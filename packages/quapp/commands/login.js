/**
 * Login command - Sign in to Quapp developer account
 *
 * Supports interactive prompts (default) and non-interactive
 * mode via --email and --password flags.
 */

import prompts from 'prompts';
import * as logger from '../lib/logger.js';
import * as colors from '../lib/colors.js';
import {
  createSupabaseClient,
  writeCredentials,
} from '../lib/credentials.js';

/**
 * Run the login command
 * @param {Object} options
 * @param {string|null} options.email - Email from --email flag
 * @param {string|null} options.password - Password from --password flag
 * @returns {Promise<Object>} Result object
 */
export async function runLogin({ email, password }) {
  let inputEmail = email;
  let inputPassword = password;

  // Interactive prompts when flags are missing
  if (!inputEmail || !inputPassword) {
    if (!logger.isJsonMode()) {
      logger.newline();
      logger.info(colors.boldBlue('Quapp Login'));
      logger.newline();
    }

    const questions = [];

    if (!inputEmail) {
      questions.push({
        type: 'text',
        name: 'email',
        message: 'Email:',
        validate: (v) => (v.includes('@') ? true : 'Enter a valid email'),
      });
    }

    if (!inputPassword) {
      questions.push({
        type: 'password',
        name: 'password',
        message: 'Password:',
        validate: (v) => (v.length >= 8 ? true : 'Password must be 8+ characters'),
      });
    }

    const answers = await prompts(questions, {
      onCancel: () => {
        // Return empty to signal cancellation
      },
    });

    inputEmail = inputEmail || answers.email;
    inputPassword = inputPassword || answers.password;
  }

  if (!inputEmail || !inputPassword) {
    logger.error('Email and password are required');
    return { success: false, error: 'Email and password are required' };
  }

  // Sign in
  logger.debug('Signing in...');
  if (!logger.isJsonMode()) {
    logger.info(colors.dim('Signing in...'));
  }

  const supabase = createSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: inputEmail,
    password: inputPassword,
  });

  if (error) {
    logger.error(`Login failed: ${error.message}`);
    return { success: false, error: error.message };
  }

  const session = data.session;
  const user = data.user;

  // Check for developer profile
  const { data: profile } = await supabase
    .schema('developer')
    .from('profiles')
    .select('id, display_name, slug, status')
    .eq('user_id', user.id)
    .maybeSingle();

  // Save credentials
  writeCredentials({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_email: user.email,
    user_id: user.id,
    has_developer_profile: !!profile,
    developer_display_name: profile?.display_name || null,
    developer_slug: profile?.slug || null,
  });

  // Output
  logger.success(`Logged in as ${colors.bold(user.email)}`);

  if (profile) {
    logger.info(`  Developer: ${colors.bold(profile.display_name)} ${colors.dim(`(${profile.slug})`)}`);
  } else {
    logger.newline();
    logger.warn('No developer profile found.');
    logger.info('  Create one at the Developer Portal before publishing.');
  }

  logger.newline();

  return {
    success: true,
    email: user.email,
    userId: user.id,
    hasProfile: !!profile,
    developerName: profile?.display_name || null,
    developerSlug: profile?.slug || null,
  };
}
