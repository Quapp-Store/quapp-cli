/**
 * Serve command - Start development server with LAN access
 */

import { spawn } from 'child_process';
import os from 'os';
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

  logger.debug(`Starting Vite on ${serverConfig.host}:${serverConfig.port}`);

  // Build Vite arguments
  const viteArgs = [
    'vite',
    '--host', serverConfig.host,
    '--port', String(serverConfig.port),
  ];

  if (serverConfig.strictPort || !config.server.autoRetry) {
    viteArgs.push('--strictPort');
  }

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

  let qrShown = false;

  // Build URLs - LAN URL for QR code, localhost for browser
  const protocol = serverConfig.https ? 'https' : 'http';
  const lanUrl = `${protocol}://${serverConfig.host}:${serverConfig.port}`;
  const localUrl = `${protocol}://localhost:${serverConfig.port}`;

  // Function to show QR code and open browser
  const showQRAndOpenBrowser = async () => {
    if (qrShown) return;
    qrShown = true;
    
    // Show access URLs
    logger.newline();
    console.log('  \x1b[1m\x1b[32m✓\x1b[0m \x1b[1mServer running!\x1b[0m');
    logger.newline();
    // console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   ${localUrl}`);
    console.log(`  \x1b[36m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m ${lanUrl}`);
    
    // Show QR code for mobile access
    if (serverConfig.qr) {
      try {
        const qrcode = await import('qrcode-terminal');
        logger.newline();
        console.log('  \x1b[90m📱 Scan to open on mobile:\x1b[0m');
        logger.newline();
        qrcode.default.generate(lanUrl, { small: true });
      } catch (err) {
        // qrcode-terminal not available, skip
        logger.debug(`QR code generation failed: ${err.message}`);
      }
    }
    
    logger.newline();

    // Open browser if requested - use localhost for local browser access
    if (serverConfig.openBrowser) {
      try {
        const open = await import('open');
        await open.default(lanUrl);
      } catch (err) {
        logger.debug(`Failed to open browser: ${err.message}`);
      }
    }
  };

  // Show QR code after Vite has had time to start (simple and reliable)
  setTimeout(showQRAndOpenBrowser, 1500);

  // Handle stdout - just pass through to console
  viteProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  // Handle stderr
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Handle process exit
  return new Promise((resolve) => {
    viteProcess.on('close', (code) => {
      if (code !== 0 && config.server.autoRetry && options._attempt < 10) {
        const nextPort = serverConfig.port + 1;
        logger.warn(`Port ${serverConfig.port} in use. Trying port ${nextPort}...`);
        
        // Retry with next port
        resolve(runServe({
          ...options,
          port: nextPort,
          _attempt: (options._attempt || 0) + 1,
        }));
      } else if (code !== 0) {
        resolve({
          success: false,
          error: `Vite exited with code ${code}`,
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
      logger.error(`Failed to start Vite: ${err.message}`);
      resolve({
        success: false,
        error: err.message,
        exitCode: EXIT_CODES.GENERAL_ERROR,
      });
    });
  });
}
