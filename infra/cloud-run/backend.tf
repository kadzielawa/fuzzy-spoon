# Terraform backend configuration for state management
# Configure this for remote state storage with Terraform Cloud or GCS

terraform {
  # Local backend (development - not recommended for production)
  # Uncomment and use if no remote backend is configured
  # backend "local" {
  #   path = "terraform.tfstate"
  # }

  # Google Cloud Storage backend (recommended for production)
  # Requires: gsutil, gcloud CLI configured with credentials
  # Usage: terraform init -backend-config=bucket=my-bucket -backend-config=prefix=cloud-run/dev
  backend "gcs" {
    # Configure via command line:
    # terraform init \
    #   -backend-config=bucket=my-terraform-state-bucket \
    #   -backend-config=prefix=cloud-run/dev

    # Or hardcode values below (not recommended for security)
    # bucket = "my-terraform-state-bucket"
    # prefix = "cloud-run"
  }

  # Alternative: Terraform Cloud backend
  # Uncomment to use Terraform Cloud for state management
  # cloud {
  #   organization = "my-organization"
  #   workspaces {
  #     name = "cloud-run-dev"
  #   }
  # }
}

# Configure required providers
terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}
