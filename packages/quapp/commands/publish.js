/**
 * Publish command - Upload and publish a .qpp file to the Quapp Store
 *
 * Flow: validate file -> read manifest -> get presigned URL ->
 *       upload to S3 -> publish release via Edge Function
 */

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import * as logger from '../lib/logger.js';
import * as colors from '../lib/colors.js';
import {
  EXIT_CODES,
  SUPABASE_URL,
  MAX_QPP_FILE_SIZE,
} from '../lib/constants.js';
import {
  readCredentials,
  getValidToken,
} from '../lib/credentials.js';

// ---------------------------------------------------------------------------
// Manifest reading from .qpp ZIP
// ---------------------------------------------------------------------------

/**
 * Extract and validate manifest.json from a .qpp ZIP archive
 * @param {string} filePath - Absolute path to .qpp file
 * @returns {Object} { manifest, fileCount } or throws
 */
function readManifestFromZip(filePath) {
  const zip = new AdmZip(filePath);
  const entry = zip.getEntry('manifest.json');

  if (!entry) {
    const nested = zip
      .getEntries()
      .find(
        (e) =>
          e.entryName.endsWith('/manifest.json') &&
          e.entryName.split('/').length === 2
      );
    if (nested) {
      const folder = nested.entryName.split('/')[0];
      throw new Error(
        `manifest.json found inside "${folder}/" folder. ` +
          'It should be at the root of the ZIP. Rebuild with: quapp build'
      );
    }
    throw new Error(
      'manifest.json not found in .qpp file. Rebuild with: quapp build'
    );
  }

  const raw = entry.getData().toString('utf-8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON in manifest.json');
  }

  // Validate required fields
  const required = ['package_name', 'version', 'version_code', 'entry_point'];
  for (const field of required) {
    if (manifest[field] === undefined || manifest[field] === null) {
      throw new Error(`Missing required manifest field: ${field}`);
    }
  }

  if (!/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}$/.test(manifest.package_name)) {
    throw new Error(
      'Invalid package_name format. Must be lowercase with 3+ segments (e.g., com.company.app)'
    );
  }

  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    throw new Error('Invalid version format. Must be semver (e.g., 1.0.0)');
  }

  if (typeof manifest.version_code !== 'number' || manifest.version_code < 1) {
    throw new Error('version_code must be a positive integer');
  }

  if (!zip.getEntry(manifest.entry_point)) {
    throw new Error(`Entry point not found in archive: ${manifest.entry_point}`);
  }

  const fileCount = zip.getEntries().filter((e) => !e.isDirectory).length;

  return { manifest, fileCount };
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

/**
 * POST to a Supabase Edge Function
 * @param {string} endpoint - Function name (e.g. 'get-upload-url')
 * @param {Object} body - Request body
 * @param {string} token - Bearer token
 * @returns {Promise<Object>} Response JSON
 */
async function apiPost(endpoint, body, token) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.message || json.error || `API error: ${res.status}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Publish command
// ---------------------------------------------------------------------------

/**
 * Run the publish command
 * @param {Object} options
 * @param {string|null} options.file - Path to .qpp file (default: ./dist.qpp)
 * @param {string|null} options.notes - Release notes
 * @param {string|null} options.visibility - public | unlisted | private
 * @returns {Promise<Object>} Result object
 */
export async function runPublish({ file, notes, visibility }) {
  const filePath = path.resolve(file || './dist.qpp');
  const releaseNotes = notes || null;
  const vis = visibility || 'public';

  // ---- 1. Auth check ----

  logger.debug('Checking authentication...');
  if (!logger.isJsonMode()) {
    logger.info(colors.dim('Checking authentication...'));
  }

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

  const creds = readCredentials();
  if (creds && !creds.has_developer_profile) {
    logger.error('No developer profile found.');
    logger.info('Create one at the Developer Portal before publishing.');
    logger.newline();
    return {
      success: false,
      error: 'no_developer_profile',
      exitCode: EXIT_CODES.AUTH_REQUIRED,
    };
  }

  // ---- 2. Validate file ----

  if (!fs.existsSync(filePath)) {
    logger.error(`File not found: ${filePath}`);
    logger.info('Run "quapp build" first, or specify --file <path>.');
    logger.newline();
    return { success: false, error: 'file_not_found' };
  }

  if (!filePath.endsWith('.qpp')) {
    logger.error('File must have .qpp extension.');
    logger.newline();
    return { success: false, error: 'invalid_extension' };
  }

  const stat = fs.statSync(filePath);
  if (stat.size > MAX_QPP_FILE_SIZE) {
    const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
    logger.error(`File exceeds 50MB limit (${sizeMB}MB).`);
    logger.newline();
    return { success: false, error: 'file_too_large' };
  }

  // ---- 3. Read manifest ----

  if (!logger.isJsonMode()) {
    logger.info(colors.dim('Reading manifest...'));
  }

  let manifest, fileCount;
  try {
    ({ manifest, fileCount } = readManifestFromZip(filePath));
  } catch (err) {
    logger.error(err.message);
    logger.newline();
    return { success: false, error: err.message };
  }

  logger.newline();
  logger.info(colors.boldBlue('Publishing'));
  logger.info(`  Package:    ${colors.bold(manifest.package_name)}`);
  logger.info(`  Version:    ${manifest.version} (code: ${manifest.version_code})`);
  logger.info(`  Files:      ${fileCount}`);
  logger.info(`  Size:       ${(stat.size / 1024).toFixed(1)} KB`);
  logger.info(`  Visibility: ${vis}`);
  logger.newline();

  // ---- 4. Get presigned upload URL ----

  if (!logger.isJsonMode()) {
    logger.info(colors.dim('Requesting upload URL...'));
  }

  let uploadUrl, s3Key;
  try {
    const result = await apiPost(
      'get-upload-url',
      {
        package_name: manifest.package_name,
        version: manifest.version,
        version_code: manifest.version_code,
        file_size: stat.size,
        file_name: path.basename(filePath),
      },
      token
    );
    uploadUrl = result.upload_url;
    s3Key = result.s3_key;
  } catch (err) {
    logger.error(`Failed to get upload URL: ${err.message}`);
    logger.newline();
    return { success: false, error: err.message };
  }

  // ---- 5. Upload to S3 ----

  if (!logger.isJsonMode()) {
    logger.info(colors.dim('Uploading .qpp file...'));
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: { 'Content-Type': 'application/zip' },
    });
    if (!res.ok) {
      throw new Error(`S3 upload returned ${res.status}`);
    }
  } catch (err) {
    logger.error(`Upload failed: ${err.message}`);
    logger.newline();
    return { success: false, error: err.message };
  }

  // ---- 6. Publish release ----

  if (!logger.isJsonMode()) {
    logger.info(colors.dim('Publishing release...'));
  }

  try {
    const result = await apiPost(
      'publish-release',
      {
        s3_key: s3Key,
        package_name: manifest.package_name,
        version: manifest.version,
        version_code: manifest.version_code,
        release_notes: releaseNotes,
        visibility: vis,
      },
      token
    );

    logger.newline();
    logger.success('Published successfully!');
    logger.newline();
    logger.info(`  ${colors.bold('URL:')}     ${colors.cyan(result.hosted_url)}`);
    logger.info(`  ${colors.bold('Slug:')}    ${result.slug}`);
    logger.info(`  ${colors.bold('Release:')} ${result.release_id}`);
    logger.info(`  ${colors.bold('App ID:')}  ${result.quapp_id}`);
    if (result.files_extracted) {
      logger.info(`  ${colors.bold('Files:')}   ${result.files_extracted} extracted`);
    }
    if (result.processing_time_ms) {
      logger.info(`  ${colors.bold('Time:')}    ${result.processing_time_ms}ms`);
    }
    logger.newline();

    return {
      success: true,
      hostedUrl: result.hosted_url,
      slug: result.slug,
      releaseId: result.release_id,
      quappId: result.quapp_id,
      filesExtracted: result.files_extracted || 0,
      processingTimeMs: result.processing_time_ms || 0,
    };
  } catch (err) {
    logger.error(`Publish failed: ${err.message}`);
    logger.newline();
    return { success: false, error: err.message };
  }
}
