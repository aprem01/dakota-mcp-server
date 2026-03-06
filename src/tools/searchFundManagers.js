import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';

export const searchFundManagersDefinition = {
  name: 'search_fund_managers',
  description:
    'Search for fund managers in Dakota Marketplace. Filter by name, AUM range, investment strategy, or geography. Returns a list of matching fund manager profiles.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Fund manager name or partial name to search for',
      },
      aum_min: {
        type: 'number',
        description: 'Minimum assets under management (in millions USD)',
      },
      aum_max: {
        type: 'number',
        description: 'Maximum assets under management (in millions USD)',
      },
      strategy: {
        type: 'string',
        description: 'Investment strategy (e.g., "Private Equity", "Hedge Fund", "Real Estate", "Venture Capital")',
      },
      geography: {
        type: 'string',
        description: 'Geographic focus or headquarters location',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default 25, max 100)',
      },
      session_id: {
        type: 'string',
        description: 'Your authenticated session ID',
      },
    },
    required: ['session_id'],
  },
};

export const searchFundManagersHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'search_fund_managers', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const conditions = ["RecordType.Name = 'Fund Manager'"];

  if (params.name) {
    conditions.push(`Name LIKE '%${sanitize(params.name)}%'`);
  }
  if (params.aum_min != null) {
    conditions.push(`AUM__c >= ${Number(params.aum_min)}`);
  }
  if (params.aum_max != null) {
    conditions.push(`AUM__c <= ${Number(params.aum_max)}`);
  }
  if (params.strategy) {
    conditions.push(`Strategy__c = '${sanitize(params.strategy)}'`);
  }
  if (params.geography) {
    conditions.push(`BillingCountry LIKE '%${sanitize(params.geography)}%'`);
  }

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 25, 1), 100);
  const soql = `SELECT Id, Name, AUM__c, Strategy__c, BillingCity, BillingState, BillingCountry, Website, Description FROM Account WHERE ${conditions.join(' AND ')} ORDER BY Name LIMIT ${limit}`;

  const result = await sfClient.query(soql);

  const response = {
    total: result.totalSize,
    records: (result.records || []).map((r) => ({
      id: r.Id,
      name: r.Name,
      aum: r.AUM__c,
      strategy: r.Strategy__c,
      location: [r.BillingCity, r.BillingState, r.BillingCountry].filter(Boolean).join(', '),
      website: r.Website,
      description: r.Description,
    })),
  };

  await setCache(session.userId, 'search_fund_managers', params, response);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});

function sanitize(input) {
  return String(input).replace(/['\\]/g, '');
}
