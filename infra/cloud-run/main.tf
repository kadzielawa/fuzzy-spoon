###############################################################
# Cloud Run Service - Main Configuration
# NGDI Module-based Cloud Run deployment with load balancing
###############################################################

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Service Account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = local.service_account_id
  display_name = "Service Account for ${var.service_name}"
  description  = "Terraform-managed service account for Cloud Run service: ${var.service_name}"

  project = var.project_id
}

# Basic Cloud Run permissions
resource "google_project_iam_member" "cloud_run_basic" {
  project = var.project_id
  role    = "roles/run.serviceAgent"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Logging permission
resource "google_project_iam_member" "logging_write" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run Service - using google-beta for latest features
resource "google_cloud_run_service" "service" {
  name            = var.service_name
  location        = var.region
  project         = var.project_id
  

  template {
    spec {
      service_account_name = google_service_account.cloud_run_sa.email
      
      containers {
        image = var.container_image
        
        ports {
          container_port = var.container_port
        }

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }

        env {
          name  = "PORT"
          value = tostring(var.container_port)
        }

        dynamic "env" {
          for_each = var.environment_variables
          content {
            name  = env.key
            value = env.value
          }
        }

        dynamic "env" {
          for_each = var.secrets
          content {
            name = env.key
            value_from {
              secret_key_ref {
                name = env.value.key
                key  = env.value.version
              }
            }
          }
        }
      }

      timeout_seconds       = var.timeout_seconds
      service_account_name  = google_service_account.cloud_run_sa.email
    }

    metadata {
      labels = local.common_labels
    }
  }

  metadata {
    labels = local.common_labels
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_iam_member.cloud_run_basic,
    google_project_iam_member.logging_write
  ]
}

# IAM binding for public access (if enabled)
resource "google_cloud_run_service_iam_member" "public" {
  count   = var.allow_unauthenticated ? 1 : 0
  service = google_cloud_run_service.service.name
  role    = "roles/run.invoker"
  member  = "allUsers"
  project = var.project_id
  location = var.region
}

# Ingress settings
resource "google_cloud_run_service" "ingress" {
  name            = var.service_name
  location        = var.region
  project         = var.project_id

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = var.ingress_settings
    }
  }
}

# VPC Connector binding (if provided)
resource "google_cloud_run_service" "vpc_connector" {
  count    = var.vpc_connector != "" ? 1 : 0
  name     = var.service_name
  location = var.region
  project  = var.project_id

  template {
    spec {
      vpc_access_connector = var.vpc_connector
    }
  }
}

# Custom domain mapping (if provided)
resource "google_cloud_run_domain_mapping" "custom_domain" {
  count    = var.custom_domain != "" ? 1 : 0
  name     = var.custom_domain
  location = var.region
  project  = var.project_id

  spec {
    route_name = google_cloud_run_service.service.name
  }

  depends_on = [google_cloud_run_service.service]
}

# Network Endpoint Group (NEG) for Load Balancing
resource "google_compute_network_endpoint_group" "cloudrun_neg" {
  name                  = "${var.service_name}-neg"
  network_endpoint_type = "SERVERLESS"
  location              = var.region
  project               = var.project_id

  cloud_run {
    service = google_cloud_run_service.service.name
  }

  depends_on = [google_cloud_run_service.service]
}

# Load Balancer Backend Service
resource "google_compute_backend_service" "cloudrun_backend" {
  name            = "${var.service_name}-backend"
  project         = var.project_id
  protocol        = "HTTPS"
  timeout_sec     = var.timeout_seconds
  load_balancing_scheme = "EXTERNAL"
  
  health_checks = [google_compute_health_check.cloudrun_health.id]

  backend {
    group           = google_compute_network_endpoint_group.cloudrun_neg.id
    balancing_mode  = "RATE"
    max_rate_per_endpoint = 100
  }
  
  dynamic "cdn_policy" {
    for_each = var.enable_cdn ? [1] : []
    content {
      cache_mode = "CACHE_ALL_STATIC"
      
      client_ttl = 3600
      default_ttl = 3600
      max_ttl = 86400
      
      negative_caching = true
      negative_caching_policy {
        code = 404
        ttl = 120
      }
      negative_caching_policy {
        code = 410
        ttl = 120
      }
    }
  }

  depends_on = [google_compute_network_endpoint_group.cloudrun_neg]
}

# Health Check
resource "google_compute_health_check" "cloudrun_health" {
  name    = "${var.service_name}-health-check"
  project = var.project_id

  https_health_check {
    port = "443"
  }

  check_interval_sec  = 30
  timeout_sec         = 10
  unhealthy_threshold = 3
}

# URL Map
resource "google_compute_url_map" "cloudrun_urlmap" {
  name            = "${var.service_name}-urlmap"
  project         = var.project_id
  default_service = google_compute_backend_service.cloudrun_backend.id
}

# HTTPS Target Proxy
resource "google_compute_target_https_proxy" "cloudrun_proxy" {
  name             = "${var.service_name}-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.cloudrun_urlmap.id
  ssl_certificates = [google_compute_ssl_certificate.cloudrun_cert.id]
}

# Self-signed certificate (replace with your own for production)
resource "google_compute_ssl_certificate" "cloudrun_cert" {
  name        = "${var.service_name}-ssl-cert"
  project     = var.project_id
  certificate = file("${path.module}/certs/certificate.pem")
  private_key = file("${path.module}/certs/private-key.pem")
  
  lifecycle {
    create_before_destroy = true
  }
}

# Global Forwarding Rule
resource "google_compute_global_forwarding_rule" "cloudrun_forwarding_rule" {
  name                  = "${var.service_name}-forwarding-rule"
  project               = var.project_id
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "443"
  target                = google_compute_target_https_proxy.cloudrun_proxy.id
  
  depends_on = [google_compute_target_https_proxy.cloudrun_proxy]
}

# Monitoring Alert Policy for high error rates
resource "google_monitoring_alert_policy" "cloudrun_errors" {
  count           = var.enable_monitoring ? 1 : 0
  display_name    = "${var.service_name}-error-rate-alert"
  combiner        = "OR"
  project         = var.project_id
  notification_channels = []

  conditions {
    display_name = "High Error Rate"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND resource.label.service_name=\"${var.service_name}\" AND metric.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 10

      aggregations {
        alignment_period    = "60s"
        per_series_aligner  = "ALIGN_RATE"
      }
    }
  }

  documentation {
    content   = "Cloud Run service ${var.service_name} has a high error rate (5xx responses > 10 per minute)"
    mime_type = "text/markdown"
  }
}

# Log sink for exporting logs (optional)
resource "google_logging_project_sink" "cloudrun_logs" {
  count           = var.enable_monitoring ? 1 : 0
  name            = "${var.service_name}-logs-sink"
  destination     = "logging.googleapis.com/projects/${var.project_id}/logs/${var.service_name}"
  filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\""
  project         = var.project_id
}
