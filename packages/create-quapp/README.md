# create-quapp

Scaffold a new Quapp project with your choice of framework.

## Quick Start

```bash
# Interactive mode
npm create quapp

# With project name
npm create quapp my-app

# Full automation (AI-friendly)
npm create quapp my-app -t react-ts -a "Author Name" -d "My app description" --git --install --yes

# Preview without creating (dry run)
npm create quapp my-app -t react-ts --dry-run
```

## Usage

```bash
npm create quapp [project-name] [options]
npx create-quapp [project-name] [options]
```

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--template <name>` | `-t` | Template to use (see below) |
| `--author <name>` | `-a` | Author name (for package.json) |
| `--description <text>` | `-d` | Project description |
| `--force` | `-f` | Overwrite existing directory |
| `--git` | `-g` | Initialize git repository |
| `--install` | `-i` | Install dependencies |
| `--yes` | `-y` | Skip prompts, use defaults |
| `--dry-run` | | Preview what would be created (no changes) |
| `--no-git` | | Skip git initialization |
| `--no-install` | | Skip dependency installation |
| `--pm <manager>` | | Package manager (npm, yarn, pnpm, bun) |
| `--json` | | Output as JSON (for AI/automation) |
| `--no-color` | | Disable colored output |
| `--verbose` | | Show detailed logs |
| `--version` | `-v` | Show version |
| `--help` | `-h` | Show help |

## Available Templates

### React
- `react` - React with JavaScript
- `react-ts` - React with TypeScript
- `react+swc` - React with JavaScript + SWC
- `react-ts+swc` - React with TypeScript + SWC

### Vue
- `vue` - Vue with JavaScript
- `vue-ts` - Vue with TypeScript

### Vanilla
- `vanilla-js` - Vanilla JavaScript
- `vanilla-ts` - Vanilla TypeScript

### Solid
- `solid-js` - Solid.js with JavaScript
- `solid-ts` - Solid.js with TypeScript

## Examples

```bash
# Interactive mode - prompts for all options
npm create quapp

# Create React TypeScript project
npm create quapp my-app -t react-ts

# Create Vue project with git and dependencies
npm create quapp my-vue-app -t vue --git --install

# Full automation for CI/CD or AI
npm create quapp my-app -t react-ts -g -i -y --json

# Use pnpm as package manager
npx create-quapp my-app -t solid-ts --pm pnpm -y -i

# Overwrite existing directory
npm create quapp existing-project -t react --force
```

## AI/Automation Usage

For non-interactive environments (CI/CD, AI assistants), use the `--yes` flag with required options:

```bash
# Minimal automation
npm create quapp my-app --template react --yes

# Full automation with JSON output  
npm create quapp my-app -t react-ts -a "Dev Name" -d "My project" --git --install --yes --json

# Dry run to preview (validates without creating)
npm create quapp my-app -t react-ts --dry-run --json
```

### JSON Output

Success output:
```json
{
  "success": true,
  "projectName": "my-app",
  "projectPath": "/path/to/my-app",
  "template": "react-ts",
  "framework": "react",
  "author": "Dev Name",
  "description": "My project",
  "packageManager": "npm",
  "gitInitialized": true,
  "dependenciesInstalled": true,
  "nextSteps": ["cd my-app", "npm run dev"]
}
```

Dry run output:
```json
{
  "success": true,
  "dryRun": true,
  "wouldCreate": {
    "projectName": "my-app",
    "projectPath": "/path/to/my-app",
    "template": "react-ts",
    "framework": "react",
    "author": "Dev Name",
    "description": "My project",
    "gitInit": true,
    "installDeps": true
  }
}
```

Error output (includes suggestion for AI to fix):
```json
{
  "success": false,
  "errorCode": "MISSING_TEMPLATE",
  "error": "Template is required",
  "suggestion": "Add template: --template react-ts"
}
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Template not found |
| 4 | Git error |
| 5 | Network error |
| 130 | User cancelled (Ctrl+C) |

## License

MIT
