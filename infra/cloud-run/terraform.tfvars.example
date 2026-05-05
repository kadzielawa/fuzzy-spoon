# Cloud Run Template - Example Configuration
# Copy this file to terraform.tfvars and update with your values

project_id     = "my-gcp-project"
region         = "us-central1"
service_name   = "my-api-service"
environment    = "dev"

# Container configuration
container_image = "us-central1-docker.pkg.dev/my-gcp-project/my-api-service/app:v1.0.0"
container_port  = 8080

# Resource sizing
cpu             = "0.5"
memory          = "512Mi"
min_instances   = 0
max_instances   = 50
timeout_seconds = 300

# Access control
allow_unauthenticated = true
ingress_settings      = "ALLOW_ALL"

# Optional: VPC and networking
vpc_connector   = ""
custom_domain   = ""
enable_cdn      = false

# Monitoring
enable_monitoring      = true
enable_binary_authorization = false

# Environment variables
environment_variables = {
  LOG_LEVEL       = "INFO"
  DATABASE_POOL   = "10"
  CACHE_TTL       = "3600"
}

# Labels
labels = {
  managed_by = "terraform"
  template   = "cloud-run-ngdi"
  billing_code = "DEPT-001"
  owner      = "platform-team"
}
