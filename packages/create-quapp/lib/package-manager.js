/**
 * Package manager detection and commands
 */

import { execSync } from 'child_process';

// Package manager configurations
const MANAGERS = {
  npm: {
    name: 'npm',
    install: 'npm install',
    run: 'npm run',
    lockfile: 'package-lock.json',
  },
  yarn: {
    name: 'yarn',
    install: 'yarn',
    run: 'yarn',
    lockfile: 'yarn.lock',
  },
  pnpm: {
    name: 'pnpm',
    install: 'pnpm install',
    run: 'pnpm',
    lockfile: 'pnpm-lock.yaml',
  },
  bun: {
    name: 'bun',
    install: 'bun install',
    run: 'bun run',
    lockfile: 'bun.lockb',
  },
};

/**
 * Check if a command exists in PATH
 * @param {string} cmd
 * @returns {boolean}
 */
function commandExists(cmd) {
  try {
    execSync(process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`, {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect which package manager invoked this script
 * Based on npm_config_user_agent environment variable
 * @returns {string|null}
 */
function detectFromUserAgent() {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) return null;

  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('bun')) return 'bun';
  if (userAgent.includes('npm')) return 'npm';
  return null;
}


/**
 * Detect the preferred package manager
 * Priority: CLI flag > user agent > npm (default)
 * 
 * For scaffolding, we DON'T check lockfiles or installed managers
 * because that leads to confusing behavior. We use what the user
 * used to invoke the command (npm create, pnpm create, etc.)
 * 
 * @param {Object} options
 * @param {string} options.preferred - User-specified preference via --pm flag
 * @returns {Object} Package manager configuration
 */
export function detectPackageManager({ preferred = null } = {}) {
  // 1. User explicitly specified via --pm flag
  if (preferred && MANAGERS[preferred]) {
    return MANAGERS[preferred];
  }

  // 2. Detect from how this script was invoked (npm create, pnpm create, etc.)
  // This is the most intuitive - use what the user is already using
  const fromAgent = detectFromUserAgent();
  if (fromAgent && MANAGERS[fromAgent]) {
    return MANAGERS[fromAgent];
  }

  // 3. Default to npm - most common and always available
  return MANAGERS.npm;
}

/**
 * Get all available package manager names
 * @returns {string[]}
 */
export function getAvailableManagers() {
  return Object.keys(MANAGERS).filter(commandExists);
}

/**
 * Validate package manager name
 * @param {string} name
 * @returns {boolean}
 */
export function isValidManager(name) {
  return Object.keys(MANAGERS).includes(name);
}
