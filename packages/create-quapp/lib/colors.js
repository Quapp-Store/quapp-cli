/**
 * Terminal color utilities with --no-color support
 */

let noColor = false;

/**
 * Initialize color settings based on CLI flags and environment
 * @param {boolean} disabled - Force disable colors
 */
export function initColors(disabled = false) {
  noColor = disabled || process.env.NO_COLOR !== undefined || !process.stdout.isTTY;
}

/**
 * Wrap text with ANSI color code
 * @param {string} text - Text to colorize
 * @param {string} code - ANSI color code
 * @returns {string} Colorized text or plain text if colors disabled
 */
const wrap = (text, code) => (noColor ? text : `\x1b[${code}m${text}\x1b[0m`);

// Basic colors
export const red = (text) => wrap(text, '31');
export const green = (text) => wrap(text, '32');
export const yellow = (text) => wrap(text, '33');
export const blue = (text) => wrap(text, '34');
export const magenta = (text) => wrap(text, '35');
export const cyan = (text) => wrap(text, '36');
export const gray = (text) => wrap(text, '90');

// Bold variants
export const bold = (text) => wrap(text, '1');
export const boldRed = (text) => wrap(text, '1;31');
export const boldGreen = (text) => wrap(text, '1;32');
export const boldYellow = (text) => wrap(text, '1;33');
export const boldBlue = (text) => wrap(text, '1;34');
export const boldCyan = (text) => wrap(text, '1;36');

// Dim text
export const dim = (text) => wrap(text, '2');
