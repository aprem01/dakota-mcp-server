import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';

export const searchFundsDefinition = {
  name: 'search_funds',
  description:
    'Search for funds in Dakota Marketplace. Filter by strategy, vintage year, status, or manager name. Returns matching fund records.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Fund name or partial name',
      },
      strategy: {
        type: 'string',
        description: 'Investment strategy (e.g., "Buyout", "Growth Equity", "Venture Capital", "Real Assets")',
      },
      vintage_year: {
        type: 'number',
        description: 'Vintage year of the fund',
      },
      status: {
        type: 'string',
        description: 'Fund status (e.g., "Open", "Closed", "Fundraising")',
      },
      manager_name: {
        type: 'string',
        description: 'Name of the fund manager',
      },
      size_min: {
        type: 'number',
        description: 'Minimum fund size (in millions USD)',
      },
      size_max: {
        type: 'number',
        description: 'Maximum fund size (in millions USD)',
      },
      limit: {
        type: 'number',
        description: 'Maximum results (default 25, max 100)',
      },
      session_id: { type: 'string', description: 'Your authenticated session ID' },
    },
    required: ['session_id'],
  },
};

export const searchFundsHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'search_funds', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const conditions = [];
  if (params.name) conditions.push(`Name LIKE '%${sanitize(params.name)}%'`);
  if (params.strategy) conditions.push(`Strategy__c = '${sanitize(params.strategy)}'`);
  if (params.vintage_year) conditions.push(`Vintage_Year__c = ${Number(params.vintage_year)}`);
  if (params.status) conditions.push(`Status__c = '${sanitize(params.status)}'`);
  if (params.manager_name) conditions.push(`Manager__r.Name LIKE '%${sanitize(params.manager_name)}%'`);
  if (params.size_min != null) conditions.push(`Fund_Size__c >= ${Number(params.size_min)}`);
  if (params.size_max != null) conditions.push(`Fund_Size__c <= ${Number(params.size_max)}`);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 25, 1), 100);
  const soql = `SELECT Id, Name, Strategy__c, Vintage_Year__c, Fund_Size__c, Status__c, Manager__r.Name, Manager__r.Id FROM Fund__c ${where} ORDER BY Vintage_Year__c DESC LIMIT ${limit}`;

  const result = await sfClient.query(soql);
  const response = {
    total: result.totalSize,
    records: (result.records || []).map((r) => ({
      id: r.Id,
      name: r.Name,
      strategy: r.Strategy__c,
      vintage_year: r.Vintage_Year__c,
      fund_size: r.Fund_Size__c,
      status: r.Status__c,
      manager_name: r.Manager__r?.Name,
      manager_id: r.Manager__r?.Id,
    })),
  };

  await setCache(session.userId, 'search_funds', params, response);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});

function sanitize(input) {
  return String(input).replace(/['\\]/g, '');
}
