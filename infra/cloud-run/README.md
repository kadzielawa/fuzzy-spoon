# Cloud Run Service Template (NGDI)

A production-ready Terraform template for deploying containerized services to Google Cloud Run using NGDI modules.

## Features

✅ **Service Account Management** - Automatic service account creation with proper IAM roles
✅ **Load Balancing** - Global load balancer with health checks
✅ **CDN Support** - Optional Cloud CDN for static content caching
✅ **Monitoring & Logging** - Cloud Monitoring alert policies and log routing
✅ **Custom Domains** - Support for custom domain mapping
✅ **VPC Integration** - Optional VPC connector for private networking
✅ **Secret Management** - Support for Google Secret Manager integration
✅ **Security** - Binary authorization and mTLS support ready
✅ **Auto-scaling** - Configurable min/max instances and resource limits

## Prerequisites

- Terraform >= 1.6
- Google Cloud SDK installed and authenticated
- Project with Cloud Run API enabled
- Service account with necessary permissions

```bash
gcloud services enable run.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

## Quick Start

### 1. Initialize Terraform

```bash
terraform init
```

### 2. Create Configuration

Copy the example file and customize for your service:

```bash
cp terraform.tfvars.example terraform.tfvars
```

### 3. Deploy

```bash
# Review changes
terraform plan

# Deploy the service
terraform apply
```

## Configuration Options

### Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `project_id` | string | GCP Project ID |
| `service_name` | string | Cloud Run service name (lowercase, max 63 chars) |
| `container_image` | string | Full container image URI with tag |

### Key Optional Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `region` | string | `us-central1` | GCP region |
| `environment` | string | `dev` | Environment stage (dev/staging/prod) |
| `cpu` | string | `0.5` | CPU allocation (0.25, 0.5, 1, 2, 4) |
| `memory` | string | `512Mi` | Memory allocation (256Mi-32Gi) |
| `min_instances` | number | `0` | Minimum running instances (0-100) |
| `max_instances` | number | `100` | Maximum running instances (1-1000) |
| `container_port` | number | `8080` | Container listening port |
| `timeout_seconds` | number | `300` | Request timeout (1-3600 seconds) |
| `allow_unauthenticated` | bool | `true` | Allow public access |
| `enable_cdn` | bool | `false` | Enable Cloud CDN |
| `enable_monitoring` | bool | `true` | Enable monitoring alerts |
| `environment_variables` | map | `{}` | Environment variables for container |
| `labels` | map | `{}` | Resource labels |

## Deployment Examples

### Example 1: Simple Web Service (Dev)

```hcl
project_id              = "my-project"
region                  = "us-central1"
service_name            = "web-api"
environment             = "dev"
container_image         = "us-central1-docker.pkg.dev/my-project/web-api/app:latest"
allow_unauthenticated   = true
cpu                     = "0.5"
memory                  = "512Mi"
```

### Example 2: Production with CDN

```hcl
project_id              = "my-project"
region                  = "us-central1"
service_name            = "api-prod"
environment             = "prod"
container_image         = "us-central1-docker.pkg.dev/my-project/api/app:v1.2.3"
allow_unauthenticated   = false  # Use Identity-Aware Proxy
cpu                     = "2"
memory                  = "2Gi"
min_instances           = 2
max_instances           = 50
enable_cdn              = true
custom_domain           = "api.example.com"
timeout_seconds         = 60

environment_variables = {
  ENVIRONMENT        = "production"
  LOG_LEVEL          = "WARN"
  MAX_CONNECTIONS    = "100"
  DATABASE_POOL_SIZE = "50"
}

labels = {
  environment   = "prod"
  billing_code  = "EXEC-001"
  owner         = "platform-eng"
}
```

### Example 3: With VPC and Secrets

```hcl
project_id            = "my-project"
service_name          = "internal-service"
environment           = "prod"
container_image       = "us-central1-docker.pkg.dev/my-project/svc/app:v2.0.0"
vpc_connector         = "projects/my-project/locations/us-central1/connectors/my-connector"
ingress_settings      = "ALLOW_INTERNAL_ONLY"
allow_unauthenticated = false

environment_variables = {
  API_ENDPOINT = "https://internal-api.internal"
  CACHE_TTL    = "1800"
}

secrets = {
  DATABASE_PASSWORD = {
    key     = "db-password"
    version = "latest"
  }
  API_KEY = {
    key     = "api-key-prod"
    version = "1"
  }
}
```

## Outputs

After deployment, retrieve service details:

```bash
# Get the service URL
terraform output service_url

# Get all outputs
terraform output

# Get specific details
terraform output service_details
```

### Available Outputs

- `service_url` - Auto-generated Cloud Run service URL
- `service_account_email` - Service account email for IAM bindings
- `load_balancer_ip` - Global Load Balancer IP address
- `monitoring_dashboard_url` - Link to Cloud Console metrics
- `logs_viewer_url` - Link to Cloud Logging for this service
- `service_details` - Comprehensive configuration summary

## Managing the Deployment

### Scale the Service

Update `terraform.tfvars` to change instance counts or resource allocation:

```bash
# Edit the file
nano terraform.tfvars

# Apply changes
terraform plan
terraform apply
```

### Update Container Image

Update only the image:

```bash
terraform apply -var="container_image=us-central1-docker.pkg.dev/my-project/app:v1.2.4"
```

### View Service Logs

```bash
# Via gcloud
gcloud run logs read [SERVICE-NAME] --region [REGION] --limit 50

# Via Cloud Console
terraform output logs_viewer_url  # Visit URL in browser
```

### Monitor Service

```bash
# View metrics
terraform output monitoring_dashboard_url  # Visit URL in browser

# Check scalability metrics
gcloud run services describe [SERVICE-NAME] --region [REGION]
```

## Cleanup

Destroy the entire deployment:

```bash
terraform destroy
```

Confirm the resource deletion when prompted.

## Security Considerations

1. **Service Account Permissions**: Service account has minimal required permissions. Review in `main.tf` before deployment.

2. **Public Access**: Set `allow_unauthenticated = false` in production and use Identity-Aware Proxy for auth.

3. **Secrets Management**: Use Google Secret Manager instead of environment variables for sensitive data.

4. **VPC Connectivity**: Use VPC connectors to isolate services and restrict access to internal resources.

5. **SSL/TLS**: For custom domains, ensure proper SSL certificates are configured.

6. **Network Policy**: Configure firewall rules and ingress settings appropriately.

## Troubleshooting

### Service fails to deploy

Check logs:
```bash
terraform show
gcloud run services describe [SERVICE-NAME] --region [REGION]
```

### Container image not found

Verify:
```bash
gcloud artifacts docker images list [REGION]-docker.pkg.dev/[PROJECT]/[REPO]
```

### Permission denied errors

Ensure service account has necessary roles:
```bash
gcloud projects get-iam-policy [PROJECT-ID] \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:[email@gserviceaccount.com]"
```

## Advanced Topics

### Using with Terraform Cloud/Enterprise

1. Set up remote state in Terraform Cloud
2. Configure environment variables for `GOOGLE_PROJECT`, `GOOGLE_REGION`
3. Use VCS integration for CI/CD

### Multi-region deployment

Create separate directories with region-specific `terraform.tfvars`:

```
infra/
  cloud-run-us-central1/
    main.tf → symlink to ../cloud-run/main.tf
    terraform.tfvars → region = "us-central1"
  cloud-run-us-east1/
    main.tf → symlink to ../cloud-run/main.tf
    terraform.tfvars → region = "us-east1"
```

### Using with Terraform Modules

Wrap this template as a module:

```hcl
module "api_service" {
  source = "./modules/cloud-run"
  
  project_id      = var.project_id
  region          = var.region
  service_name    = "my-api"
  container_image = "us-central1-docker.pkg.dev/..."
  # ... other variables
}
```

## Support

For issues or questions:
1. Check Cloud Run documentation: https://cloud.google.com/run/docs
2. Review Terraform Google provider: https://registry.terraform.io/providers/hashicorp/google/latest/docs
3. Check NGDI module documentation for specific module details

## License

Template provided as-is for NGDI module users.
