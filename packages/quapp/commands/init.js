/**
 * Init command - Initialize Quapp in an existing project
 */

import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import * as logger from '../lib/logger.js';
import { EXIT_CODES } from '../lib/constants.js';

/**
 * Default quapp.config.json content
 */
const DEFAULT_QUAPP_CONFIG = {
  server: {
    port: 5173,
    qr: true,
    network: 'private',
    openBrowser: false,
  },
  build: {
    outDir: 'dist',
    outputFile: 'dist.qpp',
  },
};

/**
 * Scripts to add to package.json
 */
const QUAPP_SCRIPTS = {
  'dev': 'quapp serve',
  'qbuild': 'quapp build',
};

/**
 * Run init command
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function runInit(options = {}) {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');
  const configPath = path.join(cwd, 'quapp.config.json');

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    logger.error('No package.json found in current directory');
    logger.info('Run this command in an existing project or use "npm create quapp" to create a new project');
    return {
      success: false,
      errorCode: 'NO_PACKAGE_JSON',
      error: 'No package.json found',
      suggestion: 'Run "npm init" first or use "npm create quapp" for a new project',
      exitCode: EXIT_CODES.CONFIG_ERROR,
    };
  }

  // Load existing package.json
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (err) {
    logger.error('Failed to read package.json');
    return {
      success: false,
      errorCode: 'INVALID_PACKAGE_JSON',
      error: 'Failed to parse package.json',
      exitCode: EXIT_CODES.CONFIG_ERROR,
    };
  }

  // Check if already initialized
  const hasQuappConfig = fs.existsSync(configPath);
  const hasQuappDep = pkg.devDependencies?.quapp || pkg.dependencies?.quapp;
  const hasQuappScripts = pkg.scripts?.dev?.includes('quapp') || pkg.scripts?.qbuild?.includes('quapp');

  if (hasQuappConfig && hasQuappDep && hasQuappScripts && !options.force) {
    logger.info('This project is already initialized with Quapp');
    return {
      success: true,
      alreadyInitialized: true,
      message: 'Project already initialized',
    };
  }

  // Dry run mode
  if (options.dryRun) {
    const changes = {
      createConfig: !hasQuappConfig,
      addScripts: !hasQuappScripts,
      addDependency: !hasQuappDep,
    };

    if (!logger.isJsonMode()) {
      logger.info('Dry run - no changes made');
      if (changes.createConfig) logger.info('Would create: quapp.config.json');
      if (changes.addScripts) logger.info('Would add scripts: dev, qbuild');
      if (changes.addDependency) logger.info('Would add devDependency: quapp');
    }

    return {
      success: true,
      dryRun: true,
      wouldChange: changes,
    };
  }

  // Interactive confirmation (unless --yes)
  if (!options.skipPrompts && !options.yes) {
    const confirm = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: 'Initialize Quapp in this project?',
      initial: true,
    });

    if (!confirm.proceed) {
      logger.warn('Init cancelled');
      return { success: false, cancelled: true, exitCode: EXIT_CODES.USER_CANCELLED };
    }
  }

  const changes = [];

  // Step 1: Create quapp.config.json
  if (!hasQuappConfig || options.force) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_QUAPP_CONFIG, null, 2) + '\n');
      logger.success('Created quapp.config.json');
      changes.push('quapp.config.json');
    } catch (err) {
      logger.error(`Failed to create quapp.config.json: ${err.message}`);
      return {
        success: false,
        error: 'Failed to create config file',
        exitCode: EXIT_CODES.GENERAL_ERROR,
      };
    }
  }

  // Step 2: Add scripts to package.json
  let scriptsAdded = [];
  if (!pkg.scripts) pkg.scripts = {};
  
  for (const [name, command] of Object.entries(QUAPP_SCRIPTS)) {
    if (!pkg.scripts[name] || options.force) {
      pkg.scripts[name] = command;
      scriptsAdded.push(name);
    }
  }

  // Step 3: Add quapp to devDependencies
  let depAdded = false;
  if (!hasQuappDep || options.force) {
    if (!pkg.devDependencies) pkg.devDependencies = {};
    pkg.devDependencies.quapp = '^1.1.0';
    depAdded = true;
  }

  // Step 4: Write updated package.json
  if (scriptsAdded.length > 0 || depAdded) {
    try {
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
      if (scriptsAdded.length > 0) {
        logger.success(`Added scripts: ${scriptsAdded.join(', ')}`);
        changes.push(...scriptsAdded.map(s => `script:${s}`));
      }
      if (depAdded) {
        logger.success('Added quapp to devDependencies');
        changes.push('devDependency:quapp');
      }
    } catch (err) {
      logger.error(`Failed to update package.json: ${err.message}`);
      return {
        success: false,
        error: 'Failed to update package.json',
        exitCode: EXIT_CODES.GENERAL_ERROR,
      };
    }
  }

  // Done!
  logger.newline();
  logger.success('Quapp initialized successfully!');
  
  if (!logger.isJsonMode()) {
    logger.info('');
    logger.info('Next steps:');
    if (depAdded) logger.info('  1. Run "npm install" to install quapp');
    logger.info(`  ${depAdded ? '2' : '1'}. Run "npm run dev" to start the dev server`);
    logger.info(`  ${depAdded ? '3' : '2'}. Run "npm run qbuild" to create a .qpp package`);
  }

  return {
    success: true,
    changes,
    nextSteps: depAdded
      ? ['npm install', 'npm run dev', 'npm run qbuild']
      : ['npm run dev', 'npm run qbuild'],
  };
}
