# Listicle Pre-Landing Page Generator

A web-based tool that creates and manages listicle-style pre-landing pages ("advertorials") for ecommerce products. The system generates static HTML/CSS/JS pages end-to-end with zero manual editing, driven by an AI-powered pipeline.

**Key features:**

- **Create page** with 3 inputs: product research JSON (drag-and-drop upload), product page URL (for scraping media assets), and reference URL (design template to replicate)
- **Dashboard** with smart polling that tracks generation status in real time (pending / completed / failed)
- **End-to-end AI pipeline** orchestrated across 5 specialized agents via n8n and OpenRouter
- **Static HTML/CSS/JS output** with split assets, served from Cloudflare R2 object storage
- **Fire-and-forget architecture**: API returns immediately, pipeline runs in background, n8n calls back with results

## Architecture

```
                        User
                         |
                         v
                  ┌──────────────┐
                  │   Next.js     │
                  │  (website/)   │
                  │               │
                  │ /create       │──── POST /api/listicles
                  │ /dashboard    │       │
                  │ /login        │       ▼
                  └──────┬────────┘  ┌─────────────┐
                         │           │ PostgreSQL   │
                         │           │ (cloud)      │
                         ▼           └──────┬───────┘
                  ┌──────────────┐         │
                  │   Pipeline    │─────────┘
                  │ (background)  │
                  │               │
                  │ 1. Scrape     │──▶ Playwright (headless browser)
                  │    product    │      extracts images, videos, metadata
                  │               │
                  │ 2. Scrape     │──▶ Playwright (headless browser)
                  │    reference  │      extracts headings, structure, styles
                  │               │
                  │ 3. Download   │──▶ Cloudflare R2
                  │    assets     │      stores images and videos
                  │               │
                  │ 4. Build      │──▶ Assembles optimized payload
                  │    payload    │
                  │               │
                  │ 5. Call n8n   │──▶ Fire-and-forget HTTP POST
                  └──────────────┘         │
                                           ▼
                                    ┌──────────────┐
                                    │    n8n       │
                                    │  (cloud)     │
                                    │              │
                                    │ Agent 1:     │
                                    │ Research     │──▶ GPT 5.6 Luna
                                    │ Synthesizer  │
                                    │              │
                                    │ Agent 2:     │──▶ GPT 5.6 Luna
                                    │ Content      │
                                    │ Writer       │
                                    │              │
                                    │ Agent 3:     │──▶ MiniMax M3
                                    │ JSON Refiner │
                                    │              │
                                    │ Code: Asset  │──▶ Deterministic
                                    │ Assigner     │
                                    │              │
                                    │ Agent 4:     │──▶ MiniMax M3
                                    │ HTML         │
                                    │ Generator    │
                                    │              │
                                    │ Agent 5:     │──▶ MiniMax M3
                                    │ Styler       │
                                    └──────┬───────┘
                                           │ Callback (JWT)
                                           ▼
                                    ┌──────────────┐
                                    │   Next.js    │
                                    │ /callback    │
                                    │              │
                                    │ Split HTML   │
                                    │ into CSS/JS  │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Cloudflare R2 │
                                    │              │
                                    │ index.html   │
                                    │ styles.css   │
                                    │ scripts.js   │
                                    │ assets/      │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │  Dashboard   │
                                    │  /listicles/ │
                                    │  [id]/       │
                                    │  index.html  │
                                    └──────────────┘
```

The system has two layers:

1. **Next.js application layer** — UI, forms, dashboard, API routes, PostgreSQL persistence, Playwright scraping, pipeline orchestration, and Cloudflare R2 integration. This is the single codebase under `website/`.
2. **n8n AI orchestration layer** — External cloud instance that receives webhook calls, runs 5 specialized AI agents via OpenRouter, and posts results back via callback. n8n is the only component that consumes the OpenRouter API key.

The **fire-and-forget pattern** means `POST /api/listicles` returns a `201` response immediately after inserting a `pending` row in the database. The pipeline runs asynchronously in the background. n8n calls back to `/api/listicles/callback` when generation completes, and to `/api/listicles/error` if anything fails.

## Tech Stack

| Technology      | Role                  | Why                                                               |
| --------------- | --------------------- | ----------------------------------------------------------------- |
| Next.js 16      | Application framework | Unified UI + API + route handlers in a single codebase            |
| React 19        | UI library            | Dashboard, create form, component architecture                    |
| TypeScript      | Type safety           | End-to-end type safety from Zod schemas to Drizzle ORM            |
| Tailwind CSS 4  | Styling               | Rapid UI development, consistent design on forms and dashboard    |
| PostgreSQL      | Database              | Structured persistence of listicles, users, and file tracking     |
| Drizzle ORM     | Database toolkit      | Type-safe SQL queries and schema migrations                       |
| n8n (cloud)     | AI orchestration      | Multi-agent LLM pipelines with retry logic and error workflows    |
| OpenRouter      | LLM provider          | Access to multiple free-tier models (GPT 5.6 Luna, MiniMax M3)    |
| Playwright      | Browser automation    | Headless scraping of product pages and reference pages            |
| Node.js v24+    | Runtime               | Required by Next.js 16 and native ES modules                      |
| pnpm 11         | Package manager       | Deterministic installs, workspace support                         |
| Zod v4          | Validation            | Input validation for API routes, n8n callbacks, and pipeline data |
| Zustand v5      | State management      | Lightweight React stores for form state persistence               |
| bcryptjs + jose | Authentication        | Password hashing (bcryptjs) and JWT signing/verification (jose)   |
| pino            | Logging               | Structured JSON logging to `logs/app.log` and `logs/error.log`    |
| Cloudflare R2   | Object storage        | S3-compatible storage for generated HTML/CSS/JS and media assets  |
| archiver        | ZIP compression       | On-the-fly ZIP download of all generated listicle files           |

## Project Structure

```
prueba-tecnica-automation-engineer/
├── website/                          # Next.js application
│   ├── app/                          # Routes and pages
│   │   ├── api/
│   │   │   ├── auth/login/           # POST — authenticate and set JWT cookie
│   │   │   ├── auth/logout/          # POST — clear auth cookie
│   │   │   └── listicles/
│   │   │       ├── route.ts          # GET (list), POST (create)
│   │   │       ├── callback/         # POST — receive HTML from n8n (JWT)
│   │   │       ├── error/            # POST — receive error from n8n (JWT)
│   │   │       └── [id]/
│   │   │           ├── route.ts      # DELETE — remove listicle + R2 assets
│   │   │           └── download/     # GET — ZIP download of all files
│   │   ├── create/                   # Create page (form with drag-drop upload)
│   │   ├── dashboard/                # Dashboard (table with smart polling)
│   │   ├── listicles/[...path]/      # Preview route handler (auth-protected, from R2)
│   │   ├── login/                    # Login page
│   │   ├── layout.tsx                # Root layout with metadata
│   │   ├── page.tsx                  # Index — redirects to /dashboard
│   │   ├── error.tsx                 # Global error boundary
│   │   └── not-found.tsx             # 404 page
│   ├── components/                   # React components
│   ├── lib/
│   │   ├── auth/                     # JWT, password hashing, auth config
│   │   ├── db/                       # Drizzle schema, client, migrations
│   │   ├── pipeline/                 # Background generation pipeline
│   │   │   ├── index.ts              # Orchestrator (processListicle)
│   │   │   ├── scrape-product.ts     # Playwright: extract images/videos/metadata
│   │   │   ├── scrape-reference.ts   # Playwright: extract structure and styles
│   │   │   ├── download-assets.ts    # Download media + read research JSON
│   │   │   ├── build-payload.ts      # Assemble optimized n8n payload
│   │   │   └── call-n8n.ts           # Sign JWT, fire-and-forget to n8n webhook
│   │   ├── r2/                       # Cloudflare R2 client (S3-compatible)
│   │   ├── stores/                   # Zustand stores (form state persistence)
│   │   ├── zod/                      # Zod validation schemas
│   │   ├── logger.ts                 # Pino logger configuration
│   │   └── with-logging.ts           # HOF wrapper for API route logging
│   ├── proxy.ts                      # Next.js 16 auth middleware
│   ├── instrumentation.ts            # Server startup hook (seeds admin user)
│   ├── .env.example                  # Environment variable template
│   └── package.json                  # Dependencies and scripts
├── n8n/
│   ├── pipeline.json                 # Main "Listicle Agents" workflow
│   └── error_trigger.json            # Error handling workflow
├── drizzle/                          # Drizzle Kit SQL migrations
├── pnpm-workspace.yaml               # pnpm workspace configuration
├── skills-lock.json                  # Locked skill versions for AI agents
└── .gitignore                        # Git ignore rules
```

## Prerequisites

- **Node.js** v24 or higher
- **pnpm** 11 or higher
- **PostgreSQL** database (cloud instance, accessible from your machine)
- **n8n** instance with the two workflows configured (see `n8n/pipeline.json` and `n8n/error_trigger.json`)
- **Cloudflare R2** bucket with S3-compatible API access
- **OpenRouter API key** (configured in n8n, not in Next.js — n8n is the only component that calls the LLM)

## Setup & Installation

**1. Clone the repository**

```bash
git clone <repo-url>
cd prueba-tecnica-automation-engineer
```

**2. Install dependencies**

```bash
cd website
pnpm install
```

**3. Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and fill in all 10 variables (see [Environment Variables](#environment-variables) below).

**4. Set up the database**

```bash
pnpm db:generate   # Generate SQL migrations from Drizzle schema
pnpm db:migrate    # Apply migrations to PostgreSQL
```

**5. Start the development server**

```bash
pnpm dev
```

**6. Log in**

Open `http://localhost:3000/login` and log in with the credentials from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The admin user is seeded automatically on first server start via `instrumentation.ts`.

## Environment Variables

| Variable               | Description                                                          | Where it lives |
| ---------------------- | -------------------------------------------------------------------- | -------------- |
| `DATABASE_URL`         | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) | `.env`         |
| `N8N_MAIN_URL`         | Base URL of the n8n cloud instance                                   | `.env`         |
| `NEXT_PUBLIC_APP_URL`  | Public URL of the Next.js app (used for callback URL construction)   | `.env`         |
| `ADMIN_USERNAME`       | Username for single-user admin login                                 | `.env`         |
| `ADMIN_PASSWORD`       | Password for single-user admin login                                 | `.env`         |
| `JWT_SECRET`           | Secret key for JWT signing and verification (min 32 chars)           | `.env`         |
| `R2_ACCESS_KEY_ID`     | Cloudflare R2 access key ID                                          | `.env`         |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret access key                                      | `.env`         |
| `R2_ENDPOINT`          | Cloudflare R2 S3-compatible endpoint URL                             | `.env`         |
| `R2_BUCKET_NAME`       | Cloudflare R2 bucket name                                            | `.env`         |

The **OpenRouter API key** is configured in n8n as a credential — it is not stored in the Next.js `.env` file.

## How It Works — End-to-End Flow

### Step 1: Create Form

The user visits `/create` and provides three inputs:

1. **Research JSON** — Uploaded via drag-and-drop. Validated as valid JSON, saved to disk at `data/research/` using the filename from upload, and tracked in the `uploaded_files` table with a randomly generated `sessionToken` that is stored in localStorage.
2. **Product page URL** — The ecommerce product page from which Playwright will scrape images and videos.
3. **Reference URL** — The live listicle page whose design structure will be replicated.

### Step 2: POST /api/listicles

When the user clicks "Create Listicle":

1. The form sends `{ productUrl, referenceUrl, sessionToken }` to `POST /api/listicles`
2. Inputs are validated via Zod (`createListicleSchema`)
3. The research file is looked up in the `uploaded_files` table by `sessionToken`
4. A row is inserted in the `listicles` table with `status: 'pending'`
5. `processListicle(listicleId)` is fired asynchronously (fire-and-forget)
6. The API returns `201` with the listicle ID immediately

### Step 3: Pipeline Execution (Background)

The pipeline runs inside the Next.js process, orchestrated by `lib/pipeline/index.ts`:

**a) scrape-product.ts** — Launches a headless Playwright browser (or headed in dev mode), navigates to the product page, and extracts:

- Product title and price
- Image URLs (`<img>` tags, `srcset` attributes, CSS background images)
- Video URLs (`<video>` `<source>` tags with `mp4`/`webm`/`mov` extensions; excludes HLS `.m3u8` manifests and blob URLs)

**b) scrape-reference.ts** — Using the same browser, navigates to the reference URL and extracts:

- Heading hierarchy (`h1`-`h6` tags with their text content)
- Computed CSS styles (font families, sizes, colors, backgrounds, button styles)
- Overall structural analysis (section patterns, content flow)

**c) download-assets.ts** — Downloads scraped images and videos:

- Images and videos are uploaded to Cloudflare R2 under `listicles/{id}/assets/` with filenames like `img_0.png`, `vid_0.mp4`
- Videos must have `Content-Length > 100KB` both before and after download (corrupt/invalid videos are discarded)
- The research JSON is read from disk using the file path from Step 2
- Returns an `assetMap` mapping original URLs to R2 paths

**d) build-payload.ts** — Assembles an optimized payload with 6 essential fields:

| Field          | Contents                                          |
| -------------- | ------------------------------------------------- |
| `listicleId`   | Integer ID for callback identification            |
| `callbackUrl`  | Full URL to the callback endpoint                 |
| `product`      | `{ title, price }` — product context              |
| `reference`    | `{ headings, styles }` — reference page structure |
| `research`     | The full research JSON object                     |
| `instructions` | `{ ctaUrl }` — enforces deterministic CTA URL     |
| `assetMap`     | Original URL to R2 path mappings                  |

**e) call-n8n.ts** — Signs a JWT (45-minute expiry) and fires an HTTP POST to the n8n webhook at `{N8N_MAIN_URL}/webhook/read-pipeline-data`. The pipeline ends here — it does not wait for the result.

**f) Cleanup** — After dispatching to n8n, the pipeline:

- Deletes the research JSON file from disk (already consumed)
- Removes the `uploaded_files` row (no longer needed)
- Preserves R2 assets (they are referenced by the final HTML)

### Step 4: n8n AI Processing

The main workflow "Listicle Agents" processes the payload through 12 nodes — 5 AI agents, 2 code nodes, 2 LLM models, 2 output parsers, and 1 HTTP request:

| Order | Node                          | Type              | Model        | Description                                                                                                                                                                                                       |
| ----- | ----------------------------- | ----------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Webhook                       | n8n Webhook       | —            | Receives payload, validates JWT                                                                                                                                                                                   |
| 2     | Agent 1: Research Synthesizer | AI Agent          | GPT 5.6 Luna | Synthesizes deep research JSON into structured insights (top claims, pain points, ideal customer, tone notes). Uses Parser 1 for structured output.                                                               |
| 3     | Agent 2: Content Writer       | AI Agent          | GPT 5.6 Luna | Writes benefit-driven, conversion-focused listicle copy as JSON. Receives research insights, product info, and reference headings. Outputs title, subtitle, 6-14 sections (each with heading + content), and CTA. |
| 4     | Agent 3: JSON Refiner         | AI Agent          | MiniMax M3   | Cleans and validates JSON output from Agent 2. Fixes formatting issues, unescapes strings, removes markdown wrappers. Uses Parser 2 for schema enforcement.                                                       |
| 5     | Code: Asset Assigner          | Code (JavaScript) | —            | Deterministically assigns images and videos to sections from `assetMap`. Crucially, **overwrites `cta.url`** with the product URL from `instructions.ctaUrl` — LLMs hallucinate URLs, so this is forced in code.  |
| 6     | Agent 4: HTML Generator       | AI Agent          | MiniMax M3   | Generates a complete standalone HTML page from the JSON content. Places `<img>` tags for images and `<video>` tags for videos. Uses basic inline CSS for layout.                                                  |
| 7     | Agent 5: Styler               | AI Agent          | MiniMax M3   | Validates HTML, fixes structural issues, and applies premium visual styling — typography, gradients, shadows, card layouts, CTA hover effects.                                                                    |
| 8     | HTTP: Callback to Next.js     | HTTP Request      | —            | POSTs the final HTML back to `/api/listicles/callback` with the original JWT for authentication                                                                                                                   |

**LLM model allocation rationale:**

- **GPT 5.6 Luna** (Agents 1, 2): Used for creative writing and research analysis — strong at long-form prose and following structured output schemas.
- **MiniMax M3** (Agents 3, 4, 5): Used for validation, HTML generation, and styling — fast and cost-effective for well-defined tasks.

### Step 5: Callback & Persistence

When n8n completes, `POST /api/listicles/callback` receives the HTML:

1. **JWT verification** — The Bearer token from the webhook headers is verified using `JWT_SECRET`
2. **Input validation** — The body is validated against `n8nCallbackSchema` (Zod)
3. **Asset splitting** — The `splitAssets()` function extracts inline `<style>` and `<script>` content into standalone `styles.css` and `scripts.js` files, replacing them with `<link>` and `<script src>` tags in the HTML
4. **R2 upload** — Three files are uploaded to Cloudflare R2 under `listicles/{id}/`: `index.html`, `styles.css`, `scripts.js`
5. **DB update** — The listicle row is updated: `status = 'completed'`, `outputPath = 'listicles/{id}/'`
6. **Response** — Returns `{ success: true }` to n8n

If n8n sends `status: 'failed'`, the listicle is marked as `failed` with the provided error message.

### Step 6: Dashboard & Preview

The dashboard at `/dashboard` provides:

- **GET /api/listicles** — Fetches all listicles ordered by `created_at DESC`
- **Smart polling** — Only polls every 5 seconds if any listicle has `status: 'pending'`; stops automatically when all are `completed` or `failed`
- **Status badges** — Yellow for `pending`, green for `completed`, red for `failed`
- **Spinner animation** — Visible next to the Dashboard title while processes are pending
- **View Preview** — Links to `/listicles/{id}/index.html` for completed listicles. The page is served from R2 via `app/listicles/[...path]/route.ts` with JWT cookie verification
- **Download ZIP** — `GET /api/listicles/{id}/download` creates an on-the-fly ZIP archive of all R2 files (HTML, CSS, JS, images, videos) using `archiver`
- **Delete** — `DELETE /api/listicles/{id}` removes all R2 objects under the listicle prefix and then deletes the database row. Confirmation modal before executing.

## n8n Workflows — Detailed Documentation

### Main Workflow: "Listicle Agents" (`n8n/pipeline.json`)

- **Workflow ID**: `B3xxQl6K1vyEaftY`
- **12 nodes**, 5 AI agents, 2 LLM models (OpenRouter), 2 output parsers
- **Trigger**: Webhook node at `POST /webhook/read-pipeline-data` with JWT authentication
- **Execution timeout**: 1800 seconds (30 minutes)
- **Error workflow**: Linked to `uxsqXx9AQhBBBqoh` ("Error Trigger Listicles Agents")
- **Available in MCP**: Enabled — can be managed programmatically
- **Credentials**: JWT Auth credential (`JWT_SECRET Listicle Creator`) + OpenRouter API key (`OpenRouter calvin.uhh@gmail.com`)

**Workflow flow:**

```
Webhook → Agent 1 (Research Synthesizer) → Agent 2 (Content Writer)
                                               ↓
                                          Agent 3 (JSON Refiner)
                                               ↓
                                          Code: Asset Assigner
                                               ↓
                                          Agent 4 (HTML Generator)
                                               ↓
                                          Agent 5 (Styler)
                                               ↓
                                          HTTP: Callback to Next.js
```

**LLM models via OpenRouter free tier:**

- `openai/gpt-5.6-luna` — Used by Agents 1 and 2 (creative synthesis and copywriting)
- `minimax/minimax-m3` — Used by Agents 3, 4, 5 (JSON validation, HTML generation, styling)

**Output parsers:**

- **Parser 1** — Forces Agent 1 to output structured JSON: `{ topClaims, uniqueMechanism, topPainPoints, idealCustomer, toneNotes }`
- **Parser 2** — Forces Agent 3 to output validated listicle JSON: `{ title, subtitle?, sections[{ heading, content }], cta: { text, url } }` — min 6 sections, max 14

### Error Workflow: "Error Trigger Listicles Agents" (`n8n/error_trigger.json`)

- **Workflow ID**: `uxsqXx9AQhBBBqoh`
- **4 nodes**: Error Trigger → n8n: Get Execution → Code: Extract Payload → HTTP: Notify Next.js
- **Trigger**: Automatically invoked by n8n when any node in the main workflow fails during production execution

**How it works:**

1. **Error Trigger** — Receives the `execution.id` of the failed execution
2. **n8n: Get Execution** — Calls the n8n REST API `GET /api/v1/executions/{id}?includeData=true` using the n8n API key credential. Retrieves the full execution data including webhook input payload and headers
3. **Code: Extract Payload** — Extracts from the execution data:
   - `listicleId` — from the original webhook body
   - `authHeader` — the original Bearer JWT (reused, not re-signed)
   - `errorMessage` — from the execution error data
   - `lastNodeExecuted` — which node caused the failure
   - `errorUrl` — derived from the callback URL pattern (replaces `/callback` with `/error`)
4. **HTTP: Notify Next.js** — POSTs to `/api/listicles/error` with the reused JWT and body `{ listicleId, errorMessage, lastNodeExecuted }`

The Next.js error endpoint updates the database: `status = 'failed'`, `errorMessage = '[n8n] {node}: {message}'`.

This design handles concurrency safely — each n8n execution has a unique monotonic `execution.id`, and the error workflow retrieves the exact execution data for the failed run.

## Next.js Application Details

### Pages

| Page      | Path                         | Description                                                                                                                                                                         |
| --------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login     | `/login`                     | Simple login form. Authenticates against the seeded admin user in PostgreSQL. Sets `auth_token` httpOnly cookie (1-day expiry). Redirects to `/dashboard` if already authenticated. |
| Create    | `/create`                    | Form with drag-and-drop JSON upload (stores via `POST /api/uploads`), product URL, and reference URL inputs. Uses Zustand stores for form state persistence across reloads.         |
| Dashboard | `/dashboard`                 | Table of all listicles sorted by creation date. Smart polling (5s intervals when `pending` items exist). Shows View/Download/Delete actions. Status badges with color coding.       |
| Preview   | `/listicles/[id]/index.html` | Serves generated pages from Cloudflare R2 via route handler. Auth-protected — verifies JWT cookie before serving. Displays the full generated listicle page.                        |
| Error     | `error.tsx`                  | Global error boundary (client component). Catches unhandled runtime errors in the React tree.                                                                                       |
| 404       | `not-found.tsx`              | Custom 404 page shown for non-existent routes.                                                                                                                                      |

### API Endpoints

| Method   | Path                           | Auth   | Description                                                                                                                  |
| -------- | ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/auth/login`              | No     | Accepts `{ username, password }`. Returns JWT in httpOnly cookie.                                                            |
| `POST`   | `/api/auth/logout`             | No     | Clears the `auth_token` cookie.                                                                                              |
| `GET`    | `/api/listicles`               | Cookie | Returns all listicles ordered by `created_at DESC`.                                                                          |
| `POST`   | `/api/listicles`               | Cookie | Creates a new listicle with `status: pending`. Fires async pipeline. Returns `201` with `{ success, id, status }`.           |
| `DELETE` | `/api/listicles/[id]`          | Cookie | Lists and deletes all R2 objects for the listicle, then removes the database row. Returns `{ success, deleted: N }`.         |
| `GET`    | `/api/listicles/[id]/download` | Cookie | Creates and streams a ZIP archive containing all files (HTML, CSS, JS, images, videos) for the listicle.                     |
| `POST`   | `/api/listicles/callback`      | JWT    | Receives `{ listicleId, html, status }` from n8n. Splits HTML into separate files, uploads to R2, updates DB to `completed`. |
| `POST`   | `/api/listicles/error`         | JWT    | Receives `{ listicleId, errorMessage, lastNodeExecuted }` from n8n error workflow. Updates DB to `failed`.                   |

### Authentication & Proxy

The system uses single-user authentication:

- **bcryptjs** hashes the admin password (10 salt rounds)
- **jose** signs and verifies JWT tokens (`HS256`, 1-day expiry for login; 45-minute expiry for n8n callbacks)
- The JWT is stored in an httpOnly cookie named `auth_token`

`proxy.ts` (Next.js 16 middleware) runs on every request:

- **Public paths** (`/`, `/login`, `/api/auth/login`, `/api/listicles/callback`, `/api/listicles/error`) and `/_next/*` assets are allowed through without auth
- **Redirect away paths** (`/`, `/login`) redirect to `/dashboard` if already authenticated
- **Protected routes** verify the JWT cookie; missing or invalid tokens redirect to `/login`

The admin user is seeded automatically via `instrumentation.ts` when the Next.js server starts (both in dev and production). If the user already exists, the seed is skipped.

### Database Schema

**`users`** table:

| Column          | Type           | Description                         |
| --------------- | -------------- | ----------------------------------- |
| `id`            | `serial`       | Primary key                         |
| `username`      | `varchar(100)` | Unique username for admin login     |
| `password_hash` | `text`         | bcryptjs hash of the admin password |
| `created_at`    | `timestamp`    | Creation timestamp                  |

**`listicles`** table:

| Column          | Type              | Description                                              |
| --------------- | ----------------- | -------------------------------------------------------- |
| `id`            | `serial`          | Primary key                                              |
| `product_url`   | `varchar(2048)`   | URL of the product page to scrape                        |
| `reference_url` | `varchar(2048)`   | URL of the reference listicle page                       |
| `session_token` | `varchar(255)`    | Links to the uploaded research file in `uploaded_files`  |
| `status`        | `listicle_status` | Enum: `pending`, `completed`, `failed`                   |
| `output_path`   | `varchar(500)`    | R2 key prefix for generated files (e.g. `listicles/42/`) |
| `error_message` | `varchar(2000)`   | Error details if status is `failed`                      |
| `created_at`    | `timestamp`       | Creation timestamp                                       |
| `updated_at`    | `timestamp`       | Last update timestamp                                    |

**`uploaded_files`** table:

| Column          | Type           | Description                            |
| --------------- | -------------- | -------------------------------------- |
| `id`            | `serial`       | Primary key                            |
| `session_token` | `varchar(255)` | Unique session identifier              |
| `file_name`     | `varchar(500)` | Original filename of the research JSON |
| `file_path`     | `varchar(500)` | Filesystem path to the uploaded file   |
| `created_at`    | `timestamp`    | Upload timestamp                       |

The `uploaded_files` row is deleted by the pipeline after the research JSON is consumed.

### Cloudflare R2 Integration

All generated assets and content are stored in Cloudflare R2 (S3-compatible object storage) rather than on local disk. This guarantees persistence across deploys and container restarts.

| File         | R2 Key                            | Served As                |
| ------------ | --------------------------------- | ------------------------ |
| `index.html` | `listicles/{id}/index.html`       | `text/html`              |
| `styles.css` | `listicles/{id}/styles.css`       | `text/css`               |
| `scripts.js` | `listicles/{id}/scripts.js`       | `application/javascript` |
| Images       | `listicles/{id}/assets/img_N.ext` | `image/*`                |
| Videos       | `listicles/{id}/assets/vid_N.ext` | `video/*`                |

- The R2 client (`lib/r2/client.ts`) uses `@aws-sdk/client-s3` with `region: 'auto'`
- Preview is served from R2 via `GET /listicles/[...path]` — the route handler verifies the JWT cookie and proxies the file from R2 with the correct `Content-Type`
- The delete endpoint lists all objects under the prefix and uses `DeleteObjectsCommand` for batch deletion

## Design Decisions & Trade-offs

**1. n8n as external AI orchestrator (not in-repo)**

n8n provides native LLM agent nodes, output parsers, structured schema enforcement, webhook authentication, retry logic, and error workflows — all out of the box. Building this orchestration from scratch in Node.js would duplicate existing functionality. Trade-off: requires maintaining a cloud n8n instance and configuring credentials externally.

**2. Fire-and-forget pipeline + callback pattern**

The `POST /api/listicles` returns immediately (sub-200ms) without waiting for scraping or LLM generation. n8n calls back when done. Trade-off: no real-time progress updates (the dashboard polls), and the system needs two protected endpoints (callback and error) plus JWT coordination between Next.js and n8n.

**3. OpenRouter models**

GPT 5.6 Luna handles creative writing better than small models; MiniMax M3 is fast and cost-effective for structured tasks. Trade-off: rate limits on the free tier can cause generation delays, and model availability is not guaranteed.

**4. Cloudflare R2 over local disk**

Generated files persist across deploys and Docker builds. R2 has no egress fees, making it cost-effective for serving generated pages. Trade-off: introduces cloud dependency for previewing pages.

**5. 5-agent pipeline vs single agent**

Each agent specializes in one task — research synthesis, copywriting, JSON validation, HTML generation, and styling. This produces higher quality output than a single-agent approach and allows using different models optimized for each task. Trade-off: more LLM calls per generation (5 total), higher latency, but better output quality.

**6. Deterministic CTA URL forcing**

LLMs frequently hallucinate or invent CTA URLs. The Code: Asset Assigner node deterministically overwrites `cta.url` with the product URL before HTML generation. This is code, not an LLM prompt instruction, so it cannot be hallucinated away.

**7. Session-based file tracking**

Research JSON files are tracked by `sessionToken` in a separate `uploaded_files` table rather than storing the file path in the listicle row. This allows file validation before listicle creation and clean separation of concerns. The pipeline deletes the `uploaded_files` row after consuming the file.

**8. No message queue or job system**

The architecture is naturally thread-safe without a queue. Each pipeline execution gets its own Playwright browser instance, its own n8n execution (with a unique monotonic ID), and its own R2 prefix. Concurrent requests from different users do not collide.

**9. Next.js proxy.ts over external auth service**

The built-in proxy middleware handles JWT verification inline with zero external dependencies. Simple, self-contained, and appropriate for a single-user tool.

## Known Limitations

- **OpenRouter free tier rate limits** may cause LLM calls to queue or fail, especially during concurrent generation requests. Rate limit behavior varies by model.
- **n8n execution timeout** is set to 30 minutes (1800 seconds). Highly complex listicles with many sections may approach this timeout, especially if LLM calls are slow.
- **JWT expiry for n8n callbacks** is 45 minutes from generation time. If the original pipeline JWT expires before n8n calls back, the callback will receive a 401. The error workflow reuses the original JWT, so it may also fail authentication if the JWT has expired.
- **Single-user auth only** — no multi-tenant support, no role-based access, no password reset flow. Designed for a single admin operator.
- **Playwright scraping fragility** — depends on the DOM structure of external sites. If `https://getwidestep.com/products/widestep-elora-bogo` or `https://offers.hike-footwear.com/l/li06` change their markup, scraping may break.
- **Reference page availability** — the reference URL (`offers.hike-footwear.com`) may go offline at any time, since it is an external marketing page.
- **No WebSocket or SSE progress updates** — the dashboard uses HTTP polling (every 5 seconds). There is no real-time push mechanism for status changes.

## Troubleshooting

**Listicle stuck on "pending" for a long time**

Check the n8n execution history for the workflow "Listicle Agents" — look for executions with `error` or `waiting` status. Check `website/logs/app.log` and `website/logs/error.log` for pipeline errors. If n8n is unreachable, verify `N8N_MAIN_URL`.

**"Research file not found" error when creating**

The uploaded JSON file was deleted or the session token expired. Re-upload the research JSON on the Create page. Session tokens are stored in localStorage — clearing browser data will invalidate them.

**Callback returns 401 Unauthorized**

The JWT used for n8n callback was not properly included in the webhook payload, or the JWT expired (45-minute window from pipeline dispatch). Check that the n8n error workflow is also receiving the JWT from the original webhook headers.

**Images not loading in the preview**

Verify that Cloudflare R2 credentials are correct in `.env`. Check that the R2 bucket exists and the access key has `GetObject` permissions. Verify that the `R2_ENDPOINT` URL is correct and reachable.

**n8n webhook unreachable**

Verify `N8N_MAIN_URL` points to the correct n8n instance. Check that the n8n instance is running and the webhook path `/webhook/read-pipeline-data` is active. Check network connectivity between the Next.js server and n8n.

**Login fails**

Restart the Next.js server to trigger the admin seed in `instrumentation.ts`. Verify that `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` match the expected credentials. The seed only runs if the admin user does not already exist in the database.

**Tailwind CSS styles not applying in development**

Run `pnpm build` once to ensure Tailwind v4 PostCSS plugin is properly initialized. The `@tailwindcss/postcss` plugin is used in the Next.js configuration.

## Deployment

The project includes a `Dockerfile` in `website/` for production deployment on a VPS:

```bash
# Build
cd website
pnpm build

# Start production server
pnpm start
```

- PostgreSQL and n8n are cloud services accessed via environment variables
- All 10 environment variables must be set in the production environment
- The admin user is seeded automatically on first start via `instrumentation.ts`
- Generated content is stored in Cloudflare R2, so no persistent volume is needed

## About This Project

The project demonstrates:

- **AI orchestration** — 5 specialized agents working in sequence, each using the right model for the task
- **Pragmatic architecture** — fire-and-forget, callback pattern, deterministic fallbacks where LLMs fail
- **End-to-end automation** — from form input to generated static page with zero manual editing
- **Production-ready patterns** — structured logging, error handling at multiple layers, persistent storage via object storage
