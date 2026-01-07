# Monorepo

This is a Turborepo monorepo using Bun workspaces.

## Structure

- `apps/*` - Deployable applications
  - `apps/web` - Next.js web application (port 3000)
  - `apps/api` - Express API application (port 5000)
- `packages/*` - Shared libraries and configurations
  - `packages/typescript-config` - Shared TypeScript configurations
  - `packages/eslint-config` - Shared ESLint configurations
  - `packages/shared` - Shared constants and types

## Getting Started

Install dependencies:

```bash
bun install
```

Run development (both apps):

```bash
bun run dev
```

This will start:
- `apps/web` on http://localhost:3000
- `apps/api` on http://localhost:5000

Run a specific app:

```bash
cd apps/web && bun run dev
# or
cd apps/api && bun run dev
```

Build all packages and apps:

```bash
bun run build
```

Build only packages:

```bash
bun run build:pkg
```

## Scripts

All apps and packages expose the same script contract:
- `build` - Build the package/app
- `dev` - Run in development mode
- `start` - Start the production server
- `lint` - Lint the code
- `typecheck` - Type check the code
- `test` - Run tests
- `clean` - Clean build artifacts

Run scripts across the monorepo:

```bash
bun run <script>  # Runs via turbo
```

## Shared Configs

- `@my-scope/typescript-config` - TypeScript configurations
  - `base.json` - Base TypeScript config
  - `next.json` - Next.js TypeScript config
  - `react-library.json` - React library TypeScript config
- `@my-scope/eslint-config` - ESLint configurations
  - `base.js` - Base ESLint config
  - `next.js` - Next.js ESLint config

## Apps

### apps/web
Next.js web application with App Router. Default port: 3000

### apps/api
Express API application with health-style routes. Default port: 5000
- Health check endpoint: http://localhost:5000/health
- Ready check endpoint: http://localhost:5000/ready

## Docker (apps/api)

Build the API image from the repo root:

```bash
docker build -f apps/api/Dockerfile -t business-os-api .
```

Run the container:

```bash
docker run -p 5000:5000 business-os-api
```
