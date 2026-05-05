# Development environment configuration
# Copy this to terraform.dev.tfvars and customize for your development project

project_id     = "my-gcp-project-dev"
region         = "us-central1"
service_name   = "my-api-dev"
environment    = "dev"

container_image = "us-central1-docker.pkg.dev/my-gcp-project-dev/my-api/app:latest"
container_port  = 8080

cpu             = "0.5"
memory          = "512Mi"
min_instances   = 0
max_instances   = 10
timeout_seconds = 300

allow_unauthenticated = true
ingress_settings      = "ALLOW_ALL"

vpc_connector   = ""
custom_domain   = ""
enable_cdn      = false

enable_monitoring      = true
enable_binary_authorization = false

environment_variables = {
  ENVIRONMENT         = "development"
  LOG_LEVEL           = "DEBUG"
  DATABASE_POOL_SIZE  = "5"
  CACHE_ENABLED       = "false"
}

labels = {
  managed_by   = "terraform"
  template     = "cloud-run-ngdi"
  billing_code = "DEV-001"
  owner        = "platform-team"
  environment  = "dev"
}

service_account_id = "my-api-dev-sa"
