/**
 * Constants for quapp CLI
 */

// Exit codes following Unix conventions
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  BUILD_FAILED: 3,
  CONFIG_ERROR: 4,
  MISSING_DEPENDENCY: 5,
  USER_CANCELLED: 130,
};

// Default server configuration
export const DEFAULT_SERVER_CONFIG = {
  qr: true,
  network: 'private',
  port: 5173,
  fallbackPort: true,
  https: false,
  openBrowser: false,
  autoRetry: true,
  strictPort: false,
};

// Manifest defaults
export const MANIFEST_DEFAULTS = {
  entry_point: 'index.html',
  permissions: [],
  min_sdk_version: 1,
};
