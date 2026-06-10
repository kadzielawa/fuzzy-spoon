# IDP Portal – Comprehensive Codebase Guide

A structured reference for understanding all features, workflows, and components in the full-stack Next.js + Express Infrastructure Deployment Platform.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [User-Facing Features](#user-facing-features)
3. [Complete Workflow from Login to Deployment](#complete-workflow-from-login-to-deployment)
4. [Available Patterns & Building Blocks](#available-patterns--building-blocks)
5. [Key Pages & Components](#key-pages--components)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Data Models](#data-models)
9. [Success Scenarios & Error Handling](#success-scenarios--error-handling)
10. [Demo & Testing Features](#demo--testing-features)

---

## System Overview

### Architecture

```
Browser (Frontend - Next.js)
    ↓ HTTP/REST
Backend API (Express.js)
    ├─ User Management & Profiles
    ├─ Template Registry
    ├─ Pattern Catalog (Backstage-style)
    ├─ Building Block Modules
    ├─ Deployment Orchestration
    └─ Integration Services
    ↓
External Services
    ├─ Resolver API (Pattern Deployment)
    ├─ GitHub (PR Creation, Actions)
    ├─ Terraform
    └─ GCP Resources
```

### Technology Stack

- **Frontend**: Next.js 12+, React 18+, TypeScript, TailwindCSS
- **Backend**: Express.js, TypeScript, Node.js 18+
- **Database**: In-memory mock (replaceable with real DB)
- **Authentication**: Header-based (x-user-id token)
- **IaC**: Terraform 1.9+, YAML templates
- **CI/CD**: GitHub Actions, Cloud Run

---

## User-Facing Features

### 1. Authentication & User Management
- **Demo Users**: 3 pre-configured users with different roles
  - Alice Johnson (Developer, Team Lead)
  - Bob Smith (Developer)
  - Carol White (Admin, Architect)
- **Session Persistence**: localStorage-based session storage
- **User Profile Display**: Avatar, email, department, roles

### 2. Dashboard
- Quick overview of deployed services
- Recent activity summary
- Quick-access buttons to templates and deployments
- Navigation to all major features

### 3. Template Browsing & Selection
- **Search & Filtering**: By category (compute, data, storage, etc.)
- **Role-Based Visibility**: Only accessible templates shown per user role
- **Template Cards**:
  - Icon, name, description
  - Estimated monthly cost
  - Complexity level (Low/Medium/High)
  - Deployment time estimate
  - Usage statistics (# of deployments)
  - Tags and metadata

### 4. Deployment Configuration Wizard
Multi-step process to configure infrastructure:
- **Step 1 - Project Selection**: Choose target GCP project
- **Step 2 - Configuration**: Fill in template-specific parameters
- **Step 3 - Review & Submit**: Verify settings and cost estimate
- **Parameter Validation**: Real-time validation with error messages
- **Cost Calculation**: Estimated monthly costs displayed

### 5. Deployment Management
- **My Deployments**: View all user's deployments
- **Status Tracking**: draft → pending → approved → deployed
- **Deployment History**: Timeline of changes per deployment
- **Quick Actions**: View details, update config, cancel

### 6. Approval Workflow
- **Pending Approvals**: For architects/admins (3 items shown)
- **Risk Assessment**: Risk score (0-100), security flags
- **Policy Checks**: TFLint, Checkov, cost thresholds, change windows
- **Resource Changes**: Added/Modified/Destroyed resources shown
- **Comments & Discussion**: Add comments to approval requests
- **Actions**: Approve or Reject with reason

### 7. Observability Dashboard
- **Service Health**: Status of all deployed services
- **Metrics**: Latency (P50, P99), error rates, request throughput
- **Alerts**: Real-time alerts by severity (critical, high, medium, low)
- **Logs**: Aggregated logs from all services with filtering
- **Sparklines**: Visual trend indicators for metrics

### 8. Demo Deployment Flow
- **Interactive Demo**: Simulate full deployment pipeline
- **Scenario Selection**: Choose from 3 predefined scenarios
  - Cloud Run Microservice
  - GKE Autopilot Cluster
  - Data Pipeline (Cloud Composer)
- **Live Pipeline**: Watch deployment steps execute in real-time
- **Resource Summary**: Final deployed resources and access links

### 9. User Profile Management
- **Personal Info**: Avatar, email, department
- **Roles Display**: All assigned roles
- **Permission Matrix**: Visual representation of capabilities
- **Deployment History**: Recent deployments by this user
- **Sign Out**: Logout functionality

---

## Complete Workflow from Login to Deployment

### Phase 1: Authentication

```
1. User lands on application
   ↓
2. LoginPage component displayed
   ├─ Select from 3 demo users
   ├─ User data loaded from backend
   └─ Session stored in localStorage (userId)
   ↓
3. User authenticated → Dashboard displayed
```

**API Calls**:
- `GET /api/user` (fetch user profile)
- localStorage.setItem('userId', selectedUserId)

---

### Phase 2: Template/Pattern Selection

```
1. User clicks "Templates" button
   ↓
2. TemplateSelection component loads
   ├─ GET /api/templates (all accessible templates)
   ├─ OR GET /api/catalogs/patterns (for PAT patterns)
   └─ Filter by category/role
   ↓
3. Display template cards with:
   ├─ Icon, name, description
   ├─ Estimated cost
   ├─ Required roles check
   ├─ Complexity indicators
   └─ Usage stats
   ↓
4. User clicks on template
   ├─ Template ID stored (selectedTemplateId)
   └─ Navigate to DeploymentConfig
```

**Template Categories**:
- **Compute**: Cloud Run, GKE, Cloud Functions
- **Data**: BigQuery, Data Pipeline, Cloud Composer
- **Storage**: GCS Bucket, Firebase Hosting
- **Networking**: VPC, Load Balancer
- **IAM**: Service Accounts
- **Governance**: New GCP Project

**Patterns** (Backstage-style, PAT-001–006):
- PAT-001: Batch Orchestration Pipeline
- PAT-002: Serverless Application
- PAT-003: Managed Orchestration Application
- PAT-004: Event-Driven Microservices
- PAT-005: Data Ingestion Landing Zone
- PAT-006: Specialised VM Workload Platform

---

### Phase 3: Configuration

```
1. DeploymentConfig component loads
   ↓
2. Fetch template details
   ├─ GET /api/templates/:id
   ├─ OR GET /api/catalogs/patterns/:id (if pattern)
   └─ Load parameter schema
   ↓
3. Step 1 - Project Selection
   ├─ GET /api/projects (list user's GCP projects)
   ├─ Display project dropdown
   ├─ Auto-select first if available
   └─ User selects target project
   ↓
4. Step 2 - Configuration Parameters
   ├─ Display form fields based on template
   ├─ Field types: string, number, boolean, select, textarea
   ├─ Real-time validation (pattern, min/max)
   ├─ Show default values
   ├─ Parameter description tooltips
   └─ User fills in values
   ↓
5. Step 3 - Review & Submit
   ├─ Display all parameters
   ├─ Show estimated cost
   ├─ Show policy checks (if applicable)
   ├─ Display resource changes
   └─ User confirms
   ↓
6. Submit Deployment
   └─ POST /api/deployments (or /deployments/patterns/submit for patterns)
```

**Configuration Flow for Patterns (V2)**:
```
1. Fetch Pattern + Building Blocks
   ├─ GET /api/catalogs/patterns/:id
   ├─ GET /api/catalogs/patterns/:id/blocks
   └─ Parse required & optional blocks
   ↓
2. Configure Each Building Block
   ├─ Display required blocks (mandatory)
   ├─ Show optional blocks (can deselect)
   ├─ Fill in block variables
   └─ Calculate estimated cost per block
   ↓
3. Review All Blocks
   ├─ Show dependency graph
   ├─ Show total estimated cost
   ├─ Validate all required parameters
   └─ Submit combined building_blocks payload
   ↓
4. POST /api/deployments/patterns/submit
   └─ Resolver API processes request
```

---

### Phase 4: Deployment Submission

#### Template-Based Deployment:
```
POST /api/deployments
Body:
{
  templateId: "cloud-run",
  projectId: "my-project",
  serviceName: "my-service",
  parameters: {
    service_name: "my-service",
    container_image: "gcr.io/...",
    region: "europe-west1",
    environment: "dev",
    cpu: "1",
    memory: "512Mi",
    min_instances: 0,
    max_instances: 10,
    // ... more parameters
  }
}

Response:
{
  id: "deploy-1234567890",
  userId: "user-123",
  templateId: "cloud-run",
  projectId: "my-project",
  serviceName: "my-service",
  parameters: {...},
  status: "draft",
  createdAt: "2026-04-30T14:00:00Z",
  nextStep: "review_and_submit",
  estimatedCost: "$5-50/month"
}
```

#### Pattern-Based Deployment:
```
POST /api/deployments/patterns/submit
Body:
{
  patternId: "pat-002-serverless-app",
  projectId: "vf-prod-security",
  projectName: "Vodafone Prod Security",
  environment: "prod",
  region: "europe-west1",
  building_blocks: {
    "cloud_run": {
      service_name: "fraud-detection-api",
      container_image: "...",
      min_instances: 2,
      max_instances: 20,
      cpu: "2",
      memory: "2Gi"
    },
    "cloud_sql": {
      instance_name: "fraud-db",
      database_version: "POSTGRES_15",
      tier: "db-custom-2-8192"
    },
    "iam_service_account": {
      account_id: "fraud-api-sa",
      roles: ["roles/cloudsql.client"]
    }
  },
  estimatedMonthlyCost: 450,
  timestamp: "2026-04-30T14:00:00Z"
}

Response:
{
  deploymentId: "dep-1234567890-abc123",
  status: "pending",
  payload: {...},
  resolverResponse: {
    status: "submitted",
    message: "Payload queued for processing"
  },
  createdBy: "Alice Johnson",
  timestamp: "2026-04-30T14:00:00Z"
}
```

---

### Phase 5: Approval Workflow

```
1. Deployment enters "pending" status
   ↓
2. Approval item created in queue
   ├─ Risk assessment calculated
   ├─ Policy checks run (TFLint, Checkov, budgets)
   ├─ Resource changes analyzed
   └─ Security flags identified
   ↓
3. Architect/Admin sees in "Approvals" section
   ├─ Can add comments
   ├─ Can view policy check results
   ├─ Can see risk score & security flags
   └─ Can view changed resources
   ↓
4. Approval Decision
   ├─ POST /api/deployments/:id/approve
   │   └─ Status → "approved" → "deployed"
   │
   └─ POST /api/deployments/:id/reject
       ├─ Provide rejection reason
       └─ Status → "failed"
```

---

### Phase 6: Deployment Execution

```
1. After approval:
   ├─ Deployment status: "approved"
   └─ Queued for execution (2-5 minute delay)
   ↓
2. Resolver API Integration
   ├─ IDP Backend sends payload to external Resolver API
   ├─ Resolver generates Terraform plan
   ├─ Terraform applied via GitHub Actions
   └─ Response logged and stored
   ↓
3. Deployment Status Updated
   ├─ Status → "deployed"
   ├─ deployedAt timestamp set
   ├─ Output values captured
   └─ Access URLs provided to user
   ↓
4. User sees deployment live in "Deployments" page
   ├─ Status: "deployed" (green badge)
   ├─ Resources listed
   ├─ Access links provided
   └─ Recent activity timeline shown
```

---

## Available Patterns & Building Blocks

### Standard Templates (11 Total)

#### Compute (4)
1. **Cloud Run Service** (cloud-run)
   - Serverless containerized applications
   - Auto-scaling: 0-10 instances
   - Global load balancer, CDN support
   - Cost: $5-50/month
   - Required role: developer

2. **GKE Autopilot Cluster** (gke-autopilot)
   - Managed Kubernetes
   - Automatic node provisioning
   - Cost: $50-500/month
   - Required role: architect, admin

3. **Cloud Functions v2** (cloud-functions-v2)
   - Event-driven serverless functions
   - Multiple runtimes (Python, Node.js, Go, Java)
   - Cost: Free - $30/month
   - Required role: developer

#### Data (3)
1. **Data Pipeline (Cloud Composer)** (composer-pipeline)
   - Apache Airflow orchestration
   - Scheduled ETL/ELT workflows
   - Cost: $150-300/month
   - Required role: data-engineer, architect

2. **BigQuery Data Warehouse** (bigquery-warehouse)
   - Structured data warehouse
   - Column-level security, scheduled exports
   - Cost: $10-200/month
   - Required role: data-engineer, architect

3. **BigQuery Dataset** (bq-dataset-single)
   - Single dataset with access controls
   - Cost: Free – $20/month
   - Required role: developer, data-engineer

#### Storage (2)
1. **GCS Bucket** (gcs-bucket-single)
   - Cloud Storage with lifecycle rules
   - Versioning, retention policies
   - Cost: Free – $10/month
   - Required role: developer

2. **Firebase Hosting** (firebase-hosting)
   - Fast static site hosting
   - CDN, HTTPS, custom domains
   - Cost: Free - $100/month
   - Required role: developer

#### IAM/Governance (3)
1. **Service Account** (iam-service-account)
   - GCP service account with IAM roles
   - Workload Identity support
   - Cost: Free
   - Required role: developer, architect, admin

2. **New GCP Project Boilerplate** (new-gcp-project-boilerplate)
   - Complete project bootstrap
   - Billing, APIs, FinOps labels, IAM, audit logs
   - Cost: Varies
   - Required role: admin

#### Networking (1)
1. **Shared VPC Network** (shared-vpc)
   - VPC with firewall, NAT, private DNS
   - Cloud NAT for outbound access
   - Cost: $20-150/month
   - Required role: admin, architect

#### Messaging (1)
1. **Pub/Sub Event Pipeline** (pubsub-eventbridge)
   - Managed message broker
   - Dead-letter queues, schema validation
   - Cost: $5-80/month
   - Required role: developer, architect

---

### Advanced Patterns (PAT-001–006)

#### PAT-001: Batch Orchestration Pipeline
```
Purpose: Enterprise analytics, data lake, scheduled ETL/ELT
Complexity: High | Deployment Time: ~15 min | Cost: $200–800/month
Components:
├─ Workflow Engine (Cloud Composer or GKE)
├─ BigQuery (structured storage)
├─ GCS Bucket (staging data)
├─ Optional: Pub/Sub (event triggers)
└─ Optional: Cloud SQL (relational DB)
Building Blocks: composer, bigquery, bucket, network, iam, security_policy
```

#### PAT-002: Serverless Application
```
Purpose: Internal tooling, lightweight APIs, low-traffic web apps
Complexity: Medium | Deployment Time: ~3 min | Cost: $50–300/month
Components:
├─ Cloud Run Service (compute)
├─ Cloud SQL (relational DB)
├─ Service Account + IAM
├─ Optional: BigQuery (analytics)
└─ Optional: Pub/Sub (messaging)
Building Blocks: cloud_run, sql, iam, service_account
```

#### PAT-003: Managed Orchestration Application
```
Purpose: Shared runtime for platform/SRE teams, container orchestration
Complexity: High | Deployment Time: ~12 min | Cost: $300–1500/month
Components:
├─ GKE Autopilot Cluster
├─ Service Account with Workload Identity
├─ Network + Firewall
├─ Optional: Pub/Sub (event bus)
└─ Optional: Platform Operations resources
Building Blocks: gke, network, iam, security_policy, keys
```

#### PAT-004: Event-Driven Microservices Platform
```
Purpose: Decoupled services, async messaging, event-sourced systems
Complexity: Medium | Deployment Time: ~8 min | Cost: $100–600/month
Components:
├─ Pub/Sub Topics & Subscriptions
├─ Cloud Run or GKE services
├─ Redis/Firestore (in-memory/document store)
├─ BigQuery (event analytics)
└─ Optional: Cloud SQL (stateful data)
Building Blocks: pubsub, cloud_run (or gke), cache, bigquery
```

#### PAT-005: Data Ingestion Landing Zone
```
Purpose: Data lake raw zones, multi-source ingestion
Complexity: High | Deployment Time: ~10 min | Cost: $30–200/month
Components:
├─ GCS Bucket (landing zone)
├─ BigQuery Datasets (structured + raw)
├─ IAM & Service Accounts (access control)
├─ VPC (private networking)
└─ Monitoring (audit logs, alerts)
Building Blocks: bucket, bigquery, iam, network, keys, monitoring
```

#### PAT-006: Specialised VM Workload Platform
```
Purpose: Licensed software (ArcGIS, SAP, CAD), non-containerizable workloads
Complexity: High | Deployment Time: ~10 min | Cost: $150–1000/month
Components:
├─ Compute Engine VM (specialized)
├─ Cloud SQL (relational DB)
├─ VPC Network (private networking)
├─ Firewall Rules (security)
└─ Monitoring (custom metrics)
Building Blocks: vm, sql, network, security_policy, iam, keys
```

---

### Building Blocks (Terraform Modules)

**Available Building Blocks** (catalog from BuildingBlockService):

| Block ID | Display Name | Category | Purpose |
|----------|-------------|----------|---------|
| `network` | VPC Network | network | Google Cloud VPC with routing, subnets, NAT |
| `security` | Security Policy | security | Cloud Armor WAF policies |
| `iam` | IAM & Access | iam | Service accounts and role bindings |
| `sql` | Cloud SQL | data | Managed relational databases |
| `bigquery` | BigQuery | data | Data warehouse and analytics |
| `bucket` | GCS Bucket | storage | Cloud Storage with lifecycle rules |
| `environment` | Environment Setup | compute | Base environment configuration |
| `keys` | Encryption Keys | security | Cloud KMS key management |
| `monitoring` | Monitoring | observability | Cloud Monitoring and Logging |
| `pubsub` | Pub/Sub | messaging | Message broker and event bus |
| `cloud_run` | Cloud Run | compute | Serverless container runtime |
| `gke` | GKE Cluster | compute | Kubernetes cluster |
| `cache` | Redis Cache | storage | In-memory cache layer |
| `security_policy` | Security Policy | security | IAM, VPC, firewalls |
| `vm` | Compute Instance | compute | Virtual machine |
| `keys` | KMS Keys | security | Customer-managed encryption |
| `delivery` | Delivery Pipeline | devops | CI/CD components |
| `integration` | Integration Services | compute | Service integration layer |
| `bastion` | Bastion Host | network | SSH jump host |
| `workflow` | Workflow Orchestration | compute | Orchestration engine |
| `network_policy` | Network Policy | network | K8s network policies |

**Block Variables** (example: `network` block):
```
Variables:
├─ project_id (string, required)
├─ region (string, default: europe-west3)
├─ custom_vpc_name (string, optional)
├─ routing_mode (string, default: REGIONAL)
├─ auto_create_subnetworks (boolean, default: false)
├─ create_nat (boolean, default: true)
└─ ingress_ssh_via_IAP (boolean, default: true)

Outputs:
├─ vpc_id
├─ subnet_ids
├─ nat_ips
└─ firewall_rules
```

---

## Key Pages & Components

### Frontend Pages

#### 1. **Login Page**
- **File**: [frontend/components/LoginPage.tsx](frontend/components/LoginPage.tsx)
- **Purpose**: User authentication
- **Features**:
  - Vodafone branded left panel (red #E60000)
  - User selection dropdown (3 demo users)
  - Avatar display (DiceBear API)
  - Password-less login (demo mode)
  - Mobile responsive

#### 2. **Dashboard**
- **Navigation**: After successful login
- **Features**:
  - Quick stats cards (deployments, services, alerts)
  - Feature overview
  - Recent activity feed
  - Quick-access buttons to templates/deployments

#### 3. **Templates Page**
- **File**: [frontend/components/TemplateSelection.tsx](frontend/components/TemplateSelection.tsx)
- **Purpose**: Browse and select templates for deployment
- **Features**:
  - Category filtering dropdown
  - Template card grid (icon, name, description)
  - Cost display badges
  - Complexity indicators
  - Usage statistics
  - Role-based visibility
  - Inline template preview

#### 4. **Deployment Configuration**
- **File**: [frontend/components/DeploymentConfig.tsx](frontend/components/DeploymentConfig.tsx)
- **File**: [frontend/components/DeploymentConfigV2.tsx](frontend/components/DeploymentConfigV2.tsx)
- **Purpose**: Configure infrastructure for deployment
- **Features**:
  - Multi-step wizard (3-5 steps)
  - Project selection
  - Parameter forms with validation
  - Real-time cost estimation
  - Review & submit
  - V2: Building block selection & configuration

#### 5. **My Deployments**
- **File**: [frontend/components/MyDeployments.tsx](frontend/components/MyDeployments.tsx)
- **Purpose**: View and manage user's deployments
- **Features**:
  - Deployment cards by status
  - Status badges (deployed, pending, failed)
  - Quick action buttons
  - Deployment history timeline
  - Cost information
  - Resource details

#### 6. **Approvals**
- **File**: [frontend/components/Approvals.tsx](frontend/components/Approvals.tsx)
- **Purpose**: Review and approve pending deployments
- **Access**: Architects and admins only
- **Features**:
  - Approval queue by priority
  - Risk scoring system (0-100)
  - Policy checks display (TFLint, Checkov, etc.)
  - Resource change details
  - Security flags highlighting
  - Comment section
  - Approve/Reject buttons

#### 7. **Observability Dashboard**
- **File**: [frontend/components/Observability.tsx](frontend/components/Observability.tsx)
- **Purpose**: Monitor deployed services and infrastructure
- **Features**:
  - Service health status (healthy/degraded/down)
  - Real-time metrics (latency P50/P99, error rates, throughput)
  - Alerts by severity (critical, high, medium, low)
  - Aggregated logs with filtering
  - Sparkline charts for trends
  - Service topology

#### 8. **Demo Deployment**
- **File**: [frontend/components/DemoDeployment.tsx](frontend/components/DemoDeployment.tsx)
- **Purpose**: Interactive demonstration of deployment pipeline
- **Features**:
  - Scenario selection (Cloud Run, GKE, Data Pipeline)
  - Live pipeline step execution
  - Detailed logs per step
  - Approval simulation
  - Final resource summary
  - Access links for deployed resources

#### 9. **User Profile**
- **File**: [frontend/components/UserProfile.tsx](frontend/components/UserProfile.tsx)
- **Purpose**: View user information and permissions
- **Features**:
  - Avatar and personal info
  - Role badges
  - Permission matrix display
  - Recent deployments list
  - Sign out button

#### 10. **IDPPortal (Main Container)**
- **File**: [frontend/components/IDPPortal.tsx](frontend/components/IDPPortal.tsx)
- **Purpose**: Main application shell and routing
- **Features**:
  - Navigation header with Vodafone logo
  - Tab-based navigation
  - Page state management
  - Role-based menu visibility
  - Notification badges (e.g., 3 pending approvals)

---

## Authentication & Authorization

### User Model

```typescript
interface User {
  id: string;              // e.g., "user-123"
  email: string;
  name: string;
  roles: string[];         // ["developer", "team-lead"]
  department: string;      // e.g., "Platform Engineering"
  avatar?: string;         // URL to avatar image
  createdAt: Date;
}
```

### Roles & Permissions

| Role | Can Deploy | Can Approve | Can Access |
|------|-----------|-----------|-----------|
| **developer** | ✅ (basic templates) | ❌ | Cloud Run, Cloud Functions, GCS, BigQuery dataset |
| **team-lead** | ✅ (basic templates) | ❌ | All developer templates + team resources |
| **architect** | ✅ (all templates) | ✅ | All templates, GKE, VPC, New Project |
| **admin** | ✅ (all templates) | ✅ | Everything, including stats & user management |
| **data-engineer** | ✅ (data templates) | ❌ | Data Pipeline, BigQuery, Cloud Composer |

### Template Role Requirements

- **No restriction**: Cloud Run, Cloud Functions, Firebase Hosting, GCS Bucket, Service Account, BigQuery Dataset
- **Developer+ required**: Cloud Run, Cloud Functions, Pub/Sub, Static Site
- **Data-engineer+ required**: Data Pipeline, BigQuery, Composer
- **Architect+ required**: GKE, VPC, Data Pipeline
- **Admin+ required**: New GCP Project, Admin stats

### Authentication Mechanism

```
Frontend:
1. User selects from demo users (login)
2. localStorage.setItem('userId', selectedUserId)
3. Every API request includes header: 'x-user-id: user-123'

Backend:
1. Middleware extracts 'x-user-id' header
2. Looks up user in mockUsers map
3. Attaches user to request object
4. Route handlers access (req as any).user
5. requireRole() middleware checks user.roles
```

### Demo Users

```json
{
  "id": "user-123",
  "name": "Alice Johnson",
  "email": "alice@vodafone.com",
  "roles": ["developer", "team-lead"],
  "department": "Platform Engineering"
}

{
  "id": "user-456",
  "name": "Bob Smith",
  "email": "bob@vodafone.com",
  "roles": ["developer"],
  "department": "Backend Services"
}

{
  "id": "user-789",
  "name": "Carol White",
  "email": "carol@vodafone.com",
  "roles": ["admin", "architect"],
  "department": "Infrastructure"
}
```

---

## API Endpoints Reference

### Base URL
- **Development**: `http://localhost:3001`
- **Production**: Configured via env variable

### Authentication
All endpoints (except `/health`) require `x-user-id` header.

---

### Health & Status

#### `GET /health`
Status check (no auth required)
```
Response: { status: 'ok', timestamp: '2026-04-30T14:00:00Z' }
```

#### `GET /api/health`
API health check
```
Response: { 
  status: 'ok', 
  version: '1.0.0', 
  timestamp: '2026-04-30T14:00:00Z' 
}
```

---

### User Management

#### `GET /api/user`
Get current user profile
```
Headers: x-user-id: user-123

Response:
{
  id: "user-123",
  name: "Alice Johnson",
  email: "alice@vodafone.com",
  roles: ["developer", "team-lead"],
  department: "Platform Engineering",
  avatar: "https://api.dicebear.com/..."
}
```

#### `GET /api/user/profile`
Get user profile with permissions
```
Response:
{
  ... (all user fields)
  permissions: {
    canDeploy: true,
    canApprove: false,
    canManageUsers: false
  }
}
```

#### `GET /api/user/deployments`
Get user's deployments
```
Response:
[
  {
    id: "deploy-1234567890",
    userId: "user-123",
    templateId: "cloud-run",
    projectId: "my-project",
    serviceName: "my-service",
    status: "deployed",
    createdAt: "2026-04-30T14:00:00Z"
  },
  ...
]
```

---

### Templates

#### `GET /api/templates`
List available templates (filtered by role)
```
Query params:
  - category: string (optional, e.g., "compute", "data", "storage")

Response:
[
  {
    id: "cloud-run",
    name: "cloud-run",
    label: "Cloud Run Service",
    description: "Deploy containerized applications...",
    icon: "🚀",
    category: "compute",
    version: "1.0.0",
    requiredRoles: ["developer"],
    maxInstances: 10,
    estimatedCost: "$5-50/month",
    parameters: [
      {
        name: "service_name",
        label: "Service Name",
        description: "...",
        type: "string",
        required: true,
        validation: { pattern: "^[a-z0-9-]{3,63}$" }
      },
      ...
    ]
  },
  ...
]
```

#### `GET /api/templates/:id`
Get single template with full schema
```
Response: (full template object as above)
```

---

### Patterns (Backstage Catalog)

#### `GET /api/catalogs/patterns`
List patterns from catalog
```
Query params:
  - tag: string (optional)
  - domain: string (optional)
  - lifecycle: string (optional)
  - search: string (optional, free text search)

Response:
{
  patterns: [
    {
      id: "pat-001",
      apiVersion: "backstage.io/v1alpha1",
      kind: "System",
      metadata: {
        name: "pat-001-data-ingestion",
        title: "PAT-001 – Data Ingestion",
        description: "...",
        tags: ["pattern", "data-ingestion", "landing-zone"],
        owner: "platform-engineering",
        domain: "data-platform",
        lifecycle: "candidate_requires_review",
        buildingBlocks: {
          required: ["bigquery", "bucket", "environment", "iam"],
          optional: [],
          default: ["bigquery", "bucket"]
        },
        links: [{ title: "Pattern Registry", url: "https://..." }]
      }
    },
    ...
  ],
  total: 6,
  timestamp: "2026-04-30T14:00:00Z"
}
```

#### `GET /api/catalogs/patterns/:id`
Get single pattern
```
Response: (single pattern object from above)
```

#### `GET /api/catalogs/patterns/tags/all`
Get all available pattern tags
```
Response: { tags: ["pattern", "data-ingestion", "analytics", ...] }
```

#### `GET /api/catalogs/patterns/domains/all`
Get all pattern domains
```
Response: { domains: ["data-platform", "compute", "networking", ...] }
```

#### `GET /api/catalogs/patterns/lifecycles/all`
Get pattern lifecycle statuses
```
Response: { 
  lifecycles: [
    "candidate_requires_review",
    "first_release_candidate",
    "released_reusable_pattern",
    "deprecated"
  ]
}
```

#### `GET /api/catalogs/patterns/:id/blocks`
Get building blocks for a pattern
```
Response:
{
  id: "pat-001",
  ... (pattern fields),
  requiredBlocks: [
    {
      id: "bucket",
      name: "bucket",
      displayName: "GCS Bucket",
      description: "...",
      category: "storage",
      version: "1.0.0",
      variables: [
        {
          name: "bucket_name",
          type: "string",
          description: "...",
          required: true,
          default: null,
          validation: { pattern: "^[a-z0-9._-]{3,63}$" }
        },
        ...
      ],
      outputs: [
        { name: "bucket_id", description: "...", type: "string" }
      ],
      dependencies: [],
      tags: ["storage"]
    },
    ...
  ],
  optionalBlocks: [...]
}
```

---

### Building Blocks

#### `GET /api/catalogs/building-blocks`
List all available building blocks
```
Response:
{
  blocks: [
    {
      id: "network",
      name: "network",
      displayName: "VPC Network",
      description: "...",
      category: "network",
      version: "1.0.0",
      variables: [...],
      outputs: [...],
      dependencies: [],
      tags: ["network", "vpc"]
    },
    ...
  ]
}
```

#### `GET /api/catalogs/building-blocks/:id`
Get single building block
```
Response: (single block object from above)
```

#### `GET /api/catalogs/building-blocks/:id/variables`
Get block variables and outputs
```
Response:
{
  blockId: "network",
  variables: [...],
  outputs: [...],
  dependencies: ["iam", "security"]
}
```

---

### Deployments

#### `POST /api/deployments`
Create new template-based deployment
```
Body:
{
  templateId: "cloud-run",
  projectId: "my-project",
  serviceName: "my-service",
  parameters: {
    service_name: "my-service",
    container_image: "gcr.io/...",
    region: "europe-west1",
    environment: "dev",
    cpu: "1",
    memory: "512Mi",
    min_instances: 0,
    max_instances: 10,
    container_port: 8080,
    allow_unauthenticated: true,
    enable_cdn: false,
    environment_variables: "{}"
  }
}

Response:
{
  id: "deploy-1234567890",
  userId: "user-123",
  templateId: "cloud-run",
  projectId: "my-project",
  serviceName: "my-service",
  parameters: {...},
  status: "draft",
  createdAt: "2026-04-30T14:00:00Z",
  nextStep: "review_and_submit",
  estimatedCost: "$5-50/month"
}
```

#### `POST /api/deployments/patterns/submit`
Submit pattern-based deployment
```
Body:
{
  patternId: "pat-002-serverless-app",
  projectId: "vf-prod-security",
  projectName: "Vodafone Prod Security",
  environment: "prod",
  region: "europe-west1",
  building_blocks: {
    "cloud_run": {
      service_name: "fraud-detection-api",
      container_image: "europe-west1-docker.pkg.dev/...",
      min_instances: 2,
      max_instances: 20,
      cpu: "2",
      memory: "2Gi"
    },
    "cloud_sql": {
      instance_name: "fraud-db",
      database_version: "POSTGRES_15",
      tier: "db-custom-2-8192"
    },
    "iam_service_account": {
      account_id: "fraud-api-sa",
      display_name: "Fraud API Service Account",
      roles: ["roles/cloudsql.client"]
    }
  },
  estimatedMonthlyCost: 450,
  createdBy: "user-123",
  timestamp: "2026-04-30T14:00:00Z"
}

Response:
{
  deploymentId: "dep-1234567890-abc123",
  status: "pending",
  payload: {...},
  resolverResponse: {
    status: "submitted",
    message: "Payload queued for processing"
  },
  message: "Pattern deployment submitted",
  createdBy: "Alice Johnson",
  timestamp: "2026-04-30T14:00:00Z"
}
```

#### `GET /api/deployments`
Get all deployments (admin: all, user: own only)
```
Response:
{
  total: 15,
  deployments: [
    {
      deploymentId: "dep-1234567890",
      patternId: "pat-001",
      projectId: "my-project",
      status: "deployed",
      createdAt: "2026-04-30T14:00:00Z",
      deployedAt: "2026-04-30T14:05:00Z"
    },
    ...
  ]
}
```

#### `GET /api/deployments/:id`
Get deployment details
```
Response:
{
  id: "deploy-1234567890",
  userId: "user-123",
  templateId: "cloud-run",
  projectId: "my-project",
  serviceName: "my-service",
  parameters: {...},
  status: "deployed",
  createdAt: "2026-04-30T14:00:00Z",
  approvedAt: "2026-04-30T14:02:00Z",
  deployedAt: "2026-04-30T14:05:00Z"
}
```

#### `POST /api/deployments/:id/submit`
Submit draft deployment for approval
```
Response:
{
  ... (deployment object),
  message: "Deployment submitted for approval",
  nextStep: "awaiting_approval"
}
```

#### `POST /api/deployments/:id/approve`
Approve pending deployment (architect/admin only)
```
Body: { comment: "LGTM, looks good!" } (optional)

Response:
{
  ... (deployment object),
  status: "approved",
  message: "Deployment approved and queued for execution",
  approvedBy: "Carol White",
  estimatedTime: "2-5 minutes"
}
```

#### `POST /api/deployments/:id/reject`
Reject pending deployment (architect/admin only)
```
Body: { reason: "Cost exceeds budget threshold" }

Response:
{
  ... (deployment object),
  status: "failed",
  message: "Deployment rejected",
  rejectedBy: "Carol White",
  error: "Cost exceeds budget threshold"
}
```

#### `POST /api/deployments/patterns/:deploymentId/execute`
Execute approved pattern deployment (architect/admin only)
```
Response:
{
  deploymentId: "dep-1234567890",
  status: "deployed",
  message: "Pattern deployment initiated",
  deployedBy: "Carol White",
  timestamp: "2026-04-30T14:00:00Z",
  terraformApplied: true
}
```

---

### Projects

#### `GET /api/projects`
List accessible GCP projects
```
Response:
[
  {
    id: "my-project-dev",
    name: "My Project - Dev",
    projectNumber: "123456789",
    owner: "Alice Johnson",
    region: "us-central1"
  },
  {
    id: "my-project-prod",
    name: "My Project - Prod",
    projectNumber: "987654321",
    owner: "Alice Johnson",
    region: "us-central1"
  }
]
```

---

### Statistics

#### `GET /api/stats`
Get system statistics (admin/architect only)
```
Response:
{
  totalDeployments: 47,
  activeDeployments: 32,
  pendingApprovals: 3,
  failedDeployments: 5,
  users: 150,
  templates: 11,
  deploymentsByTemplate: [
    { template: "Cloud Run Service", count: 18 },
    { template: "GKE Autopilot Cluster", count: 12 },
    { template: "Data Pipeline", count: 8 },
    ...
  ]
}
```

---

## Data Models

### Core Data Structures

```typescript
// User
interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  department: string;
  avatar?: string;
  createdAt: Date;
}

// Template
interface Template {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  requiredRoles?: string[];
  maxInstances?: number;
  estimatedCost?: string;
  parameters: TemplateParameter[];
}

// TemplateParameter
interface TemplateParameter {
  name: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  required: boolean;
  default?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

// Pattern (Backstage)
interface Pattern {
  id: string;
  apiVersion: string;
  kind: string;
  metadata: PatternMetadata;
}

interface PatternMetadata {
  name: string;
  title: string;
  description: string;
  tags: string[];
  links?: Array<{ title: string; url: string }>;
  owner: string;
  domain: string;
  lifecycle: string;
  status: string;
  runtimeType: string;
  buildingBlocks: {
    required: string[];
    optional: string[];
    default: string[];
  };
}

// BuildingBlock
interface BuildingBlock {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  variables: Variable[];
  outputs: Array<{ name: string; description: string; type: string }>;
  dependencies: string[];
  tags: string[];
}

// Variable
interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'list' | 'map' | 'object';
  description: string;
  required: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowed_values?: string[];
  };
}

// DeploymentRequest
interface DeploymentRequest {
  id: string;
  userId: string;
  templateId: string;
  projectId: string;
  serviceName: string;
  parameters: Record<string, any>;
  status: 'draft' | 'pending' | 'approved' | 'deployed' | 'failed';
  createdAt: Date;
  approvedAt?: Date;
  deployedAt?: Date;
  error?: string;
}

// DeploymentPayload (sent to Resolver API)
interface DeploymentPayload {
  patternId: string;
  projectId: string;
  projectName: string;
  building_blocks: Record<string, Record<string, any>>;
  terraform_version: string;
  backend: string;
  modules_ref: string;
  estimatedMonthlyCost?: number;
  createdBy?: string;
  timestamp: string;
}

// ApprovalItem
interface ApprovalItem {
  id: string;
  deploymentName: string;
  templateLabel: string;
  requestedBy: string;
  projectName: string;
  environment: 'production' | 'staging' | 'dev';
  status: 'pending' | 'approved' | 'rejected';
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedCost: string;
  riskScore: number;
  changedResources: Array<{ action: 'add' | 'change' | 'destroy'; resource: string; detail: string }>;
  policyChecks: Array<{ name: string; passed: boolean }>;
  comments: Array<{ author: string; text: string; time: string }>;
}
```

---

## Success Scenarios & Error Handling

### Success Scenarios

#### Scenario 1: Developer Deploying Cloud Run Service

```
1. ✅ Login
   - User: Alice Johnson (developer, team-lead)
   - Status: Authenticated
   
2. ✅ Browse Templates
   - Sees 8 available templates (developer-role filtered)
   - Selects "Cloud Run Service" (🚀)
   
3. ✅ Configure
   - Project: "my-project-dev"
   - Service Name: "checkout-api"
   - Image: "gcr.io/my-project/checkout:v1.0"
   - Region: "europe-west1"
   - CPU: "1", Memory: "512Mi"
   - Min: 0, Max: 10 instances
   - Estimated Cost: ~$20/month
   
4. ✅ Review & Submit
   - All parameters valid
   - Status: draft → pending
   
5. ✅ Awaiting Approval
   - Architect (Carol White) receives notification
   - Sees 3 pending approvals
   - Reviews deployment
   - All policy checks pass
   
6. ✅ Approval
   - Carol approves with comment: "LGTM"
   - Status: pending → approved
   
7. ✅ Execution
   - Resolver API receives payload
   - Terraform plan generated
   - GitHub Actions triggered
   - Resources deployed
   - Status: approved → deployed
   
8. ✅ Completion
   - Alice sees deployment status: "deployed" (green)
   - Output URLs available
   - Access links provided (Service URL, Monitoring Dashboard, Logs)
```

#### Scenario 2: Architect Deploying Pattern (PAT-002: Serverless App)

```
1. ✅ Login
   - User: Carol White (admin, architect)
   - Status: Authenticated
   
2. ✅ Browse Patterns
   - Sees all 6 patterns
   - Selects "PAT-002 – Serverless Application"
   
3. ✅ Select Building Blocks
   - Required blocks:
     ├─ Cloud Run Service
     ├─ Cloud SQL Database
     └─ IAM Service Account
   - Optional blocks:
     ├─ BigQuery (enabled)
     └─ Pub/Sub (disabled)
   
4. ✅ Configure Each Block
   - Cloud Run:
     ├─ Service name: "fraud-detection-api"
     ├─ Image: "europe-west1-docker.pkg.dev/.../app:v2.1"
     ├─ CPU: 2, Memory: 2Gi
     ├─ Min: 2, Max: 20
   - Cloud SQL:
     ├─ Instance: "fraud-db"
     ├─ Version: POSTGRES_15
     ├─ Tier: db-custom-2-8192
   - IAM:
     ├─ Account ID: fraud-api-sa
     ├─ Roles: roles/cloudsql.client
   - BigQuery:
     ├─ Dataset: fraud_events_prod
     ├─ Location: EU
   
5. ✅ Review
   - Estimated cost: $450/month
   - All dependencies satisfied
   - No conflicts
   
6. ✅ Submit to Resolver
   - Payload sent to Resolver API
   - Response: "Payload queued for processing"
   
7. ✅ Auto-Approval
   - Carol is admin → auto-approved
   - Status: pending → approved → deployed
   
8. ✅ Terraform Execution
   - All modules provisioned
   - Service healthy
   - Outputs captured
```

#### Scenario 3: Alert & Observability

```
1. ✅ Service Deployed
   - Status: healthy
   - Metrics: P50 latency 42ms, error rate 0.12%
   
2. ✅ Observability Dashboard
   - Shows 8 services
   - 4 healthy, 2 degraded, 1 down, 1 critical
   
3. ✅ Alert Triggered
   - Service: "product-catalog"
   - Alert: "High latency P99 > 900ms"
   - Severity: high
   - Status: firing
   - Duration: 14 minutes
   
4. ✅ View Logs
   - Shows related errors:
     "Upstream timeout calling inventory-service"
     "Redis GET timeout (500ms)"
   
5. ✅ Acknowledge Alert
   - Ops team clicks "Acknowledge"
   - Status: firing → acknowledged
   - Note added: "Investigating cache layer"
```

---

### Error Scenarios & Handling

#### Error 1: Missing Required Parameter

```
Trigger:
- User submits deployment without required parameter
- Service Name is empty

Response:
{
  "error": "Missing required parameters",
  "missing": ["service_name"]
}

HTTP Status: 400 Bad Request

Frontend Handling:
- Error banner displayed
- Field highlighted in red
- Message: "Service Name is required"
- User can correct and retry
```

#### Error 2: Insufficient Permissions

```
Trigger:
- Developer tries to access GKE template (requires architect)
- OR user tries to approve deployment (requires architect/admin)

Response:
{
  "error": "Insufficient permissions",
  "required": ["architect", "admin"],
  "userRoles": ["developer"]
}

HTTP Status: 403 Forbidden

Frontend Handling:
- Template hidden from selection
- Error message: "You don't have permission to access this template"
- Approval button disabled
- Error message: "Only architects and admins can approve deployments"
```

#### Error 3: Invalid Parameter Value

```
Trigger:
- Service name contains uppercase: "My-Service" (pattern: ^[a-z0-9-]{3,63}$)
- Region selected: "invalid-region"

Response:
{
  "error": "Parameter validation failed",
  "field": "service_name",
  "message": "Service name must be lowercase alphanumeric and hyphens",
  "pattern": "^[a-z0-9-]{3,63}$"
}

HTTP Status: 400 Bad Request

Frontend Handling:
- Real-time validation as user types
- Error shown under field
- Submit button disabled until fixed
```

#### Error 4: Template Not Found

```
Trigger:
- GET /api/templates/invalid-id

Response:
{
  "error": "Template not found"
}

HTTP Status: 404 Not Found

Frontend Handling:
- If navigating from URL directly: "Template not available"
- Redirect to templates list
- Show error toast notification
```

#### Error 5: Deployment State Conflict

```
Trigger:
- User tries to approve an already-deployed deployment
- Status: "deployed" (not "pending")

Response:
{
  "error": "Only pending deployments can be approved"
}

HTTP Status: 400 Bad Request

Frontend Handling:
- Approval button already disabled if status != pending
- If API called anyway: show error message
- User must refresh to see current status
```

#### Error 6: User Not Found

```
Trigger:
- Request with invalid x-user-id header
- Header: "x-user-id: invalid-user"

Response:
{
  "error": "User not found"
}

HTTP Status: 401 Unauthorized

Frontend Handling:
- Session invalid
- User redirected to login page
- localStorage cleared
- Error message: "Session expired, please login again"
```

#### Error 7: External API Failure (Resolver)

```
Trigger:
- Resolver API unreachable or returns error
- Timeout or 500 error from Resolver

Response:
{
  "deploymentId": "dep-1234567890",
  "status": "pending",
  "resolverResponse": {
    "status": "submitted",
    "message": "Payload queued for processing"
  }
}

HTTP Status: 200 OK

Frontend Handling:
- Deployment created locally
- Status: pending (safe state)
- Message: "Deployment queued. Will process when Resolver API is available"
- User can check status later
```

#### Error 8: Cost Threshold Exceeded

```
Trigger:
- Deployment estimated cost: $2,500/month
- Budget limit: $500/month

Response from Policy Check:
{
  "policyChecks": [
    { "name": "Cost threshold (<€200)", "passed": false }
  ],
  "securityFlags": ["High cost (+$2000)"]
}

Frontend Handling:
- In Approvals dashboard: Risk score highlighted red
- Security flag shown: "High cost (+$2000)"
- Approve button might be disabled or require confirmation
- Comment required before approval
```

#### Error 9: Deployment Already Exists

```
Trigger:
- User submits same configuration twice quickly

Response:
- Second submission: new deployment with different ID created
- Same parameters, same project

Frontend Handling:
- User sees both deployments in "My Deployments"
- Can track both independently
- Can cancel one if needed
```

#### Error 10: Rollback on Deployment Failure

```
Trigger:
- Terraform apply fails during execution
- Example: Invalid container image, permission denied

GitHub Actions Response:
```
❌ Terraform Apply Failed
Error: google_cloud_run_service.main: Error creating service:
  googleapi: Error 403: Permission denied

Rollback: terraform destroy
Status: ✓ All resources cleaned up
```

Frontend Handling:
- Deployment status: "deployed" → "failed"
- Error message displayed to user
- Failure details logged in deployment history
- User can retry with corrected parameters
```

---

## Demo & Testing Features

### 1. Demo Deployment Flow

**File**: [frontend/components/DemoDeployment.tsx](frontend/components/DemoDeployment.tsx)

**Features**:
- **3 Scenarios**: Cloud Run, GKE, Data Pipeline
- **Live Execution**: Watch deployment steps in real-time
- **Realistic Logs**: Simulated GitHub Actions logs
- **Approval Simulation**: 2-step approval workflow
- **Resource Summary**: Final deployed resources

**Execution Steps** (example - Cloud Run):
```
1. ✓ Checkout repository (800ms)
2. ✓ Setup Terraform (2.5s)
3. ✓ Terraform validate (1.2s)
4. ✓ Generate plan (3.8s)
5. ⏳ Awaiting approval...
   → Architect (Carol White) reviewing...
6. ✓ Plan approved (by Carol White)
7. ✓ Terraform apply (6.3s)
8. ✓ Extract outputs (800ms)
9. ✓ Deployment complete!
```

**Deployed Resources**:
- Cloud Run Service: vf-fraud-detection-api
- Load Balancer: europe-west1-lb
- Cloud Armor Policy: api-waf
- Monitoring: Cloud Dashboard

**Access Links**:
- Service URL: https://vf-fraud-detection-api-xyz.run.app
- Cloud Console: https://console.cloud.google.com/...
- Monitoring: https://console.cloud.google.com/monitoring/...
- Logs: https://console.cloud.google.com/logs/...

---

### 2. Mock Data

#### Mock Users
- Alice Johnson (developer, team-lead)
- Bob Smith (developer)
- Carol White (admin, architect)

#### Mock Deployments
```
dep-001: payments-api (Cloud Run, deployed)
dep-002: data-pipeline (Cloud Composer, pending_approval)
dep-003: customer-portal (GKE, deployed)
dep-004: static-assets (Firebase, failed)
```

#### Mock Approvals
```
apr-001: payments-api-v3-upgrade (pending, critical)
apr-002: iot-processing-cluster (pending, high)
apr-003: data-warehouse-migration (pending, medium)
```

#### Mock Services (Observability)
```
s1: checkout-api (healthy, 99.98% uptime)
s2: product-catalog (degraded, 98.72% uptime)
s3: data-ingestion-job (healthy)
s4: auth-service (healthy)
s5: analytics-worker (down, 94.10% uptime)
... (8 total)
```

---

### 3. Testing Workflows

#### Test 1: Login as Different Users
1. Login as Alice (developer) → see developer templates
2. Logout
3. Login as Carol (admin) → see all templates + approvals
4. Verify role-based visibility

#### Test 2: Complete Deployment Cycle
1. Select template (Cloud Run)
2. Configure parameters
3. Submit deployment
4. Check status (pending)
5. Switch user to Carol
6. Approve deployment
7. Verify status (deployed)

#### Test 3: Validation Testing
1. Try to submit with empty service name → error
2. Try to submit with uppercase characters → error
3. Try to select invalid region → error
4. Fill correctly → success

#### Test 4: Approval Workflow
1. Create deployment as developer
2. Switch to architect view
3. See in Approvals section
4. Check policy violations
5. Add comment
6. Approve or reject

#### Test 5: Observability Dashboard
1. View all services
2. Filter by health status
3. View service metrics
4. Check alerts
5. Review logs
6. Acknowledge alert

---

### 4. Development Quick Start

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev
# Server: http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
# App: http://localhost:3000

# Test endpoints
curl -H "x-user-id: user-123" http://localhost:3001/api/user

# View logs
cd backend && tail -f logs/app.log
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **Pattern** | Pre-built infrastructure blueprint (Backstage-style catalog) |
| **Template** | Pre-configured resource definition (simpler than patterns) |
| **Building Block** | Reusable Terraform module (part of patterns) |
| **Deployment** | Instance of template/pattern applied to a project |
| **Resolver API** | External service that processes deployment payloads |
| **Approval** | Gatekeeper process for deployments (architect/admin only) |
| **Risk Score** | 0-100 measure of deployment risk (cost, security, changes) |
| **Policy Check** | Automated validation (TFLint, Checkov, budgets, windows) |
| **RBAC** | Role-Based Access Control (developer, architect, admin, etc.) |
| **Observability** | Monitoring, logging, alerting, metrics |
| **SLO** | Service Level Objective (uptime, latency, error rate targets) |

---

## Quick Reference: Common Tasks

### For Developers
1. **Deploy a service**: Dashboard → Templates → Cloud Run → Configure → Submit
2. **Check deployment status**: Dashboard → Deployments
3. **View my profile**: Click avatar → User Profile
4. **Check alerts**: Dashboard → Observability

### For Architects
1. **Review approvals**: Dashboard → Approvals (shows 3 pending)
2. **Approve deployment**: Click on approval → Review → Approve
3. **Deploy pattern**: Templates → Select PAT-* → Configure blocks → Submit
4. **View stats**: Dashboard (stats visible to architects)

### For Admins
1. **Full access**: All features available
2. **Override approval**: Can approve any deployment
3. **View system stats**: Dashboard → Statistics
4. **Manage users**: (Future feature - currently mock data)

---

## File Structure Reference

```
frontend/
├── components/
│   ├── IDPPortal.tsx           # Main app container
│   ├── LoginPage.tsx           # Auth UI
│   ├── TemplateSelection.tsx   # Template browsing
│   ├── DeploymentConfig.tsx    # Configuration wizard
│   ├── DeploymentConfigV2.tsx  # Pattern-based config
│   ├── MyDeployments.tsx       # Deployment list
│   ├── Approvals.tsx           # Approval workflow
│   ├── Observability.tsx       # Monitoring dashboard
│   ├── DemoDeployment.tsx      # Interactive demo
│   ├── UserProfile.tsx         # User info
│   └── VodafoneLogo.tsx        # Brand component
├── pages/
│   ├── _app.tsx                # Next.js app wrapper
│   ├── index.tsx               # Main page
│   └── api/
│       └── [...slug].ts        # API proxy
└── lib/
    └── api.ts                  # API client

backend/
├── src/
│   ├── index.ts                # Main API server
│   ├── services/
│   │   ├── patternService.ts   # Pattern catalog
│   │   └── buildingBlockService.ts  # Building blocks
│   ├── controllers/
│   └── patterns/
└── package.json

infra/
├── templates/
│   ├── cloud_run.yaml          # Cloud Run template reference
│   ├── gke_application.yaml    # GKE template reference
│   └── data_pipeline.yaml      # Data Pipeline template reference
└── cloud-run/
    ├── main.tf                 # Production Terraform
    ├── variables.tf
    ├── outputs.tf
    └── terraform.*.tfvars      # Environment configs
```

---

**Generated**: 2026-06-08  
**Version**: 1.0  
**Status**: Complete for User Guide Generation
