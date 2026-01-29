# quapp

Dev server and build tool for Quapp projects. Serves your app over LAN with a QR code for mobile testing, and packages production builds as `.qpp` files.

## Quick Start

If you scaffolded with `create-quapp`, run the pre-configured scripts:

```bash
npm run dev      # Start dev server
npm run qbuild   # Build .qpp package
```

## Installation

For existing Vite projects:

```bash
npm install -D quapp
```

Initialize configuration and scripts:

```bash
npx quapp init
```

## Commands

### `quapp serve`

Starts Vite dev server with LAN network access and QR code.

```bash
npx quapp serve
```

| Flag | Description |
|------|-------------|
| `-p, --port <port>` | Server port (default: 5173) |
| `--host <host>` | Host to bind |
| `--open` | Open in browser |
| `--no-qr` | Disable QR code |
| `--https` | Enable HTTPS |

### `quapp build`

Builds for production and creates `.qpp` package.

```bash
npx quapp build
```

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Output filename (default: dist.qpp) |
| `--skip-prompts` | Non-interactive mode |
| `--no-clean` | Keep dist folder |

### `quapp init`

Initialize Quapp in an existing Vite project.

```bash
npx quapp init
```

| Flag | Description |
|------|-------------|
| `-y, --yes` | Skip prompts |
| `-f, --force` | Overwrite existing config |
| `--dry-run` | Preview changes |

## Configuration

`quapp.config.json`:

```json
{
  "server": {
    "port": 5173,
    "qr": true,
    "openBrowser": false
  },
  "build": {
    "outputFile": "dist.qpp"
  }
}
```

## Global Options

| Flag | Description |
|------|-------------|
| `--json` | JSON output for automation |
| `--verbose` | Detailed logging |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Automation

For CI/CD or programmatic usage:

```bash
npx quapp build --skip-prompts --json
```

```json
{
  "success": true,
  "outputFile": "dist.qpp",
  "outputPath": "/path/to/dist.qpp",
  "duration": 1234
}
```

## Requirements

- Node.js 18+
- Vite project

## Related

- [create-quapp](https://www.npmjs.com/package/create-quapp) — Project scaffolding

## License

MIT
