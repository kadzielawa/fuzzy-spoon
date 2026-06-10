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
interface TfModule {
  name: string;        // module folder name from repo
  source: string;      // registry / git source path
  version: string;
  description: string;
  keyParams: Array<{ name: string; type: string; default?: string; description: string }>;
}

const PATTERN_MODULES: Record<string, TfModule[]> = {
  'cloud-run': [
    {
      name: 'cloud_run', source: 'git::ssh://git@github.com/org/modules//cloud_run', version: '~> 2.4.0',
      description: 'Deploys a Cloud Run service with IAM, traffic splits and custom domain.',
      keyParams: [
        { name: 'service_name',     type: 'string',  description: 'Name of the Cloud Run service' },
        { name: 'image',            type: 'string',  description: 'Container image URI' },
        { name: 'region',           type: 'string',  default: 'europe-west1', description: 'GCP region' },
        { name: 'min_instances',    type: 'number',  default: '0', description: 'Min autoscaling instances' },
        { name: 'max_instances',    type: 'number',  default: '10', description: 'Max autoscaling instances' },
        { name: 'cpu',              type: 'string',  default: '1000m', description: 'vCPU allocation' },
        { name: 'memory',           type: 'string',  default: '512Mi', description: 'Memory limit' },
      ],
    },
    {
      name: 'iam_service_account', source: 'git::ssh://git@github.com/org/modules//iam_service_account', version: '~> 1.3.0',
      description: 'Creates a dedicated service account with least-privilege IAM bindings.',
      keyParams: [
        { name: 'account_id',  type: 'string', description: 'SA account ID' },
        { name: 'roles',       type: 'list(string)', description: 'IAM roles to grant' },
      ],
    },
    {
      name: 'project_services', source: 'git::ssh://git@github.com/org/modules//project_services', version: '~> 1.1.0',
      description: 'Enables required GCP APIs on the target project.',
      keyParams: [
        { name: 'services', type: 'list(string)', default: '["run.googleapis.com"]', description: 'APIs to enable' },
      ],
    },
  ],
  'gke-cluster': [
    {
      name: 'gke_standard_cluster', source: 'git::ssh://git@github.com/org/modules//gke_standard_cluster', version: '~> 3.1.0',
      description: 'Standard GKE cluster with node pools, private networking and Workload Identity.',
      keyParams: [
        { name: 'cluster_name',     type: 'string',  description: 'Cluster name' },
        { name: 'node_count',       type: 'number',  default: '3', description: 'Nodes per zone' },
        { name: 'machine_type',     type: 'string',  default: 'e2-standard-4', description: 'Node machine type' },
        { name: 'release_channel',  type: 'string',  default: 'REGULAR', description: 'GKE release channel' },
      ],
    },
    { name: 'network', source: 'git::ssh://git@github.com/org/modules//network', version: '~> 2.0.0',
      description: 'VPC network and subnets for the cluster.', keyParams: [
        { name: 'subnet_cidr', type: 'string', default: '10.0.0.0/20', description: 'Primary subnet CIDR' },
      ],
    },
    { name: 'workload_identity', source: 'git::ssh://git@github.com/org/modules//workload_identity', version: '~> 1.0.0',
      description: 'Workload Identity binding between K8s SA and GCP SA.', keyParams: [
        { name: 'namespace', type: 'string', description: 'Kubernetes namespace' },
        { name: 'ksa_name',  type: 'string', description: 'Kubernetes service account name' },
      ],
    },
    { name: 'vf_security_policy', source: 'git::ssh://git@github.com/org/modules//vf_security_policy', version: '~> 1.2.0',
      description: 'Cloud Armor security policy applied to cluster ingress.', keyParams: [
        { name: 'policy_name', type: 'string', description: 'Security policy name' },
      ],
    },
  ],
  'data-pipeline': [
    {
      name: 'composer_environment', source: 'git::ssh://git@github.com/org/modules//composer_environment', version: '~> 2.6.0',
      description: 'Cloud Composer 2 environment for Airflow-based DAG orchestration.',
      keyParams: [
        { name: 'environment_name', type: 'string', description: 'Composer environment name' },
        { name: 'node_count',       type: 'number', default: '3', description: 'Number of Composer nodes' },
        { name: 'python_version',   type: 'string', default: '3', description: 'Python version' },
      ],
    },
    { name: 'dataflow_flex_template', source: 'git::ssh://git@github.com/org/modules//dataflow_flex_template', version: '~> 1.4.0',
      description: 'Dataflow Flex Template job definition.', keyParams: [
        { name: 'job_name',           type: 'string', description: 'Dataflow job name' },
        { name: 'template_gcs_path',  type: 'string', description: 'GCS path to Flex Template spec' },
        { name: 'max_workers',        type: 'number', default: '10', description: 'Maximum worker count' },
      ],
    },
    { name: 'gcs', source: 'git::ssh://git@github.com/org/modules//gcs', version: '~> 1.5.0',
      description: 'GCS bucket for staging and output data.', keyParams: [
        { name: 'bucket_name',  type: 'string', description: 'Bucket name' },
        { name: 'location',     type: 'string', default: 'EU', description: 'Bucket location' },
      ],
    },
    { name: 'bigquery', source: 'git::ssh://git@github.com/org/modules//bigquery', version: '~> 2.2.0',
      description: 'BigQuery dataset and tables for pipeline output.', keyParams: [
        { name: 'dataset_id', type: 'string', description: 'Dataset ID' },
        { name: 'location',   type: 'string', default: 'EU', description: 'Dataset location' },
      ],
    },
  ],
  'static-site': [
    { name: 'gcs', source: 'git::ssh://git@github.com/org/modules//gcs', version: '~> 1.5.0',
      description: 'GCS bucket serving static website content.', keyParams: [
        { name: 'bucket_name',       type: 'string', description: 'Bucket name (must match domain)' },
        { name: 'website_main_page', type: 'string', default: 'index.html', description: 'Main page blob' },
      ],
    },
    { name: 'external_global_loadbalancer', source: 'git::ssh://git@github.com/org/modules//external_global_loadbalancer', version: '~> 1.3.0',
      description: 'HTTPS load balancer with managed SSL cert and CDN.', keyParams: [
        { name: 'domain',        type: 'string', description: 'Custom domain name' },
        { name: 'enable_cdn',    type: 'bool',   default: 'true', description: 'Enable Cloud CDN' },
      ],
    },
    { name: 'dns', source: 'git::ssh://git@github.com/org/modules//dns', version: '~> 1.1.0',
      description: 'Cloud DNS zone and A record for the site.', keyParams: [
        { name: 'dns_zone', type: 'string', description: 'Managed DNS zone name' },
      ],
    },
  ],
  'pubsub-pipeline': [
    { name: 'pubsub', source: 'git::ssh://git@github.com/org/modules//pubsub', version: '~> 1.4.0',
      description: 'Pub/Sub topic and subscriptions with dead-letter support.', keyParams: [
        { name: 'topic_name',          type: 'string', description: 'Topic name' },
        { name: 'subscription_names',  type: 'list(string)', description: 'Subscription names' },
        { name: 'message_retention',   type: 'string', default: '7d', description: 'Message retention duration' },
        { name: 'ack_deadline',        type: 'number', default: '30', description: 'Ack deadline in seconds' },
      ],
    },
    { name: 'cloud_function_v2', source: 'git::ssh://git@github.com/org/modules//cloud_function_v2', version: '~> 1.1.0',
      description: 'Cloud Function v2 triggered by Pub/Sub messages.', keyParams: [
        { name: 'function_name', type: 'string', description: 'Function name' },
        { name: 'runtime',       type: 'string', default: 'python311', description: 'Runtime identifier' },
        { name: 'entry_point',   type: 'string', description: 'Entry point function name' },
      ],
    },
    { name: 'iam_service_account', source: 'git::ssh://git@github.com/org/modules//iam_service_account', version: '~> 1.3.0',
      description: 'Service account for publisher and subscriber roles.', keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID' },
        { name: 'roles',      type: 'list(string)', description: 'IAM roles' },
      ],
    },
  ],
  'bigquery-dataset': [
    { name: 'bigquery', source: 'git::ssh://git@github.com/org/modules//bigquery', version: '~> 2.2.0',
      description: 'BigQuery dataset with access controls and labels.', keyParams: [
        { name: 'dataset_id',         type: 'string', description: 'Dataset identifier' },
        { name: 'location',           type: 'string', default: 'EU', description: 'Dataset location' },
        { name: 'default_expiration', type: 'number', description: 'Default table expiration ms (0 = never)' },
      ],
    },
    { name: 'bigquery_table', source: 'git::ssh://git@github.com/org/modules//bigquery_table', version: '~> 1.0.0',
      description: 'Initial landing tables with schema definitions.', keyParams: [
        { name: 'table_id', type: 'string', description: 'Table ID' },
        { name: 'schema',   type: 'string', description: 'JSON schema definition' },
      ],
    },
    { name: 'project_iam', source: 'git::ssh://git@github.com/org/modules//project_iam', version: '~> 1.1.0',
      description: 'Grants BigQuery data viewer/editor roles.', keyParams: [
        { name: 'member', type: 'string', description: 'IAM member (user/group/SA)' },
        { name: 'role',   type: 'string', description: 'IAM role' },
      ],
    },
  ],
  'vpc-network': [
    { name: 'network', source: 'git::ssh://git@github.com/org/modules//network', version: '~> 2.0.0',
      description: 'Shared VPC with subnets, secondary ranges and flow logs.', keyParams: [
        { name: 'network_name',  type: 'string', description: 'VPC name' },
        { name: 'subnets',       type: 'list(object)', description: 'Subnet definitions (name, cidr, region)' },
        { name: 'flow_logs',     type: 'bool',   default: 'true', description: 'Enable VPC flow logs' },
      ],
    },
    { name: 'firewall', source: 'git::ssh://git@github.com/org/modules//firewall', version: '~> 1.3.0',
      description: 'Firewall rules for baseline ingress/egress policies.', keyParams: [
        { name: 'rules', type: 'list(object)', description: 'Firewall rule definitions' },
      ],
    },
    { name: 'dns', source: 'git::ssh://git@github.com/org/modules//dns', version: '~> 1.1.0',
      description: 'Private DNS zone for internal name resolution.', keyParams: [
        { name: 'dns_zone', type: 'string', description: 'Private DNS zone name' },
        { name: 'visibility', type: 'string', default: 'private', description: 'Zone visibility' },
      ],
    },
    { name: 'vpc_connector', source: 'git::ssh://git@github.com/org/modules//vpc_connector', version: '~> 1.0.0',
      description: 'Serverless VPC Access connector for Cloud Run / Functions.', keyParams: [
        { name: 'connector_name', type: 'string', description: 'Connector name' },
        { name: 'cidr_range',     type: 'string', default: '10.8.0.0/28', description: 'Connector CIDR' },
      ],
    },
  ],
  'cloud-functions': [
    { name: 'cloud_function_v2', source: 'git::ssh://git@github.com/org/modules//cloud_function_v2', version: '~> 1.1.0',
      description: 'Cloud Functions v2 with event triggers and environment config.', keyParams: [
        { name: 'function_name',  type: 'string', description: 'Function name' },
        { name: 'runtime',        type: 'string', default: 'python311', description: 'Runtime' },
        { name: 'max_instances',  type: 'number', default: '10', description: 'Max concurrent instances' },
        { name: 'timeout',        type: 'number', default: '60', description: 'Timeout in seconds' },
      ],
    },
    { name: 'gcs', source: 'git::ssh://git@github.com/org/modules//gcs', version: '~> 1.5.0',
      description: 'GCS bucket for function source code.', keyParams: [
        { name: 'bucket_name', type: 'string', description: 'Source bucket name' },
      ],
    },
    { name: 'cloud_scheduler', source: 'git::ssh://git@github.com/org/modules//cloud_scheduler', version: '~> 1.0.0',
      description: 'Optional cron trigger via Cloud Scheduler.', keyParams: [
        { name: 'schedule',  type: 'string', default: '0 * * * *', description: 'Cron schedule expression' },
        { name: 'timezone',  type: 'string', default: 'Europe/London', description: 'Timezone' },
      ],
    },
    { name: 'iam_service_account', source: 'git::ssh://git@github.com/org/modules//iam_service_account', version: '~> 1.3.0',
      description: 'Service account for function execution.', keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID' },
        { name: 'roles',      type: 'list(string)', description: 'IAM roles' },
      ],
    },
  ],
  'new-gcp-project': [
    { name: 'project_services', source: 'git::ssh://git@github.com/org/modules//project_services', version: '~> 1.1.0',
      description: 'Enables required GCP APIs on the new project.', keyParams: [
        { name: 'services', type: 'list(string)', description: 'APIs to enable (e.g. compute, storage, logging)' },
      ],
    },
    { name: 'finops_labels', source: 'git::ssh://git@github.com/org/modules//finops_labels', version: '~> 1.0.0',
      description: 'Applies mandatory FinOps labels: environment, cost_centre, team, managed_by.', keyParams: [
        { name: 'environment', type: 'string', description: 'Target environment (dev/staging/production)' },
        { name: 'cost_centre', type: 'string', description: 'Cost centre code (e.g. CC1234)' },
        { name: 'team',        type: 'string', description: 'Owning team slug' },
      ],
    },
    { name: 'iam_service_account', source: 'git::ssh://git@github.com/org/modules//iam_service_account', version: '~> 1.3.0',
      description: 'Bootstrap Terraform SA for ongoing IaC deployments.', keyParams: [
        { name: 'account_id', type: 'string', description: 'SA account ID for Terraform runner' },
        { name: 'roles',      type: 'list(string)', description: 'Bootstrap IAM roles' },
      ],
    },
    { name: 'network', source: 'git::ssh://git@github.com/org/modules//network', version: '~> 2.0.0',
      description: 'Baseline VPC with private subnets and Cloud NAT.', keyParams: [
        { name: 'network_name', type: 'string', description: 'VPC name' },
        { name: 'subnets',      type: 'list(object)', description: 'Subnet definitions' },
      ],
    },
    { name: 'firewall', source: 'git::ssh://git@github.com/org/modules//firewall', version: '~> 1.3.0',
      description: 'Baseline deny-all + IAP + internal firewall rules.', keyParams: [
        { name: 'rules', type: 'list(object)', description: 'Firewall rule set' },
      ],
    },
    { name: 'notification_channel', source: 'git::ssh://git@github.com/org/modules//notification_channel', version: '~> 1.0.0',
      description: 'Email/PagerDuty channel for budget and alert notifications.', keyParams: [
        { name: 'channel_type',  type: 'string', default: 'email', description: 'Notification channel type' },
        { name: 'email_address', type: 'string', description: 'Recipient email address' },
      ],
    },
    { name: 'alert_policy', source: 'git::ssh://git@github.com/org/modules//alert_policy', version: '~> 1.1.0',
      description: 'Budget alert policy firing at 50%, 80% and 100% of monthly budget.', keyParams: [
        { name: 'budget_amount', type: 'number', description: 'Budget amount in USD' },
        { name: 'thresholds',    type: 'list(number)', default: '[0.5, 0.8, 1.0]', description: 'Alert thresholds' },
      ],
    },
    { name: 'os_login', source: 'git::ssh://git@github.com/org/modules//os_login', version: '~> 1.0.0',
      description: 'Enables OS Login at project level for SSH key management.', keyParams: [
        { name: 'enable_two_factor', type: 'bool', default: 'true', description: 'Require 2FA for OS Login' },
      ],
    },
  ],
  'service-account': [
    { name: 'iam_service_account', source: 'git::ssh://git@github.com/org/modules//iam_service_account', version: '~> 1.3.0',
      description: 'Creates the GCP service account with display name and IAM bindings.', keyParams: [
        { name: 'account_id',   type: 'string', description: 'Service account ID' },
        { name: 'display_name', type: 'string', description: 'Human-readable display name' },
        { name: 'roles',        type: 'list(string)', description: 'IAM roles to bind on the project' },
      ],
    },
    { name: 'workload_identity', source: 'git::ssh://git@github.com/org/modules//workload_identity', version: '~> 1.0.0',
      description: 'Optional Workload Identity binding for GKE workloads.', keyParams: [
        { name: 'namespace', type: 'string', description: 'Kubernetes namespace' },
        { name: 'ksa_name',  type: 'string', description: 'Kubernetes service account name' },
      ],
    },
  ],
  'bq-dataset-single': [
    { name: 'bigquery', source: 'git::ssh://git@github.com/org/modules//bigquery', version: '~> 2.2.0',
      description: 'Single BigQuery dataset with IAM access controls and optional CMEK.', keyParams: [
        { name: 'dataset_id',         type: 'string', description: 'Dataset identifier' },
        { name: 'location',           type: 'string', default: 'EU', description: 'Dataset location' },
        { name: 'default_expiration', type: 'number', default: '0', description: 'Default table expiration ms (0 = never)' },
      ],
    },
  ],
  'gcs-bucket': [
    { name: 'gcs', source: 'git::ssh://git@github.com/org/modules//gcs', version: '~> 1.5.0',
      description: 'Cloud Storage bucket with lifecycle rules, uniform access and optional versioning.', keyParams: [
        { name: 'bucket_name',    type: 'string', description: 'Globally unique bucket name' },
        { name: 'location',       type: 'string', default: 'EU', description: 'Bucket location' },
        { name: 'storage_class',  type: 'string', default: 'STANDARD', description: 'Storage class' },
        { name: 'versioning',     type: 'bool',   default: 'false', description: 'Enable object versioning' },
        { name: 'retention_days', type: 'number', default: '0', description: 'Retention lock in days (0 = off)' },
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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
    return (
      <div className="p-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" style={{ border: '1px solid #E0E0E0' }} />
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
        <p className="text-gray-500 text-sm">Platform-approved infrastructure patterns. Select one to launch a guided deployment wizard.</p>
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
                      <p className="text-gray-400">Deploy time</p>
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
        const modules = PATTERN_MODULES[detailId] ?? [];
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
                  <p className="text-gray-400">Deploy time</p>
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
