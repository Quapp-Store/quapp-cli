/**
 * Configuration loading and validation for quapp
 */

import fs from 'fs';
import path from 'path';
import { DEFAULT_SERVER_CONFIG } from './constants.js';

/**
 * Load quapp.config.json from project root
 * @param {string} cwd - Current working directory
 * @returns {Object} Merged configuration
 */
export function loadConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, 'quapp.config.json');
  
  let userConfig = {};
  let configLoaded = false;
  let configError = null;

  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      userConfig = JSON.parse(data);
      configLoaded = true;
    } catch (err) {
      configError = `Invalid quapp.config.json: ${err.message}`;
    }
  }

  // Merge with defaults
  const config = {
    server: {
      ...DEFAULT_SERVER_CONFIG,
      ...(userConfig.server || {}),
    },
    build: {
      outDir: 'dist',
      outputFile: 'dist.qpp',
      ...(userConfig.build || {}),
    },
  };

  return {
    config,
    configLoaded,
    configError,
    configPath,
  };
}

/**
 * Load and validate package.json
 * @param {string} cwd - Current working directory
 * @returns {Object} Package data and validation result
 */
export function loadPackageJson(cwd = process.cwd()) {
  const packagePath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packagePath)) {
    return {
      success: false,
      error: 'package.json not found. Are you in a Quapp project directory?',
    };
  }

  try {
    const data = fs.readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(data);
    
    // Validate required fields
    const missing = [];
    if (!pkg.name || pkg.name.trim() === '') missing.push('name');
    if (!pkg.version || pkg.version.trim() === '') missing.push('version');

    return {
      success: true,
      package: pkg,
      path: packagePath,
      missingFields: missing,
    };
  } catch (err) {
    return {
      success: false,
      error: `Invalid package.json: ${err.message}`,
    };
  }
}

/**
 * Update package.json with new values
 * @param {string} cwd - Current working directory
 * @param {Object} updates - Fields to update
 * @returns {Object} Result
 */
export function updatePackageJson(cwd, updates) {
  const { success, package: pkg, path: packagePath, error } = loadPackageJson(cwd);
  
  if (!success) {
    return { success: false, error };
  }

  try {
    const updated = { ...pkg, ...updates };
    fs.writeFileSync(packagePath, JSON.stringify(updated, null, 2) + '\n');
    return { success: true, package: updated };
  } catch (err) {
    return { success: false, error: `Failed to update package.json: ${err.message}` };
  }
}

/**
 * Check if Vite is available in the project
 * @param {string} cwd - Current working directory
 * @returns {Object} Vite availability info
 */
export function checkViteAvailable(cwd = process.cwd()) {
  const viteBin = path.join(cwd, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
  const viteExists = fs.existsSync(viteBin);

  return {
    available: viteExists,
    path: viteBin,
    hint: viteExists ? null : 'Run "npm install" to install dependencies first.',
  };
}

/**
 * Check if project has a build script
 * @param {Object} pkg - Package.json content
 * @returns {boolean}
 */
export function hasBuildScript(pkg) {
  return pkg?.scripts?.build !== undefined;
}
