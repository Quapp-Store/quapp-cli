/**
 * Interactive prompts for project setup
 */

import prompts from 'prompts';
import { TEMPLATES, FRAMEWORKS } from './constants.js';
import { validateProjectName } from './templates.js';
import { isGitAvailable } from './git.js';
import * as colors from './colors.js';

// Track if user cancelled via Ctrl+C or Escape
let cancelled = false;

/**
 * Setup handlers for Escape and Ctrl+C
 * @param {Function} onCancel - Callback when user cancels
 */
export function setupCancelHandlers(onCancel) {
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    cancelled = true;
    onCancel('SIGINT');
  });

  // Configure prompts to handle cancellation
  prompts.override({ onCancel: () => { cancelled = true; } });
}

/**
 * Check if user cancelled
 * @returns {boolean}
 */
export function wasCancelled() {
  return cancelled;
}

/**
 * Prompt for project name
 * @returns {Promise<string|null>}
 */
export async function askProjectName() {
  const response = await prompts({
    type: 'text',
    name: 'name',
    message: 'Project name:',
    validate: (value) => {
      const result = validateProjectName(value);
      return result.valid ? true : result.error;
    },
  });

  if (!response.name) return null;
  return response.name.trim();
}

/**
 * Prompt for framework selection
 * @returns {Promise<string|null>}
 */
export async function askFramework() {
  const response = await prompts({
    type: 'select',
    name: 'framework',
    message: 'Select a framework:',
    choices: FRAMEWORKS.map((f) => ({
      title: f.display,
      value: f.name,
    })),
    initial: 0,
  });

  return response.framework || null;
}

/**
 * Prompt for template variant within a framework
 * @param {string} framework
 * @returns {Promise<string|null>}
 */
export async function askTemplate(framework) {
  const templates = TEMPLATES[framework];
  if (!templates || templates.length === 0) return null;

  // If only one template, return it directly
  if (templates.length === 1) return templates[0];

  const response = await prompts({
    type: 'select',
    name: 'template',
    message: 'Select a variant:',
    choices: templates.map((t) => ({
      title: formatTemplateName(t),
      value: t,
    })),
    initial: 0,
  });

  return response.template || null;
}

/**
 * Prompt for git initialization
 * @returns {Promise<boolean>}
 */
export async function askGitInit() {
  if (!isGitAvailable()) {
    return false;
  }

  const response = await prompts({
    type: 'confirm',
    name: 'git',
    message: 'Initialize a git repository?',
    initial: false,
  });

  return response.git ?? false;
}

/**
 * Prompt for dependency installation
 * @param {string} packageManager - Name of package manager to use
 * @returns {Promise<boolean>}
 */
export async function askInstallDeps(packageManager = 'npm') {
  const response = await prompts({
    type: 'confirm',
    name: 'install',
    message: `Install dependencies with ${packageManager}?`,
    initial: true,
  });

  return response.install ?? false;
}

/**
 * Format template name for display
 * @param {string} template
 * @returns {string}
 */
function formatTemplateName(template) {
  // Format: react-ts+swc -> TypeScript + SWC
  const parts = [];
  
  if (template.includes('-ts')) {
    parts.push('TypeScript');
  } else if (template.includes('-js') || template === 'vanilla-js') {
    parts.push('JavaScript');
  } else if (!template.includes('ts') && !template.includes('js')) {
    parts.push('JavaScript'); // default
  }

  if (template.includes('+swc')) {
    parts.push('SWC');
  }

  return parts.length > 0 ? parts.join(' + ') : template;
}

/**
 * Run all prompts for project setup (interactive mode)
 * @param {Object} defaults - Pre-filled values to skip prompts
 * @returns {Promise<Object|null>} All answers or null if cancelled
 */
export async function runAllPrompts(defaults = {}) {
  const result = {};

  // Project name
  if (!defaults.name) {
    result.name = await askProjectName();
    if (!result.name) return null;
  } else {
    result.name = defaults.name;
  }

  // Framework and template
  if (!defaults.template) {
    result.framework = await askFramework();
    if (!result.framework) return null;

    result.template = await askTemplate(result.framework);
    if (!result.template) return null;
  } else {
    result.template = defaults.template;
  }

  // Git initialization
  if (defaults.git === undefined) {
    result.git = await askGitInit();
  } else {
    result.git = defaults.git;
  }

  // Install dependencies
  if (defaults.install === undefined) {
    result.install = await askInstallDeps(defaults.packageManager || 'npm');
  } else {
    result.install = defaults.install;
  }

  return result;
}
