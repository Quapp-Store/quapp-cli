/**
 * Whoami command - Show the currently logged-in user
 */

import * as logger from '../lib/logger.js';
import * as colors from '../lib/colors.js';
import { EXIT_CODES } from '../lib/constants.js';
import {
  readCredentials,
  deleteCredentials,
  getValidToken,
  createSupabaseClient,
} from '../lib/credentials.js';

/**
 * Run the whoami command
 * @returns {Promise<Object>} Result object
 */
export async function runWhoami() {
  const token = await getValidToken();

  if (!token) {
    logger.error('Not logged in. Run "quapp login" first.');
    logger.newline();
    return {
      success: false,
      error: 'not_logged_in',
      exitCode: EXIT_CODES.AUTH_REQUIRED,
    };
  }

  // Verify token server-side
  const supabase = createSupabaseClient(token);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    deleteCredentials();
    logger.error('Session expired. Run "quapp login" again.');
    logger.newline();
    return {
      success: false,
      error: 'session_expired',
      exitCode: EXIT_CODES.AUTH_REQUIRED,
    };
  }

  const creds = readCredentials();

  logger.newline();
  logger.info(colors.boldBlue('Quapp Account'));
  logger.newline();
  logger.info(`  Email:     ${colors.bold(data.user.email)}`);
  logger.info(`  User ID:   ${colors.dim(data.user.id)}`);

  if (creds?.has_developer_profile) {
    logger.info(
      `  Developer: ${colors.green(creds.developer_display_name)} ${colors.dim(`(${creds.developer_slug})`)}`
    );
  } else {
    logger.info(`  Developer: ${colors.yellow('No profile')}`);
  }

  logger.newline();

  return {
    success: true,
    email: data.user.email,
    userId: data.user.id,
    hasProfile: creds?.has_developer_profile || false,
    developerName: creds?.developer_display_name || null,
    developerSlug: creds?.developer_slug || null,
  };
}
