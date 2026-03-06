import { getSession, getValidAccessToken } from '../auth/oauth.js';
import { SalesforceClient } from '../salesforce/client.js';
import { MockSalesforceClient } from '../salesforce/mock.js';
import { checkRateLimit } from './rateLimiter.js';
import { refreshAccessToken } from '../auth/oauth.js';
import { redis } from '../cache/redis.js';

const USE_MOCK = process.env.USE_MOCK === 'true';

const MOCK_SESSION = {
  userId: 'mock-user-001',
  orgId: 'mock-org-001',
  customerTier: 'premium',
  accessToken: 'mock-token',
  refreshToken: 'mock-refresh',
  instanceUrl: 'https://mock.salesforce.com',
  issuedAt: Date.now(),
};

/**
 * Wraps an MCP tool handler with session validation, rate limiting, and
 * automatic Salesforce client injection. Handles token refresh on 401.
 * In mock mode (USE_MOCK=true), bypasses auth and uses mock SF client.
 */
export function withSession(handler) {
  return async (params, extra) => {
    // Mock mode: skip auth, use mock client
    if (USE_MOCK) {
      const sfClient = new MockSalesforceClient();
      const session = MOCK_SESSION;
      return await handler(params, { ...extra, session, sfClient, sessionId: 'mock-session' });
    }

    const sessionId = extra?.sessionId || params?.session_id;

    if (!sessionId) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          error: 'authentication_required',
          message: 'No session ID provided. Please authenticate first via /auth/login.',
        })}],
        isError: true,
      };
    }

    const session = await getSession(sessionId);
    if (!session) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          error: 'session_expired',
          message: 'Your session has expired. Please re-authenticate via /auth/login.',
        })}],
        isError: true,
      };
    }

    // Rate limit check
    const rateResult = await checkRateLimit(session.userId, session.customerTier);
    if (!rateResult.allowed) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          error: 'rate_limit_exceeded',
          message: `Rate limit exceeded. Limit: ${rateResult.limit}/hour. Try again after ${rateResult.resetAt}.`,
          limit: rateResult.limit,
          reset_at: rateResult.resetAt,
        })}],
        isError: true,
      };
    }

    // Get valid access token (handles silent refresh)
    let accessToken, instanceUrl;
    try {
      ({ accessToken, instanceUrl } = await getValidAccessToken(sessionId));
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          error: 'authentication_failed',
          message: 'Unable to authenticate with Salesforce. Please re-authenticate.',
        })}],
        isError: true,
      };
    }

    const sfClient = new SalesforceClient(accessToken, instanceUrl);

    try {
      return await handler(params, { ...extra, session, sfClient, sessionId });
    } catch (err) {
      // Handle Salesforce 401 — attempt one token refresh and retry
      if (err.code === 'SF_AUTH_EXPIRED') {
        try {
          const newTokenData = await refreshAccessToken(session.refreshToken);
          session.accessToken = newTokenData.access_token;
          session.issuedAt = parseInt(newTokenData.issued_at, 10);
          if (newTokenData.refresh_token) {
            session.refreshToken = newTokenData.refresh_token;
          }
          await redis.set(`session:${sessionId}`, JSON.stringify(session), 'EX', 86400);

          const retrySfClient = new SalesforceClient(newTokenData.access_token, instanceUrl);
          return await handler(params, { ...extra, session, sfClient: retrySfClient, sessionId });
        } catch {
          return {
            content: [{ type: 'text', text: JSON.stringify({
              error: 'authentication_failed',
              message: 'Salesforce authentication failed after retry. Please re-authenticate.',
            })}],
            isError: true,
          };
        }
      }

      // Handle Salesforce 403
      if (err.code === 'SF_ACCESS_DENIED') {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            error: 'access_denied',
            message: err.message,
          })}],
          isError: true,
        };
      }

      // Generic error
      return {
        content: [{ type: 'text', text: JSON.stringify({
          error: 'internal_error',
          message: `An error occurred: ${err.message}`,
        })}],
        isError: true,
      };
    }
  };
}
