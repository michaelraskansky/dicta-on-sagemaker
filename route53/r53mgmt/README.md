# r53mgmt — Route 53 DNS Management Dashboard

A full-stack dashboard for managing AWS Route 53 hosted zones, DNS records, health checks, DNSSEC key rotation, and child zone creation — automated via Step Functions.

## Quick Start

```bash
npm install
npm run dev:all    # Starts frontend (:3000) and API server (:3001)
```

Requires AWS credentials configured locally (default SDK credential chain).

## What It Does

- **Dashboard** — Overview of all hosted zones (public/private), record counts, child zone creation
- **Zone Detail** — DNS records, DNSSEC status, delegation set, tags, child zone creation
- **Health Checks** — Health check status with per-region checker results
- **Zone Operations** — Unified workflow tracker for DNSSEC KSK rotation (RFC 7583 Double-DS) and child zone creation, with approval buttons for manual steps
- **DNS Firewall, Traffic Flow, Domains, Resolver** — Live AWS API pages for firewall rules, traffic policies, domain registration, and resolver endpoints

## Architecture

```
React SPA (Vite)  →  Express API (local proxy)  →  AWS (Route 53, Step Functions)
     :3000               :3001                        us-east-1
```

The frontend is a React 19 SPA built with Vite. The backend is an Express server that proxies requests to AWS APIs using the AWS SDK. Vite's dev server proxies `/api` requests to Express.

The backend is split into `backend/app.ts` (the Express app, exported) and `backend/server.ts` (local listener). Import `app` from `app.ts` to deploy on any platform.

## Infrastructure

Terraform configs in `infra/` deploy:
- **Step Functions** state machines: DNSSEC KSK rotation (Double-DS method) and child zone creation with NS delegation
- **Two Lambda functions**: `create-ksk` (KMS key creation) and `validate-chain` (DNSSEC chain validation)
- **SNS topic** for notifications and manual approval callbacks (task tokens)

```bash
cd infra
terraform init
terraform apply
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `''` | Frontend API base URL (empty = Vite proxy) |
| `AWS_REGION` | `us-east-1` | AWS SDK region |
| `STATE_MACHINE_ARN` | — | KSK rotation Step Functions ARN |
| `CREATE_ZONE_STATE_MACHINE_ARN` | — | Child zone creation Step Functions ARN |
| `PORT` | `3001` | Express server port |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4, shadcn/ui, react-router-dom v7
- **Backend**: Express 5, AWS SDK v3 (Route 53, Step Functions)
- **Infrastructure**: Terraform, AWS Step Functions, Lambda (Node.js 20), SNS, KMS

## Authentication

Auth is handled by a pluggable `AuthProvider` in `frontend/hooks/useAuth.tsx`. Currently a no-op (demo mode). Replace the provider implementation with Cognito, OIDC, or any auth system for production.

## Project Structure

See [AGENTS.md](./AGENTS.md) for a detailed directory map and codebase conventions.
