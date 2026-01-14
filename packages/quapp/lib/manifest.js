/**
 * Manifest generation for .qpp packages
 */

import fs from 'fs';
import path from 'path';
import { MANIFEST_DEFAULTS } from './constants.js';

/**
 * Sanitize string for package name (alphanumeric only, lowercase)
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 50); // Reasonable length limit
}

/**
 * Parse version string to version code
 * Converts "1.2.3" to 10203, "2.0.0" to 20000
 * @param {string} version
 * @returns {number}
 */
function parseVersionCode(version) {
  if (!version) return 1;
  
  const parts = version.split('.').map(p => parseInt(p, 10) || 0);
  const [major = 0, minor = 0, patch = 0] = parts;
  
  return major * 10000 + minor * 100 + patch;
}

/**
 * Generate manifest.json content
 * @param {Object} pkg - Package.json content
 * @param {Object} options - Additional options
 * @returns {Object} Manifest content
 */
export function generateManifest(pkg, options = {}) {
  const { name, version, author } = pkg;
  
  const sanitizedAuthor = sanitize(author) || 'developer';
  const sanitizedName = sanitize(name) || 'app';
  
  return {
    package_name: `com.${sanitizedAuthor}.${sanitizedName}`,
    version: version || '1.0.0',
    version_code: parseVersionCode(version),
    entry_point: options.entryPoint || MANIFEST_DEFAULTS.entry_point,
    permissions: options.permissions || MANIFEST_DEFAULTS.permissions,
    min_sdk_version: options.minSdkVersion || MANIFEST_DEFAULTS.min_sdk_version,
    ...(options.extra || {}),
  };
}

/**
 * Write manifest.json to directory
 * @param {string} dir - Target directory
 * @param {Object} manifest - Manifest content
 * @returns {Object} Result
 */
export function writeManifest(dir, manifest) {
  try {
    const manifestPath = path.join(dir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    return { success: true, path: manifestPath };
  } catch (err) {
    return { success: false, error: `Failed to write manifest: ${err.message}` };
  }
}

/**
 * Read existing manifest from directory
 * @param {string} dir - Directory to read from
 * @returns {Object|null} Manifest content or null
 */
export function readManifest(dir) {
  try {
    const manifestPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return null;
  }
}
