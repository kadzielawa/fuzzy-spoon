import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Template {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  requiredRoles?: string[];
  maxInstances?: number;
  estimatedCost?: string;
  // Pattern-specific metadata
  tags?: string[];
  lifecycle?: string;
  status?: string;
  owner?: string;
  runtimeType?: string;
  buildingBlocks?: {
    required?: string[];
    optional?: string[];
    default?: string[];
  };
  links?: Array<{ title: string; url: string }>;
  releaseBucket?: string;
}

/* ─── Local pattern enrichment ───────────────────────────────────────────── */
const PATTERN_META: Record<string, {
  badge?: string;
  badgeColor?: string;
  complexity: 'Low' | 'Medium' | 'High';
  deployTime: string;
  tags: string[];
  usedBy: number;
}> = {
  // ── Multi-module patterns ──────────────────────────────────────────────────
  'cloud-run':         { badge: 'Most Popular', badgeColor: '#E60000', complexity: 'Low',    deployTime: '~3 min',  tags: ['containers','auto-scaling','serverless'],        usedBy: 47 },
  'gke-cluster':       { badge: 'Enterprise',   badgeColor: '#7C3AED', complexity: 'High',   deployTime: '~12 min', tags: ['kubernetes','ha','workload-identity'],           usedBy: 12 },
  'data-pipeline':     {                                                complexity: 'High',   deployTime: '~15 min', tags: ['airflow','dataflow','etl','bq','gcs'],           usedBy: 8  },
  'static-site':       { badge: 'Quick Start',  badgeColor: '#16a34a', complexity: 'Low',    deployTime: '~2 min',  tags: ['cdn','hosting','https','dns'],                  usedBy: 31 },
  'pubsub-pipeline':   { badge: 'New',          badgeColor: '#2563eb', complexity: 'Low',    deployTime: '~2 min',  tags: ['messaging','event-driven','async'],             usedBy: 14 },
  'bigquery-dataset':  {                                                complexity: 'Medium', deployTime: '~5 min',  tags: ['analytics','warehouse','iam','scheduler'],      usedBy: 22 },
  'vpc-network':       {                                                complexity: 'High',   deployTime: '~6 min',  tags: ['networking','shared-vpc','firewall','nat'],     usedBy: 9  },
  'cloud-functions':   {                                                complexity: 'Low',    deployTime: '~3 min',  tags: ['serverless','event-driven','scheduler'],        usedBy: 33 },
  'new-gcp-project':   { badge: 'Foundation',   badgeColor: '#0ea5e9', complexity: 'High',   deployTime: '~8 min',  tags: ['project','finops','billing','audit','iam'],     usedBy: 6  },
  // ── Atomic / single-resource patterns ─────────────────────────────────────
  'service-account':   { badge: 'Atomic',       badgeColor: '#9ca3af', complexity: 'Low',    deployTime: '~1 min',  tags: ['iam','service-account','workload-identity'],    usedBy: 58 },
  'bq-dataset-single': { badge: 'Atomic',       badgeColor: '#9ca3af', complexity: 'Low',    deployTime: '~1 min',  tags: ['bigquery','dataset','analytics'],               usedBy: 41 },
  'gcs-bucket':        { badge: 'Atomic',       badgeColor: '#9ca3af', complexity: 'Low',    deployTime: '~1 min',  tags: ['storage','bucket','lifecycle'],                 usedBy: 63 },
};

/* ─── Terraform modules per pattern ─────────────────────────────────────── */
const NGDI_BASE = 'https://github.com/VFGROUP-NSE-DNOSS/DNE-PE-NGDI-TERRAFORM-MODULES';
const ngdiSrc  = (m: string) => `git::${NGDI_BASE}.git//${m}`;
const ngdiLink = (m: string) => `${NGDI_BASE}/tree/main/${m}`;

interface TfModule {
  name: string;
  source: string;
  link: string;
  version: string;
  description: string;
  keyParams: Array<{ name: string; type: string; default?: string; description: string }>;
}

const PATTERN_MODULES: Record<string, TfModule[]> = {
  // ── Cloud Run ──────────────────────────────────────────────────────────────
  'cloud-run': [
    {
      name: 'cloud_run', source: ngdiSrc('cloud_run'), link: ngdiLink('cloud_run'), version: '~> 2.4.1',
      description: 'Fully-managed Cloud Run service with traffic splits, custom domain, concurrency and Cloud Armor.',
      keyParams: [
        { name: 'service_name',  type: 'string', description: 'Name of the Cloud Run service' },
        { name: 'image',         type: 'string', description: 'Container image URI from Artifact Registry' },
        { name: 'region',        type: 'string', default: 'europe-west1', description: 'GCP region' },
        { name: 'min_instances', type: 'number', default: '0',     description: 'Min autoscaling instances' },
        { name: 'max_instances', type: 'number', default: '10',    description: 'Max autoscaling instances' },
        { name: 'cpu',           type: 'string', default: '1000m', description: 'vCPU allocation' },
        { name: 'memory',        type: 'string', default: '512Mi', description: 'Memory limit' },
      ],
    },
    {
      name: 'artifact_registry', source: ngdiSrc('artifact_registry'), link: ngdiLink('artifact_registry'), version: '~> 1.2.0',
      description: 'Docker repository in Artifact Registry for storing and versioning container images.',
      keyParams: [
        { name: 'repository_id', type: 'string', description: 'Repository ID' },
        { name: 'location',      type: 'string', default: 'europe-west1', description: 'Registry location' },
        { name: 'format',        type: 'string', default: 'DOCKER', description: 'Repository format' },
      ],
    },
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'Dedicated service account with least-privilege IAM bindings for the Cloud Run service.',
      keyParams: [
        { name: 'account_id', type: 'string', description: 'Service account ID' },
        { name: 'roles',      type: 'list(string)', description: 'IAM roles to grant' },
      ],
    },
    {
      name: 'network', source: ngdiSrc('network'), link: ngdiLink('network'), version: '~> 2.1.0',
      description: 'VPC network with Serverless VPC Access connector enabling Cloud Run egress to private resources.',
      keyParams: [
        { name: 'network_name', type: 'string', description: 'VPC name' },
        { name: 'create_nat',   type: 'bool',   default: 'true', description: 'Provision Cloud NAT for egress' },
      ],
    },
    {
      name: 'dns', source: ngdiSrc('dns'), link: ngdiLink('dns'), version: '~> 1.1.3',
      description: 'Cloud DNS managed zone and CNAME records pointing to the Cloud Run service URL.',
      keyParams: [
        { name: 'dns_zone',   type: 'string', description: 'Managed DNS zone name' },
        { name: 'visibility', type: 'string', default: 'public', description: 'public or private' },
      ],
    },
    {
      name: 'project_services', source: ngdiSrc('project_services'), link: ngdiLink('project_services'), version: '~> 1.1.1',
      description: 'Enables run.googleapis.com, artifactregistry.googleapis.com and dependent APIs.',
      keyParams: [
        { name: 'services', type: 'list(string)', default: '["run.googleapis.com"]', description: 'APIs to enable' },
      ],
    },
    {
      name: 'vf_security_policy', source: ngdiSrc('vf_security_policy'), link: ngdiLink('vf_security_policy'), version: '~> 1.2.1',
      description: 'Cloud Armor WAF policy with pre-configured OWASP rules attached to the load balancer.',
      keyParams: [
        { name: 'policy_name', type: 'string', description: 'Security policy name' },
        { name: 'enable_layer7_ddos_defense', type: 'bool', default: 'true', description: 'Enable adaptive DDoS protection' },
      ],
    },
    {
      name: 'logging_sink', source: ngdiSrc('logging_sink'), link: ngdiLink('logging_sink'), version: '~> 1.0.2',
      description: 'Log export sink routing Cloud Run request logs to BigQuery or GCS for auditing.',
      keyParams: [
        { name: 'sink_name',   type: 'string', description: 'Log sink name' },
        { name: 'destination', type: 'string', description: 'Sink destination URI (bigquery/storage)' },
      ],
    },
  ],
  // ── GKE Cluster ───────────────────────────────────────────────────────────
  'gke-cluster': [
    {
      name: 'gke_standard_cluster', source: ngdiSrc('gke_standard_cluster'), link: ngdiLink('gke_standard_cluster'), version: '~> 3.2.0',
      description: 'Production-grade GKE Standard cluster with private nodes, release channels and binary authorisation.',
      keyParams: [
        { name: 'cluster_name',    type: 'string', description: 'Cluster name' },
        { name: 'node_count',      type: 'number', default: '3',             description: 'Nodes per zone' },
        { name: 'machine_type',    type: 'string', default: 'e2-standard-4', description: 'Node machine type' },
        { name: 'release_channel', type: 'string', default: 'REGULAR',       description: 'GKE release channel' },
      ],
    },
    {
      name: 'gke_autopilot_cluster', source: ngdiSrc('gke_autopilot_cluster'), link: ngdiLink('gke_autopilot_cluster'), version: '~> 1.1.0',
      description: 'Autopilot variant — fully-managed node lifecycle for unpredictable workloads.',
      keyParams: [
        { name: 'cluster_name', type: 'string', description: 'Cluster name' },
        { name: 'region',       type: 'string', default: 'europe-west4', description: 'Cluster region' },
      ],
    },
    {
      name: 'network', source: ngdiSrc('network'), link: ngdiLink('network'), version: '~> 2.1.0',
      description: 'VPC with dedicated GKE subnet and secondary ranges for pods and services.',
      keyParams: [
        { name: 'subnet_cidr',   type: 'string', default: '10.0.0.0/20',  description: 'Primary subnet CIDR' },
        { name: 'pods_cidr',     type: 'string', default: '10.4.0.0/14',  description: 'Pod secondary range' },
        { name: 'services_cidr', type: 'string', default: '10.0.32.0/20', description: 'Services secondary range' },
      ],
    },
    {
      name: 'workload_identity', source: ngdiSrc('workload_identity'), link: ngdiLink('workload_identity'), version: '~> 1.0.4',
      description: 'Binds a Kubernetes ServiceAccount to a GCP ServiceAccount for keyless authentication.',
      keyParams: [
        { name: 'namespace', type: 'string', description: 'Kubernetes namespace' },
        { name: 'ksa_name',  type: 'string', description: 'Kubernetes service account name' },
      ],
    },
    {
      name: 'vf_security_policy', source: ngdiSrc('vf_security_policy'), link: ngdiLink('vf_security_policy'), version: '~> 1.2.1',
      description: 'Cloud Armor WAF policy applied to the GKE Ingress external load balancer.',
      keyParams: [
        { name: 'policy_name', type: 'string', description: 'Security policy name' },
      ],
    },
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'GKE node service account with minimal IAM roles (logging, monitoring, artifact pull).',
      keyParams: [
        { name: 'account_id', type: 'string', description: 'Node SA account ID' },
        { name: 'roles',      type: 'list(string)', description: 'IAM roles' },
      ],
    },
    {
      name: 'kms', source: ngdiSrc('kms'), link: ngdiLink('kms'), version: '~> 1.0.1',
      description: 'CMEK key for etcd secrets and boot disk encryption.',
      keyParams: [
        { name: 'keyring_name', type: 'string', description: 'KMS keyring name' },
        { name: 'key_name',     type: 'string', description: 'KMS key name' },
      ],
    },
    {
      name: 'secret_manager', source: ngdiSrc('secret_manager'), link: ngdiLink('secret_manager'), version: '~> 1.1.0',
      description: 'Stores cluster credentials and application secrets, accessible via Workload Identity.',
      keyParams: [
        { name: 'secret_id',   type: 'string', description: 'Secret identifier' },
        { name: 'replication', type: 'string', default: 'automatic', description: 'Replication policy' },
      ],
    },
  ],
  // ── Data Pipeline ─────────────────────────────────────────────────────────
  'data-pipeline': [
    {
      name: 'composer_environment', source: ngdiSrc('composer_environment'), link: ngdiLink('composer_environment'), version: '~> 2.6.1',
      description: 'Cloud Composer 2 (Apache Airflow) environment for orchestrating DAG-based data workflows.',
      keyParams: [
        { name: 'environment_name', type: 'string', description: 'Composer environment name' },
        { name: 'node_count',       type: 'number', default: '3', description: 'Number of Composer nodes' },
        { name: 'python_version',   type: 'string', default: '3', description: 'Python version' },
      ],
    },
    {
      name: 'dataflow_flex_template', source: ngdiSrc('dataflow_flex_template'), link: ngdiLink('dataflow_flex_template'), version: '~> 1.4.2',
      description: 'Dataflow Flex Template job — containerised pipeline execution with auto-scaling workers.',
      keyParams: [
        { name: 'job_name',          type: 'string', description: 'Dataflow job name' },
        { name: 'template_gcs_path', type: 'string', description: 'GCS path to the Flex Template JSON spec' },
        { name: 'max_workers',       type: 'number', default: '10', description: 'Maximum worker count' },
      ],
    },
    {
      name: 'bigquery', source: ngdiSrc('bigquery'), link: ngdiLink('bigquery'), version: '~> 2.3.0',
      description: 'BigQuery dataset with IAM access controls, labels and optional column-level security.',
      keyParams: [
        { name: 'dataset_id', type: 'string', description: 'Dataset ID' },
        { name: 'location',   type: 'string', default: 'EU', description: 'Dataset location' },
      ],
    },
    {
      name: 'bigquery_table', source: ngdiSrc('bigquery_table'), link: ngdiLink('bigquery_table'), version: '~> 1.0.1',
      description: 'Landing and curated tables with JSON schema, partitioning and clustering.',
      keyParams: [
        { name: 'table_id',           type: 'string', description: 'Table ID' },
        { name: 'schema',             type: 'string', description: 'JSON schema definition' },
        { name: 'partitioning_field', type: 'string', description: 'Partition column name' },
      ],
    },
    {
      name: 'gcs', source: ngdiSrc('gcs'), link: ngdiLink('gcs'), version: '~> 1.5.2',
      description: 'GCS bucket for staging and archival of raw pipeline data.',
      keyParams: [
        { name: 'bucket_name', type: 'string', description: 'Bucket name' },
        { name: 'location',    type: 'string', default: 'EU', description: 'Bucket location' },
      ],
    },
    {
      name: 'pubsub', source: ngdiSrc('pubsub'), link: ngdiLink('pubsub'), version: '~> 1.4.1',
      description: 'Pub/Sub topic triggering streaming pipelines on new data arrival events.',
      keyParams: [
        { name: 'topic_name',        type: 'string', description: 'Topic name' },
        { name: 'message_retention', type: 'string', default: '7d', description: 'Message retention' },
      ],
    },
    {
      name: 'dataproc', source: ngdiSrc('dataproc'), link: ngdiLink('dataproc'), version: '~> 1.3.0',
      description: 'Dataproc cluster for heavy Spark/Hadoop batch processing jobs.',
      keyParams: [
        { name: 'cluster_name', type: 'string', description: 'Dataproc cluster name' },
        { name: 'master_type',  type: 'string', default: 'n1-standard-4', description: 'Master node machine type' },
        { name: 'worker_count', type: 'number', default: '2', description: 'Number of worker nodes' },
      ],
    },
    {
      name: 'dashboard_composer', source: ngdiSrc('dashboard_composer'), link: ngdiLink('dashboard_composer'), version: '~> 1.0.0',
      description: 'Cloud Monitoring dashboard for Composer DAG success rates and scheduler lag.',
      keyParams: [
        { name: 'dashboard_name', type: 'string', description: 'Dashboard display name' },
      ],
    },
    {
      name: 'dashboard_bq', source: ngdiSrc('dashboard_bq'), link: ngdiLink('dashboard_bq'), version: '~> 1.0.0',
      description: 'Cloud Monitoring dashboard visualising BigQuery slot usage and query latency.',
      keyParams: [
        { name: 'dashboard_name', type: 'string', description: 'Dashboard display name' },
      ],
    },
  ],
  // ── Static Site ───────────────────────────────────────────────────────────
  'static-site': [
    {
      name: 'gcs', source: ngdiSrc('gcs'), link: ngdiLink('gcs'), version: '~> 1.5.2',
      description: 'GCS bucket configured for static website hosting with uniform bucket-level access.',
      keyParams: [
        { name: 'bucket_name',       type: 'string', description: 'Bucket name (must match domain)' },
        { name: 'website_main_page', type: 'string', default: 'index.html', description: 'Main page object' },
        { name: 'website_not_found', type: 'string', default: '404.html',   description: '404 error page' },
      ],
    },
    {
      name: 'external_global_loadbalancer', source: ngdiSrc('external_global_loadbalancer'), link: ngdiLink('external_global_loadbalancer'), version: '~> 1.3.1',
      description: 'Global HTTPS load balancer with Google-managed SSL certificate and Cloud CDN.',
      keyParams: [
        { name: 'domain',     type: 'string', description: 'Custom domain name' },
        { name: 'enable_cdn', type: 'bool',   default: 'true', description: 'Enable Cloud CDN' },
      ],
    },
    {
      name: 'external_global_address', source: ngdiSrc('external_global_address'), link: ngdiLink('external_global_address'), version: '~> 1.0.1',
      description: 'Reserved global external IPv4 address for the HTTPS load balancer.',
      keyParams: [
        { name: 'address_name', type: 'string', description: 'Reserved IP address name' },
      ],
    },
    {
      name: 'dns', source: ngdiSrc('dns'), link: ngdiLink('dns'), version: '~> 1.1.3',
      description: 'Cloud DNS zone with A record pointing to the reserved global IP.',
      keyParams: [
        { name: 'dns_zone', type: 'string', description: 'Managed DNS zone name' },
      ],
    },
    {
      name: 'vf_security_policy', source: ngdiSrc('vf_security_policy'), link: ngdiLink('vf_security_policy'), version: '~> 1.2.1',
      description: 'Cloud Armor policy protecting the load balancer from DDoS and OWASP threats.',
      keyParams: [
        { name: 'policy_name', type: 'string', description: 'Security policy name' },
      ],
    },
  ],
  // ── Pub/Sub Pipeline ──────────────────────────────────────────────────────
  'pubsub-pipeline': [
    {
      name: 'pubsub', source: ngdiSrc('pubsub'), link: ngdiLink('pubsub'), version: '~> 1.4.1',
      description: 'Pub/Sub topic and push/pull subscriptions with configurable dead-letter topic.',
      keyParams: [
        { name: 'topic_name',         type: 'string', description: 'Topic name' },
        { name: 'subscription_names', type: 'list(string)', description: 'Subscription names' },
        { name: 'message_retention',  type: 'string', default: '7d', description: 'Message retention duration' },
        { name: 'ack_deadline',       type: 'number', default: '30', description: 'Ack deadline in seconds' },
      ],
    },
    {
      name: 'cloud_function_v2', source: ngdiSrc('cloud_function_v2'), link: ngdiLink('cloud_function_v2'), version: '~> 1.2.0',
      description: 'Cloud Functions 2nd gen consumer triggered by Pub/Sub push subscription.',
      keyParams: [
        { name: 'function_name', type: 'string', description: 'Function name' },
        { name: 'runtime',       type: 'string', default: 'python311', description: 'Runtime identifier' },
        { name: 'entry_point',   type: 'string', description: 'Entry point function name' },
        { name: 'max_instances', type: 'number', default: '10', description: 'Max concurrent instances' },
      ],
    },
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'Service accounts for publisher and subscriber roles with minimal IAM permissions.',
      keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID' },
        { name: 'roles',      type: 'list(string)', description: 'IAM roles' },
      ],
    },
    {
      name: 'secret_manager', source: ngdiSrc('secret_manager'), link: ngdiLink('secret_manager'), version: '~> 1.1.0',
      description: 'Stores HMAC signing keys and webhook credentials used by the function.',
      keyParams: [
        { name: 'secret_id', type: 'string', description: 'Secret identifier' },
      ],
    },
    {
      name: 'cloud_scheduler', source: ngdiSrc('cloud_scheduler'), link: ngdiLink('cloud_scheduler'), version: '~> 1.0.3',
      description: 'Optional cron job to publish heartbeat messages for pipeline health checks.',
      keyParams: [
        { name: 'schedule', type: 'string', default: '*/5 * * * *', description: 'Cron schedule expression' },
        { name: 'timezone', type: 'string', default: 'Europe/London', description: 'Scheduler timezone' },
      ],
    },
    {
      name: 'alert_policy', source: ngdiSrc('alert_policy'), link: ngdiLink('alert_policy'), version: '~> 1.1.1',
      description: 'Monitoring alert firing when undelivered message count exceeds threshold.',
      keyParams: [
        { name: 'alert_name', type: 'string', description: 'Alert policy name' },
        { name: 'threshold',  type: 'number', default: '1000', description: 'Undelivered message threshold' },
      ],
    },
  ],
  // ── BigQuery Dataset ──────────────────────────────────────────────────────
  'bigquery-dataset': [
    {
      name: 'bigquery', source: ngdiSrc('bigquery'), link: ngdiLink('bigquery'), version: '~> 2.3.0',
      description: 'BigQuery dataset with fine-grained access controls, default table expiration and labels.',
      keyParams: [
        { name: 'dataset_id',         type: 'string', description: 'Dataset identifier' },
        { name: 'location',           type: 'string', default: 'EU', description: 'Dataset location' },
        { name: 'default_expiration', type: 'number', description: 'Default table expiration ms (0 = never)' },
      ],
    },
    {
      name: 'bigquery_table', source: ngdiSrc('bigquery_table'), link: ngdiLink('bigquery_table'), version: '~> 1.0.1',
      description: 'Landing tables with JSON schema, time partitioning and clustering columns.',
      keyParams: [
        { name: 'table_id', type: 'string', description: 'Table ID' },
        { name: 'schema',   type: 'string', description: 'JSON schema definition' },
      ],
    },
    {
      name: 'project_iam', source: ngdiSrc('project_iam'), link: ngdiLink('project_iam'), version: '~> 1.1.2',
      description: 'Grants roles/bigquery.dataEditor and dataViewer at project level.',
      keyParams: [
        { name: 'member', type: 'string', description: 'IAM member (user/group/SA)' },
        { name: 'role',   type: 'string', description: 'IAM role' },
      ],
    },
    {
      name: 'kms', source: ngdiSrc('kms'), link: ngdiLink('kms'), version: '~> 1.0.1',
      description: 'CMEK key protecting BigQuery dataset at rest using Cloud KMS.',
      keyParams: [
        { name: 'keyring_name', type: 'string', description: 'KMS keyring name' },
        { name: 'key_name',     type: 'string', description: 'KMS key name' },
      ],
    },
    {
      name: 'logging_sink', source: ngdiSrc('logging_sink'), link: ngdiLink('logging_sink'), version: '~> 1.0.2',
      description: 'Exports data access audit logs to a dedicated audit dataset.',
      keyParams: [
        { name: 'sink_name',   type: 'string', description: 'Log sink name' },
        { name: 'destination', type: 'string', description: 'Sink destination URI' },
      ],
    },
    {
      name: 'dashboard_bq', source: ngdiSrc('dashboard_bq'), link: ngdiLink('dashboard_bq'), version: '~> 1.0.0',
      description: 'Cloud Monitoring dashboard tracking slot consumption, bytes scanned and query counts.',
      keyParams: [
        { name: 'dashboard_name', type: 'string', description: 'Dashboard display name' },
      ],
    },
  ],
  // ── VPC Network ───────────────────────────────────────────────────────────
  'vpc-network': [
    {
      name: 'network', source: ngdiSrc('network'), link: ngdiLink('network'), version: '~> 2.1.0',
      description: 'Shared VPC with primary and secondary subnets, flow logs and Cloud NAT for egress.',
      keyParams: [
        { name: 'network_name', type: 'string', description: 'VPC name' },
        { name: 'subnets',      type: 'list(object)', description: 'Subnet definitions (name, cidr, region)' },
        { name: 'flow_logs',    type: 'bool',   default: 'true', description: 'Enable VPC flow logs' },
      ],
    },
    {
      name: 'firewall', source: ngdiSrc('firewall'), link: ngdiLink('firewall'), version: '~> 1.3.1',
      description: 'Hierarchical firewall rules: deny-all baseline + IAP + internal allow.',
      keyParams: [
        { name: 'rules', type: 'list(object)', description: 'Firewall rule definitions' },
      ],
    },
    {
      name: 'dns', source: ngdiSrc('dns'), link: ngdiLink('dns'), version: '~> 1.1.3',
      description: 'Private Cloud DNS zone peered to the Shared VPC for internal service discovery.',
      keyParams: [
        { name: 'dns_zone',   type: 'string', description: 'Private DNS zone name' },
        { name: 'visibility', type: 'string', default: 'private', description: 'Zone visibility' },
      ],
    },
    {
      name: 'vpc_connector', source: ngdiSrc('vpc_connector'), link: ngdiLink('vpc_connector'), version: '~> 1.0.2',
      description: 'Serverless VPC Access connector bridging Cloud Run / Functions to the private VPC.',
      keyParams: [
        { name: 'connector_name', type: 'string', description: 'Connector name' },
        { name: 'cidr_range',     type: 'string', default: '10.8.0.0/28', description: 'Connector CIDR' },
      ],
    },
    {
      name: 'transparent_squid_egress', source: ngdiSrc('transparent_squid_egress'), link: ngdiLink('transparent_squid_egress'), version: '~> 1.0.0',
      description: 'Transparent Squid proxy VM for controlled and audited internet egress from the VPC.',
      keyParams: [
        { name: 'proxy_name', type: 'string', description: 'Proxy VM name' },
        { name: 'zone',       type: 'string', default: 'europe-west3-a', description: 'VM zone' },
      ],
    },
    {
      name: 'bastion_vm', source: ngdiSrc('bastion_vm'), link: ngdiLink('bastion_vm'), version: '~> 1.1.0',
      description: 'IAP-enabled bastion host for secure SSH access to private resources without VPN.',
      keyParams: [
        { name: 'vm_name',      type: 'string', description: 'Bastion VM name' },
        { name: 'machine_type', type: 'string', default: 'e2-micro', description: 'Machine type' },
      ],
    },
    {
      name: 'vf_security_policy', source: ngdiSrc('vf_security_policy'), link: ngdiLink('vf_security_policy'), version: '~> 1.2.1',
      description: 'Cloud Armor policy protecting external load balancers in the network.',
      keyParams: [
        { name: 'policy_name', type: 'string', description: 'Security policy name' },
      ],
    },
  ],
  // ── Cloud Functions ───────────────────────────────────────────────────────
  'cloud-functions': [
    {
      name: 'cloud_function_v2', source: ngdiSrc('cloud_function_v2'), link: ngdiLink('cloud_function_v2'), version: '~> 1.2.0',
      description: 'Cloud Functions 2nd gen with HTTP/event triggers, environment variables and VPC egress.',
      keyParams: [
        { name: 'function_name', type: 'string', description: 'Function name' },
        { name: 'runtime',       type: 'string', default: 'python311', description: 'Runtime' },
        { name: 'max_instances', type: 'number', default: '10', description: 'Max concurrent instances' },
        { name: 'timeout',       type: 'number', default: '60', description: 'Timeout in seconds' },
      ],
    },
    {
      name: 'gcs', source: ngdiSrc('gcs'), link: ngdiLink('gcs'), version: '~> 1.5.2',
      description: 'GCS bucket storing the function deployment package (zip archive).',
      keyParams: [
        { name: 'bucket_name', type: 'string', description: 'Source bucket name' },
      ],
    },
    {
      name: 'cloud_scheduler', source: ngdiSrc('cloud_scheduler'), link: ngdiLink('cloud_scheduler'), version: '~> 1.0.3',
      description: 'Optional Cloud Scheduler job invoking the function on a cron schedule.',
      keyParams: [
        { name: 'schedule', type: 'string', default: '0 * * * *', description: 'Cron schedule expression' },
        { name: 'timezone', type: 'string', default: 'Europe/London', description: 'Timezone' },
      ],
    },
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'Execution service account with roles scoped to exactly what the function needs.',
      keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID' },
        { name: 'roles',      type: 'list(string)', description: 'IAM roles' },
      ],
    },
    {
      name: 'secret_manager', source: ngdiSrc('secret_manager'), link: ngdiLink('secret_manager'), version: '~> 1.1.0',
      description: 'Stores API keys and credentials injected as environment variables into the function.',
      keyParams: [
        { name: 'secret_id', type: 'string', description: 'Secret identifier' },
      ],
    },
    {
      name: 'cloud_build', source: ngdiSrc('cloud_build'), link: ngdiLink('cloud_build'), version: '~> 1.1.0',
      description: 'Cloud Build trigger that redeploys the function on each Git push to main.',
      keyParams: [
        { name: 'trigger_name', type: 'string', description: 'Build trigger name' },
        { name: 'repo_name',    type: 'string', description: 'Source repository name' },
        { name: 'branch',       type: 'string', default: 'main', description: 'Git branch to track' },
      ],
    },
  ],
  // ── New GCP Project ───────────────────────────────────────────────────────
  'new-gcp-project': [
    {
      name: 'project_services', source: ngdiSrc('project_services'), link: ngdiLink('project_services'), version: '~> 1.1.1',
      description: 'Enables required GCP APIs (compute, storage, logging, monitoring, iam) on the new project.',
      keyParams: [
        { name: 'services', type: 'list(string)', description: 'APIs to enable' },
      ],
    },
    {
      name: 'finops_labels', source: ngdiSrc('finops_labels'), link: ngdiLink('finops_labels'), version: '~> 1.0.1',
      description: 'Applies mandatory FinOps resource labels: environment, cost_centre, team, managed_by.',
      keyParams: [
        { name: 'environment', type: 'string', description: 'Target environment (dev/staging/production)' },
        { name: 'cost_centre', type: 'string', description: 'Cost centre code (e.g. CC1234)' },
        { name: 'team',        type: 'string', description: 'Owning team slug' },
      ],
    },
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'Bootstrap Terraform service account for ongoing IaC pipeline deployments.',
      keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID for Terraform runner' },
        { name: 'roles',      type: 'list(string)', description: 'Bootstrap IAM roles' },
      ],
    },
    {
      name: 'iam_custom_role_stack', source: ngdiSrc('iam_custom_role_stack'), link: ngdiLink('iam_custom_role_stack'), version: '~> 1.0.0',
      description: 'Custom IAM roles enforcing least-privilege access across project services.',
      keyParams: [
        { name: 'role_id',     type: 'string', description: 'Custom role ID' },
        { name: 'title',       type: 'string', description: 'Role display title' },
        { name: 'permissions', type: 'list(string)', description: 'Granted permissions' },
      ],
    },
    {
      name: 'network', source: ngdiSrc('network'), link: ngdiLink('network'), version: '~> 2.1.0',
      description: 'Baseline VPC with private subnets, Cloud NAT and IAP firewall rules.',
      keyParams: [
        { name: 'network_name', type: 'string', description: 'VPC name' },
        { name: 'subnets',      type: 'list(object)', description: 'Subnet definitions' },
      ],
    },
    {
      name: 'firewall', source: ngdiSrc('firewall'), link: ngdiLink('firewall'), version: '~> 1.3.1',
      description: 'Deny-all default + IAP allow + internal allow firewall rules.',
      keyParams: [
        { name: 'rules', type: 'list(object)', description: 'Firewall rule set' },
      ],
    },
    {
      name: 'notification_channel', source: ngdiSrc('notification_channel'), link: ngdiLink('notification_channel'), version: '~> 1.0.1',
      description: 'Email/PagerDuty notification channel for budget alerts and monitoring policies.',
      keyParams: [
        { name: 'channel_type',  type: 'string', default: 'email', description: 'Channel type (email / pagerduty)' },
        { name: 'email_address', type: 'string', description: 'Recipient email address' },
      ],
    },
    {
      name: 'alert_policy', source: ngdiSrc('alert_policy'), link: ngdiLink('alert_policy'), version: '~> 1.1.1',
      description: 'Budget alert policies firing at 50%, 80% and 100% of monthly spend.',
      keyParams: [
        { name: 'budget_amount', type: 'number', description: 'Budget amount in USD' },
        { name: 'thresholds',    type: 'list(number)', default: '[0.5, 0.8, 1.0]', description: 'Alert thresholds' },
      ],
    },
    {
      name: 'os_login', source: ngdiSrc('os_login'), link: ngdiLink('os_login'), version: '~> 1.0.1',
      description: 'Enables OS Login at project level for centrally-managed SSH key distribution.',
      keyParams: [
        { name: 'enable_two_factor', type: 'bool', default: 'true', description: 'Require 2FA for OS Login' },
      ],
    },
    {
      name: 'pam', source: ngdiSrc('pam'), link: ngdiLink('pam'), version: '~> 1.0.0',
      description: 'Privileged Access Manager — time-bound elevated roles with approval workflows.',
      keyParams: [
        { name: 'entitlement_id', type: 'string', description: 'PAM entitlement ID' },
        { name: 'max_duration',   type: 'string', default: '4h', description: 'Max grant duration' },
      ],
    },
  ],
  // ── Service Account (atomic) ──────────────────────────────────────────────
  'service-account': [
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'GCP service account with display name, description and least-privilege IAM role bindings.',
      keyParams: [
        { name: 'account_id',   type: 'string', description: 'Service account ID' },
        { name: 'display_name', type: 'string', description: 'Human-readable display name' },
        { name: 'roles',        type: 'list(string)', description: 'IAM roles to bind on the project' },
      ],
    },
    {
      name: 'workload_identity', source: ngdiSrc('workload_identity'), link: ngdiLink('workload_identity'), version: '~> 1.0.4',
      description: 'Optional Workload Identity binding for GKE pods to authenticate as this service account.',
      keyParams: [
        { name: 'namespace', type: 'string', description: 'Kubernetes namespace' },
        { name: 'ksa_name',  type: 'string', description: 'Kubernetes service account name' },
      ],
    },
    {
      name: 'secret_manager', source: ngdiSrc('secret_manager'), link: ngdiLink('secret_manager'), version: '~> 1.1.0',
      description: 'Stores the service account JSON key for legacy systems requiring key-based auth.',
      keyParams: [
        { name: 'secret_id', type: 'string', description: 'Secret identifier for the SA key' },
      ],
    },
  ],
  // ── BQ Dataset (atomic) ───────────────────────────────────────────────────
  'bq-dataset-single': [
    {
      name: 'bigquery', source: ngdiSrc('bigquery'), link: ngdiLink('bigquery'), version: '~> 2.3.0',
      description: 'Single BigQuery dataset with IAM access controls, optional CMEK and resource labels.',
      keyParams: [
        { name: 'dataset_id',         type: 'string', description: 'Dataset identifier' },
        { name: 'location',           type: 'string', default: 'EU', description: 'Dataset location' },
        { name: 'default_expiration', type: 'number', default: '0', description: 'Default table expiration ms' },
      ],
    },
    {
      name: 'project_iam', source: ngdiSrc('project_iam'), link: ngdiLink('project_iam'), version: '~> 1.1.2',
      description: 'Grants BigQuery dataViewer / dataEditor roles to specified principals.',
      keyParams: [
        { name: 'member', type: 'string', description: 'IAM member' },
        { name: 'role',   type: 'string', description: 'BigQuery IAM role' },
      ],
    },
  ],
  // ── GCS Bucket (atomic) ───────────────────────────────────────────────────
  'gcs-bucket': [
    {
      name: 'gcs', source: ngdiSrc('gcs'), link: ngdiLink('gcs'), version: '~> 1.5.2',
      description: 'Cloud Storage bucket with lifecycle rules, uniform access, optional versioning and retention lock.',
      keyParams: [
        { name: 'bucket_name',    type: 'string', description: 'Globally unique bucket name' },
        { name: 'location',       type: 'string', default: 'EU',       description: 'Bucket location' },
        { name: 'storage_class',  type: 'string', default: 'STANDARD', description: 'Storage class' },
        { name: 'versioning',     type: 'bool',   default: 'false',    description: 'Enable object versioning' },
        { name: 'retention_days', type: 'number', default: '0',        description: 'Retention lock in days (0 = off)' },
      ],
    },
    {
      name: 'iam_service_account', source: ngdiSrc('iam_service_account'), link: ngdiLink('iam_service_account'), version: '~> 1.3.2',
      description: 'Service account granted objectAdmin or objectViewer for application access to the bucket.',
      keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID' },
        { name: 'roles',      type: 'list(string)', description: 'Storage IAM roles' },
      ],
    },
    {
      name: 'kms', source: ngdiSrc('kms'), link: ngdiLink('kms'), version: '~> 1.0.1',
      description: 'Optional CMEK key for customer-managed encryption of bucket objects.',
      keyParams: [
        { name: 'keyring_name', type: 'string', description: 'KMS keyring name' },
        { name: 'key_name',     type: 'string', description: 'KMS key name' },
      ],
    },
    {
      name: 'logging_sink', source: ngdiSrc('logging_sink'), link: ngdiLink('logging_sink'), version: '~> 1.0.2',
      description: 'Exports data access audit logs for the bucket to a separate audit GCS bucket.',
      keyParams: [
        { name: 'sink_name',   type: 'string', description: 'Log sink name' },
        { name: 'destination', type: 'string', description: 'Audit bucket URI' },
      ],
    },
    {
      name: 'dashboard_gcs', source: ngdiSrc('dashboard_gcs'), link: ngdiLink('dashboard_gcs'), version: '~> 1.0.0',
      description: 'Cloud Monitoring dashboard showing object counts, egress and request metrics.',
      keyParams: [
        { name: 'dashboard_name', type: 'string', description: 'Dashboard display name' },
      ],
    },
  ],
};
const COMPLEXITY_COLOR: Record<string, { bg: string; color: string }> = {
  Low:    { bg: '#F0FFF4', color: '#16a34a' },
  Medium: { bg: '#FFFBEB', color: '#d97706' },
  High:   { bg: '#FFF5F5', color: '#E60000' },
};

const CATEGORY_ICON: Record<string, string> = {
  compute:    '⚙️',
  data:       '💾',
  web:        '🌐',
  messaging:  '📨',
  networking: '🔒',
  governance: '🏦',
  iam:        '🤖',
  storage:    '🪣',
  'data-platform': '💾',
  'application-platform': '⚙️',
};

/* ─── Map a live pattern ID (e.g. "pat-003") → PATTERN_MODULES key ──────── */
function resolveModulesKey(patternId: string, template?: { label?: string; tags?: string[] }): string {
  if (PATTERN_MODULES[patternId]) return patternId; // direct hit (already matches)
  const combined = [template?.label ?? '', ...(template?.tags ?? [])].join(' ').toLowerCase();
  if (combined.includes('cloud-run') || (combined.includes('serverless') && !combined.includes('function'))) return 'cloud-run';
  if (combined.includes('gke') || combined.includes('kubernetes') || combined.includes('k8s')) return 'gke-cluster';
  if (combined.includes('data-pipeline') || combined.includes('pipeline') || combined.includes('workflow') || combined.includes('orchestrat') || combined.includes('dataflow') || combined.includes('composer')) return 'data-pipeline';
  if (combined.includes('static') || combined.includes('cdn') || combined.includes('hosting')) return 'static-site';
  if (combined.includes('pubsub') || combined.includes('pub/sub') || combined.includes('messaging') || combined.includes('event-driven')) return 'pubsub-pipeline';
  if (combined.includes('bigquery') || combined.includes('data-ingestion') || combined.includes('analytics') || combined.includes('warehouse') || combined.includes('dataset')) return 'bigquery-dataset';
  if (combined.includes('vpc') || combined.includes('network') || combined.includes('firewall') || combined.includes('landing-zone')) return 'vpc-network';
  if (combined.includes('function') || combined.includes('cloud function') || combined.includes('faas')) return 'cloud-functions';
  if (combined.includes('new project') || combined.includes('project bootstrap') || combined.includes('finops') || combined.includes('billing')) return 'new-gcp-project';
  if (combined.includes('service account') || combined.includes('service-account') || combined.includes('iam') && combined.includes('account')) return 'service-account';
  if (combined.includes('gcs') || combined.includes('bucket') || combined.includes('storage') || combined.includes('data-lake')) return 'gcs-bucket';
  return patternId; // no match — modules panel will show empty state
}

/* ─── Helper function to transform Backstage patterns ────────────────────── */
function transformBackstagePatternToTemplate(pattern: any): Template {
  const meta = PATTERN_META[pattern.id] || {};
  
  return {
    id: pattern.id,
    name: pattern.metadata.name,
    label: pattern.metadata.title,
    description: pattern.metadata.description,
    icon: CATEGORY_ICON[pattern.metadata.domain as keyof typeof CATEGORY_ICON] || '📦',
    category: pattern.metadata.domain,
    version: '1.0.0',
    requiredRoles: ['developer'],
    // Pattern metadata
    tags: pattern.metadata.tags || [],
    lifecycle: pattern.metadata.lifecycle,
    status: pattern.metadata.status,
    owner: pattern.metadata.owner,
    runtimeType: pattern.metadata.runtimeType,
    buildingBlocks: pattern.metadata.buildingBlocks,
    links: pattern.metadata.links,
    releaseBucket: pattern.metadata.releaseBucket,
  };
}

/* ─── Component ─────────────────────────────────────────────────────────── */
interface PatternCatalogProps {
  userId: string;
  onSelectTemplate: (templateId: string) => void;
}

export const TemplateSelection: React.FC<PatternCatalogProps> = ({ userId, onSelectTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'complexity'>('popular');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const LOADING_PHASES = [
    { icon: '🔗', text: 'Connecting to catalog API…',       sub: 'catalog-api-479677124022.europe-west2.run.app' },
    { icon: '📋', text: 'Fetching pattern definitions…',   sub: 'GET /catalog · parsing YAML manifests'         },
    { icon: '🧱', text: 'Loading building blocks…',        sub: 'Resolving module dependencies from NGDI repo'   },
    { icon: '🏷️', text: 'Indexing tags & categories…',     sub: 'Building domain · lifecycle · owner indices'      },
    { icon: '✨', text: 'Rendering pattern catalog…',      sub: 'Almost there!'                                  },
  ];

  useEffect(() => {
    if (!isLoading) return;
    let phase = 0;
    let progress = 5;
    const interval = setInterval(() => {
      phase = Math.min(phase + 1, LOADING_PHASES.length - 1);
      progress = Math.min(progress + 18 + Math.random() * 8, 95);
      setLoadingPhase(phase);
      setLoadingProgress(Math.round(progress));
    }, 600);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const loadPatterns = async () => {
      try {
        // Load catalog patterns only
        const catalogData = await api.catalogs.patterns.list().catch(() => ({ patterns: [] }));

        // Transform Backstage patterns to Template format
        const patternsAsTemplates = (catalogData.patterns || []).map(
          transformBackstagePatternToTemplate
        );

        setTemplates(patternsAsTemplates);
      } catch (error) {
        console.error('Error loading patterns:', error);
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatterns();
  }, [userId]);

  const categories = Array.from(new Set(templates.map((t) => t.category))).sort();

  const filtered = templates
    .filter((t) => {
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const meta = PATTERN_META[t.id];
        return (
          t.label.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (meta?.tags ?? []).some((tag) => tag.includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.label.localeCompare(b.label);
      if (sortBy === 'complexity') {
        const order: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
        return (order[PATTERN_META[a.id]?.complexity ?? 'Low'] ?? 0) - (order[PATTERN_META[b.id]?.complexity ?? 'Low'] ?? 0);
      }
      return (PATTERN_META[b.id]?.usedBy ?? 0) - (PATTERN_META[a.id]?.usedBy ?? 0);
    });

  if (isLoading) {
    const phase = LOADING_PHASES[loadingPhase];
    return (
      <div className="p-8 max-w-7xl">
        <style>{`
          @keyframes ts-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
          @keyframes ts-shimmer {
            0%   { background-position: -800px 0; }
            100% { background-position:  800px 0; }
          }
          .ts-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 800px 100%;
            animation: ts-shimmer 1.4s infinite linear;
          }
          @keyframes ts-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>

        {/* Status bar */}
        <div className="mb-8 rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ height: 4, background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${loadingProgress}%`,
              background: 'linear-gradient(90deg,#E60000,#ff6b6b)',
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: '0 0 8px rgba(230,0,0,0.4)',
            }} />
          </div>
          <div className="flex items-center gap-4 px-6 py-4">
            <span style={{ fontSize: '1.5rem', animation: 'ts-blink 1.5s ease-in-out infinite' }}>{phase.icon}</span>
            <div style={{ flex: 1 }}>
              <p className="font-semibold text-sm" style={{ color: '#0f172a', animation: 'ts-fadein 0.4s ease' }} key={loadingPhase}>{phase.text}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{phase.sub}</p>
            </div>
            <span className="text-xs font-mono" style={{ color: '#E60000', fontWeight: 700 }}>{loadingProgress}%</span>
          </div>
          {/* Phase dots */}
          <div className="flex items-center gap-1.5 px-6 pb-4">
            {LOADING_PHASES.map((_, i) => (
              <div key={i} style={{
                height: 4, borderRadius: 2,
                width: i <= loadingPhase ? 20 : 8,
                background: i <= loadingPhase ? '#E60000' : '#e2e8f0',
                transition: 'all 0.4s ease',
                opacity: i < loadingPhase ? 0.45 : 1,
              }} />
            ))}
          </div>
        </div>

        {/* Skeleton header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="ts-shimmer h-7 w-40 rounded-lg" />
            <div className="ts-shimmer h-5 w-16 rounded-full" />
          </div>
          <div className="ts-shimmer h-4 w-80 rounded" />
        </div>

        {/* Skeleton controls */}
        <div className="flex gap-3 mb-8">
          <div className="ts-shimmer h-10 flex-1 rounded-xl" />
          {[80, 72, 88, 64].map((w, i) => (
            <div key={i} className="ts-shimmer h-10 rounded-full" style={{ width: w }} />
          ))}
        </div>

        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ border: '1px solid #E0E0E0', animationDelay: `${i * 80}ms`, animation: 'ts-fadein 0.4s ease both' }}>
              {/* Top accent */}
              <div className="ts-shimmer h-1.5" style={{ background: undefined }} />
              <div className="p-5 flex flex-col gap-3">
                {/* Icon + title */}
                <div className="flex items-start gap-3">
                  <div className="ts-shimmer w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="ts-shimmer h-4 rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                    <div className="ts-shimmer h-3 w-24 rounded-full" />
                  </div>
                </div>
                {/* Description lines */}
                <div className="space-y-1.5">
                  <div className="ts-shimmer h-3 rounded" style={{ width: '95%' }} />
                  <div className="ts-shimmer h-3 rounded" style={{ width: `${70 + (i % 2) * 15}%` }} />
                </div>
                {/* Tags */}
                <div className="flex gap-1.5">
                  {[48, 56, 40].map((w, j) => (
                    <div key={j} className="ts-shimmer h-5 rounded" style={{ width: w }} />
                  ))}
                </div>
                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="ts-shimmer h-12 rounded-lg" />
                  <div className="ts-shimmer h-12 rounded-lg" />
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #f4f4f4' }}>
                  <div className="ts-shimmer h-3 w-28 rounded" />
                  <div className="flex gap-2">
                    <div className="ts-shimmer h-8 w-16 rounded-xl" />
                    <div className="ts-shimmer h-8 w-24 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Pattern Catalog</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: '#E60000' }}>
            {templates.length} patterns
          </span>
        </div>
        <p className="text-gray-500 text-sm">Platform-approved infrastructure patterns. Selecting a pattern submits a deployment request — Terraform files are generated and a PR is raised on the NGDI repo where GitHub Actions runs <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>terraform plan</code> / <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>apply</code>.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search patterns, tags…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: '1px solid #E0E0E0' }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={selectedCategory === 'all' ? { background: '#E60000', color: 'white' } : { background: 'white', border: '1px solid #E0E0E0', color: '#666' }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors flex items-center gap-1.5"
              style={selectedCategory === cat ? { background: '#E60000', color: 'white' } : { background: 'white', border: '1px solid #E0E0E0', color: '#666' }}
            >
              {CATEGORY_ICON[cat] && <span>{CATEGORY_ICON[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
          style={{ border: '1px solid #E0E0E0', color: '#666' }}
        >
          <option value="popular">Sort: Most Used</option>
          <option value="name">Sort: Name A–Z</option>
          <option value="complexity">Sort: Complexity</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-gray-700">No patterns found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((template) => {
            const meta = PATTERN_META[template.id];
            const complexityCfg = COMPLEXITY_COLOR[meta?.complexity ?? 'Low'];
            const isHovered = hoveredId === template.id;
            return (
              <div
                key={template.id}
                className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all"
                style={{
                  border: isHovered ? '1.5px solid #E60000' : '1px solid #E0E0E0',
                  boxShadow: isHovered ? '0 8px 24px rgba(230,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.05)',
                  transform: isHovered ? 'translateY(-2px)' : undefined,
                }}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="relative h-1.5" style={{ background: '#E60000' }}>
                  {meta?.badge && (
                    <span
                      className="absolute right-3 top-1 text-white text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: meta.badgeColor ?? '#E60000', fontSize: '10px' }}
                    >
                      {meta.badge}
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl flex-shrink-0">{template.icon}</span>
                    <div>
                      <h2 className="font-bold text-sm leading-tight" style={{ color: '#1A1A1A' }}>{template.label}</h2>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ background: '#F4F4F4', color: '#666' }}>
                        {CATEGORY_ICON[template.category]} {template.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 leading-relaxed flex-1">{template.description}</p>

                  {/* Tags from pattern data */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {template.tags.slice(0, 4).map((tag, i) => (
                        <span key={`tag-${i}`} className="px-2 py-0.5 rounded text-xs" style={{ background: '#F4F4F4', color: '#888' }}>
                          #{tag}
                        </span>
                      ))}
                      {template.tags.length > 4 && (
                        <span className="px-2 py-0.5 rounded text-xs" style={{ background: '#F4F4F4', color: '#888' }}>
                          +{template.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pattern metadata display */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    {/* Lifecycle/Status */}
                    <div className="p-2 rounded-lg text-center" style={{ background: '#F4F4F4' }}>
                      <p className="font-semibold" style={{ color: '#1A1A1A' }}>{template.lifecycle || 'N/A'}</p>
                      <p className="text-gray-400">Lifecycle</p>
                    </div>
                    {/* Runtime Type */}
                    <div className="p-2 rounded-lg text-center" style={{ background: '#F4F4F4' }}>
                      <p className="font-semibold" style={{ color: '#1A1A1A' }} title={template.runtimeType}>{template.runtimeType?.substring(0, 12) || 'Pattern'}</p>
                      <p className="text-gray-400">Runtime</p>
                    </div>
                    {/* Owner */}
                    {template.owner && (
                      <div className="p-2 rounded-lg text-center" style={{ background: '#F4F4F4' }}>
                        <p className="font-semibold" style={{ color: '#1A1A1A' }} title={template.owner}>{template.owner.substring(0, 12)}</p>
                        <p className="text-gray-400">Owner</p>
                      </div>
                    )}
                    {/* Status */}
                    {template.status && (
                      <div className="p-2 rounded-lg text-center" style={{ background: '#F4F4F4' }}>
                        <p className="font-semibold" style={{ color: '#1A1A1A' }} title={template.status}>{template.status.replace(/_/g, ' ').substring(0, 12)}</p>
                        <p className="text-gray-400">Status</p>
                      </div>
                    )}
                  </div>

                  {/* Building Blocks Summary */}
                  {template.buildingBlocks && (
                    <div className="mb-4 p-3 rounded-lg" style={{ background: '#FAFAFA' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#1A1A1A' }}>Building Blocks</p>
                      <div className="flex gap-3 text-xs">
                        {template.buildingBlocks.required && template.buildingBlocks.required.length > 0 && (
                          <div>
                            <p style={{ color: '#E60000', fontWeight: 'bold' }}>{template.buildingBlocks.required.length}</p>
                            <p style={{ color: '#666' }}>Required</p>
                          </div>
                        )}
                        {template.buildingBlocks.optional && template.buildingBlocks.optional.length > 0 && (
                          <div>
                            <p style={{ color: '#7C3AED', fontWeight: 'bold' }}>{template.buildingBlocks.optional.length}</p>
                            <p style={{ color: '#666' }}>Optional</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="p-2 rounded-lg text-center" style={{ background: '#F4F4F4' }}>
                      <p className="font-semibold" style={{ color: '#1A1A1A' }}>{meta?.deployTime ?? '~5 min'}</p>
                      <p className="text-gray-400">PR raised in</p>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: complexityCfg.bg }}>
                      <p className="font-semibold" style={{ color: complexityCfg.color }}>{meta?.complexity ?? 'Medium'}</p>
                      <p style={{ color: complexityCfg.color, opacity: 0.7 }}>Complexity</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F4F4F4' }}>
                    <span className="text-xs text-gray-400">
                      Used by <strong style={{ color: '#1A1A1A' }}>{meta?.usedBy ?? 0}</strong> teams
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailId(template.id)}
                        className="px-3 py-2 text-xs font-medium rounded-xl transition-colors hover:bg-gray-100"
                        style={{ border: '1px solid #E0E0E0', color: '#666' }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => onSelectTemplate(template.id)}
                        className="px-4 py-2 text-white text-xs font-bold rounded-xl transition-opacity hover:opacity-90"
                        style={{ background: '#E60000' }}
                      >
                        Use Pattern →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* ── Pattern detail drawer ── */}
      {detailId && (() => {
        const t = templates.find((x) => x.id === detailId);
        const meta = PATTERN_META[detailId];
        const modulesKey = resolveModulesKey(detailId, t);
        const modules = PATTERN_MODULES[modulesKey] ?? [];
        if (!t) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setDetailId(null)}
          >
            <div
              className="ml-auto h-full bg-white overflow-y-auto flex flex-col"
              style={{ width: 'min(640px, 100vw)', boxShadow: '-4px 0 32px rgba(0,0,0,0.15)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer header */}
              <div className="flex items-start justify-between p-6 pb-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{t.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{t.label}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                </div>
                <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-4">✕</button>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2 px-6 py-4" style={{ borderBottom: '1px solid #F4F4F4' }}>
                {t.tags?.map((tag, i) => (
                  <span key={`tag-${i}`} className="px-2.5 py-1 rounded-full text-xs" style={{ background: '#F4F4F4', color: '#666' }}>#{tag}</span>
                ))}
              </div>

              {/* Pattern Metadata */}
              <div className="px-6 py-4" style={{ borderBottom: '1px solid #F4F4F4' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {t.lifecycle && (
                    <div className="p-3 rounded-lg" style={{ background: '#F4F4F4' }}>
                      <p className="text-xs text-gray-500 mb-1">Lifecycle</p>
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{t.lifecycle}</p>
                    </div>
                  )}
                  {t.status && (
                    <div className="p-3 rounded-lg" style={{ background: '#F4F4F4' }}>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{t.status.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {t.owner && (
                    <div className="p-3 rounded-lg" style={{ background: '#F4F4F4' }}>
                      <p className="text-xs text-gray-500 mb-1">Owner</p>
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{t.owner}</p>
                    </div>
                  )}
                  {t.runtimeType && (
                    <div className="p-3 rounded-lg" style={{ background: '#F4F4F4' }}>
                      <p className="text-xs text-gray-500 mb-1">Runtime</p>
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{t.runtimeType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Building Blocks */}
              {t.buildingBlocks && (
                <div className="px-6 py-4" style={{ borderBottom: '1px solid #F4F4F4' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>🧱 Building Blocks</h3>
                  {t.buildingBlocks.required && t.buildingBlocks.required.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: '#E60000' }}>Required ({t.buildingBlocks.required.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {t.buildingBlocks.required.map((block, i) => (
                          <span key={`required-${i}`} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: '#FFE4E4', color: '#E60000' }}>
                            {block}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {t.buildingBlocks.optional && t.buildingBlocks.optional.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: '#7C3AED' }}>Optional ({t.buildingBlocks.optional.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {t.buildingBlocks.optional.map((block, i) => (
                          <span key={`optional-${i}`} className="px-2.5 py-1 rounded-lg text-xs" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                            {block}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Documentation Links */}
              {t.links && t.links.length > 0 && (
                <div className="px-6 py-4" style={{ borderBottom: '1px solid #F4F4F4' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>📚 Documentation</h3>
                  <div className="space-y-2">
                    {t.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg hover:bg-blue-50 transition-colors"
                        style={{ border: '1px solid #E0E0E0', color: '#0ea5e9', textDecoration: 'none' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{link.title}</span>
                          <span className="text-lg">→</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 px-6 py-4" style={{ borderBottom: '1px solid #F4F4F4' }}>
                <div className="p-3 rounded-xl text-center text-xs" style={{ background: '#F4F4F4' }}>
                  <p className="font-bold text-base" style={{ color: '#1A1A1A' }}>{meta?.deployTime ?? '~5 min'}</p>
                  <p className="text-gray-400">PR raised in</p>
                </div>
                <div className="p-3 rounded-xl text-center text-xs" style={{ background: COMPLEXITY_COLOR[meta?.complexity ?? 'Low'].bg }}>
                  <p className="font-bold text-base" style={{ color: COMPLEXITY_COLOR[meta?.complexity ?? 'Low'].color }}>{meta?.complexity ?? 'Medium'}</p>
                  <p style={{ color: COMPLEXITY_COLOR[meta?.complexity ?? 'Low'].color, opacity: 0.7 }}>Complexity</p>
                </div>
                <div className="p-3 rounded-xl text-center text-xs" style={{ background: '#F4F4F4' }}>
                  <p className="font-bold text-base" style={{ color: '#1A1A1A' }}>{meta?.usedBy ?? 0}</p>
                  <p className="text-gray-400">Teams using</p>
                </div>
              </div>

              {/* Terraform modules */}
              <div className="flex-1 px-6 py-5">
                <h3 className="text-sm font-bold mb-4" style={{ color: '#1A1A1A' }}>
                  🧱 Terraform Modules ({modules.length})
                </h3>
                {modules.length === 0 && <p className="text-gray-400 text-sm">No module details available yet.</p>}
                <div className="space-y-4">
                  {modules.map((mod) => (
                    <div key={mod.name} className="rounded-xl overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
                      {/* Module header */}
                      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1A1A1A' }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">{mod.name}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: '#E60000', color: 'white' }}>{mod.version}</span>
                        </div>
                        {mod.link && (
                          <a
                            href={mod.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: '0.2rem 0.65rem', background: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '6px', fontSize: '0.7rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                          >
                            ↗ GitHub
                          </a>
                        )}
                      </div>
                      {/* Source */}
                      <div className="px-4 py-2 text-xs font-mono text-gray-500 truncate" style={{ background: '#F8F8F8', borderBottom: '1px solid #E0E0E0' }}>
                        source = &quot;{mod.source}&quot;
                      </div>
                      {/* Description */}
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F4F4F4' }}>
                        <p className="text-xs text-gray-600">{mod.description}</p>
                      </div>
                      {/* Parameters table */}
                      <div className="px-4 py-3">
                        <p className="text-xs font-semibold mb-2" style={{ color: '#1A1A1A' }}>Key Parameters</p>
                        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#F4F4F4' }}>
                              <th className="text-left px-2 py-1.5 font-semibold text-gray-600 rounded-tl">Name</th>
                              <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Type</th>
                              <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Default</th>
                              <th className="text-left px-2 py-1.5 font-semibold text-gray-600 rounded-tr">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mod.keyParams.map((p, i) => (
                              <tr key={p.name} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                <td className="px-2 py-1.5 font-mono font-medium" style={{ color: '#E60000' }}>{p.name}</td>
                                <td className="px-2 py-1.5 font-mono text-gray-500">{p.type}</td>
                                <td className="px-2 py-1.5 font-mono text-gray-400">{p.default ?? '—'}</td>
                                <td className="px-2 py-1.5 text-gray-600">{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawer footer */}
              <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #E0E0E0' }}>
                <button
                  onClick={() => setDetailId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  style={{ border: '1px solid #E0E0E0' }}
                >
                  Close
                </button>
                <button
                  onClick={() => { setDetailId(null); onSelectTemplate(detailId); }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#E60000' }}
                >
                  Use Pattern →
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
