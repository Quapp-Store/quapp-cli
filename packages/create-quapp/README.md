# create-quapp

Scaffolding tool for Quapp projects.

## Usage

```bash
npm create quapp@latest
```

```bash
yarn create quapp
```

```bash
pnpm create quapp
```

```bash
bun create quapp
```

Then follow the prompts.

You can also specify the project name and template directly:

```bash
npm create quapp@latest my-app -- --template react
```

## Templates

| JavaScript | TypeScript |
|------------|------------|
| `vanilla-js` | `vanilla-ts` |
| `react` | `react-ts` |
| `react+swc` | `react-ts+swc` |
| `vue` | `vue-ts` |
| `solid-js` | `solid-ts` |

## Options

| Flag | Description |
|------|-------------|
| `-t, --template <name>` | Project template |
| `-a, --author <name>` | Author name |
| `-d, --description <text>` | Project description |
| `-g, --git` | Initialize git repository |
| `-i, --install` | Install dependencies |
| `-y, --yes` | Skip prompts, use defaults |
| `-f, --force` | Overwrite existing directory |
| `--pm <manager>` | Package manager (npm/yarn/pnpm/bun) |
| `--dry-run` | Preview without creating |

## Scaffolded Project

The generated project includes:

- [quapp](https://www.npmjs.com/package/quapp) dev dependency
- `npm run dev` — Start dev server with mobile QR code
- `npm run qbuild` — Build `.qpp` package
- `quapp.config.json` — Quapp configuration
- Vite build setup

## Example

```bash
# Create React TypeScript project
npm create quapp@latest my-app -- --template react-ts

cd my-app
npm install
npm run dev
```

## Automation

For CI/CD or programmatic usage:

```bash
npm create quapp@latest my-app -- -t react -y --json
```

JSON output:

```json
{
  "success": true,
  "projectName": "my-app",
  "projectPath": "/path/to/my-app",
  "template": "react",
  "nextSteps": ["cd my-app", "npm install", "npm run dev"]
}
```

## Related

- [quapp](https://www.npmjs.com/package/quapp) — Dev server and build CLI

## License

MIT
