/**
 * Build command - Create production .qpp package
 */

import fs from 'fs';
import { rm } from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';
import prompts from 'prompts';
import * as logger from '../lib/logger.js';
import { loadConfig, loadPackageJson, updatePackageJson, hasBuildScript } from '../lib/config.js';
import { generateManifest, writeManifest } from '../lib/manifest.js';
import { EXIT_CODES } from '../lib/constants.js';

/**
 * Prompt for missing package.json fields
 * @param {Object} pkg - Current package.json
 * @param {string[]} missing - List of missing fields
 * @returns {Promise<Object>} Updated values
 */
async function promptMissingFields(pkg, missing) {
  const questions = [];

  if (missing.includes('name')) {
    questions.push({
      type: 'text',
      name: 'name',
      message: 'Enter project name:',
      validate: (x) => x.trim() !== '' ? true : 'Name is required',
    });
  }

  if (missing.includes('version')) {
    questions.push({
      type: 'text',
      name: 'version',
      message: 'Enter version (e.g., 1.0.0):',
      initial: '1.0.0',
      validate: (x) => x.trim() !== '' ? true : 'Version is required',
    });
  }

  // Always ask for author if not present
  if (!pkg.author) {
    questions.push({
      type: 'text',
      name: 'author',
      message: 'Enter author name:',
      validate: (x) => x.trim() !== '' ? true : 'Author is required',
    });
  }

  if (questions.length === 0) {
    return {};
  }

  return await prompts(questions);
}

/**
 * Compress directory to .qpp file
 * @param {string} sourceDir - Directory to compress
 * @param {string} outputPath - Output file path
 * @returns {Promise<Object>} Result with file size
 */
async function compressToQpp(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve({
        success: true,
        size: archive.pointer(),
        path: outputPath,
      });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Format bytes to human readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Run the build command
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Result
 */
export async function runBuild(options = {}) {
  const cwd = process.cwd();
  const startTime = Date.now();

  // Load config
  const { config, configError } = loadConfig(cwd);
  
  if (configError) {
    logger.warn(configError);
  }

  // Load package.json
  const pkgResult = loadPackageJson(cwd);
  
  if (!pkgResult.success) {
    logger.error(pkgResult.error);
    return { 
      success: false, 
      errorCode: 'PACKAGE_JSON_ERROR',
      error: pkgResult.error, 
      suggestion: 'Make sure you are in a Quapp project directory',
      exitCode: EXIT_CODES.CONFIG_ERROR 
    };
  }

  let pkg = pkgResult.package;

  // Handle missing fields
  if (pkgResult.missingFields.length > 0 || !pkg.author) {
    if (options.skipPrompts) {
      // In non-interactive mode, use defaults for missing fields
      const updates = {};
      
      if (pkgResult.missingFields.includes('name')) {
        logger.error('Missing required field: name');
        return { success: false, error: 'Missing name in package.json', exitCode: EXIT_CODES.CONFIG_ERROR };
      }
      
      if (pkgResult.missingFields.includes('version')) {
        updates.version = '1.0.0';
        logger.warn('No version specified, using 1.0.0');
      }
      
      if (!pkg.author) {
        updates.author = 'developer';
        logger.warn('No author specified, using "developer"');
      }
      
      if (Object.keys(updates).length > 0) {
        const updateResult = updatePackageJson(cwd, updates);
        if (updateResult.success) {
          pkg = updateResult.package;
        }
      }
    } else {
      // Interactive mode - prompt for missing fields
      const answers = await promptMissingFields(pkg, pkgResult.missingFields);
      
      if (Object.keys(answers).length > 0) {
        const updateResult = updatePackageJson(cwd, answers);
        if (!updateResult.success) {
          logger.error(updateResult.error);
          return { success: false, error: updateResult.error, exitCode: EXIT_CODES.CONFIG_ERROR };
        }
        pkg = updateResult.package;
        logger.success('Updated package.json');
      }
    }
  }

  // Check for build script
  if (!hasBuildScript(pkg)) {
    logger.error('No "build" script found in package.json');
    logger.info('Add a build script to your package.json, e.g.: "build": "vite build"');
    return { 
      success: false, 
      errorCode: 'NO_BUILD_SCRIPT',
      error: 'No build script', 
      suggestion: 'Add to package.json: "scripts": { "build": "vite build" }',
      exitCode: EXIT_CODES.CONFIG_ERROR 
    };
  }

  // Paths
  const distDir = path.join(cwd, config.build.outDir);
  let outputFile = options.output || config.build.outputFile;
  // Ensure .qpp extension
  if (!outputFile.endsWith('.qpp')) {
    outputFile = `${outputFile}.qpp`;
  }
  const outputPath = path.join(cwd, outputFile);

  // Step 1: Run build
  logger.step('📦', 'Building for production...');
  
  try {
    execSync('npm run build', { 
      cwd, 
      stdio: logger.isJsonMode() ? 'pipe' : 'inherit' 
    });
    logger.success('Build completed');
  } catch (err) {
    logger.error('Build failed');
    return { success: false, error: 'Build failed', exitCode: EXIT_CODES.BUILD_FAILED };
  }

  // Step 2: Verify dist folder exists
  if (!fs.existsSync(distDir)) {
    logger.error(`Build output directory "${config.build.outDir}" not found`);
    logger.info('Make sure your build script outputs to the correct directory');
    return { success: false, error: 'Build output not found', exitCode: EXIT_CODES.BUILD_FAILED };
  }

  // Step 3: Generate and write manifest
  logger.step('📋', 'Generating manifest...');
  
  const manifest = generateManifest(pkg);
  const manifestResult = writeManifest(distDir, manifest);
  
  if (!manifestResult.success) {
    logger.error(manifestResult.error);
    return { success: false, error: manifestResult.error, exitCode: EXIT_CODES.GENERAL_ERROR };
  }
  
  logger.success('Manifest created');
  logger.debug(`Package: ${manifest.package_name}`);
  logger.debug(`Version: ${manifest.version} (code: ${manifest.version_code})`);

  // Step 4: Compress to .qpp
  logger.step('🗜️', `Compressing to ${outputFile}...`);
  
  try {
    const compressResult = await compressToQpp(distDir, outputPath);
    logger.success(`Created ${outputFile} (${formatSize(compressResult.size)})`);
  } catch (err) {
    logger.error(`Failed to create ${outputFile}: ${err.message}`);
    return { success: false, error: 'Compression failed', exitCode: EXIT_CODES.GENERAL_ERROR };
  }

  // Step 5: Clean up dist folder
  if (options.clean !== false) {
    try {
      await rm(distDir, { recursive: true, force: true });
      logger.debug('Cleaned up dist folder');
    } catch (err) {
      logger.warn(`Could not remove dist folder: ${err.message}`);
    }
  }

  // Done
  const duration = Date.now() - startTime;
  logger.newline();
  logger.success(`Build complete in ${(duration / 1000).toFixed(1)}s`);

  return {
    success: true,
    outputFile,
    outputPath,
    manifest,
    duration,
  };
}
