/**
 * Template handling - cloning and validation
 */

import fs from 'fs';
import path from 'path';
import { TEMPLATE_REPO, ALL_TEMPLATES, TEMPLATES } from './constants.js';
import * as logger from './logger.js';

/**
 * Validate template name
 * @param {string} template
 * @returns {Object} Validation result
 */
export function validateTemplate(template) {
  if (!template) {
    return { valid: false, error: 'Template name is required' };
  }

  if (!ALL_TEMPLATES.includes(template)) {
    return {
      valid: false,
      error: `Invalid template: "${template}"`,
      hint: `Available templates: ${ALL_TEMPLATES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Get framework name from template
 * @param {string} template
 * @returns {string|null}
 */
export function getFrameworkFromTemplate(template) {
  for (const [framework, templates] of Object.entries(TEMPLATES)) {
    if (templates.includes(template)) {
      return framework;
    }
  }
  return null;
}

/**
 * Clone template to target directory using degit
 * @param {string} template - Template name
 * @param {string} targetDir - Target directory path
 * @param {Object} options
 * @param {boolean} options.force - Overwrite existing directory
 * @returns {Promise<Object>} Clone result
 */
export async function cloneTemplate(template, targetDir, { force = false } = {}) {
  const degit = (await import('degit')).default;
  const repoPath = `${TEMPLATE_REPO}/${template}`;

  try {
    const emitter = degit(repoPath, { cache: false, force });
    await emitter.clone(targetDir);
    return { success: true };
  } catch (err) {
    // Handle specific error cases
    if (err.message.includes('could not find commit hash for HEAD')) {
      return {
        success: false,
        error: 'Git is not available or network error',
        hint: 'Please install Git from: https://git-scm.com/download',
        code: 'GIT_NOT_AVAILABLE',
      };
    }

    if (err.code === 'DEST_NOT_EMPTY') {
      return {
        success: false,
        error: `Directory "${path.basename(targetDir)}" is not empty`,
        hint: 'Use --force to overwrite existing files',
        code: 'DEST_NOT_EMPTY',
      };
    }

    return {
      success: false,
      error: 'Failed to clone template',
      details: err.message,
      code: 'CLONE_FAILED',
    };
  }
}

/**
 * Update package.json in the cloned project
 * @param {string} projectDir
 * @param {Object} updates - Fields to update
 * @returns {Object} Result
 */
export function updatePackageJson(projectDir, updates) {
  const packageJsonPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return {
      success: false,
      error: 'package.json not found in template',
    };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const updated = { ...pkg, ...updates };
    fs.writeFileSync(packageJsonPath, JSON.stringify(updated, null, 2) + '\n');
    return { success: true, package: updated };
  } catch (err) {
    return {
      success: false,
      error: 'Failed to update package.json',
      details: err.message,
    };
  }
}

/**
 * Validate project name for npm/file system compatibility
 * @param {string} name
 * @returns {Object} Validation result
 */
export function validateProjectName(name) {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Project name is required' };
  }

  const trimmed = name.trim();

  // Check for invalid characters
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Project name can only contain letters, numbers, hyphens, and underscores',
    };
  }

  // Check length
  if (trimmed.length > 214) {
    return { valid: false, error: 'Project name is too long (max 214 characters)' };
  }

  // Check for reserved names
  const reserved = ['node_modules', 'favicon.ico', 'package.json'];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: `"${trimmed}" is a reserved name` };
  }

  return { valid: true, name: trimmed };
}
