import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';
import { buildAllocatorComposite, parseCompositeResponse } from '../salesforce/composite.js';

export const getAllocatorDefinition = {
  name: 'get_allocator',
  description:
    'Get the full profile of an institutional allocator by Salesforce record ID. Returns allocator details and associated contacts.',
  inputSchema: {
    type: 'object',
    properties: {
      record_id: {
        type: 'string',
        description: 'The Salesforce record ID of the allocator',
      },
      session_id: { type: 'string', description: 'Your authenticated session ID' },
    },
    required: ['record_id', 'session_id'],
  },
};

export const getAllocatorHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'get_allocator', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const compositeRequests = buildAllocatorComposite(params.record_id);
  const compositeResult = await sfClient.composite(compositeRequests);
  const parsed = parseCompositeResponse(compositeResult);

  const allocator = parsed.allocator;
  if (allocator?.error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({
        error: 'not_found',
        message: `Allocator ${params.record_id} not found or not accessible.`,
      })}],
      isError: true,
    };
  }

  const response = {
    allocator: {
      id: allocator.Id,
      name: allocator.Name,
      type: allocator.Allocator_Type__c,
      aum: allocator.AUM__c,
      location: [allocator.BillingCity, allocator.BillingState, allocator.BillingCountry].filter(Boolean).join(', '),
      website: allocator.Website,
      description: allocator.Description,
      phone: allocator.Phone,
    },
    contacts: (parsed.contacts?.records || []).map((c) => ({
      id: c.Id,
      first_name: c.FirstName,
      last_name: c.LastName,
      email: c.Email,
      phone: c.Phone,
      title: c.Title,
    })),
  };

  await setCache(session.userId, 'get_allocator', params, response, true);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});
