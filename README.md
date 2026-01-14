# Quapp CLI 🚀

**Quapp** is a developer-friendly CLI toolkit for building modern web applications that can be packaged and distributed through the Quapp Store.

## Packages

This monorepo contains two packages:

| Package | Description |
|---------|-------------|
| [`create-quapp`](./packages/create-quapp) | Scaffold new Quapp projects |
| [`quapp`](./packages/quapp) | Development server & build tools |

## Quick Start

```bash
# Create a new project
npm create quapp my-app

# Or with all options
npm create quapp my-app --template react-ts --git --install

# Navigate to project
cd my-app

# Start development server
npm run dev

# Build for production
npm run build:qpp
```

## Features

- ⚡ **Fast scaffolding** - Create projects with React, Vue, Solid, or Vanilla JS
- 📱 **LAN QR code** - Test on mobile devices instantly
- 📦 **One-command build** - Creates production-ready `.qpp` packages
- 🤖 **AI-friendly** - Full CLI flag support for automation
- 🎨 **Multiple frameworks** - React, Vue, Solid, Vanilla (JS & TypeScript)

## CLI Usage

### Creating a Project

```bash
# Interactive mode
npm create quapp

# With options (AI-friendly)
npm create quapp my-app --template react-ts --git --install --yes

# JSON output for automation
npm create quapp my-app -t react-ts -g -i -y --json
```

**Available templates:**
- React: `react`, `react-ts`, `react+swc`, `react-ts+swc`
- Vue: `vue`, `vue-ts`
- Solid: `solid-js`, `solid-ts`
- Vanilla: `vanilla-js`, `vanilla-ts`

### Development Server

```bash
# Start dev server with QR code
quapp serve

# Custom port
quapp serve --port 3000

# Open browser
quapp serve --open
```

### Building for Production

```bash
# Build and create .qpp
quapp build

# Non-interactive mode
quapp build --skip-prompts --json
```

## Configuration

Create `quapp.config.json` in your project:

```json
{
  "server": {
    "port": 5173,
    "qr": true,
    "network": "private",
    "openBrowser": false
  },
  "build": {
    "outDir": "dist",
    "outputFile": "dist.qpp"
  }
}
```

## AI/Automation Support

Both CLI tools support non-interactive mode with JSON output:

```bash
# Create project without prompts
npm create quapp my-app -t react-ts --git --install --yes --json

# Build without prompts
quapp build --skip-prompts --json
```

Output format:
```json
{
  "success": true,
  "projectName": "my-app",
  "template": "react-ts",
  "gitInitialized": true,
  "dependenciesInstalled": true
}
```

## Flags Reference

### create-quapp

| Flag | Short | Description |
|------|-------|-------------|
| `--template` | `-t` | Template to use |
| `--force` | `-f` | Overwrite existing directory |
| `--git` | `-g` | Initialize git repository |
| `--install` | `-i` | Install dependencies |
| `--yes` | `-y` | Skip prompts, use defaults |
| `--pm` | | Package manager (npm, yarn, pnpm, bun) |
| `--json` | | JSON output |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

### quapp

| Flag | Short | Description |
|------|-------|-------------|
| `--port` | `-p` | Server port |
| `--open` | | Open browser |
| `--no-qr` | | Disable QR code |
| `--output` | `-o` | Output filename |
| `--skip-prompts` | | Non-interactive mode |
| `--json` | | JSON output |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Template/Build error |
| 4 | Configuration error |
| 5 | Missing dependency |
| 130 | User cancelled |

## Requirements

- Node.js >= 18.0.0
- Git (for `--git` flag and template cloning)

## License

MIT
