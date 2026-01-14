/**
 * Structured logging with JSON output support
 */

import * as colors from './colors.js';

let jsonMode = false;
let verboseMode = false;
let logs = [];

/**
 * Initialize logger
 * @param {Object} options
 */
export function initLogger({ json = false, verbose = false } = {}) {
  jsonMode = json;
  verboseMode = verbose;
  logs = [];
}

export function isJsonMode() {
  return jsonMode;
}

export function info(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'info', message, ...data, timestamp: Date.now() });
  } else {
    console.log(message);
  }
}

export function success(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'success', message, ...data, timestamp: Date.now() });
  } else {
    console.log(colors.green(`✔ ${message}`));
  }
}

export function warn(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'warn', message, ...data, timestamp: Date.now() });
  } else {
    console.log(colors.yellow(`⚠ ${message}`));
  }
}

export function error(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'error', message, ...data, timestamp: Date.now() });
  } else {
    console.error(colors.red(`✖ ${message}`));
  }
}

export function debug(message, data = {}) {
  if (jsonMode && verboseMode) {
    logs.push({ level: 'debug', message, ...data, timestamp: Date.now() });
  } else if (verboseMode) {
    console.log(colors.gray(`[debug] ${message}`));
  }
}

export function step(emoji, message) {
  if (jsonMode) {
    logs.push({ level: 'step', message, timestamp: Date.now() });
  } else {
    console.log(`${emoji} ${message}`);
  }
}

export function newline() {
  if (!jsonMode) console.log();
}

export function outputJson(result) {
  if (jsonMode) {
    console.log(JSON.stringify({
      ...result,
      logs: verboseMode ? logs : undefined,
    }, null, 2));
  }
}
