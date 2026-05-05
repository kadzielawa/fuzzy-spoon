# 🏗️ Advanced IDP Portal - Complete Setup Guide

## Overview

This is a complete Infrastructure Deployment Platform (IDP) with:

- **Advanced Terraform Cloud Run Template** - Production-ready configuration with load balancing, CDN, monitoring
- **GitHub Actions CI/CD** - Automated validation, planning, and deployment workflows
- **Advanced IDP Portal Frontend** - Beautiful Next.js UI with template selection, configuration wizard, and user profile management
- **Backend API** - Express.js service with role-based access control, template management, and deployment tracking

## Project Structure

```
simple-ui/
├── infra/
│   ├── templates/           # Template definitions (YAML)
│   └── cloud-run/           # Terraform Cloud Run template
│       ├── variables.tf      # Comprehensive variable definitions
│       ├── main.tf           # Infrastructure resources  
│       ├── outputs.tf        # Output values
│       ├── backend.tf        # State management config
│       ├── .tflint.hcl       # Terraform linting rules
│       ├── README.md         # Template documentation
│       ├── terraform.tfvars.example
│       ├── terraform.dev.tfvars
│       ├── terraform.staging.tfvars
│       └── terraform.prod.tfvars
│
├── backend/
│   ├── src/
│   │   └── index.ts         # Express API with template management
│   ├── package.json
│   └── .env.example         # Environment template
│
├── frontend/
│   ├── components/
│   │   ├── IDPPortal.tsx              # Main portal component
│   │   ├── LoginPage.tsx              # Demo user login
│   │   ├── UserProfile.tsx            # User roles & deployments
│   │   ├── TemplateSelection.tsx      # Template browsing
│   │   └── DeploymentConfig.tsx       # Multi-step configuration
│   ├── pages/
│   │   ├── _app.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── .env.local.example
│
├── .github/workflows/
│   ├── terraform-validate.yml         # PR validation & planning
│   └── terraform-deploy.yml           # Production deployment
│
└── README.md (this file)
```

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start development server
npm run dev
# Server runs on http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies  
npm install

# Configure environment
cp .env.local.example .env.local
nano .env.local  # Edit API URL if needed

# Start development server
npm run dev
# App runs on http://localhost:3000
```

### 3. Terraform Template

```bash
cd infra/cloud-run

# Initialize Terraform
terraform init

# Copy and customize configuration
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Review planned changes
terraform plan

# Deploy
terraform apply
```

## IDP Portal Features

### 🎯 User Authentication
- Demo user login with 3 pre-configured roles:
  - **Developer** - Can deploy Cloud Run services
  - **Architect** - Can approve deployments, access GKE & Data Pipeline templates
  - **Admin** - Full access to all features and system statistics

### 📋 Template Selection
- **Cloud Run Service** (🚀) - Serverless container deployment
- **GKE Autopilot Cluster** (☸️) - Managed Kubernetes
- **Data Pipeline** (📊) - Apache Airflow on Cloud Composer
- **Static Site** (🌐) - Firebase Hosting

### ⚙️ Advanced Configuration
Multi-step deployment wizard:

1. **Step 1: Project Selection** - Choose GCP project
2. **Step 2: Configuration** - Form-based parameter selection
   - Infrastructure sizing (CPU, Memory, Instances)
   - Networking (VPC, Custom domains)
   - Security (Authentication, CDN)
   - Monitoring & Logging
3. **Step 3: Review** - Preview configuration and estimated costs

### 👤 User Profiles
- View assigned roles and permissions
- Track deployment history
- See capability matrix (Can Deploy, Can Approve, Can Manage)

### 📊 Admin Dashboard
- System statistics (deployments, approvals, templates)
- Deployment tracking by template
- User management view

## API Endpoints

### Authentication
All endpoints require `x-user-id` header (demo users: `user-123`, `user-456`, `user-789`)

### User Endpoints
```
GET  /api/user                 - Get current user profile
GET  /api/user/profile         - Get profile with permissions
GET  /api/user/deployments     - Get user's deployments
```

### Template Endpoints
```
GET  /api/templates            - List accessible templates
GET  /api/templates/:id        - Get template details
GET  /api/templates/:id/preview - Preview configuration
```

### Deployment Endpoints
```
POST /api/deployments                 - Create new deployment
GET  /api/deployments/:id             - Get deployment status
POST /api/deployments/:id/submit      - Submit for approval
POST /api/deployments/:id/approve     - Approve deployment (admin only)
POST /api/deployments/:id/reject      - Reject deployment (admin only)
```

### Project Endpoints
```
GET  /api/projects             - List accessible GCP projects
```

### Statistics
```
GET  /api/stats                - System statistics (admin only)
```

## Terraform Cloud Run Template

### Key Features

**✅ Load Balancing**
- Global load balancer with health checks
- Network Endpoint Groups (NEG) for Cloud Run integration
- SSL/TLS termination

**✅ Automatic Scaling**
- Configurable min/max instances
- Per-instance request rate limits
- Scale-to-zero support

**✅ CDN Support**
- Optional Cloud CDN for static content
- Configurable cache policies
- Negative caching for 404/410 responses

**✅ VPC Integration**
- VPC Connector for private networking
- Configurable ingress settings
- Network isolation options

**✅ Security**
- Service account with minimal required permissions
- IAM role management
- Binary Authorization ready
- mTLS support

**✅ Monitoring**
- Cloud Monitoring alert policies
- Cloud Logging integration
- Request/response metrics
- Custom dashboards

### Template Variables

```hcl
# Required
project_id           = "my-project"
service_name         = "my-api"
container_image      = "us-central1-docker.pkg.dev/..."

# Sizing
cpu                  = "0.5"      # 0.25, 0.5, 1, 2, 4
memory               = "512Mi"    # 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi, 16Gi, 32Gi
min_instances        = 0
max_instances        = 100

# Networking
vpc_connector        = ""         # Optional VPC connector
custom_domain        = ""         # Optional custom domain
ingress_settings     = "ALLOW_ALL"

# Features
enable_cdn           = false
enable_monitoring    = true

# Environment
environment_variables = {
  LOG_LEVEL = "INFO"
}
```

## GitHub Actions Workflows

### Validation Workflow (`terraform-validate.yml`)

Runs on every PR and push to main:

```
1. Terraform Format Check - Code formatting validation
2. Terraform Validate - Configuration validation
3. Terraform Plan - Show planned changes
4. TFLint - Linting & best practices
5. Checkov - Security scanning
```

### Deployment Workflow (`terraform-deploy.yml`)

Manual trigger with environment selection:

```
1. Create Terraform plan
2. Wait for approval (configurable)
3. Apply infrastructure changes
4. Extract and output service details
5. Rollback on failure (with notification)
```

## Configuration Examples

### Example 1: Development Service
```hcl
project_id = "my-project-dev"
service_name = "api-dev"
environment = "dev"
cpu = "0.5"
memory = "512Mi"
allow_unauthenticated = true
```

### Example 2: Production Service
```hcl
project_id = "my-project-prod"
service_name = "api-prod"
environment = "prod"
cpu = "2"
memory = "2Gi"
min_instances = 2
max_instances = 100
enable_cdn = true
allow_unauthenticated = false
custom_domain = "api.example.com"
```

### Example 3: Data Processing Service
```hcl
project_id = "my-project-data"
service_name = "batch-processor"
environment = "prod"
cpu = "4"
memory = "8Gi"
min_instances = 0
max_instances = 5
timeout_seconds = 3600  # Long-running jobs
```

## Deployment Workflow

### Step-by-Step

1. **Login** → Select demo user or authenticate
2. **Browse Templates** → Browse by category
3. **Configure** → Multi-step wizard
   - Select project
   - Fill configuration parameters
   - Preview costs
4. **Create Deployment** → Submits for approval
5. **Approval** → Admin/Architect approves
6. **Deploy** → GitHub Actions triggers Terraform
7. **Track Status** → View deployment details and logs

## Security

### Access Control
- **Role-Based Access Control (RBAC)**
  - Different templates require different roles
  - Only admins can approve deployments
  - Users see only accessible templates

- **Service Accounts** 
  - Least privilege IAM roles
  - Minimal required permissions assigned
  - Separate service accounts per environment

### Best Practices
1. Always use `allow_unauthenticated = false` in production
2. Enable custom domains with valid SSL certificates
3. Use VPC connectors for internal services
4. Enable Binary Authorization for container images
5. Configure firewall rules appropriately
6. Use Secret Manager for sensitive values

## Monitoring & Logging

### Available Outputs
```bash
# Service URL
terraform output service_url

# Load balancer IP
terraform output load_balancer_ip

# Service account
terraform output service_account_email

# Monitoring dashboard
terraform output monitoring_dashboard_url

# Logs viewer
terraform output logs_viewer_url
```

### Cloud Logging
```bash
# View Cloud Run logs
gcloud run logs read [SERVICE-NAME] --region [REGION] --limit 100

# Filter specific errors
gcloud run logs read [SERVICE-NAME] --region [REGION] \
  --filter="severity>=ERROR"

# Follow logs in real-time
gcloud run logs read [SERVICE-NAME] --region [REGION] --follow
```

## Advanced Topics

### Multi-Region Deployment
Create separate configurations for each region:
```
cloud-run-us-central1/
cloud-run-eu-west1/
cloud-run-asia-east1/
```

### Using with Terraform Cloud
```bash
terraform login  # Authenticate with Terraform Cloud
terraform init   # Initialize with cloud backend
```

### CI/CD Integration
Pre-commit hooks for validation:
```bash
#!/bin/bash
terraform fmt -check
terraform validate
tflint
```

### Customizing for Your Org
1. Fork the repository
2. Update `OWNER` and `REPO` in GitHub Actions
3. Configure state bucket
4. Customize template parameters
5. Add organization-specific labels

## Troubleshooting

### Service fails to deploy
```bash
# Check Cloud Run service status
gcloud run services describe [SERVICE-NAME] --region [REGION]

# View recent revisions
gcloud run revisions list --region [REGION]

# Check service logs
gcloud logging read "resource.type=cloud_run_revision AND \
  resource.labels.service_name=[SERVICE-NAME]" --limit 50 --format json
```

### Permission denied errors
```bash
# Check service account roles
gcloud projects get-iam-policy [PROJECT-ID] \
  --flatten="bindings[].members" \
  --filter="bindings.members:[REDACTED_EMAIL_ADDRESS_1]"

# Add necessary roles
gcloud projects add-iam-policy-binding [PROJECT-ID] \
  --member=serviceAccount:[EMAIL] \
  --role=roles/run.admin
```

### Terraform state lock
```bash
# Force unlock (use with caution!)
terraform force-unlock [LOCK-ID]
```

## Performance Optimization

### Cost Optimization
- Use `min_instances = 0` for dev/staging (scale to zero)
- Right-size CPU/Memory based on actual needs
- Enable Cloud CDN for static content
- Use committed use discounts for prod

### Performance Tuning
- Increase CPU for faster startup
- Optimize container image size
- Enable HTTP/2 for better concurrent performance
- Configure connection pooling in database clients

## Roadmap

Future enhancements:
- [ ] Multi-cloud support (AWS, Azure)
- [ ] Advanced RBAC with custom roles
- [ ] Deployment scheduling
- [ ] GitOps integration
- [ ] Cost forecasting
- [ ] Automated rollback on health check failures
- [ ] Blue-green deployments
- [ ] Canary release support

## Support & Contributing

For issues or questions:
1. Check Cloud Run documentation: https://cloud.google.com/run/docs
2. Review Terraform provider: https://registry.terraform.io/providers/hashicorp/google
3. File an issue on GitHub
4. Join our Slack channel for discussions

## License

This project is provided as-is for platform engineering teams.

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** Production Ready
