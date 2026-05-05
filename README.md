# IDP Portal – Internal Developer Platform MVP

A minimal Internal Developer Platform that lets developers provision GCP services through predefined **Golden Path patterns** – no raw Terraform required.

## Architecture

```
Frontend (Next.js)
   ↓
Backend API (Express + TypeScript)
   ↓
Config Generator (YAML)
   ↓
GitHub PR Creator (Octokit)
   ↓
GitHub Actions (CI/CD)
   ↓
Terraform (NGDI modules)
   ↓
GCP Resources
```

## Project Structure

```
idp-portal/
├── frontend/               # Next.js + TypeScript UI
│   ├── pages/
│   ├── components/
│   └── styles/
├── backend/                # Express + TypeScript API
│   └── src/
│       ├── controllers/
│       ├── services/
│       └── patterns/
├── infra/
│   └── templates/          # NGDI module reference templates
└── .github/
    └── workflows/          # GitHub Actions CI/CD
```

## Prerequisites

- Node.js 18+
- npm

## Quick Start

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend – copy and edit
cp backend/.env.example backend/.env

# Frontend – copy and edit (optional)
cp frontend/.env.local.example frontend/.env.local
```

> **Mock mode**: If `GITHUB_TOKEN` is not set, the backend returns a mock PR URL so you can develop the UI without GitHub credentials.

### 3. Start the servers

```bash
# Terminal 1 – Backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 – Frontend (http://localhost:3000)
cd frontend && npm run dev
```

## GitHub Integration

Set these variables in `backend/.env`:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token with `repo` scope |
| `GITHUB_OWNER` | GitHub organization or username |
| `GITHUB_REPO` | Repository where service configs will be stored |

Generated configs are committed to `services/<environment>/<service_name>.yaml` and a PR is opened automatically.

## API Reference

### `POST /request`

Submit a service provisioning request.

**Request:**
```json
{
  "pattern": "cloud_run",
  "service_name": "my-service",
  "environment": "dev",
  "region": "europe-west1",
  "options": {
    "db": true,
    "pubsub": false
  }
}
```

**Response:**
```json
{
  "status": "PR_CREATED",
  "pr_url": "https://github.com/org/repo/pull/42"
}
```

### `GET /patterns`

Returns all available patterns with their module definitions.

### `GET /health`

Health check.

## Available Patterns

| Pattern | Description | Core Modules |
|---|---|---|
| `cloud_run` | Cloud Run Service | cloud_run, iam_service_account, artifact_registry, network, dns |
| `gke_application` | GKE Application | gke_cluster, gke_node_pool, iam_service_account, artifact_registry, network, dns |
| `data_pipeline` | Data Pipeline | dataflow, bigquery, gcs_bucket, iam_service_account, pubsub, network |

**Optional modules** (any pattern): `db` → Cloud SQL, `pubsub` → Pub/Sub

## Validation Rules

| Field | Rule |
|---|---|
| `pattern` | Must be one of the defined pattern keys |
| `service_name` | Lowercase alphanumeric + hyphens, 3–64 chars, start/end with letter or digit |
| `environment` | `dev`, `test`, or `prod` |
| `region` | One of the allowed GCP regions |

Raw Terraform input and custom modules are rejected by the backend.

## Key Principle

> Developers interact with **patterns**, not Terraform modules.  
> The backend translates intent into standardized NGDI module usage.
