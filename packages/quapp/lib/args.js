/**
 * Argument parsing for quapp CLI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get package version
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
\x1b[1m\x1b[34mquapp\x1b[0m - Quapp development CLI

\x1b[1mUsage:\x1b[0m
  quapp <command> [options]

\x1b[1mCommands:\x1b[0m
  serve               Start development server with LAN access
  build               Build for production and create .qpp package
  init                Initialize Quapp in an existing project

\x1b[1mGlobal Options:\x1b[0m
  --no-color          Disable colored output
  --json              Output result as JSON (for automation/AI)
  --verbose           Show detailed logs
  -v, --version       Show version number
  -h, --help          Show this help message

\x1b[1mServe Options:\x1b[0m
  -p, --port <port>   Port to run server on (default: 5173)
  --host <host>       Host to bind to (default: auto-detected LAN IP)
  --no-qr             Disable QR code display
  --open              Open browser automatically
  --https             Enable HTTPS

\x1b[1mBuild Options:\x1b[0m
  -o, --output <file> Output file name (default: dist.qpp)
  --no-clean          Keep dist folder after compression
  --skip-prompts      Skip interactive prompts (use package.json as-is)

\x1b[1mInit Options:\x1b[0m
  -y, --yes           Skip confirmation prompt
  -f, --force         Overwrite existing config/scripts
  --dry-run           Preview changes without applying

\x1b[1mExamples:\x1b[0m
  \x1b[36m# Initialize Quapp in existing project\x1b[0m
  quapp init

  \x1b[36m# Initialize without prompts (AI-friendly)\x1b[0m
  quapp init --yes --json

  \x1b[36m# Start dev server\x1b[0m
  quapp serve

  \x1b[36m# Start on specific port\x1b[0m
  quapp serve --port 3000

  \x1b[36m# Build for production\x1b[0m
  quapp build

  \x1b[36m# Build to custom output (AI-friendly)\x1b[0m
  quapp build -o myapp.qpp --json --skip-prompts

\x1b[1mConfiguration:\x1b[0m
  Create quapp.config.json in your project root to customize defaults:

  {
    "server": {
      "port": 5173,
      "qr": true,
      "network": "private",
      "openBrowser": false
    },
    "build": {
      "outDir": "dist",
      "outputFile": "dist.qpp"
    }
  }

\x1b[1mLearn more:\x1b[0m
  https://github.com/Quapp-Store/Quapp
`;
}

/**
 * Validate command-specific flags
 * @param {Object} args - Parsed arguments
 */
function validateCommandFlags(args) {
  if (!args.command) return;

  // Check serve-specific flags
  if (args.command !== 'serve') {
    if (args.port !== null) args.errors.push(`Flag "--port" is only valid for "serve" command`);
    if (args.host !== null) args.errors.push(`Flag "--host" is only valid for "serve" command`);
    if (args.qr === false) args.errors.push(`Flag "--no-qr" is only valid for "serve" command`);
    if (args.open === true) args.errors.push(`Flag "--open" is only valid for "serve" command`);
    if (args.https === true) args.errors.push(`Flag "--https" is only valid for "serve" command`);
  }

  // Check build-specific flags
  if (args.command !== 'build') {
    if (args.output !== null) args.errors.push(`Flag "--output" is only valid for "build" command`);
    if (args.clean === false) args.errors.push(`Flag "--no-clean" is only valid for "build" command`);
    if (args.skipPrompts === true) args.errors.push(`Flag "--skip-prompts" is only valid for "build" command`);
  }

  // Check init-specific flags
  if (args.command !== 'init') {
    if (args.yes === true) args.errors.push(`Flag "--yes" is only valid for "init" command`);
    if (args.force === true) args.errors.push(`Flag "--force" is only valid for "init" command`);
    if (args.dryRun === true) args.errors.push(`Flag "--dry-run" is only valid for "init" command`);
  }
}

/**
 * Parse command line arguments
 * @param {string[]} argv
 * @returns {Object}
 */
export function parseArgs(argv) {
  const args = {
    command: null,
    
    // Global flags
    help: false,
    version: false,
    json: false,
    verbose: false,
    noColor: false,
    
    // Serve options
    port: null,
    host: null,
    qr: true,
    open: false,
    https: false,
    
    // Build options
    output: null,
    clean: true,
    skipPrompts: false,
    
    // Init options
    yes: false,
    force: false,
    dryRun: false,
    
    // Extra args to forward
    extra: [],
    
    // Errors
    errors: [],
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    // Commands
    if (!args.command && (arg === 'serve' || arg === 'build' || arg === 'init')) {
      args.command = arg;
      i++;
      continue;
    }

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

    // No color
    if (arg === '--no-color') {
      args.noColor = true;
      i++;
      continue;
    }

    // Port
    if (arg === '-p' || arg === '--port') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        args.errors.push(`Flag "--port" requires a value`);
        i++;
        continue;
      }
      i++; // Move past the flag to the value
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        args.errors.push(`Invalid port: "${value}". Must be 1-65535`);
      } else {
        args.port = port;
      }
      i++;
      continue;
    }

    // Host
    if (arg === '--host') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        args.errors.push(`Flag "--host" requires a value`);
        i++;
        continue;
      }
      i++; // Move past the flag to the value
      args.host = value;
      i++;
      continue;
    }

    // QR
    if (arg === '--no-qr') {
      args.qr = false;
      i++;
      continue;
    }

    // Open browser
    if (arg === '--open') {
      args.open = true;
      i++;
      continue;
    }

    // HTTPS
    if (arg === '--https') {
      args.https = true;
      i++;
      continue;
    }

    // Output file
    if (arg === '-o' || arg === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        args.errors.push(`Flag "--output" requires a value`);
        i++;
        continue;
      }
      i++; // Move past the flag to the value
      args.output = value;
      i++;
      continue;
    }

    // No clean
    if (arg === '--no-clean') {
      args.clean = false;
      i++;
      continue;
    }

    // Skip prompts
    if (arg === '--skip-prompts') {
      args.skipPrompts = true;
      i++;
      continue;
    }

    // Yes (skip confirmation)
    if (arg === '-y' || arg === '--yes') {
      args.yes = true;
      i++;
      continue;
    }

    // Force
    if (arg === '-f' || arg === '--force') {
      args.force = true;
      i++;
      continue;
    }

    // Dry run
    if (arg === '--dry-run') {
      args.dryRun = true;
      i++;
      continue;
    }

    // Unknown flag
    if (arg.startsWith('-')) {
      // Check if it's a known invalid flag for current command
      if (args.command) {
        args.errors.push(`Unknown flag: "${arg}". Run "quapp ${args.command} --help" for available options`);
      } else {
        args.errors.push(`Unknown flag: "${arg}". Run "quapp --help" for available commands`);
      }
      i++;
      continue;
    }

    // Unknown positional
    if (args.command) {
      args.errors.push(`Unexpected argument: "${arg}". Run "quapp ${args.command} --help" for usage`);
    } else {
      args.errors.push(`Unknown command: "${arg}". Run "quapp --help" for available commands`);
    }
    i++;
  }

  // Validate command-specific flags
  validateCommandFlags(args);

  return args;
}
