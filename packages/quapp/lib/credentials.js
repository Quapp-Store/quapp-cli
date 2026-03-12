/**
 * Credential storage and Supabase client management
 *
 * Stores auth tokens in ~/.quapp/credentials.json.
 * Handles automatic token refresh when expired.
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  QUAPP_DIR,
  CREDENTIALS_PATH,
} from './constants.js';

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

/**
 * Create a lightweight Supabase client
 * @param {string} [accessToken] - Optional Bearer token to inject
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createSupabaseClient(accessToken) {
  const options = accessToken
    ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    : {};
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
}

// ---------------------------------------------------------------------------
// Credential file helpers
// ---------------------------------------------------------------------------

/**
 * Read stored credentials from disk
 * @returns {Object|null} Credentials object or null if not found / invalid
 */
export function readCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) return null;
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist credentials to disk
 * @param {Object} creds - Credentials to save
 */
export function writeCredentials(creds) {
  if (!fs.existsSync(QUAPP_DIR)) {
    fs.mkdirSync(QUAPP_DIR, { recursive: true });
  }
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2) + '\n');
}

/**
 * Remove the credentials file
 */
export function deleteCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) fs.unlinkSync(CREDENTIALS_PATH);
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

/**
 * Get a valid access token, auto-refreshing if expired
 * @returns {Promise<string|null>} Valid access_token or null
 */
export async function getValidToken() {
  const creds = readCredentials();
  if (!creds) return null;

  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // refresh 60s before expiry

  if (creds.expires_at && creds.expires_at - buffer > now) {
    return creds.access_token;
  }

  // Token expired or about to expire -- attempt refresh
  if (!creds.refresh_token) return null;

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: creds.refresh_token,
    });

    if (error || !data.session) {
      deleteCredentials();
      return null;
    }

    const session = data.session;
    writeCredentials({
      ...creds,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    });

    return session.access_token;
  } catch {
    return null;
  }
}
