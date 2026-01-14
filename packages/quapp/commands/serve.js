/**
 * Serve command - Start development server with LAN access
 */

import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { existsSync } from 'fs';
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
 * Wait for Vite to be ready by parsing stdout
 * @param {string} output - Stdout content
 * @returns {Object|null} Server info if ready
 */
function parseViteReady(output) {
  // Vite outputs lines like:
  // "Local:   http://localhost:5173/"
  // "Network: http://192.168.1.100:5173/"
  const localMatch = output.match(/Local:\s+(https?:\/\/[^\s]+)/);
  const networkMatch = output.match(/Network:\s+(https?:\/\/[^\s]+)/);
  
  if (localMatch || networkMatch) {
    return {
      local: localMatch?.[1]?.replace(/\/$/, ''),
      network: networkMatch?.[1]?.replace(/\/$/, ''),
    };
  }
  return null;
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

  let serverInfo = null;
  let qrShown = false;

  // Handle stdout
  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);

    // Check if Vite is ready
    if (!serverInfo) {
      serverInfo = parseViteReady(output);
      
      if (serverInfo && !qrShown) {
        qrShown = true;
        
        // Show QR code after Vite output
        setTimeout(async () => {
          const url = serverInfo.network || serverInfo.local;
          
          if (serverConfig.qr && url) {
            try {
              const qrcode = await import('qrcode-terminal');
              logger.newline();
              logger.step('📱', 'Scan QR code to open on mobile:');
              logger.newline();
              qrcode.default.generate(url, { small: true });
            } catch {
              // qrcode-terminal not available, skip
            }
          }

          // Open browser if requested
          if (serverConfig.openBrowser && serverInfo.local) {
            try {
              const open = await import('open');
              await open.default(serverInfo.local);
            } catch {
              // open not available, skip
            }
          }
        }, 100);
      }
    }
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
          serverInfo,
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
