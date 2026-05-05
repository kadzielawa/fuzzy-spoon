###############################################################
# Cloud Run Service - Outputs
###############################################################

output "service_id" {
  description = "Cloud Run service ID"
  value       = google_cloud_run_service.service.id
}

output "service_url" {
  description = "Auto-generated Cloud Run service URL"
  value       = google_cloud_run_service.service.status[0].url
}

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_service.service.name
}

output "revision" {
  description = "Latest revision of the Cloud Run service"
  value       = google_cloud_run_service.service.status[0].latest_ready_revision_name
}

output "custom_domain_url" {
  description = "Custom domain URL (if configured)"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "Not configured"
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.cloud_run_sa.email
}

output "service_account_id" {
  description = "Service account ID"
  value       = google_service_account.cloud_run_sa.name
}

output "load_balancer_ip" {
  description = "Global Load Balancer IP address"
  value       = google_compute_global_forwarding_rule.cloudrun_forwarding_rule.ip_address
}

output "load_balancer_url" {
  description = "Load Balancer URL"
  value       = "https://${google_compute_global_forwarding_rule.cloudrun_forwarding_rule.ip_address}"
}

output "neg_id" {
  description = "Network Endpoint Group ID"
  value       = google_compute_network_endpoint_group.cloudrun_neg.id
}

output "backend_service_id" {
  description = "Backend service ID"
  value       = google_compute_backend_service.cloudrun_backend.id
}

output "health_check_id" {
  description = "Health check ID"
  value       = google_compute_health_check.cloudrun_health.id
}

output "ssl_certificate_id" {
  description = "SSL certificate ID"
  value       = google_compute_ssl_certificate.cloudrun_cert.id
}

output "url_map_id" {
  description = "URL Map ID"
  value       = google_compute_url_map.cloudrun_urlmap.id
}

output "terraform_state_commands" {
  description = "Useful Terraform commands for managing state"
  value = {
    plan  = "terraform plan -out=tfplan"
    apply = "terraform apply tfplan"
    destroy = "terraform destroy"
    state_list = "terraform state list"
    state_show = "terraform state show google_cloud_run_service.service"
  }
}

output "monitoring_dashboard_url" {
  description = "URL to Cloud Run service metrics in Cloud Console"
  value       = "https://console.cloud.google.com/run/detail/${var.region}/${google_cloud_run_service.service.name}/metrics?project=${var.project_id}"
}

output "logs_viewer_url" {
  description = "URL to Cloud Logging for this service"
  value       = "https://console.cloud.google.com/logs/query?project=${var.project_id}&query=resource.type%3D%22cloud_run_revision%22%20AND%20resource.labels.service_name%3D%22${google_cloud_run_service.service.name}%22"
}

output "service_details" {
  description = "Comprehensive service details"
  value = {
    region             = var.region
    project_id         = var.project_id
    service_name       = var.service_name
    environment        = var.environment
    container_image    = var.container_image
    cpu                = var.cpu
    memory             = var.memory
    min_instances      = var.min_instances
    max_instances      = var.max_instances
    container_port     = var.container_port
    timeout_seconds    = var.timeout_seconds
    allow_unauthenticated = var.allow_unauthenticated
    cdn_enabled        = var.enable_cdn
    vpc_connector      = var.vpc_connector
    service_account    = google_service_account.cloud_run_sa.email
  }

  depends_on = [google_cloud_run_service.service]
}
