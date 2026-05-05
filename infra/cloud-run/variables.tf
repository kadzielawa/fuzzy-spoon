###############################################################
# Cloud Run Service Template - Variables
# NGDI Module-based configuration for deploying containerized services
###############################################################

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

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be a valid GCP project ID format."
  }
}

variable "region" {
  description = "GCP region for Cloud Run service"
  type        = string
  default     = "us-central1"
  
  validation {
    condition = contains([
      "us-central1", "us-east1", "us-east4", "us-west1", "us-west4",
      "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-north1",
      "asia-east1", "asia-east2", "asia-northeast1", "asia-northeast2", "asia-northeast3",
      "asia-southeast1", "asia-southeast2", "asia-south1", "australia-southeast1"
    ], var.region)
    error_message = "Region must be a valid GCP region."
  }
}

variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", var.service_name))
    error_message = "Service name must be lowercase alphanumeric with hyphens (3-63 chars)."
  }
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "container_image" {
  description = "Full container image URI (e.g., gcr.io/project/image:tag)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9-.]+\\.[a-z]+/.*/.+:.+$", var.container_image))
    error_message = "Container image must be a valid registry URL with tag."
  }
}

variable "container_port" {
  description = "Container listening port"
  type        = number
  default     = 8080
  
  validation {
    condition     = var.container_port >= 1 && var.container_port <= 65535
    error_message = "Port must be between 1 and 65535."
  }
}

variable "memory" {
  description = "Memory allocation per instance (e.g., '512Mi', '1Gi', '4Gi')"
  type        = string
  default     = "512Mi"
  
  validation {
    condition     = can(regex("^[0-9]+(Mi|Gi)$", var.memory))
    error_message = "Memory must be in format: 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi, 16Gi, 32Gi"
  }
}

variable "cpu" {
  description = "CPU allocation per instance (e.g., '0.25', '0.5', '1', '2', '4')"
  type        = string
  default     = "0.5"
  
  validation {
    condition     = contains(["0.25", "0.5", "1", "2", "4"], var.cpu)
    error_message = "CPU must be one of: 0.25, 0.5, 1, 2, 4"
  }
}

variable "min_instances" {
  description = "Minimum number of running instances"
  type        = number
  default     = 0
  
  validation {
    condition     = var.min_instances >= 0 && var.min_instances <= 100
    error_message = "Min instances must be 0-100."
  }
}

variable "max_instances" {
  description = "Maximum number of running instances"
  type        = number
  default     = 100
  
  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 1000
    error_message = "Max instances must be 1-1000."
  }
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to the service"
  type        = bool
  default     = true
}

variable "timeout_seconds" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
  
  validation {
    condition     = var.timeout_seconds >= 1 && var.timeout_seconds <= 3600
    error_message = "Timeout must be 1-3600 seconds."
  }
}

variable "environment_variables" {
  description = "Environment variables to inject into the container"
  type        = map(string)
  default     = {}
  
  sensitive = false
}

variable "secrets" {
  description = "Secret references from Secret Manager (name => {key => version})"
  type        = map(object({
    key     = string
    version = string
  }))
  default = {}
  
  sensitive = true
}

variable "ingress_settings" {
  description = "Ingress setting for the service (ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLOUD_ONLY)"
  type        = string
  default     = "ALLOW_ALL"
  
  validation {
    condition     = contains(["ALLOW_ALL", "ALLOW_INTERNAL_ONLY", "ALLOW_INTERNAL_AND_GCLOUD_ONLY"], var.ingress_settings)
    error_message = "Ingress setting must be ALLOW_ALL, ALLOW_INTERNAL_ONLY, or ALLOW_INTERNAL_AND_GCLOUD_ONLY."
  }
}

variable "vpc_connector" {
  description = "VPC Connector name for connecting to VCP (optional)"
  type        = string
  default     = ""
}

variable "enable_cdn" {
  description = "Enable Cloud CDN for the load balancer"
  type        = bool
  default     = false
}

variable "custom_domain" {
  description = "Custom domain for the service (optional)"
  type        = string
  default     = ""
}

variable "enable_monitoring" {
  description = "Enable Cloud Monitoring and logging"
  type        = bool
  default     = true
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    managed_by = "terraform"
    template   = "cloud-run-ngdi"
  }
}

variable "service_account_id" {
  description = "Service account ID (auto-generated if not provided)"
  type        = string
  default     = ""
}

variable "enable_binary_authorization" {
  description = "Enable Binary Authorization for the service"
  type        = bool
  default     = false
}

variable "enable_mtls" {
  description = "Enable mutual TLS for container communication"
  type        = bool
  default     = false
}

locals {
  service_account_id = var.service_account_id != "" ? var.service_account_id : "${var.service_name}-sa"
  
  common_labels = merge(
    var.labels,
    {
      environment = var.environment
      service     = var.service_name
      deployed_at = timestamp()
    }
  )
}
