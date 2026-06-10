# 🚀 Infrastructure Deployment Portal - Complete User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Portal Overview](#portal-overview)
3. [Step-by-Step Workflow](#step-by-step-workflow)
4. [Available Templates](#available-templates)
5. [Advanced Patterns](#advanced-patterns)
6. [Building Blocks](#building-blocks)
7. [Deployment Process](#deployment-process)
8. [Features & Capabilities](#features--capabilities)
9. [Role-Based Access](#role-based-access)

---

## Getting Started

### Login to the Portal

The portal provides **3 demo user accounts** to showcase different roles:

#### 👤 **User 1: Developer (Default)**
- **Email**: alice.johnson@vodafone.com
- **Roles**: developer, team-lead
- **Permissions**: Can view templates, create deployments, submit for approval
- **Use Case**: Standard team member creating infrastructure

#### 👤 **User 2: Architect**
- **Email**: bob.martinez@vodafone.com
- **Roles**: architect, admin
- **Permissions**: Full access - approve deployments, manage governance policies
- **Use Case**: Infrastructure review & approval authority

#### 👤 **User 3: Data Engineer**
- **Email**: carol.chen@vodafone.com
- **Roles**: data-engineer
- **Permissions**: Access to data pipeline templates & patterns
- **Use Case**: Data infrastructure specialist

**Access the Portal:**
```
Frontend: http://localhost:3000
Backend API: http://localhost:3001
```

---

## Portal Overview

### Main Dashboard
When you log in, you see the **main dashboard** with:

```
┌─────────────────────────────────────┐
│  IDP Portal - Deployment Wizard     │
├─────────────────────────────────────┤
│                                     │
│  👋 Welcome, [User Name]           │
│  🏢 Department: Platform Engineering│
│  📊 Your Role: Developer, Team Lead│
│                                     │
│  ┌──────────────────────────────┐  │
│  │ 📋 Select a Template/Pattern │  │
│  └──────────────────────────────┘  │
│                                     │
│  📊 Recent Deployments              │
│  ✅ Deployment Status              │
│  📋 Templates Available             │
│                                     │
└─────────────────────────────────────┘
```

### Top Navigation Features

| Feature | Purpose |
|---------|---------|
| **🏠 Home** | Return to dashboard |
| **📊 My Deployments** | View all your submitted deployments |
| **✅ Approvals** (Admin only) | Review pending approvals |
| **👁️ Observability** | Monitor deployment health & alerts |
| **👤 Profile** | View your user details & permissions |
| **🎮 Demo Deployment** | Interactive simulation of full workflow |

---

## Step-by-Step Workflow

### Phase 1️⃣: Select Template or Pattern

#### Option A: Browse Standard Templates (11 Available)

**Compute Services:**
```
1. Cloud Run Service
   └─ Serverless containerized applications
   └─ Best for: Microservices, APIs
   └─ Configuration: Container image, CPU, Memory

2. Google Kubernetes Engine (GKE)
   └─ Managed Kubernetes clusters
   └─ Best for: Complex workloads, microservices mesh
   └─ Configuration: Node pools, Istio, Pod scaling

3. Cloud Functions
   └─ Event-driven serverless functions
   └─ Best for: Event triggers, background jobs
   └─ Configuration: Runtime, timeout, memory
```

**Data Services:**
```
4. Data Pipeline (Dataflow)
   └─ Stream/batch data processing
   └─ Best for: ETL, data transformation
   └─ Configuration: Workers, autoscaling, retention

5. BigQuery
   └─ Data warehouse & analytics
   └─ Best for: Analytics, reporting, machine learning
   └─ Configuration: Dataset, tables, access control

6. Cloud Composer (Airflow)
   └─ Managed workflow orchestration
   └─ Best for: Complex data workflows, scheduling
   └─ Configuration: DAGs, worker nodes, scheduling
```

**Storage Services:**
```
7. Cloud Storage (GCS)
   └─ Object storage buckets
   └─ Best for: Data lakes, backups, archives
   └─ Configuration: Location, storage class, versioning

8. Firebase Hosting
   └─ Static site hosting with CDN
   └─ Best for: Web apps, documentation
   └─ Configuration: Custom domain, SSL
```

**Governance & Access:**
```
9. Service Account
   └─ Identity for applications & automation
   └─ Best for: Application authentication
   └─ Configuration: Roles, permissions, key management

10. New GCP Project
    └─ Create isolated project environment
    └─ Best for: Environment separation, multi-team setups
    └─ Configuration: Billing, org policies

11. Shared VPC
    └─ Network connectivity between projects
    └─ Best for: Multi-project networking
    └─ Configuration: Subnets, firewall rules
```

#### Option B: Advanced Patterns (6 Available)

Patterns combine multiple building blocks for common enterprise scenarios:

```
🎯 PAT-001: Data Ingestion Landing Zone
   ├─ Building Blocks: Network + Storage + IAM + Monitoring
   ├─ Best for: Centralized data collection
   └─ Estimated Monthly Cost: $450-$750

🎯 PAT-002: Serverless Application Platform
   ├─ Building Blocks: Cloud Run + Load Balancer + Monitoring + Security
   ├─ Best for: Microservices architecture
   └─ Estimated Monthly Cost: $300-$600

🎯 PAT-003: Managed Kubernetes Platform
   ├─ Building Blocks: GKE + Service Mesh + Monitoring + Security
   ├─ Best for: Complex containerized workloads
   └─ Estimated Monthly Cost: $1,200-$2,500

🎯 PAT-004: Event-Driven Microservices
   ├─ Building Blocks: Pub/Sub + Cloud Functions + BigQuery + IAM
   ├─ Best for: Asynchronous processing, real-time analytics
   └─ Estimated Monthly Cost: $200-$500

🎯 PAT-005: Batch Orchestration Platform
   ├─ Building Blocks: Cloud Composer + BigQuery + Storage + Monitoring
   ├─ Best for: Scheduled data jobs, ETL pipelines
   └─ Estimated Monthly Cost: $600-$1,200

🎯 PAT-006: VM Workload Platform
   ├─ Building Blocks: Compute Engine + Load Balancer + Storage + Monitoring
   ├─ Best for: Legacy applications, custom workloads
   └─ Estimated Monthly Cost: $800-$1,600
```

### Phase 2️⃣: Configure Deployment

After selecting a template/pattern, configure these settings:

```
Step 1: Service Name
├─ Name your deployment (e.g., "my-api-service")
├─ Used to: Generate project IDs, tracking
└─ Requirements: Alphanumeric, dashes allowed

Step 2: Environment Selection
├─ Development (dev)
├─ Staging (staging)
└─ Production (prod)
    └─ Note: Production requires architect approval

Step 3: Region Selection
├─ europe-west1 (Belgium)
├─ europe-west2 (London)
├─ us-central1 (Iowa)
├─ us-east1 (South Carolina)
└─ asia-east1 (Taiwan)

Step 4: Building Blocks (Select Components)
├─ ☑️ Enable Database
│   └─ Adds: Cloud SQL, managed backups, replication
├─ ☑️ Enable Pub/Sub
│   └─ Adds: Message queues, event routing
└─ ☑️ Enable Monitoring
    └─ Adds: Cloud Monitoring, alerts, dashboards

Step 5: Review Configuration
├─ Verify all settings
├─ Estimated monthly cost calculated
└─ Required approvals shown
```

### Phase 3️⃣: Submit for Processing

**What Happens:**

```
1. Frontend Validation ✅
   └─ All required fields checked
   └─ Service name format validated
   └─ Building blocks compatibility verified

2. Send to Backend API
   └─ Endpoint: POST /api/deployments/patterns/submit
   └─ Payload: Pattern ID, project ID, building blocks, environment
   └─ Authentication: x-user-id header

3. Backend Processing
   └─ User authenticated
   └─ Deployment record created
   └─ Payload sent to Resolver API
   └─ Response: Deployment ID + Status

4. Response Received
   └─ Status: "Payload queued for processing"
   └─ Deployment ID: dep-[timestamp]-[random]
   └─ Next: Awaiting approval (if required)
```

**Example Response:**
```json
{
  "deploymentId": "dep-1780920651668-3ivt59vqs",
  "status": "pending",
  "message": "Pattern deployment submitted",
  "createdBy": "Alice Johnson",
  "timestamp": "2026-06-08T12:10:51.668Z",
  "resolverResponse": {
    "status": "submitted",
    "message": "Payload queued for processing"
  }
}
```

### Phase 4️⃣: Approval Process

**For Production Deployments:**

1. **Risk Assessment** 🔍
   - Policy compliance check
   - Cost analysis
   - Security scanning
   - Environment validation

2. **Approval Required From:**
   - ✅ Architect (infrastructure review)
   - ✅ Manager (budget approval)
   - ✅ Security team (for prod)

3. **Approval Workflow:**
   ```
   Submitted (pending)
        ↓
   [ARCHITECT REVIEW] → Risk score calculated
        ↓
   Approved ✅ or Rejected ❌
        ↓
   If Approved → Ready for Execution
   ```

4. **View Pending Approvals:**
   - Go to: **Approvals** tab (architects only)
   - See: All pending deployment requests
   - Action: Review details → Approve/Reject

---

## Available Templates

### Quick Reference Table

| # | Template | Type | Use Case | Roles | Cost/Month |
|---|----------|------|----------|-------|-----------|
| 1 | Cloud Run | Compute | Microservices | All | $50-200 |
| 2 | GKE | Compute | Complex workloads | Architects | $400-1000 |
| 3 | Cloud Functions | Compute | Event triggers | All | $0-100 |
| 4 | Data Pipeline | Data | ETL/Streaming | Data Eng | $200-500 |
| 5 | BigQuery | Data | Analytics | Data Eng | $100-500 |
| 6 | Cloud Composer | Data | Orchestration | Data Eng | $300-600 |
| 7 | Cloud Storage | Storage | Object storage | All | $50-200 |
| 8 | Firebase Hosting | Storage | Static sites | All | $0-50 |
| 9 | Service Account | Access | App identity | Architects | $0 |
| 10 | GCP Project | Governance | Isolation | Architects | $0 |
| 11 | Shared VPC | Networking | Multi-project | Architects | $0-100 |

---

## Advanced Patterns

### Understanding Building Blocks

A **Pattern = Combination of Building Blocks**

```
Example: PAT-002 Serverless Application Platform
├─ 🌐 Network Block
│   ├─ VPC configuration
│   ├─ Subnets
│   └─ Firewall rules
├─ 🔐 IAM Block
│   ├─ Service accounts
│   ├─ Role bindings
│   └─ Access policies
├─ 📊 Monitoring Block
│   ├─ Dashboards
│   ├─ Alerts
│   └─ Log aggregation
└─ 🔒 Security Block
    ├─ DLP policies
    ├─ Encryption
    └─ Compliance checks
```

### Available Building Blocks (20+)

```
Infrastructure:
  • network          - VPC, subnets, firewalls
  • compute          - VM, container runtime
  • storage          - GCS, Cloud SQL, BigTable
  • load_balancer    - Traffic distribution, SSL

Data & Analytics:
  • bigquery         - Data warehouse
  • pubsub           - Message queues
  • dataflow         - Stream/batch processing
  • cloud_composer   - Workflow orchestration

Security & Access:
  • iam              - Identity & access management
  • security_policy  - Governance, compliance
  • keys             - Encryption key management
  • audit_logging    - Activity tracking

Operations:
  • monitoring       - Metrics, dashboards, alerts
  • logging          - Log collection & analysis
  • observability    - Distributed tracing
  • health_checks    - Availability monitoring
```

---

## Deployment Process

### Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: LOGIN                                       │
│ User: alice.johnson@vodafone.com (Developer)        │
│ Roles: developer, team-lead                         │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 2: DASHBOARD                                   │
│ • View recent deployments                           │
│ • See available templates (11 templates)            │
│ • Browse advanced patterns (6 patterns)             │
│ • Check user profile & permissions                  │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 3: SELECT TEMPLATE/PATTERN                     │
│ Choice A: Cloud Run Service (simple)                │
│ Choice B: PAT-002 Serverless Platform (advanced)   │
│ → Form loads with pattern details                   │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 4: CONFIGURE                                   │
│ Service Name: my-payment-api                        │
│ Environment: dev                                    │
│ Region: europe-west2 (London)                       │
│ Building Blocks: Database ✓, Pub/Sub ✓             │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 5: REVIEW                                      │
│ • Estimated Cost: $450/month                        │
│ • Required Approvals: Yes (for prod)               │
│ • Validation: ✓ All checks passed                   │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 6: SUBMIT                                      │
│ POST /api/deployments/patterns/submit               │
│ Response: Deployment ID + Status                    │
│ Status: "Payload queued for processing"             │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 7: APPROVAL (if prod)                          │
│ Sent to: bob.martinez@vodafone.com (Architect)     │
│ Review: Risk assessment, policy check               │
│ Decision: ✅ Approved or ❌ Rejected               │
└────────────────┬────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────┐
│ STEP 8: EXECUTION                                   │
│ Resolver API receives payload                       │
│ ↓ Terraform generated                              │
│ ↓ GitHub PR created                                │
│ ↓ Infrastructure deployed to GCP                    │
│ Status: "Deployment successful"                     │
└─────────────────────────────────────────────────────┘
```

### API Endpoints Used

```
1. Authentication
   GET /api/user                    → Get current user info

2. Template Discovery
   GET /api/templates               → List all templates
   GET /api/templates/:id           → Template details

3. Pattern Discovery
   GET /api/catalogs/patterns       → Browse patterns
   GET /api/catalogs/patterns?tag=X → Filter by tag

4. Building Blocks
   GET /api/catalogs/building-blocks → List blocks
   POST /api/catalogs/blocks/:id     → Get block details

5. Deployment Submission
   POST /api/deployments/patterns/submit  → Submit deployment

6. Deployment Tracking
   GET /api/deployments/:id         → Get deployment status
   GET /api/deployments/history     → Deployment history

7. Approval Workflow
   POST /api/deployments/:id/submit     → Submit for approval
   POST /api/deployments/:id/approve    → Approve deployment

8. Monitoring
   GET /api/stats                   → System statistics
   GET /api/projects                → Project listing
```

---

## Features & Capabilities

### 🎯 Core Features

#### 1. **Multi-Role Authorization**
```
Developers:      Create, submit deployments
Team Leads:      Review team deployments
Architects:      Approve, manage governance
Admins:          Full system access
Data Engineers:  Data-specific templates
```

#### 2. **Template Management**
- 11 pre-built templates
- Filter by type (Compute, Data, Storage, Governance)
- Cost estimation
- Required approvals shown
- Deployment history

#### 3. **Advanced Patterns**
- 6 enterprise patterns (PAT-001 to PAT-006)
- Combine multiple building blocks
- Best practices included
- Preconfigured for scale

#### 4. **Building Block Library**
- 20+ reusable components
- Mix and match for custom deployments
- Full metadata & documentation
- Integration examples

#### 5. **Configuration Wizard**
- Step-by-step guided setup
- Input validation
- Auto-generated IDs
- Cost calculation

#### 6. **Deployment Tracking**
```
Status Lifecycle:
Draft → Submitted → Pending Approval → Approved → Executing → Success/Failed
```

#### 7. **Approval Workflow**
- Risk assessment
- Policy compliance checks
- Multi-level approval
- Audit trail

#### 8. **Observability Dashboard**
- Real-time deployment status
- Error tracking
- Cost monitoring
- Audit logs

#### 9. **User Profile Management**
- View assigned roles
- See permissions
- Department information
- Avatar & preferences

---

## Role-Based Access

### Developer Workflow
```
1. Login → Dashboard
2. Select template or pattern
3. Fill configuration form
4. Submit for deployment
5. Track status in "My Deployments"
6. (Await approval if production)
```

### Architect Workflow
```
1. Login → Dashboard
2. Navigate to "Approvals" tab
3. Review pending deployments
4. Assess risk & policy compliance
5. Make approval decision
6. Document approval in audit trail
```

### Admin Workflow
```
1. Login → Dashboard
2. Access "System Statistics"
3. View all deployments across organization
4. Manage governance policies
5. Configure templates & patterns
6. Monitor system health
```

---

## Common Tasks

### 📋 Task: Deploy a Microservice
1. Go to **Templates** → Select **Cloud Run Service**
2. Enter service name: `my-microservice-api`
3. Choose environment: `staging`
4. Select region: `europe-west1`
5. Enable building blocks: Database ✓
6. Click **Submit**
7. Share deployment ID with team
8. Monitor in **My Deployments** tab

### 📊 Task: Set Up Data Pipeline
1. Go to **Patterns** → Select **PAT-005: Batch Orchestration**
2. Enter service name: `daily-etl-job`
3. Choose environment: `production`
4. Enable blocks: BigQuery ✓, Monitoring ✓
5. Click **Submit**
6. Wait for architect approval
7. Check status once approved

### ✅ Task: Review Deployment
1. Go to **Approvals** (architects only)
2. Find pending deployment
3. Click **Review**
4. Assess:
   - Cost implications
   - Security policies
   - Team capacity
5. Click **Approve** or **Reject**
6. Add optional notes
7. Decision recorded

### 📈 Task: Monitor Infrastructure
1. Go to **Observability** tab
2. View dashboard showing:
   - Active deployments
   - Resource utilization
   - Cost trends
   - Alert status
3. Drill down into specific deployments
4. Check logs and metrics

---

## Success Scenarios

### ✅ Scenario 1: Quick Dev Environment
**User**: Developer  
**Template**: Cloud Run  
**Timeline**: 5 minutes  
**Result**: Dev service running, automated approval

### ✅ Scenario 2: Production Complex Setup
**User**: Architect  
**Pattern**: PAT-002 (Serverless)  
**Timeline**: 15 minutes setup + approval  
**Result**: Multi-region production ready

### ✅ Scenario 3: Data Pipeline Creation
**User**: Data Engineer  
**Pattern**: PAT-005 (Batch Orchestration)  
**Timeline**: 10 minutes + 2 hours data loading  
**Result**: Automated daily ETL running

### ✅ Scenario 4: Compliance Deployment
**User**: Team + Architect  
**Pattern**: PAT-001 (Data Landing Zone)  
**Timeline**: 20 minutes + security review  
**Result**: Compliant infrastructure with audit logs

---

## Support & Next Steps

### 📞 Getting Help
- Check **Help** section in user profile
- Review template descriptions
- Contact architecture team
- Check audit logs for deployment history

### 🚀 Next Steps
1. **Try a simple deployment** → Start with Cloud Run
2. **Explore patterns** → See enterprise setups
3. **Build custom configuration** → Mix building blocks
4. **Scale to production** → Use approval workflow
5. **Monitor infrastructure** → Use observability tools

---

## Quick Reference

### Portal URLs
| Component | URL |
|-----------|-----|
| Frontend Portal | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Health Check | http://localhost:3001/health |

### Demo Users
| Email | Role | Password |
|-------|------|----------|
| alice.johnson@vodafone.com | Developer | any |
| bob.martinez@vodafone.com | Architect | any |
| carol.chen@vodafone.com | Data Engineer | any |

### Key Endpoints for Developers
```bash
# Get user info
curl http://localhost:3000/api/user -H "x-user-id: user-123"

# List templates
curl http://localhost:3000/api/templates

# List patterns
curl http://localhost:3000/api/catalogs/patterns

# Submit deployment
curl -X POST http://localhost:3000/api/deployments/patterns/submit \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{"patternId":"cloud_run","projectId":"my-service",...}'
```

---

## Portal Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Pages:                                                 │  │
│  │ • / (Dashboard)      • /deployments                    │  │
│  │ • /approvals         • /observability                  │  │
│  │ • /demo-deployment   • /user-profile                   │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────────┘
                     │ HTTP/REST API
                     ↓
┌──────────────────────────────────────────────────────────────┐
│                     BACKEND (Express.js)                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Services:                                              │  │
│  │ • User Management        • Pattern Service            │  │
│  │ • Deployment Service     • Building Block Service     │  │
│  │ • Approval Workflow      • Cost Calculation           │  │
│  └────────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ↓           ↓           ↓
    ┌────────┐  ┌─────────┐  ┌──────────┐
    │Catalog │  │Resolver │  │Terraform │
    │API     │  │API      │  │Modules   │
    └────────┘  └─────────┘  └──────────┘
         ↓           ↓           ↓
         └───────────┼───────────┘
                     ↓
            ┌──────────────────┐
            │    GCP Cloud     │
            │ (Actual Infra)   │
            └──────────────────┘
```

---

**Portal Version**: 1.0  
**Last Updated**: June 2026  
**For Support**: Contact architecture team
