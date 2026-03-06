import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';
import { buildFundManagerComposite, parseCompositeResponse } from '../salesforce/composite.js';

export const getFundManagerDefinition = {
  name: 'get_fund_manager',
  description:
    'Get the full profile of a fund manager by Salesforce record ID. Returns manager details, associated funds, and contacts in a single call.',
  inputSchema: {
    type: 'object',
    properties: {
      record_id: {
        type: 'string',
        description: 'The Salesforce record ID of the fund manager',
      },
      },
    },
    required: ['record_id'],
  },
};

export const getFundManagerHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'get_fund_manager', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const compositeRequests = buildFundManagerComposite(params.record_id);
  const compositeResult = await sfClient.composite(compositeRequests);
  const parsed = parseCompositeResponse(compositeResult);

  const manager = parsed.manager;
  if (manager?.error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({
        error: 'not_found',
        message: `Fund manager ${params.record_id} not found or not accessible.`,
      })}],
      isError: true,
    };
  }

  const response = {
    manager: {
      id: manager.Id,
      name: manager.Name,
      aum: manager.AUM__c,
      strategy: manager.Strategy__c,
      location: [manager.BillingCity, manager.BillingState, manager.BillingCountry].filter(Boolean).join(', '),
      website: manager.Website,
      description: manager.Description,
      phone: manager.Phone,
      industry: manager.Industry,
    },
    funds: (parsed.funds?.records || []).map((f) => ({
      id: f.Id,
      name: f.Name,
      strategy: f.Strategy__c,
      vintage_year: f.Vintage_Year__c,
      fund_size: f.Fund_Size__c,
      status: f.Status__c,
    })),
    contacts: (parsed.contacts?.records || []).map((c) => ({
      id: c.Id,
      first_name: c.FirstName,
      last_name: c.LastName,
      email: c.Email,
      phone: c.Phone,
      title: c.Title,
    })),
  };

  await setCache(session.userId, 'get_fund_manager', params, response, true);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});
