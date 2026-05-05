# Production environment configuration
# Copy this to terraform.prod.tfvars - requires careful review before deployment

project_id     = "my-gcp-project-prod"
region         = "us-central1"
service_name   = "my-api-prod"
environment    = "prod"

container_image = "us-central1-docker.pkg.dev/my-gcp-project-prod/my-api/app:v1.0.0"
container_port  = 8080

cpu             = "2"
memory          = "2Gi"
min_instances   = 2
max_instances   = 100
timeout_seconds = 60

allow_unauthenticated = false  # Use Identity-Aware Proxy for auth
ingress_settings      = "ALLOW_ALL"

vpc_connector   = "projects/my-gcp-project-prod/locations/us-central1/connectors/prod-connector"
custom_domain   = "api.example.com"
enable_cdn      = true

enable_monitoring           = true
enable_binary_authorization = false  # Enable after setting up policy

environment_variables = {
  ENVIRONMENT         = "production"
  LOG_LEVEL           = "WARN"
  DATABASE_POOL_SIZE  = "50"
  CACHE_ENABLED       = "true"
  CACHE_TTL           = "3600"
  MAX_CONNECTIONS     = "1000"
}

labels = {
  managed_by   = "terraform"
  template     = "cloud-run-ngdi"
  billing_code = "EXEC-001"
  owner        = "platform-team"
  environment  = "prod"
  sla          = "high-availability"
}

service_account_id = "my-api-prod-sa"
