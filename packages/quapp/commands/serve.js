/**
 * Serve command - Start development server with LAN access
 * 
 * Design: We use --strictPort so Vite exits on port conflicts, allowing us to:
 * 1. Control ALL user-facing messages (no duplicate/conflicting output)
 * 2. Show accurate port information
 * 3. Provide a clean, quapp-branded DX
 */

import { spawn } from 'child_process';
import os from 'os';
import net from 'net';
import * as logger from '../lib/logger.js';
import { loadConfig, checkViteAvailable } from '../lib/config.js';
import { EXIT_CODES } from '../lib/constants.js';

/**
 * Get local IP address for LAN access
 * @param {string} networkType - 'private' for LAN IP, 'local' for localhost
 * @returns {string}
 */
function getIP(networkType = 'private') {
  if (networkType === 'private') {
    const interfaces = os.networkInterfaces();
    for (const key in interfaces) {
      for (const iface of interfaces[key] ?? []) {
        if (!iface.internal && iface.family === 'IPv4') {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @param {string} host - Host to check on
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port, host = 'localhost') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      server.close(); // Clean up even on error to prevent fd leak
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, host);
  });
}

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Port to start searching from
 * @param {string} host - Host to check on
 * @param {number} maxAttempts - Maximum number of ports to try
 * @returns {Promise<{port: number, retries: number}>}
 */
async function findAvailablePort(startPort, host = 'localhost', maxAttempts = 10) {
  let port = startPort;
  let retries = 0;
  
  while (retries < maxAttempts) {
    if (await isPortAvailable(port, host)) {
      return { port, retries };
    }
    logger.info(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
    retries++;
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

/**
 * Run the serve command
 * @param {Object} options - Command options
 * @returns {Promise<Object>} Result
 */
export async function runServe(options = {}) {
  const cwd = process.cwd();
  
  // Load config
  const { config, configError } = loadConfig(cwd);
  
  if (configError) {
    logger.warn(configError);
  }

  // Merge options with config
  const serverConfig = {
    ...config.server,
    port: options.port || config.server.port,
    host: options.host || (config.server.network === 'private' ? getIP('private') : 'localhost'),
    qr: options.qr !== undefined ? options.qr : config.server.qr,
    openBrowser: options.open || config.server.openBrowser,
    https: options.https || config.server.https,
  };

  // Check if Vite is available
  const vite = checkViteAvailable(cwd);
  
  if (!vite.available) {
    logger.error('Vite is not installed');
    logger.info(vite.hint);
    return { success: false, error: 'Vite not found', exitCode: EXIT_CODES.MISSING_DEPENDENCY };
  }

  // Find available port BEFORE starting Vite (if autoRetry is enabled)
  let actualPort = serverConfig.port;
  
  if (config.server.autoRetry && !serverConfig.strictPort) {
    try {
      const { port, retries } = await findAvailablePort(serverConfig.port, serverConfig.host);
      actualPort = port;
    } catch (err) {
      logger.error(err.message);
      return { success: false, error: err.message, exitCode: EXIT_CODES.GENERAL_ERROR };
    }
  }

  logger.debug(`Starting dev server on ${serverConfig.host}:${actualPort}`);

  // Build Vite arguments - always use strictPort since we handle port finding ourselves
  const viteArgs = [
    'vite',
    '--host', serverConfig.host,
    '--port', String(actualPort),
    '--strictPort', // Always strict since we pre-check port availability
  ];

  if (serverConfig.https) {
    viteArgs.push('--https');
  }

  // Add any extra args passed through
  if (options.extra?.length > 0) {
    viteArgs.push(...options.extra);
  }

  // Start Vite process using npx to avoid path issues with spaces
  const viteProcess = spawn('npx', viteArgs, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });

  let serverReady = false;
  let bannerShown = false;
  const protocol = serverConfig.https ? 'https' : 'http';
  const lanUrl = `${protocol}://${serverConfig.host}:${actualPort}`;
  const localUrl = `${protocol}://localhost:${actualPort}`;

  // Function to show our custom banner with QR code
  const showBanner = async () => {
    if (bannerShown) return;
    bannerShown = true;

    logger.newline();
    console.log('  \x1b[1m\x1b[32m✓\x1b[0m \x1b[1mDev server running!\x1b[0m');
    logger.newline();
    // console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   ${localUrl}`);
    // console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m ${lanUrl}`);
    
    // Show QR code for mobile access
    if (serverConfig.qr) {
      try {
        const qrcode = await import('qrcode-terminal');
        logger.newline();
        console.log('  \x1b[90m📱 Scan to open on mobile:\x1b[0m');
        logger.newline();
        qrcode.default.generate(lanUrl, { small: true });
      } catch (err) {
        logger.debug(`QR code generation failed: ${err.message}`);
      }
    }
    
    logger.newline();
    console.log('  \x1b[90mpress h + enter to show help\x1b[0m');
    logger.newline();

    // Open browser if requested
    if (serverConfig.openBrowser) {
      try {
        const open = await import('open');
        await open.default(localUrl);
      } catch (err) {
        logger.debug(`Failed to open browser: ${err.message}`);
      }
    }
  };

  // Handle stdout - filter Vite's startup banner, pass through HMR/other messages
  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Detect when Vite is ready
    if (output.includes('ready in')) {
      serverReady = true;
      // Show our banner instead of Vite's
      showBanner();
      return; // Don't print Vite's ready line
    }
    
    // Filter out Vite's startup banner lines (we show our own)
    // These patterns match Vite's default startup output
    const isStartupBanner = 
      output.includes('VITE v') ||
      output.includes('➜  Local:') ||
      output.includes('➜  Network:') ||
      output.includes('press h + enter') ||
      (output.trim() === '' && !serverReady); // Empty lines before ready
    
    if (isStartupBanner) {
      return; // Suppress Vite's banner
    }
    
    // Pass through all other output (HMR updates, warnings, etc.)
    process.stdout.write(data);
  });

  // Handle stderr - pass through (errors, warnings)
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Handle process exit
  return new Promise((resolve) => {
    viteProcess.on('close', (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: `Dev server exited with code ${code}`,
          exitCode: EXIT_CODES.GENERAL_ERROR,
        });
      } else {
        resolve({
          success: true,
          lanUrl,
          localUrl,
        });
      }
    });

    viteProcess.on('error', (err) => {
      logger.error(`Failed to start dev server: ${err.message}`);
      resolve({
        success: false,
        error: err.message,
        exitCode: EXIT_CODES.GENERAL_ERROR,
      });
    });
  });
}
