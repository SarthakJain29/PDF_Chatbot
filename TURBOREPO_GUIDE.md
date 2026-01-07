# Turborepo Explained - Beginner's Guide

## What is Turborepo?

Turborepo is a **build system** for monorepos (multiple projects in one repository). Think of it as a smart task runner that:
- Runs tasks (like `build`, `dev`, `lint`) across multiple projects
- **Caches** results so it doesn't redo work unnecessarily
- Runs tasks in the **correct order** (dependencies first)
- Runs tasks in **parallel** when possible

---

## Key Concepts Explained

### 1. **Bun Workspaces Configured**

**What it means:**
- **Workspaces** = A way to organize multiple packages/apps in one repo
- **Bun** = A fast JavaScript package manager (alternative to npm/yarn)
- **Configured** = Set up so Bun knows where to find your packages

**Why it matters:**
```
Your repo structure:
├── apps/
│   ├── web-app/          ← One app
│   └── api-server/       ← Another app
└── packages/
    ├── shared-ui/        ← Shared code
    └── utils/            ← Shared utilities
```

Bun workspaces let you:
- Install dependencies once at the root
- Share code between apps easily
- Run commands across all packages

**In your setup:**
```json
"workspaces": ["apps/*", "packages/*"]
```
This tells Bun: "Look for packages in `apps/` and `packages/` folders"

---

### 2. **Turbo Pipeline with Caching and Task Dependencies**

**What it means:**
- **Pipeline** = A defined set of tasks and their relationships
- **Caching** = Saving build results so you don't rebuild if nothing changed
- **Task Dependencies** = "Run this task BEFORE that task"

**Why it matters:**

#### Task Dependencies (`dependsOn`)
```
Example: Your web-app needs shared-ui to be built first

turbo.json says:
"build": {
  "dependsOn": ["^build"]  ← "^" means "build dependencies first"
}
```

**What happens:**
1. Turbo sees you want to build `web-app`
2. It checks: "Does web-app depend on shared-ui?"
3. If yes: Build `shared-ui` FIRST
4. Then build `web-app`

**The `^` symbol:**
- `"dependsOn": ["^build"]` = Build all dependencies first
- `"dependsOn": ["build"]` = Build this package's own build task first

#### Caching
```
First time you run: bun run build
→ Turbo builds everything (takes 2 minutes)
→ Turbo saves results to cache

Second time you run: bun run build
→ Turbo checks: "Did any files change?"
→ If no changes: Uses cached results (takes 2 seconds!)
→ If changes: Rebuilds only what changed
```

**Cache outputs:**
```json
"outputs": [".dist/**", ".next/**"]
```
This tells Turbo: "These folders contain the build results - cache them!"

---

### 3. **Consistent Script Contract Across All Workspaces**

**What it means:**
- **Script contract** = Every package/app has the same script names
- **Consistent** = Same names everywhere

**Why it matters:**

Every `package.json` in your monorepo should have:
```json
{
  "scripts": {
    "build": "...",
    "dev": "...",
    "start": "...",
    "lint": "...",
    "typecheck": "...",
    "clean": "..."
  }
}
```

**Benefits:**
- Run `bun run build` from root → builds EVERYTHING
- Turbo knows what to run without guessing
- Easy to remember commands

**Example:**
```bash
# From root, build everything
bun run build

# Turbo automatically:
# 1. Finds all packages with "build" script
# 2. Runs them in correct order
# 3. Caches results
```

---

### 4. **Shared TypeScript and ESLint Configs**

**What it means:**
- **Shared configs** = One configuration file used by multiple projects
- **TypeScript config** = Rules for how TypeScript compiles your code
- **ESLint config** = Rules for code quality/style

**Why it matters:**

**Without shared configs:**
```
apps/web-app/tsconfig.json      ← Different rules
apps/api-server/tsconfig.json   ← Different rules
packages/utils/tsconfig.json    ← Different rules
```
→ Inconsistent code, hard to maintain

**With shared configs:**
```
packages/typescript-config/base.json  ← One source of truth
apps/web-app/tsconfig.json           ← Extends base.json
apps/api-server/tsconfig.json        ← Extends base.json
packages/utils/tsconfig.json         ← Extends base.json
```
→ Consistent rules everywhere, easy to update

**How it works:**
```json
// apps/web-app/tsconfig.json
{
  "extends": "@my-scope/typescript-config/next.json"
}
```
Instead of copying config, you **extend** the shared one.

---

### 5. **.env as a Global Dependency for Cache Invalidation**

**What it means:**
- **.env file** = Environment variables (API keys, database URLs, etc.)
- **Global dependency** = A file that affects ALL packages
- **Cache invalidation** = "Clear cache when this file changes"

**Why it matters:**

```json
// turbo.json
"globalDependencies": [".env"]
```

**The problem:**
```
1. You build your app → Turbo caches it
2. You change .env (new API key)
3. You run build again
4. Without globalDependencies: Turbo uses OLD cache (wrong API key!)
5. With globalDependencies: Turbo sees .env changed → rebuilds everything
```

**Real example:**
```
.env file contains:
API_KEY=old_key_123

You build → cache saved

You change .env:
API_KEY=new_key_456

You build again:
→ Turbo checks: "Did .env change?" 
→ Yes! → Invalidates cache → Rebuilds everything
→ Now your app uses new_key_456 ✅
```

---

### 6. **Output Directories Configured (.dist/, .next/)**

**What it means:**
- **Output directories** = Where build results go
- **.dist/** = Compiled library code
- **.next/** = Next.js build output
- **Configured** = Turbo knows to cache these folders

**Why it matters:**

**Different project types output to different places:**
```
packages/shared-ui/
  → Builds to: .dist/          ← Library output

apps/web-app/ (Next.js)
  → Builds to: .next/           ← Next.js output

apps/api-server/
  → Builds to: .dist/           ← Compiled server code
```

**In turbo.json:**
```json
"build": {
  "outputs": [".dist/**", ".next/**", "!.next/cache/**"]
}
```

**What this does:**
- `.dist/**` = Cache everything in .dist folders
- `.next/**` = Cache everything in .next folders
- `!.next/cache/**` = DON'T cache Next.js cache (it's temporary)

**Why cache outputs?**
```
Without caching outputs:
→ Build takes 2 minutes every time

With caching outputs:
→ First build: 2 minutes (saves to cache)
→ Second build: 2 seconds (uses cache)
→ Only rebuilds if source files changed
```

---

## Common Turbo.json Patterns Explained

### `"cache": false`
```json
"dev": { "cache": false, "persistent": true }
```
**Why:** Dev servers are running processes, not build outputs. No point caching them.

### `"persistent": true`
```json
"dev": { "persistent": true }
```
**Why:** Dev servers run forever (until you stop them). Turbo knows not to wait for them to "finish."

### `"dependsOn": ["^build"]`
```json
"build": { "dependsOn": ["^build"] }
```
**Why:** 
- `^` = Dependencies (packages this one depends on)
- Ensures dependencies are built first

### `"dependsOn": ["build"]`
```json
"test": { "dependsOn": ["build"] }
```
**Why:** Run this package's own build before running tests.

---

## Real-World Example

**Scenario:** You have a monorepo with:
- `packages/shared-ui` (React component library)
- `apps/web-app` (Next.js app that uses shared-ui)

**What happens when you run `bun run build`:**

1. **Turbo analyzes:**
   - `web-app` depends on `shared-ui`
   - `shared-ui` has no dependencies

2. **Turbo builds in order:**
   ```
   Step 1: Build shared-ui → Outputs to packages/shared-ui/.dist/
   Step 2: Build web-app → Outputs to apps/web-app/.next/
   ```

3. **Turbo caches:**
   - Saves `.dist/` and `.next/` folders
   - Remembers which files were used

4. **Next time you run `bun run build`:**
   - Turbo checks: "Did any source files change?"
   - If `shared-ui` didn't change → Uses cached `.dist/`
   - If `web-app` didn't change → Uses cached `.next/`
   - Only rebuilds what changed!

---

## Quick Reference

| Term | Simple Meaning |
|------|----------------|
| **Workspace** | A package/app in your monorepo |
| **Pipeline** | The set of tasks and their relationships |
| **Cache** | Saved build results to avoid rebuilding |
| **Task Dependency** | "Run this task before that task" |
| **Output** | The built/compiled files |
| **Global Dependency** | A file that affects all packages |
| **Script Contract** | Same script names across all packages |

---

## Tips for Beginners

1. **Start simple:** Add one app, get it working, then add more
2. **Check cache:** Run `bun run build` twice - second time should be instant
3. **Watch the logs:** Turbo shows what it's caching and why
4. **Consistent scripts:** Always use the same script names everywhere
5. **Test locally:** Make a change, see if Turbo rebuilds correctly

---

## Common Commands

```bash
# Build everything
bun run build

# Build only packages (not apps)
bun run build:pkg

# Run dev servers
bun run dev

# Lint everything
bun run lint

# Type check everything
bun run typecheck

# Clean all build artifacts
bun run clean
```

---

## Troubleshooting

**"Why isn't Turbo using my cache?"**
- Check if source files changed
- Check if `.env` changed (if it's a global dependency)
- Check if outputs are configured correctly

**"Why is Turbo rebuilding everything?"**
- A global dependency changed
- Output configuration changed
- Cache was cleared

**"How do I clear the cache?"**
```bash
bun run clean  # Removes .turbo folder
```
