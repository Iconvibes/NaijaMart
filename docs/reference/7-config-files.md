# Configuration Files Reference

Purpose and key settings for each configuration file.

## package.json

**Purpose:** Project metadata, dependencies, and npm scripts.

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Frontend dev server only (port 5173) |
| `server` | `node server/index.js` | API server only (port 5000) |
| `dev:full` | `concurrently "npm:server" "npm:dev"` | Both servers concurrently |
| `build` | `vite build` | Production build → `dist/` |
| `test` | `node --test` | Run unit tests |
| `lint` | `eslint .` | Lint all JS/JSX files |
| `preview` | `vite preview` | Preview production build locally |

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | API server |
| `mongoose` | ^9.9.2 | MongoDB ODM |
| `jsonwebtoken` | ^9.0.3 | JWT auth |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `helmet` | ^8.3.0 | Security headers |
| `cors` | ^2.8.6 | CORS middleware |
| `multer` | ^2.2.0 | File upload |
| `socket.io` | ^4.8.3 | Realtime notifications |
| `react` | ^19.2.8 | UI framework |
| `react-router-dom` | ^7.18.2 | Client-side routing |
| `recharts` | ^3.10.1 | Charts (lazy-loaded) |

### devDependencies

| Package | Purpose |
|---------|---------|
| `vite` | Build tool + dev server |
| `@vitejs/plugin-react` | React Fast Refresh |
| `tailwindcss` | Utility-first CSS |
| `concurrently` | Run multiple processes |
| `eslint` | Code linting |

## vite.config.js

**Purpose:** Vite build configuration.

```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
})
```

**Key settings:**
- **Proxy:** Routes `/api` and `/uploads` to the Express server during development. This allows the frontend to make same-origin requests.
- **Plugins:** React (Fast Refresh) and Tailwind CSS.

## tailwind.config.js

**Purpose:** Tailwind CSS theme customization.

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF9900',    // Jumia orange: CTAs, buttons
        secondary: '#2E2E2E',  // Charcoal: nav, text
        accent: '#00B517',     // Green: In Stock, Verified
        background: '#F5F5F5', // Off-white page background
        danger: '#D32F2F',     // Red: discounts, sale badges
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(46,46,46,0.08)',
      },
    },
  },
}
```

**Color meaning:**
- `primary` (#FF9900) — Action buttons, CTAs, links
- `secondary` (#2E2E2E) — Text, navigation
- `accent` (#00B517) — Success states, in-stock indicators
- `background` (#F5F5F5) — Page background
- `danger` (#D32F2F) — Errors, discounts, sale badges

## eslint.config.js

**Purpose:** ESLint configuration with separate rules for client and server.

- **Client (src/):** `eslint:recommended` + `react-hooks` + `react-refresh` rules, browser globals
- **Server (server/):** `eslint:recommended` only, Node.js globals
- **Ignored:** `dist/`

## Dockerfile

**Purpose:** Multi-stage Docker build for production.

- **Stage 1 (`build`):** Installs all deps, runs `npm run build`
- **Stage 2 (`production`):** Installs production-only deps, copies `server/` and `dist/`, runs as non-root user `naijamart`
- **Health check:** Hits `/api/health` every 30s
- **Entrypoint:** `node server/index.js`

## .dockerignore

**Purpose:** Keeps Docker build context lean.

Excludes: `node_modules`, `dist`, `.env`, `.git`, `test/`, `docs/`, `scripts/`, `public/images/`

## .env.example

**Purpose:** Template for environment variables. Copy to `.env` and fill in values.

See [Environment Variables Reference](2-environment-variables.md) for all options.

## .gitignore

**Key entries:**
- `.env` — secrets (`.env.example` is tracked)
- `dist/` — build output (reproducible via `npm run build`)
- `node_modules/` — dependencies (reproducible via `npm install`)
- `server/uploads/` — user-uploaded files
- `docs/INTERVIEW-PORTFOLIO.md` — personal file
