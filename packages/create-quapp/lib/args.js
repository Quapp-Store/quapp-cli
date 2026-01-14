/**
 * Argument parsing for create-quapp CLI
 * Lightweight parser without external dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ALL_TEMPLATES, DEFAULTS } from './constants.js';
import { isValidManager } from './package-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get package version from package.json
 * @returns {string}
 */
export function getVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Generate help text
 * @returns {string}
 */
export function getHelpText() {
  return `
\x1b[1m\x1b[34mcreate-quapp\x1b[0m - Scaffold a new Quapp project

\x1b[1mUsage:\x1b[0m
  npm create quapp [project-name] [options]
  npx create-quapp [project-name] [options]

\x1b[1mArguments:\x1b[0m
  project-name          Name of the project directory to create

\x1b[1mOptions:\x1b[0m
  -t, --template <name> Template to use (react, react-ts, vue, vue-ts, etc.)
  -a, --author <name>   Author name (for package.json and manifest)
  -d, --description <text> Project description
  -f, --force           Overwrite existing directory
  -g, --git             Initialize a git repository
  -i, --install         Install dependencies after scaffolding
  -y, --yes             Skip prompts and use defaults
  --dry-run             Preview what would be created (no changes made)
  --no-color            Disable colored output
  --no-git              Skip git initialization
  --no-install          Skip dependency installation
  --pm <manager>        Package manager (npm, yarn, pnpm, bun)
  --json                Output as JSON (for AI/automation)
  --verbose             Show detailed logs
  -v, --version         Show version
  -h, --help            Show help

\x1b[1mAvailable Templates:\x1b[0m
  react                 React with JavaScript
  react-ts              React with TypeScript
  react+swc             React with JavaScript + SWC
  react-ts+swc          React with TypeScript + SWC
  vue                   Vue with JavaScript
  vue-ts                Vue with TypeScript
  vanilla-js            Vanilla JavaScript
  vanilla-ts            Vanilla TypeScript
  solid-js              Solid.js with JavaScript
  solid-ts              Solid.js with TypeScript

\x1b[1mExamples:\x1b[0m
  \x1b[36m# Interactive mode\x1b[0m
  npm create quapp

  \x1b[36m# Create React TypeScript project\x1b[0m
  npm create quapp my-app --template react-ts

  \x1b[36m# Full automation (AI-friendly)\x1b[0m
  npm create quapp my-app -t react-ts --git --install --yes --json

  \x1b[36m# Use pnpm and skip all prompts\x1b[0m
  npx create-quapp my-app -t vue-ts --pm pnpm -y -i

\x1b[1mLearn more:\x1b[0m
  https://github.com/Quapp-Store/Quapp
`;
}

/**
 * Parse command line arguments
 * @param {string[]} argv - Process arguments (typically process.argv.slice(2))
 * @returns {Object} Parsed arguments
 */
export function parseArgs(argv) {
  const args = {
    // Positional
    projectName: null,
    
    // Flags
    template: null,
    author: null,
    description: null,
    force: false,
    git: undefined, // undefined = ask, true = yes, false = no
    install: undefined, // undefined = ask, true = yes, false = no
    yes: false, // Skip all prompts
    dryRun: false,
    noColor: false,
    packageManager: null,
    json: false,
    verbose: false,
    help: false,
    version: false,
    
    // Errors
    errors: [],
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    // Help
    if (arg === '-h' || arg === '--help') {
      args.help = true;
      i++;
      continue;
    }

    // Version
    if (arg === '-v' || arg === '--version') {
      args.version = true;
      i++;
      continue;
    }

    // Template
    if (arg === '-t' || arg === '--template') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        args.errors.push('--template requires a value');
      } else if (!ALL_TEMPLATES.includes(value)) {
        args.errors.push(`Invalid template: "${value}". Available: ${ALL_TEMPLATES.join(', ')}`);
      } else {
        args.template = value;
      }
      i++;
      continue;
    }

    // Author
    if (arg === '-a' || arg === '--author') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        args.errors.push('--author requires a value');
      } else {
        args.author = value;
      }
      i++;
      continue;
    }

    // Description
    if (arg === '-d' || arg === '--description') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        args.errors.push('--description requires a value');
      } else {
        args.description = value;
      }
      i++;
      continue;
    }

    // Dry run
    if (arg === '--dry-run') {
      args.dryRun = true;
      i++;
      continue;
    }

    // Force
    if (arg === '-f' || arg === '--force') {
      args.force = true;
      i++;
      continue;
    }

    // Git
    if (arg === '-g' || arg === '--git') {
      args.git = true;
      i++;
      continue;
    }
    if (arg === '--no-git') {
      args.git = false;
      i++;
      continue;
    }

    // Install
    if (arg === '-i' || arg === '--install') {
      args.install = true;
      i++;
      continue;
    }
    if (arg === '--no-install') {
      args.install = false;
      i++;
      continue;
    }

    // Yes (skip prompts)
    if (arg === '-y' || arg === '--yes') {
      args.yes = true;
      i++;
      continue;
    }

    // No color
    if (arg === '--no-color') {
      args.noColor = true;
      i++;
      continue;
    }

    // Package manager
    if (arg === '--pm') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) {
        args.errors.push('--pm requires a value (npm, yarn, pnpm, bun)');
      } else if (!isValidManager(value)) {
        args.errors.push(`Invalid package manager: "${value}". Use: npm, yarn, pnpm, or bun`);
      } else {
        args.packageManager = value;
      }
      i++;
      continue;
    }

    // JSON output
    if (arg === '--json') {
      args.json = true;
      i++;
      continue;
    }

    // Verbose
    if (arg === '--verbose') {
      args.verbose = true;
      i++;
      continue;
    }

    // Unknown flag
    if (arg.startsWith('-')) {
      args.errors.push(`Unknown option: ${arg}`);
      i++;
      continue;
    }

    // Positional argument (project name)
    if (!args.projectName) {
      args.projectName = arg;
    } else {
      args.errors.push(`Unexpected argument: ${arg}`);
    }
    i++;
  }

  return args;
}

/**
 * Get effective options combining args with defaults
 * @param {Object} args - Parsed arguments
 * @returns {Object} Effective options
 */
export function getEffectiveOptions(args) {
  const options = {
    name: args.projectName,
    template: args.template || (args.yes ? DEFAULTS.template : null),
    author: args.author,
    description: args.description,
    force: args.force || DEFAULTS.force,
    git: args.git,
    install: args.install,
    dryRun: args.dryRun,
    packageManager: args.packageManager,
    json: args.json,
    verbose: args.verbose,
    noColor: args.noColor,
    interactive: !args.yes,
  };

  // In --yes mode, apply defaults for unspecified options
  if (args.yes) {
    if (options.git === undefined) options.git = DEFAULTS.git;
    if (options.install === undefined) options.install = DEFAULTS.install;
  }

  return options;
}
