import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';

export const searchMarketplaceDefinition = {
  name: 'search_marketplace',
  description:
    'Free-text search across all Dakota Marketplace data — fund managers, allocators, funds, and contacts. Uses Salesforce SOSL to search across multiple objects simultaneously. Best for broad queries when you are unsure which entity type to search.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Free-text search query (e.g., "Blackstone real estate" or "California pension")',
      },
      limit: {
        type: 'number',
        description: 'Maximum results per object type (default 10, max 50)',
      },
    },
    required: ['query'],
  },
};

export const searchMarketplaceHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'search_marketplace', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 10, 1), 50);
  const searchTerm = sanitize(params.query);

  const sosl = `FIND {${searchTerm}} IN ALL FIELDS RETURNING Account(Id, Name, AUM__c, Strategy__c, Allocator_Type__c, RecordType.Name, BillingCity, BillingState, BillingCountry LIMIT ${limit}), Fund__c(Id, Name, Strategy__c, Vintage_Year__c, Fund_Size__c, Status__c, Manager__r.Name LIMIT ${limit}), Contact(Id, FirstName, LastName, Title, Email, Account.Name LIMIT ${limit})`;

  const result = await sfClient.search(sosl);
  const searchRecords = result.searchRecords || [];

  const response = {
    query: params.query,
    results: {
      managers: searchRecords
        .filter((r) => r.attributes?.type === 'Account' && r.RecordType?.Name === 'Fund Manager')
        .map((r) => ({
          id: r.Id,
          name: r.Name,
          aum: r.AUM__c,
          strategy: r.Strategy__c,
          location: [r.BillingCity, r.BillingState, r.BillingCountry].filter(Boolean).join(', '),
        })),
      allocators: searchRecords
        .filter((r) => r.attributes?.type === 'Account' && r.RecordType?.Name === 'Allocator')
        .map((r) => ({
          id: r.Id,
          name: r.Name,
          type: r.Allocator_Type__c,
          aum: r.AUM__c,
          location: [r.BillingCity, r.BillingState, r.BillingCountry].filter(Boolean).join(', '),
        })),
      funds: searchRecords
        .filter((r) => r.attributes?.type === 'Fund__c')
        .map((r) => ({
          id: r.Id,
          name: r.Name,
          strategy: r.Strategy__c,
          vintage_year: r.Vintage_Year__c,
          fund_size: r.Fund_Size__c,
          status: r.Status__c,
          manager_name: r.Manager__r?.Name,
        })),
      contacts: searchRecords
        .filter((r) => r.attributes?.type === 'Contact')
        .map((r) => ({
          id: r.Id,
          first_name: r.FirstName,
          last_name: r.LastName,
          title: r.Title,
          email: r.Email,
          company: r.Account?.Name,
        })),
    },
  };

  await setCache(session.userId, 'search_marketplace', params, response);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});

function sanitize(input) {
  return String(input).replace(/[{}()\[\]\\'"*?!&|~^]/g, '');
}
