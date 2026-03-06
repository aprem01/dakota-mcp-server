import { getCached, setCache } from '../cache/redis.js';
import { withSession } from '../middleware/session.js';

export const getContactsDefinition = {
  name: 'get_contacts',
  description:
    'Get contacts associated with a fund manager or allocator record. Returns contact names, titles, emails, and phone numbers.',
  inputSchema: {
    type: 'object',
    properties: {
      account_id: {
        type: 'string',
        description: 'The Salesforce Account ID of the manager or allocator',
      },
      title_filter: {
        type: 'string',
        description: 'Optional filter by job title (partial match)',
      },
      limit: {
        type: 'number',
        description: 'Maximum results (default 50, max 200)',
      },
    },
    required: ['account_id'],
  },
};

export const getContactsHandler = withSession(async (params, { session, sfClient }) => {
  const cached = await getCached(session.userId, 'get_contacts', params);
  if (cached) return { content: [{ type: 'text', text: JSON.stringify(cached) }] };

  const conditions = [`AccountId = '${sanitize(params.account_id)}'`];
  if (params.title_filter) {
    conditions.push(`Title LIKE '%${sanitize(params.title_filter)}%'`);
  }

  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 50, 1), 200);
  const soql = `SELECT Id, FirstName, LastName, Email, Phone, Title, Department, MailingCity, MailingState FROM Contact WHERE ${conditions.join(' AND ')} ORDER BY LastName LIMIT ${limit}`;

  const result = await sfClient.query(soql);
  const response = {
    total: result.totalSize,
    account_id: params.account_id,
    contacts: (result.records || []).map((c) => ({
      id: c.Id,
      first_name: c.FirstName,
      last_name: c.LastName,
      email: c.Email,
      phone: c.Phone,
      title: c.Title,
      department: c.Department,
      location: [c.MailingCity, c.MailingState].filter(Boolean).join(', '),
    })),
  };

  await setCache(session.userId, 'get_contacts', params, response, true);
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
});

function sanitize(input) {
  return String(input).replace(/['\\]/g, '');
}
