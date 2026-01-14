/**
 * Structured logging with JSON output support for AI/automation
 */

import * as colors from './colors.js';

let jsonMode = false;
let verboseMode = false;
let logs = [];

/**
 * Initialize logger settings
 * @param {Object} options
 * @param {boolean} options.json - Enable JSON output mode
 * @param {boolean} options.verbose - Enable verbose logging
 */
export function initLogger({ json = false, verbose = false } = {}) {
  jsonMode = json;
  verboseMode = verbose;
  logs = [];
}

/**
 * Check if JSON mode is enabled
 * @returns {boolean}
 */
export function isJsonMode() {
  return jsonMode;
}

/**
 * Log info message
 * @param {string} message
 * @param {Object} data - Optional structured data for JSON mode
 */
export function info(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'info', message, ...data, timestamp: Date.now() });
  } else {
    console.log(message);
  }
}

/**
 * Log success message with green checkmark
 * @param {string} message
 * @param {Object} data
 */
export function success(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'success', message, ...data, timestamp: Date.now() });
  } else {
    console.log(colors.green(`✔ ${message}`));
  }
}

/**
 * Log warning message with yellow indicator
 * @param {string} message
 * @param {Object} data
 */
export function warn(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'warn', message, ...data, timestamp: Date.now() });
  } else {
    console.log(colors.yellow(`⚠ ${message}`));
  }
}

/**
 * Log error message with red indicator
 * @param {string} message
 * @param {Object} data
 */
export function error(message, data = {}) {
  if (jsonMode) {
    logs.push({ level: 'error', message, ...data, timestamp: Date.now() });
  } else {
    console.error(colors.red(`✖ ${message}`));
  }
}

/**
 * Log verbose/debug message (only shown in verbose mode)
 * @param {string} message
 * @param {Object} data
 */
export function debug(message, data = {}) {
  if (jsonMode) {
    if (verboseMode) {
      logs.push({ level: 'debug', message, ...data, timestamp: Date.now() });
    }
  } else if (verboseMode) {
    console.log(colors.gray(`[debug] ${message}`));
  }
}

/**
 * Log a step in the process
 * @param {number} step - Step number
 * @param {string} message
 */
export function step(stepNum, message) {
  if (jsonMode) {
    logs.push({ level: 'step', step: stepNum, message, timestamp: Date.now() });
  } else {
    console.log(colors.cyan(`\n[${stepNum}] ${message}`));
  }
}

/**
 * Print blank line (ignored in JSON mode)
 */
export function newline() {
  if (!jsonMode) {
    console.log();
  }
}

/**
 * Print header/banner (ignored in JSON mode)
 * @param {string} text
 */
export function banner(text) {
  if (!jsonMode) {
    console.log(colors.boldBlue(`\n  ${text}\n`));
  }
}

/**
 * Output final JSON result
 * @param {Object} result - Final result object
 */
export function outputJson(result) {
  if (jsonMode) {
    console.log(JSON.stringify({
      ...result,
      logs: verboseMode ? logs : undefined,
    }, null, 2));
  }
}

/**
 * Print next steps instructions (ignored in JSON mode)
 * @param {string[]} steps
 */
export function nextSteps(steps) {
  if (!jsonMode) {
    console.log(colors.yellow('\nNext steps:\n'));
    steps.forEach((s) => console.log(colors.boldBlue(`  ${s}`)));
    console.log();
  }
}
