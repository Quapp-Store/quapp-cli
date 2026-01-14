# quapp

Development CLI for Quapp projects - start a dev server with LAN QR code and build `.qpp` packages.

## Installation

```bash
npm install -D quapp
```

## Commands

### `quapp init`

Initialize Quapp in an existing project. Creates config and adds scripts.

```bash
quapp init [options]
```

**Options:**
| Flag | Short | Description |
|------|-------|-------------|
| `--yes` | `-y` | Skip confirmation prompt |
| `--force` | `-f` | Overwrite existing config/scripts |
| `--dry-run` | | Preview changes without applying |

### `quapp serve`

Start development server with LAN access and QR code for mobile testing.

```bash
quapp serve [options]
```

**Options:**
| Flag | Short | Description |
|------|-------|-------------|
| `--port <port>` | `-p` | Port to run on (default: 5173) |
| `--host <host>` | | Host to bind to |
| `--open` | | Open browser automatically |
| `--no-qr` | | Disable QR code display |
| `--https` | | Enable HTTPS |

### `quapp build`

Build for production and create `.qpp` package.

```bash
quapp build [options]
```

**Options:**
| Flag | Short | Description |
|------|-------|-------------|
| `--output <file>` | `-o` | Output filename (default: dist.qpp) |
| `--no-clean` | | Keep dist folder after build |
| `--skip-prompts` | | Skip interactive prompts |

## Global Options

| Flag | Short | Description |
|------|-------|-------------|
| `--json` | | Output as JSON (for automation/AI) |
| `--no-color` | | Disable colored output |
| `--verbose` | | Show detailed logs |
| `--version` | `-v` | Show version |
| `--help` | `-h` | Show help |

## Configuration

Create `quapp.config.json` in your project root:

```json
{
  "server": {
    "port": 5173,
    "qr": true,
    "network": "private",
    "openBrowser": false,
    "https": false,
    "fallbackPort": true,
    "autoRetry": true,
    "strictPort": false
  },
  "build": {
    "outDir": "dist",
    "outputFile": "dist.qpp"
  }
}
```

## Examples

```bash
# Initialize Quapp in existing project
quapp init

# Initialize without prompts (AI-friendly)
quapp init --yes --json

# Start dev server
quapp serve

# Start on specific port
quapp serve -p 3000

# Start and open browser
quapp serve --open

# Build for production
quapp build

# Build with custom output name
quapp build -o my-app.qpp

# Build with JSON output (AI-friendly)
quapp build --json --skip-prompts
```

## AI/Automation Usage

For non-interactive environments:

```bash
# Initialize without prompts
quapp init --yes --json

# Preview init changes
quapp init --dry-run --json

# Build without prompts
quapp build --skip-prompts --json

# Build with custom output
quapp build -o myapp.qpp --skip-prompts --json
```

### JSON Output Examples

Init success:
```json
{
  "success": true,
  "changes": ["quapp.config.json", "script:dev", "script:qbuild", "devDependency:quapp"],
  "nextSteps": ["npm install", "npm run dev"]
}
```

Build success:
```json
{
  "success": true,
  "outputFile": "dist.qpp",
  "outputPath": "/path/to/project/dist.qpp",
  "manifest": {
    "package_name": "com.author.myapp",
    "version": "1.0.0",
    "version_code": 10000
  },
  "duration": 5230
}
```

Error (with suggestion for AI):
```json
{
  "success": false,
  "errorCode": "NO_BUILD_SCRIPT",
  "error": "No build script",
  "suggestion": "Add to package.json: \"scripts\": { \"build\": \"vite build\" }"
}
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Build failed |
| 4 | Configuration error |
| 5 | Missing dependency |
| 130 | User cancelled |

## Requirements

- Node.js >= 18.0.0
- Vite (in your project's dependencies)

## License

MIT
