import crypto from 'crypto';
import { Router } from 'express';
import { redis } from '../cache/redis.js';
import {
  generatePKCE,
  buildAuthorizationURL,
  exchangeCodeForTokens,
  storeSession,
  resolveCustomerTier,
} from './oauth.js';

const router = Router();

// Step 1: Initiate OAuth flow
router.get('/auth/login', async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const { verifier, challenge } = generatePKCE();

    // Store PKCE verifier and state temporarily (10 min TTL)
    await redis.set(`oauth_state:${state}`, JSON.stringify({ verifier }), 'EX', 600);

    const authUrl = buildAuthorizationURL(state, challenge);
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate login', detail: err.message });
  }
});

// Step 2: OAuth callback
router.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).json({ error: 'OAuth denied', detail: error });
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  try {
    const stateData = await redis.get(`oauth_state:${state}`);
    if (!stateData) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    const { verifier } = JSON.parse(stateData);
    await redis.del(`oauth_state:${state}`);

    const tokenData = await exchangeCodeForTokens(code, verifier);

    // Resolve user info and customer tier
    const { tier, userInfo } = await resolveCustomerTier(
      tokenData.access_token,
      tokenData.instance_url
    );

    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = await storeSession(sessionId, tokenData, {
      user_id: tokenData.id?.split('/').pop() || userInfo.user_id,
      organization_id: userInfo.organization_id,
      custom_attributes: { customer_tier: tier },
    });

    // Return session ID to the MCP client
    res.json({
      session_id: sessionId,
      user_id: session.userId,
      customer_tier: session.customerTier,
      message: 'Authentication successful. Use this session_id in MCP requests.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Authentication failed', detail: err.message });
  }
});

// Health check / session status
router.get('/auth/status', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) {
    return res.status(401).json({ error: 'No session ID provided' });
  }

  const data = await redis.get(`session:${sessionId}`);
  if (!data) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  const session = JSON.parse(data);
  res.json({
    authenticated: true,
    user_id: session.userId,
    customer_tier: session.customerTier,
  });
});

export default router;
