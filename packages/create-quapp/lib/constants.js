/**
 * Constants and defaults for create-quapp CLI
 */

// Exit codes following Unix conventions
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  TEMPLATE_NOT_FOUND: 3,
  GIT_ERROR: 4,
  NETWORK_ERROR: 5,
  USER_CANCELLED: 130, // Standard for Ctrl+C
};

// Available templates organized by framework
export const TEMPLATES = {
  react: ['react', 'react-ts', 'react+swc', 'react-ts+swc'],
  vue: ['vue', 'vue-ts'],
  vanilla: ['vanilla-js', 'vanilla-ts'],
  solid: ['solid-js', 'solid-ts'],
};

// All templates flattened for validation
export const ALL_TEMPLATES = Object.values(TEMPLATES).flat();

// Framework display names for prompts
export const FRAMEWORKS = [
  { name: 'react', display: 'React' },
  { name: 'vue', display: 'Vue' },
  { name: 'vanilla', display: 'Vanilla' },
  { name: 'solid', display: 'Solid' },
];

// Default values for non-interactive mode
export const DEFAULTS = {
  template: 'react',
  git: false,
  install: false,
  force: false,
};

// Template repository base path
export const TEMPLATE_REPO = 'Quapp-Store/Quapp/packages/templates';
