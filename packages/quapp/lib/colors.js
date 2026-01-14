/**
 * Terminal color utilities
 */

let noColor = false;

/**
 * Initialize color settings
 * @param {boolean} disabled - Force disable colors
 */
export function initColors(disabled = false) {
  noColor = disabled || process.env.NO_COLOR !== undefined || !process.stdout.isTTY;
}

const wrap = (text, code) => (noColor ? text : `\x1b[${code}m${text}\x1b[0m`);

// Basic colors
export const red = (text) => wrap(text, '31');
export const green = (text) => wrap(text, '32');
export const yellow = (text) => wrap(text, '33');
export const blue = (text) => wrap(text, '34');
export const cyan = (text) => wrap(text, '36');
export const gray = (text) => wrap(text, '90');

// Bold variants
export const bold = (text) => wrap(text, '1');
export const boldBlue = (text) => wrap(text, '1;34');
export const boldGreen = (text) => wrap(text, '1;32');
export const boldRed = (text) => wrap(text, '1;31');
export const boldYellow = (text) => wrap(text, '1;33');

// Dim
export const dim = (text) => wrap(text, '2');
