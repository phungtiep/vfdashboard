# 🚀 Deploying to Cloudflare Pages (2026 Edition)

Based on the latest Cloudflare & Astro standards (Jan 2026), here is the optimal deployment strategy.

## 1. Configuration (Already Applied)

We have configured the project for **Edge-First** execution using `adapter: cloudflare()`.

### `astro.config.mjs`

```javascript
import cloudflare from "@astrojs/cloudflare";
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "compile",
    sessionKVBindingName: "YOUR_KV_BINDING_NAME", // e.g., "VFDashboard"
  }),
  // ...
});
```

### `wrangler.toml`

Crucial for Node.js compatibility (Buffer, process, etc.) at the Edge.

- **Build Output Directory**: `./dist`
- **Compatibility Date**: `2026-01-01`
- **Compatibility Flags**: `nodejs_compat` (Required for API Proxy)
- **Node.js Version**: `>=22.0.0`

```toml
name = "vfdashboard"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[[kv_namespaces]]
binding = "YOUR_KV_BINDING_NAME"
id = "YOUR_KV_NAMESPACE_ID"
```

## 🏗️ Architecture: Hybrid Model (2026)

To ensure maximum stability and zero-flicker transitions, this project uses a **Hybrid Architecture**:

- **Static Pages**: `index.astro` and `login.astro` are prerendered as static HTML. This prevents SSR errors (like `[object Object]`) and ensures instant page loads.
- **Dynamic Worker**: The Cloudflare Worker handles the `/api/*` proxy routes and SSR for dynamic paths if needed.
- **Client Hydration**: All dashboard components use `client:only="react"` to guarantee they only run in the browser after authentication.

## 🚀 Manual Deployment (CLI-First)

The most reliable way to deploy is using the **Wrangler CLI**. This avoids CI/CD timeouts and provides immediate feedback.

### 1. Prerequisites

- **Wrangler CLI**: Installed via `npm install -g wrangler` or run via `npx`.
- **Cloudflare Account**: With access to the `vfdashboard` Pages project.

### 2. Clean Build & Deploy

Always use the project's built-in deploy command which handles cleaning, building, and uploading in one step:

```bash
npm run deploy
```

> [!TIP]
> **Why `npx rimraf`?**
> Cloudflare's build system sometimes caches intermediate files. Deleting `dist` and `.wrangler` ensures every deployment is 100% fresh.

### 3. Verification Post-Deploy

After the CLI output confirms completion:

1.  Check the **Project URL** (e.g., `https://dashboard.vf9.club`).
2.  Verify the API health at `https://dashboard.vf9.club/api/login`.
    - You should see a JSON response with `TOKEN_V2_5566_BINGO` or similar debug markers.

## 2. Deployment (CLI Method - Recommended)

We use **Direct Upload** via the Wrangler CLI. This is faster and gives you more control than the automatic Git integration.

### Prerequisites (One-time setup)

1.  **Login to Cloudflare:**
    ```bash
    npx wrangler login
    ```
2.  **Create the Project** (Required only once):
    ```bash
    npx wrangler pages project create vfdashboard --production-branch main
    ```

### 3. Setting up KV Namespaces (Required)

If you see an "Invalid KV namespace ID" error during deployment, you need to create a real KV namespace:

1.  **Create the namespace**:
    ```bash
    npx wrangler kv namespace create YOUR_NAMESPACE_NAME
    ```
2.  **Copy the ID**: Copy the `id` and `binding` from the terminal output.
3.  **Update `wrangler.toml`**: Paste the `binding` and `id` into the `[[kv_namespaces]]` section.
4.  **Update `astro.config.mjs`**: Ensure `sessionKVBindingName` matches your `binding` name.

### How to Deploy

Run this single command whenever you want to publish changes:

```bash
npm run deploy
```

This command will:

1.  **Build** the project (`npm run build`).
2.  **Upload** local files to Cloudflare Pages.

### Option B: Cloudflare Git Integration (Alternative)

_Not recommended for this setup as it requires manual dashboard configuration._
If you prefer this, connect your Git repo in the Cloudflare Dashboard and set the build command to `npm run build` and output directory to `/dist`.

## 3. Local Development (Platform Proxy)

The new adapter supports **Platform Proxy**, meaning `npm run dev` locally will simulate the Cloudflare Worker environment (KV, Headers, etc.) accurately.

```bash
npm run dev
```

---

## 4. Verification

After deployment, your app will be hosted at `https://vfdashboard.pages.dev`.

- **Performance**: Assets served globally via CDN.
- **API**: `/api/*` requests handled by Edge Workers (Serverless) with rotating IPs.
