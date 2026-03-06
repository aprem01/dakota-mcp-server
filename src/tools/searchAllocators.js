import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';

export const searchAllocatorsDefinition = {
  name: 'search_allocators',
  description:
    'Search for institutional allocators in Dakota Marketplace. Filter by allocator type, AUM range, or location. Returns matching allocator profiles.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Allocator name or partial name to search for',
      },
      type: {
        type: 'string',
        description: 'Allocator type (e.g., "Pension", "Endowment", "Foundation", "Family Office", "Sovereign Wealth Fund")',
      },
      aum_min: {
        type: 'number',
        description: 'Minimum assets under management (in millions USD)',
      },
      aum_max: {
        type: 'number',
        description: 'Maximum assets under management (in millions USD)',
      },
      location: {
        type: 'string',
        description: 'City, state, or country',
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

export const searchAllocatorsHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'search_allocators', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const conditions = ["RecordType.Name = 'Allocator'"];
  if (params.name) conditions.push(`Name LIKE '%${sanitize(params.name)}%'`);
  if (params.type) conditions.push(`Allocator_Type__c = '${sanitize(params.type)}'`);
  if (params.aum_min != null) conditions.push(`AUM__c >= ${Number(params.aum_min)}`);
  if (params.aum_max != null) conditions.push(`AUM__c <= ${Number(params.aum_max)}`);
  if (params.location) conditions.push(`(BillingCity LIKE '%${sanitize(params.location)}%' OR BillingState LIKE '%${sanitize(params.location)}%' OR BillingCountry LIKE '%${sanitize(params.location)}%')`);

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 25, 1), 100);
  const soql = `SELECT Id, Name, Allocator_Type__c, AUM__c, BillingCity, BillingState, BillingCountry, Website, Description FROM Account WHERE ${conditions.join(' AND ')} ORDER BY Name LIMIT ${limit}`;

  const result = await sfClient.query(soql);
  const response = {
    total: result.totalSize,
    records: (result.records || []).map((r) => ({
      id: r.Id,
      name: r.Name,
      type: r.Allocator_Type__c,
      aum: r.AUM__c,
      location: [r.BillingCity, r.BillingState, r.BillingCountry].filter(Boolean).join(', '),
      website: r.Website,
      description: r.Description,
    })),
  };

  await setCache(session.userId, 'search_allocators', params, response);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});

function sanitize(input) {
  return String(input).replace(/['\\]/g, '');
}
