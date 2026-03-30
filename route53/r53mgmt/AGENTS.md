# AGENTS.md — Project Briefing

## What This Is

r53mgmt is a Route 53 DNS management dashboard with DNSSEC KSK rotation automation.
It's a demo/reference app — runs locally, talks to real AWS APIs, deployable to any platform.
It's a demo/reference app — runs locally, talks to real AWS APIs, deployable to any platform.

## Architecture (3 tiers)

```
React SPA (Vite)  →  Express API (local proxy)  →  AWS (Route 53, Step Functions)
     :3000               :3001                        us-east-1
```

- **Frontend**: React 19 + TypeScript + Tailwind 4 + shadcn/ui. Vite proxies `/api` to Express in dev.
- **Backend**: Express app in `backend/app.ts`, local listener in `backend/server.ts`. Thin proxy to AWS SDKs — no business logic, just marshalling.
- **Infrastructure**: Terraform in `infra/`. Step Functions state machine for DNSSEC KSK rotation (RFC 7583 Double-DS method). Two Lambdas, SNS for notifications.

## Directory Map

```
backend/
  app.ts              Express app (exported, platform-agnostic)
  server.ts           Local dev listener (imports app, calls listen())
  tsconfig.json

frontend/
  App.tsx             Router — 8 routes behind shared Layout
  main.tsx            Entry point
  hooks/
    useApi.ts         Generic data fetcher + typed hooks (useZones, useRecords, etc.)
    useAuth.tsx        Auth context — no-op demo provider, swap for Cognito/OIDC
  components/
    Layout.tsx         Shell: Sidebar + Topbar + SearchDialog + <Outlet>
    PageHeader.tsx     Shared: page title + subtitle + refresh
    StatCard.tsx       Shared: icon + color + value + label stat card
    Sidebar.tsx        Navigation
    SearchDialog.tsx   Cross-zone DNS record search (cmdk)
    CreateChildZoneDialog.tsx  Modal for child zone creation
    LiveZoneTree.tsx   Live zone hierarchy visualization
    ui/               shadcn/ui primitives (don't modify directly)
  pages/
    Dashboard.tsx      Zone overview (LIVE data)
    ZoneDetail.tsx     Zone records + DNSSEC status (LIVE data)
    HealthChecks.tsx   Health check status with regional checkers (LIVE data)
    ZoneOperations.tsx Zone Operations: DNSSEC KSK rotation + child zone creation (LIVE data)
    DnsFirewall.tsx    DNS Firewall rule groups (LIVE data)
    TrafficFlow.tsx    Traffic policy visualization (LIVE data)
    Domains.tsx        Domain registration (LIVE data)
    ResolverVpc.tsx    Resolver endpoints + rules (LIVE data)

infra/
  main.tf             Provider config (AWS us-east-1)
  rotation.tf         Step Functions, Lambdas, SNS, IAM
  child-zone.tf       Step Functions + IAM for child zone creation
  state-machine.asl.json  KSK rotation workflow (Double-DS method)
  create-child-zone.asl.json  Child zone creation workflow
  variables.tf        Configurable params (email, TTLs, KMS deletion window)
  outputs.tf          State machine ARNs, SNS topic ARN
  lambda/
    create-ksk/       Creates KMS key with DNSSEC policy
    validate-chain/   Validates DNSSEC chain + extracts DS records
```

## Key Patterns

- **All pages use real AWS APIs** via `useApi` hooks.
- **API base URL**: Configured via `VITE_API_URL` env var. Defaults to `''` (Vite proxy). All fetch calls use the `API` constant from `useApi.ts`.
- **Auth**: `AuthProvider` wraps the app. Currently a no-op (demo mode). Replace the provider in `useAuth.tsx` for production auth.
- **Shared components**: All pages use `PageHeader` + `StatCard` for consistent layout. Page-specific content goes below.
- **Backend split**: `backend/app.ts` exports the Express app. `backend/server.ts` is just the local listener. Import `app` from `app.ts` to wrap for any deployment target.
- **Search**: Background indexer fetches all records into memory on startup, refreshes every 10 min. Self-throttles to ~3 req/s to avoid Route 53 API limits. Frontend debounces queries (300ms) and searches server-side via `GET /api/search`. Index stats available at `GET /api/search/stats`.
- **Console links**: All resource rows link to the AWS Console via `frontend/lib/console-urls.ts`. Global services (Route 53) use us-east-1; regional services (Resolver, Firewall, Step Functions) use `VITE_AWS_REGION`.

## Environment Variables

| Variable | Default | Used By |
|---|---|---|
| `VITE_API_URL` | `''` (Vite proxy) | Frontend — API base URL |
| `AWS_REGION` | `us-east-1` | Backend — AWS SDK region |
| `STATE_MACHINE_ARN` | — | Backend — KSK rotation Step Functions ARN |
| `CREATE_ZONE_STATE_MACHINE_ARN` | — | Backend — Child zone creation Step Functions ARN |
| `PORT` | `3001` | Backend — Express listen port |

## Running Locally

```bash
npm install
npm run dev:all    # Starts both Vite (3000) and Express (3001)
```

Requires AWS credentials configured locally (default SDK credential chain).

## Conventions

- File names match their primary export (`Dashboard.tsx` exports `Dashboard`)
- Hooks follow `useX` naming
- Pages are self-contained — each owns its data fetching and rendering
- No global state management — React context for auth only, hooks for data
- shadcn/ui components in `frontend/components/ui/` are generated — don't edit directly
