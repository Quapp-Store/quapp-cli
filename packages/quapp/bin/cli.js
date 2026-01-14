#!/usr/bin/env node

/**
 * quapp CLI - Development and build tools for Quapp projects
 * 
 * Commands:
 *   quapp serve  - Start development server with LAN access
 *   quapp build  - Build for production and create .qpp package
 */

import { parseArgs, getHelpText, getVersion } from '../lib/args.js';
import { initColors } from '../lib/colors.js';
import * as logger from '../lib/logger.js';
import { EXIT_CODES } from '../lib/constants.js';
import { runServe } from '../commands/serve.js';
import { runBuild } from '../commands/build.js';
import { runInit } from '../commands/init.js';

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  // Parse arguments
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

  // Initialize colors
  initColors(args.noColor);

  // Initialize logger
  logger.initLogger({ json: args.json, verbose: args.verbose });

  // Check for argument errors
  if (args.errors.length > 0) {
    for (const err of args.errors) {
      logger.error(err);
    }
    if (args.json) {
      logger.outputJson({ success: false, errors: args.errors });
    }
    process.exit(EXIT_CODES.INVALID_ARGS);
  }

  // Handle missing command
  if (!args.command) {
    console.log(getHelpText());
    process.exit(EXIT_CODES.SUCCESS);
  }

  // Route to command
  let result;

  switch (args.command) {
    case 'serve':
      result = await runServe({
        port: args.port,
        host: args.host,
        qr: args.qr,
        open: args.open,
        https: args.https,
        extra: args.extra,
        _attempt: 0,
      });
      break;

    case 'build':
      result = await runBuild({
        output: args.output,
        clean: args.clean,
        skipPrompts: args.skipPrompts,
      });
      break;

    case 'init':
      result = await runInit({
        force: args.force,
        yes: args.yes,
        dryRun: args.dryRun,
        skipPrompts: args.skipPrompts,
      });
      break;

    default:
      logger.error(`Unknown command: ${args.command}`);
      logger.info('Run "quapp --help" for available commands');
      
      if (args.json) {
        logger.outputJson({ success: false, error: `Unknown command: ${args.command}` });
      }
      process.exit(EXIT_CODES.INVALID_ARGS);
  }

  // Output JSON result if requested
  if (args.json && result) {
    logger.outputJson(result);
  }

  // Exit with appropriate code
  process.exit(result?.success ? EXIT_CODES.SUCCESS : (result?.exitCode || EXIT_CODES.GENERAL_ERROR));
}

// ============================================================================
// Run
// ============================================================================

main().catch((err) => {
  console.error(`\x1b[31m✖ Unexpected error: ${err.message}\x1b[0m`);
  
  if (process.argv.includes('--verbose')) {
    console.error(err.stack);
  }
  
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      success: false,
      error: err.message,
      stack: process.argv.includes('--verbose') ? err.stack : undefined,
    }, null, 2));
  }
  
  process.exit(EXIT_CODES.GENERAL_ERROR);
});
