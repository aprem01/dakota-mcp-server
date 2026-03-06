import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';
import { buildFundComposite, parseCompositeResponse } from '../salesforce/composite.js';

export const getFundDefinition = {
  name: 'get_fund',
  description:
    'Get full details of a specific fund by Salesforce record ID. Returns fund information and the associated manager.',
  inputSchema: {
    type: 'object',
    properties: {
      record_id: {
        type: 'string',
        description: 'The Salesforce record ID of the fund',
      },
    },
    required: ['record_id'],
  },
};

export const getFundHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'get_fund', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const compositeRequests = buildFundComposite(params.record_id);
  const compositeResult = await sfClient.composite(compositeRequests);
  const parsed = parseCompositeResponse(compositeResult);

  const fund = parsed.fund;
  if (fund?.error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({
        error: 'not_found',
        message: `Fund ${params.record_id} not found or not accessible.`,
      })}],
      isError: true,
    };
  }

  const response = {
    fund: {
      id: fund.Id,
      name: fund.Name,
      strategy: fund.Strategy__c,
      vintage_year: fund.Vintage_Year__c,
      fund_size: fund.Fund_Size__c,
      status: fund.Status__c,
      target_size: fund.Target_Size__c,
      description: fund.Description__c,
    },
    manager: parsed.manager?.records?.[0]
      ? {
          id: parsed.manager.records[0].Id,
          name: parsed.manager.records[0].Name,
          type: parsed.manager.records[0].Type,
          website: parsed.manager.records[0].Website,
        }
      : null,
  };

  await setCache(session.userId, 'get_fund', params, response, true);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});
