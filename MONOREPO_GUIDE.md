# Monorepo Package Manager Guide

## Current Setup

Your monorepo uses **Bun workspaces** at the root level (`packageManager: "bun@1.1.13"`), with mixed runtimes:

- **Root**: Bun workspaces (package manager)
- **Frontend app**: Bun (package manager) + Node.js (runtime)
- **Worker app**: Bun (package manager + runtime)
- **Future API servers**: Bun (package manager + runtime)
- **Packages**: Bun (package manager)

**Key Concept**: Bun is used for **package management** across the entire monorepo, but individual apps can use different **runtimes** (Node.js or Bun) based on their needs.

## Creating New Apps

### Option 1: Node.js Runtime App (e.g., Next.js Frontend)

For apps that need Node.js runtime (like your frontend):

1. **Create the app directory:**

   ```bash
   mkdir apps/my-next-app
   cd apps/my-next-app
   ```

2. **Initialize with Bun:**

   ```bash
   bun init -y
   ```

3. **Update `package.json`:**
   - Set `"name"` to your app name (e.g., `"my-next-app"`)
   - Add `"private": true`
   - Add your scripts (e.g., `"dev": "next dev"`, `"build": "next build"`)
   - Add dependencies

4. **Install dependencies:**

   ```bash
   # From root - Bun handles workspace linking
   bun install
   ```

5. **Add to Turbo tasks** (if needed):
   - The app will automatically be picked up by Turbo if it has matching scripts
   - Ensure scripts match Turbo task names: `dev`, `build`, `lint`, `check-types`

**Note**: Even though you use Bun for package management, the app runs on Node.js at runtime (e.g., `next dev` uses Node.js).

### Option 2: Bun Runtime App (For worker/API servers)

For apps that use Bun as both package manager and runtime:

1. **Create the app directory:**

   ```bash
   mkdir apps/my-api-server
   cd apps/my-api-server
   ```

2. **Initialize with Bun:**

   ```bash
   bun init -y
   ```

3. **Update `package.json`:**

   ```json
   {
     "name": "my-api-server",
     "module": "index.ts",
     "type": "module",
     "private": true,
     "scripts": {
       "dev": "bun --watch index.ts",
       "start": "bun index.ts",
       "build": "bun build index.ts --outdir ./dist"
     },
     "devDependencies": {
       "@types/bun": "latest"
     },
     "dependencies": {
       // your dependencies
     }
   }
   ```

4. **Install dependencies:**

   ```bash
   # From root
   bun install
   ```

5. **Run the app:**

   ```bash
   # Development
   bun run dev

   # Production
   bun run start
   ```

## Creating New Packages

1. **Create the package directory:**

   ```bash
   mkdir packages/my-new-package
   cd packages/my-new-package
   ```

2. **Initialize with Bun:**

   ```bash
   bun init -y
   ```

3. **Update `package.json`:**

   ```json
   {
     "name": "my-new-package",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "main": "./index.ts",
     "exports": {
       ".": "./index.ts"
     },
     "dependencies": {
       // your dependencies
     },
     "devDependencies": {
       // dev dependencies
     }
   }
   ```

4. **Create your package files:**
   - `index.ts` (or `index.js`)
   - `tsconfig.json` (if TypeScript)
   - Any other source files

5. **Install dependencies:**

   ```bash
   # From root
   bun install
   ```

6. **Use in other packages/apps:**

   **Option A: Using `workspace:*` (Recommended for Bun)**

   ```json
   {
     "dependencies": {
       "my-new-package": "workspace:*"
     }
   }
   ```

   **Option B: Using `file:` protocol (Also works, current approach)**

   ```json
   {
     "dependencies": {
       "my-new-package": "file:../../packages/my-new-package"
     }
   }
   ```

   **Note**: Both approaches work with Bun. `workspace:*` is Bun's recommended native approach, while `file:` is more universal and works with npm/pnpm/yarn as well. Your current `file:` references will continue to work perfectly.

## Package Manager vs Runtime

### Bun as Package Manager (Always)

- ✅ **Root workspace management** (always use Bun)
- ✅ **Installing dependencies** (`bun install` from root)
- ✅ **Running Turbo commands** (`bun run dev`, `bun run build`)
- ✅ **All packages** (shared libraries, types, configs)
- ✅ **All apps** (dependency management)

### Runtime Options

**Node.js Runtime** (for frontend/Next.js):

- ✅ Use when you need Node.js ecosystem compatibility
- ✅ Next.js, Express with Node, etc.
- ✅ Example: `"dev": "next dev"` (runs on Node.js)

**Bun Runtime** (for workers/API servers):

- ✅ Use when you want Bun's performance and features
- ✅ Worker services, API servers, background jobs
- ✅ Example: `"dev": "bun --watch index.ts"` (runs on Bun)

### Important Notes:

1. **Dependency Management**: Always use `bun install` from the root to manage dependencies across the workspace. This ensures proper linking between packages.

2. **Mixed Runtimes**: Your frontend uses Bun for package management but Node.js at runtime. Your worker uses Bun for both. This is perfectly fine - Bun handles workspace linking, and each app chooses its runtime.

3. **TypeScript**: Bun has built-in TypeScript support, so you don't need separate compilation steps for Bun runtime apps.

4. **Workspace Linking**: Bun automatically handles workspace package linking. You can use either:
   - `workspace:*` (Bun's recommended native approach)
   - `file:../../packages/package-name` (universal, works with all package managers)

   Both work identically - Bun resolves them to the local workspace packages when you run `bun install` from the root.

## Quick Reference Commands

```bash
# Install all dependencies (from root)
bun install

# Add dependency to specific app/package
cd apps/my-app
bun add some-package

# Or from root with workspace filter
bun add some-package --workspace=apps/my-app

# Add dev dependency
bun add -d some-dev-package --workspace=apps/my-app

# Remove dependency
bun remove some-package --workspace=apps/my-app

# Run dev for all apps
bun run dev

# Run dev for specific app
bun run dev -- --filter=my-app

# Build all
bun run build

# Type check all
bun run check-types

# Lint all
bun run lint
```

## Example: Creating a New Next.js App

```bash
# 1. Create app
mkdir apps/my-next-app
cd apps/my-next-app

# 2. Initialize with Bun
bun init -y

# 3. Install Next.js dependencies
bun add next react react-dom

# 4. Update package.json
# Add scripts: "dev": "next dev", "build": "next build", etc.

# 5. Install from root (links workspace packages)
cd ../..
bun install
```

**Note**: This app uses Bun for package management, but `next dev` runs on Node.js at runtime.

## Example: Creating a New Bun API Server

```bash
# 1. Create app
mkdir apps/my-api-server
cd apps/my-api-server

# 2. Initialize with Bun
bun init -y

# 3. Install dependencies
bun add express
bun add -d @types/bun @types/express

# 4. Create index.ts
cat > index.ts << 'EOF'
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Bun!' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
EOF

# 5. Update package.json scripts
# "dev": "bun --watch index.ts"
# "start": "bun index.ts"

# 6. Install from root
cd ../..
bun install
```

## Example: Creating a Shared Utility Package

```bash
# 1. Create package
mkdir packages/utils
cd packages/utils

# 2. Initialize with Bun
bun init -y

# 3. Create index.ts
echo 'export const myUtil = () => {};' > index.ts

# 4. Update package.json with proper exports

# 5. Install from root
cd ../..
bun install

# 6. Use in app
cd apps/frontend
# Add to package.json: "utils": "file:../../packages/utils"
bun install
```

## Runtime Decision Guide

### Use Node.js Runtime When:

- Building Next.js applications
- Using Node.js-specific packages that don't work with Bun
- Need maximum ecosystem compatibility
- Deploying to platforms optimized for Node.js

### Use Bun Runtime When:

- Building API servers or workers
- Want faster startup times
- Need built-in TypeScript support without compilation
- Building background job processors
- Want to leverage Bun's performance benefits

## Workspace Package References

### Current Setup (Works Fine!)

Your current setup uses `file:` protocol:

```json
{
  "dependencies": {
    "db": "file:../../packages/db",
    "types": "file:../../packages/types"
  }
}
```

**This will continue to work perfectly** with Bun. No changes needed!

### Optional: Migrate to `workspace:*` (Bun Native)

If you want to use Bun's recommended approach, you can optionally migrate to `workspace:*`:

```json
{
  "dependencies": {
    "db": "workspace:*",
    "types": "workspace:*"
  }
}
```

**Benefits of `workspace:*`:**

- Bun's native workspace protocol
- Cleaner syntax (no relative paths)
- Automatically resolves to workspace packages
- Works identically to `file:` protocol

**Migration is optional** - your current `file:` references work perfectly fine!

### Import Statements (No Changes Needed)

Your import statements don't need to change at all. Whether you use `file:` or `workspace:*`, you import the same way:

```typescript
// Both work identically
import db from "db";
import { Deal } from "db";
import { getDealById } from "db/queries";
```

### Next.js Configuration (For Frontend)

If your Next.js app uses workspace packages, you may want to add them to `transpilePackages` in `next.config.ts` to ensure proper transpilation:

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ["db", "types", "ui"], // Add your workspace package names
  // ... other config
};
```

**Note**: This is often optional if packages are already being transpiled correctly, but it's a best practice for TypeScript workspace packages.

## Troubleshooting

- **Dependencies not linking**: Run `bun install` from root
- **Turbo not picking up app**: Ensure package.json has correct scripts matching Turbo tasks
- **Type errors with workspace packages**: Run `bun install` from root to ensure proper linking
- **Bun vs Node confusion**: Remember - Bun for package management, choose runtime per app
- **Lockfile issues**: Delete `bun.lockb` and run `bun install` from root to regenerate
- **Workspace package not found**: Ensure you've run `bun install` from root after adding the dependency
- **Next.js can't resolve workspace packages**: Add package names to `transpilePackages` in `next.config.ts` (see below)

## Migration Notes

If you're migrating from npm:

1. The `workspaces` field in `package.json` works the same way
2. Replace `npm install` with `bun install`
3. Replace `npm run` with `bun run`
4. Bun uses `bun.lockb` instead of `package-lock.json`
5. Workspace linking (`file:../../packages/...`) works the same way
