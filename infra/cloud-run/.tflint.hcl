# TFLint configuration for Cloud Run template validation
# https://github.com/terraform-linters/tflint

plugin "google" {
  enabled = true
  version = "0.27.0"
  source  = "github.com/terraform-linters/tflint-ruleset-google"
}

rule "terraform_naming_convention" {
  enabled = true
}

rule "terraform_standard_module_structure" {
  enabled = false # Not applicable for single templates
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}

rule "terraform_comment_syntax" {
  enabled = true
}

rule "terraform_unused_required_providers" {
  enabled = true
}

rule "google_instance_machine_type_invalid" {
  enabled = true
}

rule "google_storage_bucket_public" {
  enabled = true
}

rule "google_compute_firewall_invalid_name" {
  enabled = true
}
