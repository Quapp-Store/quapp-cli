/**
 * Git operations for project scaffolding
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Check if git is available in PATH
 * @returns {boolean}
 */
export function isGitAvailable() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize a git repository in the given directory
 * @param {string} dir - Directory path
 * @returns {Object} Result with success status and optional error
 */
export function initRepository(dir) {
  if (!isGitAvailable()) {
    return {
      success: false,
      error: 'Git is not installed',
      hint: 'Download Git from: https://git-scm.com/download',
    };
  }

  try {
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    
    // Create initial .gitignore if it doesn't exist
    const gitignorePath = path.join(dir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const defaultGitignore = [
        'node_modules',
        'dist',
        'dist.qpp',
        '.env',
        '.env.local',
        '*.log',
        '.DS_Store',
        'Thumbs.db',
      ].join('\n');
      fs.writeFileSync(gitignorePath, defaultGitignore + '\n');
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: 'Failed to initialize git repository',
      details: err.message,
    };
  }
}

/**
 * Check if directory is inside a git repository
 * @param {string} dir
 * @returns {boolean}
 */
export function isInsideGitRepo(dir) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}
