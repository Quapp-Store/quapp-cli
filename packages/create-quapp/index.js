#!/usr/bin/env node

/**
 * create-quapp - Scaffold a new Quapp project
 * 
 * Supports both interactive and non-interactive (AI-friendly) modes.
 * Use --json for machine-readable output.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Local modules
import { parseArgs, getHelpText, getVersion, getEffectiveOptions } from './lib/args.js';
import { initColors } from './lib/colors.js';
import * as logger from './lib/logger.js';
import { EXIT_CODES, DEFAULTS } from './lib/constants.js';
import { detectPackageManager } from './lib/package-manager.js';
import { isGitAvailable, initRepository } from './lib/git.js';
import { 
  validateTemplate, 
  validateProjectName, 
  cloneTemplate, 
  updatePackageJson,
  getFrameworkFromTemplate 
} from './lib/templates.js';
import { runAllPrompts, setupCancelHandlers } from './lib/prompts.js';

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const startTime = Date.now();
  
  // Parse command line arguments
  const args = parseArgs(process.argv.slice(2));

  // Handle --help
  if (args.help) {
    console.log(getHelpText());
    process.exit(EXIT_CODES.SUCCESS);
  }

  // Handle --version
  if (args.version) {
    console.log(getVersion());
    process.exit(EXIT_CODES.SUCCESS);
  }

  // Initialize colors (respects --no-color)
  initColors(args.noColor);

  // Initialize logger (respects --json and --verbose)
  logger.initLogger({ json: args.json, verbose: args.verbose });

  // Check for argument parsing errors
  if (args.errors.length > 0) {
    for (const err of args.errors) {
      logger.error(err);
    }
    if (args.json) {
      logger.outputJson({ success: false, errors: args.errors });
    }
    process.exit(EXIT_CODES.INVALID_ARGS);
  }

  // Get effective options (combines args with defaults)
  const options = getEffectiveOptions(args);

  // Setup cancel handlers
  setupCancelHandlers((signal) => {
    logger.newline();
    logger.warn(`Setup cancelled (${signal})`);
    if (args.json) {
      logger.outputJson({ success: false, cancelled: true, signal });
    }
    process.exit(EXIT_CODES.USER_CANCELLED);
  });

  // Run the scaffolding
  const result = await scaffold(options);

  // Output final result
  const duration = Date.now() - startTime;
  
  if (args.json) {
    logger.outputJson({
      success: result.success,
      ...result,
      duration,
    });
  }

  process.exit(result.success ? EXIT_CODES.SUCCESS : result.exitCode || EXIT_CODES.GENERAL_ERROR);
}

// ============================================================================
// Scaffolding Logic
// ============================================================================

async function scaffold(options) {
  let config = { ...options };
  
  // -------------------------------------------------------------------------
  // Step 1: Detect package manager EARLY (needed for prompts)
  // -------------------------------------------------------------------------
  
  const pm = detectPackageManager({ preferred: options.packageManager });
  config.packageManager = pm.name;
  
  logger.debug(`Using package manager: ${pm.name}`);
  
  // -------------------------------------------------------------------------
  // Step 2: Gather configuration (interactive or from flags)
  // -------------------------------------------------------------------------
  
  if (options.interactive && (!options.name || !options.template)) {
    // Show welcome banner in interactive mode
    logger.banner('Welcome to Quapp!');
    
    // Run interactive prompts for missing values
    const answers = await runAllPrompts({
      name: options.name,
      template: options.template,
      git: options.git,
      install: options.install,
      packageManager: pm.name, // Pass detected package manager to prompts
    });

    if (!answers) {
      logger.warn('Setup cancelled');
      return { success: false, cancelled: true, exitCode: EXIT_CODES.USER_CANCELLED };
    }

    config = { ...config, ...answers };
  }

  // Validate we have required values
  if (!config.name) {
    logger.error('Project name is required');
    logger.info('Usage: npm create quapp <project-name> [options]');
    return { 
      success: false, 
      errorCode: 'MISSING_NAME',
      error: 'Project name is required', 
      suggestion: 'Add project name: create-quapp my-app',
      exitCode: EXIT_CODES.INVALID_ARGS 
    };
  }

  if (!config.template) {
    logger.error('Template is required');
    logger.info(`Use --template <name> or run in interactive mode`);
    return { 
      success: false, 
      errorCode: 'MISSING_TEMPLATE',
      error: 'Template is required', 
      suggestion: `Add template: --template react-ts`,
      availableTemplates: ['react', 'react-ts', 'vue', 'vue-ts', 'vanilla-js', 'vanilla-ts', 'solid-js', 'solid-ts', 'react+swc', 'react-ts+swc'],
      exitCode: EXIT_CODES.INVALID_ARGS 
    };
  }

  // Validate project name
  const nameValidation = validateProjectName(config.name);
  if (!nameValidation.valid) {
    logger.error(nameValidation.error);
    return { 
      success: false, 
      errorCode: 'INVALID_NAME',
      error: nameValidation.error, 
      suggestion: 'Use only letters, numbers, hyphens, and underscores',
      exitCode: EXIT_CODES.INVALID_ARGS 
    };
  }

  // Validate template
  const templateValidation = validateTemplate(config.template);
  if (!templateValidation.valid) {
    logger.error(templateValidation.error);
    if (templateValidation.hint) logger.info(templateValidation.hint);
    return { 
      success: false, 
      errorCode: 'INVALID_TEMPLATE',
      error: templateValidation.error, 
      suggestion: templateValidation.hint,
      exitCode: EXIT_CODES.TEMPLATE_NOT_FOUND 
    };
  }

  // -------------------------------------------------------------------------
  // Step 3: Setup paths and check directory
  // -------------------------------------------------------------------------
  
  const projectDir = path.resolve(process.cwd(), config.name);
  const projectDirRelative = path.relative(process.cwd(), projectDir) || config.name;
  const framework = getFrameworkFromTemplate(config.template);

  logger.debug(`Target directory: ${projectDir}`);

  // Check if directory exists
  const dirExists = fs.existsSync(projectDir);
  const dirEmpty = dirExists ? fs.readdirSync(projectDir).length === 0 : true;
  
  if (dirExists && !dirEmpty && !config.force) {
    logger.error(`Directory "${config.name}" already exists and is not empty`);
    logger.info('Use --force to overwrite');
    return { 
      success: false, 
      errorCode: 'DIR_NOT_EMPTY',
      error: 'Directory not empty', 
      suggestion: 'Use --force to overwrite or choose a different name',
      exitCode: EXIT_CODES.GENERAL_ERROR 
    };
  }

  // -------------------------------------------------------------------------
  // Handle --dry-run: Preview and exit
  // -------------------------------------------------------------------------
  
  if (options.dryRun) {
    const preview = {
      success: true,
      dryRun: true,
      wouldCreate: {
        projectName: config.name,
        projectPath: projectDir,
        template: config.template,
        framework,
        packageManager: pm.name,
        author: config.author || null,
        description: config.description || null,
        gitInit: config.git === true,
        installDeps: config.install === true,
        overwrite: dirExists && !dirEmpty,
      },
      nextSteps: [
        `cd ${projectDirRelative}`,
        ...(config.install !== true ? [pm.install] : []),
        `${pm.run} dev`,
      ],
    };
    
    if (!logger.isJsonMode()) {
      logger.info('Dry run - no changes made');
      logger.info(`Would create: ${config.name} (${config.template})`);
      logger.info(`Location: ${projectDir}`);
      if (config.author) logger.info(`Author: ${config.author}`);
      if (config.git === true) logger.info('Would initialize git');
      if (config.install === true) logger.info(`Would install with ${pm.name}`);
    }
    
    return preview;
  }

  // -------------------------------------------------------------------------
  // Step 4: Clone template
  // -------------------------------------------------------------------------
  
  if (dirExists && !dirEmpty && config.force) {
    logger.warn(`Overwriting existing directory: ${config.name}`);
  }
  
  logger.info(`Creating project in ${projectDirRelative}...`);
  logger.debug(`Cloning template: ${config.template}`);

  const cloneResult = await cloneTemplate(config.template, projectDir, { force: config.force });
  
  if (!cloneResult.success) {
    logger.error(cloneResult.error);
    if (cloneResult.hint) logger.info(cloneResult.hint);
    
    const exitCode = cloneResult.code === 'GIT_NOT_AVAILABLE' 
      ? EXIT_CODES.GIT_ERROR 
      : EXIT_CODES.NETWORK_ERROR;
    
    return { success: false, error: cloneResult.error, exitCode };
  }

  logger.success('Template cloned');

  // -------------------------------------------------------------------------
  // Step 5: Update package.json
  // -------------------------------------------------------------------------
  
  const pkgUpdates = { name: config.name };
  if (config.author) {
    pkgUpdates.author = config.author;
  }
  if (config.description) {
    pkgUpdates.description = config.description;
  }
  
  const pkgResult = updatePackageJson(projectDir, pkgUpdates);
  
  if (!pkgResult.success) {
    logger.error(pkgResult.error);
    return { success: false, error: pkgResult.error, exitCode: EXIT_CODES.GENERAL_ERROR };
  }

  logger.success('Updated package.json');

  // -------------------------------------------------------------------------
  // Step 6: Initialize git (if requested)
  // -------------------------------------------------------------------------
  
  let gitInitialized = false;
  
  if (config.git === true) {
    const gitResult = initRepository(projectDir);
    
    if (gitResult.success) {
      logger.success('Initialized git repository');
      gitInitialized = true;
    } else {
      logger.warn(`Git initialization failed: ${gitResult.error}`);
      if (gitResult.hint) logger.info(gitResult.hint);
    }
  } else if (config.git === false) {
    logger.debug('Skipping git initialization (--no-git)');
  }

  // -------------------------------------------------------------------------
  // Step 7: Install dependencies (if requested)
  // -------------------------------------------------------------------------
  
  let depsInstalled = false;
  
  if (config.install === true) {
    logger.info(`Installing dependencies with ${pm.name}...`);
    
    try {
      execSync(pm.install, { 
        cwd: projectDir, 
        stdio: logger.isJsonMode() ? 'ignore' : 'inherit' 
      });
      logger.success('Dependencies installed');
      depsInstalled = true;
    } catch (err) {
      logger.warn('Failed to install dependencies');
      logger.info(`Run "${pm.install}" manually in the project directory`);
    }
  } else if (config.install === false) {
    logger.debug('Skipping dependency installation (--no-install)');
  }

  // -------------------------------------------------------------------------
  // Step 8: Done! Show next steps
  // -------------------------------------------------------------------------
  
  // Build next steps
  const steps = [];
  steps.push(`cd ${projectDirRelative}`);
  if (!depsInstalled) steps.push(pm.install);
  steps.push(`${pm.run} dev`);

  if (!logger.isJsonMode()) {
    logger.nextSteps(steps);
  }

  return {
    success: true,
    projectName: config.name,
    projectPath: projectDir,
    template: config.template,
    framework,
    author: config.author || null,
    description: config.description || null,
    packageManager: pm.name,
    gitInitialized,
    dependenciesInstalled: depsInstalled,
    nextSteps: steps,
  };
}

// ============================================================================
// Run
// ============================================================================

main().catch((err) => {
  logger.error(`Unexpected error: ${err.message}`);
  logger.debug(err.stack);
  
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ 
      success: false, 
      error: err.message,
      stack: process.argv.includes('--verbose') ? err.stack : undefined 
    }, null, 2));
  }
  
  process.exit(EXIT_CODES.GENERAL_ERROR);
});
