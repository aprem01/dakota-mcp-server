import crypto from 'crypto';
import { redis } from '../cache/redis.js';

const SESSION_TTL = 86400; // 24 hours
const TOKEN_REFRESH_BUFFER = 300; // Refresh 5 min before expiry

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizationURL(state, codeChallenge) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SALESFORCE_CLIENT_ID,
    redirect_uri: process.env.SALESFORCE_REDIRECT_URI,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    scope: 'api refresh_token',
  });
  return `${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/authorize?${params}`;
}

export async function exchangeCodeForTokens(code, codeVerifier) {
  const response = await fetch(
    `${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        redirect_uri: process.env.SALESFORCE_REDIRECT_URI,
        code,
        code_verifier: codeVerifier,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken) {
  const response = await fetch(
    `${process.env.SALESFORCE_INSTANCE_URL}/services/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.SALESFORCE_CLIENT_ID,
        client_secret: process.env.SALESFORCE_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return response.json();
}

export async function storeSession(sessionId, tokenData, userInfo) {
  const session = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    instanceUrl: tokenData.instance_url,
    issuedAt: parseInt(tokenData.issued_at, 10),
    userId: userInfo.user_id,
    orgId: userInfo.organization_id,
    customerTier: userInfo.custom_attributes?.customer_tier || 'standard',
  };

  await redis.set(
    `session:${sessionId}`,
    JSON.stringify(session),
    'EX',
    SESSION_TTL
  );

  return session;
}

export async function getSession(sessionId) {
  const data = await redis.get(`session:${sessionId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function getValidAccessToken(sessionId) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('No active session');

  const now = Date.now();
  const tokenAge = (now - session.issuedAt) / 1000;

  // Salesforce access tokens typically expire after 2 hours
  if (tokenAge > 7200 - TOKEN_REFRESH_BUFFER) {
    try {
      const newTokenData = await refreshAccessToken(session.refreshToken);
      session.accessToken = newTokenData.access_token;
      session.issuedAt = parseInt(newTokenData.issued_at, 10);
      if (newTokenData.refresh_token) {
        session.refreshToken = newTokenData.refresh_token;
      }
      await redis.set(
        `session:${sessionId}`,
        JSON.stringify(session),
        'EX',
        SESSION_TTL
      );
    } catch (err) {
      throw new Error(`Token refresh failed: ${err.message}`);
    }
  }

  return { accessToken: session.accessToken, instanceUrl: session.instanceUrl };
}

export async function resolveCustomerTier(accessToken, instanceUrl) {
  const response = await fetch(
    `${instanceUrl}/services/oauth2/userinfo`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return { tier: 'standard', userInfo: {} };
  const userInfo = await response.json();
  return {
    tier: userInfo.custom_attributes?.customer_tier || 'standard',
    userInfo,
  };
}
