/**
 * Constants for quapp CLI
 */

import os from 'os';
import path from 'path';

// Exit codes following Unix conventions
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  BUILD_FAILED: 3,
  CONFIG_ERROR: 4,
  MISSING_DEPENDENCY: 5,
  AUTH_REQUIRED: 6,
  USER_CANCELLED: 130,
};

// Supabase public credentials (safe to embed -- security enforced via RLS)
export const SUPABASE_URL = 'https://nbmdahtxrsuuuymvisru.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ibWRhaHR4cnN1dXV5bXZpc3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTE0OTcsImV4cCI6MjA3OTE4NzQ5N30.Hq069to85Slho4_ORzAtj7jPzQ99-StjXkfPOozs1uY';

// Credential storage paths
export const QUAPP_DIR = path.join(os.homedir(), '.quapp');
export const CREDENTIALS_PATH = path.join(QUAPP_DIR, 'credentials.json');

// Upload limits
export const MAX_QPP_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
