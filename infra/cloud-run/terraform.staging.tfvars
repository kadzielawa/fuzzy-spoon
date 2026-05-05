# Staging environment configuration

project_id     = "my-gcp-project-staging"
region         = "us-central1"
service_name   = "my-api-staging"
environment    = "staging"

container_image = "us-central1-docker.pkg.dev/my-gcp-project-staging/my-api/app:staging-latest"
container_port  = 8080

cpu             = "1"
memory          = "1Gi"
min_instances   = 1
max_instances   = 30
timeout_seconds = 120

allow_unauthenticated = false
ingress_settings      = "ALLOW_ALL"

vpc_connector   = ""
custom_domain   = "api-staging.example.com"
enable_cdn      = false

enable_monitoring      = true
enable_binary_authorization = false

environment_variables = {
  ENVIRONMENT         = "staging"
  LOG_LEVEL           = "INFO"
  DATABASE_POOL_SIZE  = "20"
  CACHE_ENABLED       = "true"
  CACHE_TTL           = "1800"
}

labels = {
  managed_by   = "terraform"
  template     = "cloud-run-ngdi"
  billing_code = "STAGE-001"
  owner        = "platform-team"
  environment  = "staging"
}

service_account_id = "my-api-staging-sa"
