/**
 * Logout command - Sign out and remove stored credentials
 */

import * as logger from '../lib/logger.js';
import {
  readCredentials,
  deleteCredentials,
  createSupabaseClient,
} from '../lib/credentials.js';

/**
 * Run the logout command
 * @returns {Promise<Object>} Result object
 */
export async function runLogout() {
  const creds = readCredentials();

  if (!creds) {
    logger.info('Already logged out.');
    logger.newline();
    return { success: true, alreadyLoggedOut: true };
  }

  // Best-effort server-side sign out
  try {
    const supabase = createSupabaseClient(creds.access_token);
    await supabase.auth.signOut();
  } catch {
    // ignore -- delete local credentials regardless
  }

  deleteCredentials();
  logger.success('Logged out successfully.');
  logger.newline();

  return { success: true };
}
