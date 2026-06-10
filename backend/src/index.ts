/**
 * IDP Portal API - Advanced Template Management & User Services
 * Handles authentication, template queries, deployment management, and user profiles
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import { ResolverService, ResolverDeploymentPayload, ResolverResponse } from './services/resolverService';

dotenv.config();

const PORT = process.env.PORT || 3001;
const app: Express = express();

// ============================================================================
// Middleware
// ============================================================================

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '100kb' }));

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  department: string;
  avatar?: string;
  createdAt: Date;
}

interface TemplateParameter {
  name: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  required: boolean;
  default?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

interface Template {
  id: string;
  name: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  parameters: TemplateParameter[];
  requiredRoles?: string[];
  maxInstances?: number;
  estimatedCost?: string;
}

interface DeploymentRequest {
  id: string;
  userId: string;
  templateId: string;
  projectId: string;
  serviceName: string;
  parameters: Record<string, any>;
  status: 'draft' | 'pending' | 'approved' | 'deployed' | 'failed' | 'resolved';
  createdAt: Date;
  approvedAt?: Date;
  deployedAt?: Date;
  error?: string;
  // Terraform files from resolver
  terraformFiles?: {
    main_tf: string;
    variables_tf: string;
    terraform_tfvars: string;
  };
  resolverResponse?: Record<string, any>;
  resolverStatus?: 'pending' | 'resolved' | 'error';
}

interface DeploymentPayload {
  patternId: string;
  projectId: string;
  projectName: string;
  building_blocks: Record<string, Record<string, any>>;
  terraform_version: string;
  backend: string;
  modules_ref: string;
  estimatedMonthlyCost?: number;
  createdBy?: string;
  timestamp: string;
}

// ============================================================================
// Mock Database (Replace with real DB)
// ============================================================================

const mockUsers: Map<string, User> = new Map([
  [
    'user-123',
    {
      id: 'user-123',
      email: '[REDACTED_EMAIL_ADDRESS_2]',
      name: 'Alice Johnson',
      roles: ['developer', 'team-lead'],
      department: 'Platform Engineering',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      createdAt: new Date('2024-01-01'),
    },
  ],
  [
    'user-456',
    {
      id: 'user-456',
      email: '[REDACTED_EMAIL_ADDRESS_3]',
      name: 'Bob Smith',
      roles: ['developer'],
      department: 'Backend Services',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      createdAt: new Date('2024-02-01'),
    },
  ],
  [
    'user-789',
    {
      id: 'user-789',
      email: '[REDACTED_EMAIL_ADDRESS_4]',
      name: 'Carol White',
      roles: ['admin', 'architect'],
      department: 'Infrastructure',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
      createdAt: new Date('2024-01-15'),
    },
  ],
]);

const templates: Template[] = [
  {
    id: 'cloud-run',
    name: 'cloud-run',
    label: 'Cloud Run Service',
    description: 'Deploy containerized applications to Google Cloud Run with automatic scaling',
    icon: '🚀',
    category: 'compute',
    version: '1.0.0',
    requiredRoles: ['developer'],
    maxInstances: 10,
    estimatedCost: '$5-50/month',
    parameters: [
      {
        name: 'service_name',
        label: 'Service Name',
        description: 'Unique identifier for your service',
        type: 'string',
        required: true,
        validation: { pattern: '^[a-z0-9-]{3,63}$' },
      },
      {
        name: 'container_image',
        label: 'Container Image URI',
        description: 'Full Docker image path (e.g., gcr.io/project/image:tag)',
        type: 'string',
        required: true,
        validation: { pattern: '^[a-z0-9-.]+\\.[a-z]+/.*/.+:.+$' },
      },
      {
        name: 'region',
        label: 'GCP Region',
        description: 'Where to deploy the service',
        type: 'select',
        required: true,
        default: 'us-central1',
        options: [
          { label: 'US Central 1', value: 'us-central1' },
          { label: 'US East 1', value: 'us-east1' },
          { label: 'US West 1', value: 'us-west1' },
          { label: 'Europe West 1', value: 'europe-west1' },
          { label: 'Asia East 1', value: 'asia-east1' },
        ],
      },
      {
        name: 'environment',
        label: 'Environment',
        description: 'Deployment environment',
        type: 'select',
        required: true,
        default: 'dev',
        options: [
          { label: 'Development', value: 'dev' },
          { label: 'Staging', value: 'staging' },
          { label: 'Production', value: 'prod' },
        ],
      },
      {
        name: 'cpu',
        label: 'CPU Allocation',
        description: 'CPU cores per instance',
        type: 'select',
        required: true,
        default: '0.5',
        options: [
          { label: '0.25 cores', value: '0.25' },
          { label: '0.5 cores', value: '0.5' },
          { label: '1 core', value: '1' },
          { label: '2 cores', value: '2' },
          { label: '4 cores', value: '4' },
        ],
      },
      {
        name: 'memory',
        label: 'Memory Allocation',
        description: 'RAM per instance',
        type: 'select',
        required: true,
        default: '512Mi',
        options: [
          { label: '256 MB', value: '256Mi' },
          { label: '512 MB', value: '512Mi' },
          { label: '1 GB', value: '1Gi' },
          { label: '2 GB', value: '2Gi' },
          { label: '4 GB', value: '4Gi' },
          { label: '8 GB', value: '8Gi' },
        ],
      },
      {
        name: 'min_instances',
        label: 'Minimum Instances',
        description: 'Minimum running instances (0 for scale to zero)',
        type: 'number',
        required: true,
        default: 0,
        validation: { min: 0, max: 100 },
      },
      {
        name: 'max_instances',
        label: 'Maximum Instances',
        description: 'Maximum running instances',
        type: 'number',
        required: true,
        default: 50,
        validation: { min: 1, max: 1000 },
      },
      {
        name: 'container_port',
        label: 'Container Port',
        description: 'Port the container listens on',
        type: 'number',
        required: true,
        default: 8080,
        validation: { min: 1, max: 65535 },
      },
      {
        name: 'allow_unauthenticated',
        label: 'Allow Unauthenticated Access',
        description: 'Allow public access to the service',
        type: 'boolean',
        required: false,
        default: true,
      },
      {
        name: 'enable_cdn',
        label: 'Enable Cloud CDN',
        description: 'Cache static content for better performance',
        type: 'boolean',
        required: false,
        default: false,
      },
      {
        name: 'environment_variables',
        label: 'Environment Variables (JSON)',
        description: 'Configuration variables (e.g., {"LOG_LEVEL": "INFO"})',
        type: 'textarea',
        required: false,
        default: '{}',
      },
    ],
  },
  {
    id: 'gke-cluster',
    name: 'gke-autopilot',
    label: 'GKE Autopilot Cluster',
    description: 'Kubernetes cluster with automatic node management',
    icon: '☸️',
    category: 'compute',
    version: '1.0.0',
    requiredRoles: ['architect', 'admin'],
    maxInstances: 3,
    estimatedCost: '$50-500/month',
    parameters: [
      {
        name: 'cluster_name',
        label: 'Cluster Name',
        description: 'Name of the Kubernetes cluster',
        type: 'string',
        required: true,
        validation: { pattern: '^[a-z0-9-]{1,40}$' },
      },
      {
        name: 'region',
        label: 'GCP Region',
        description: 'Cluster region',
        type: 'select',
        required: true,
        default: 'us-central1',
        options: [
          { label: 'US Central 1', value: 'us-central1' },
          { label: 'US East 1', value: 'us-east1' },
          { label: 'Europe West 1', value: 'europe-west1' },
        ],
      },
      {
        name: 'network_name',
        label: 'VPC Network',
        description: 'Virtual Private Cloud network',
        type: 'string',
        required: true,
        default: 'default',
      },
      {
        name: 'enable_autopilot',
        label: 'Enable Autopilot',
        description: 'Automatic node provisioning and management',
        type: 'boolean',
        required: true,
        default: true,
      },
    ],
  },
  {
    id: 'data-pipeline',
    name: 'composer-pipeline',
    label: 'Data Pipeline (Cloud Composer)',
    description: 'Apache Airflow-managed data orchestration',
    icon: '📊',
    category: 'data',
    version: '1.0.0',
    requiredRoles: ['data-engineer', 'architect'],
    maxInstances: 5,
    estimatedCost: '$150-300/month',
    parameters: [
      {
        name: 'environment_name',
        label: 'Environment Name',
        description: 'Composer environment identifier',
        type: 'string',
        required: true,
        validation: { pattern: '^[a-z0-9-]{1,63}$' },
      },
      {
        name: 'region',
        label: 'Region',
        description: 'Deployment region',
        type: 'select',
        required: true,
        default: 'us-central1',
        options: [
          { label: 'US Central 1', value: 'us-central1' },
          { label: 'US East 1', value: 'us-east1' },
        ],
      },
      {
        name: 'node_count',
        label: 'Node Count',
        description: 'Number of worker nodes',
        type: 'number',
        required: true,
        default: 3,
        validation: { min: 3, max: 10 },
      },
    ],
  },
  {
    id: 'static-site',
    name: 'firebase-hosting',
    label: 'Static Site (Firebase Hosting)',
    description: 'Fast, secure static web content delivery',
    icon: '🌐',
    category: 'web',
    version: '1.0.0',
    requiredRoles: ['developer'],
    maxInstances: 20,
    estimatedCost: 'Free - $100/month',
    parameters: [
      {
        name: 'site_name',
        label: 'Site Name',
        description: 'Unique Firebase site identifier',
        type: 'string',
        required: true,
        validation: { pattern: '^[a-z0-9-]{1,50}$' },
      },
      {
        name: 'domain',
        label: 'Custom Domain',
        description: 'Optional custom domain',
        type: 'string',
        required: false,
      },
    ],
  },
  {
    id: 'new-gcp-project',
    name: 'new-gcp-project-boilerplate',
    label: 'New GCP Project (Boilerplate)',
    description: 'Full project bootstrap: billing, APIs, FinOps labels, IAM foundations, network, audit logs, org-policy constraints, and budget alerts.',
    icon: '🏗️',
    category: 'governance',
    version: '3.0.0',
    requiredRoles: ['admin'],
    estimatedCost: 'Varies',
    parameters: [
      { name: 'project_name', label: 'Project Name', description: 'Human-readable project name', type: 'string', required: true, validation: { pattern: '^[a-zA-Z0-9 _-]{4,30}$' } },
      { name: 'project_id', label: 'Project ID', description: 'Globally unique GCP project ID', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{4,28}[a-z0-9]$' } },
      { name: 'billing_account', label: 'Billing Account ID', description: 'GCP billing account (XXXXXX-XXXXXX-XXXXXX)', type: 'string', required: true },
      { name: 'folder_id', label: 'Parent Folder ID', description: 'Organisation folder to create the project under', type: 'string', required: true },
      { name: 'environment', label: 'Environment', description: 'FinOps label: environment tag', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'production' }] },
      { name: 'cost_centre', label: 'Cost Centre', description: 'FinOps label: cost centre code', type: 'string', required: true, validation: { pattern: '^[A-Z0-9]{4,10}$' } },
      { name: 'team', label: 'Team', description: 'FinOps label: owning team slug', type: 'string', required: true },
      { name: 'budget_amount_usd', label: 'Monthly Budget (USD)', description: 'Budget alert threshold in USD', type: 'number', required: true, default: 500, validation: { min: 10, max: 1000000 } },
      { name: 'region', label: 'Default Region', description: 'Default region for resources', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'enable_vpc', label: 'Bootstrap VPC Network', description: 'Create default VPC with subnets and firewall baseline', type: 'boolean', required: false, default: true },
      { name: 'enable_audit_logs', label: 'Enable Audit Logging', description: 'Configure Cloud Audit Logs for all services', type: 'boolean', required: false, default: true },
    ],
  },
  {
    id: 'service-account',
    name: 'iam-service-account',
    label: 'Service Account',
    description: 'Single GCP service account with scoped IAM roles and optional Workload Identity binding.',
    icon: '🤖',
    category: 'iam',
    version: '1.0.0',
    requiredRoles: ['developer', 'architect', 'admin'],
    estimatedCost: 'Free',
    parameters: [
      { name: 'account_id', label: 'Account ID', description: 'Service account ID (e.g. my-svc)', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{4,28}[a-z0-9]$' } },
      { name: 'display_name', label: 'Display Name', description: 'Human-readable description', type: 'string', required: true },
      { name: 'roles', label: 'IAM Roles', description: 'Comma-separated roles (e.g. roles/storage.objectViewer)', type: 'string', required: false },
      { name: 'workload_identity_namespace', label: 'Workload Identity Namespace', description: 'K8s namespace for WI binding (leave blank to skip)', type: 'string', required: false },
      { name: 'create_key', label: 'Create JSON Key', description: 'Generate a service account key (not recommended for production)', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'bq-dataset-single',
    name: 'bigquery-dataset-single',
    label: 'BigQuery Dataset',
    description: 'Single BigQuery dataset with access controls, default table expiry and optional CMEK.',
    icon: '📊',
    category: 'data',
    version: '1.0.0',
    requiredRoles: ['developer', 'data-engineer'],
    estimatedCost: 'Free – $20/month',
    parameters: [
      { name: 'dataset_id', label: 'Dataset ID', description: 'BigQuery dataset identifier', type: 'string', required: true, validation: { pattern: '^[a-zA-Z0-9_]{1,1024}$' } },
      { name: 'location', label: 'Location', description: 'Data residency', type: 'select', required: true, default: 'EU',
        options: [{ label: 'EU (multi-region)', value: 'EU' }, { label: 'europe-west1', value: 'europe-west1' }, { label: 'US (multi-region)', value: 'US' }] },
      { name: 'default_table_expiry_days', label: 'Default Table Expiry (days)', description: '0 = no expiry', type: 'number', required: false, default: 0, validation: { min: 0, max: 3650 } },
      { name: 'enable_cmek', label: 'Customer-Managed Encryption (CMEK)', description: 'Use Cloud KMS key for encryption', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'gcs-bucket',
    name: 'gcs-bucket-single',
    label: 'GCS Bucket',
    description: 'Single Cloud Storage bucket with lifecycle rules, retention policy, uniform access and optional versioning.',
    icon: '🪣',
    category: 'storage',
    version: '1.0.0',
    requiredRoles: ['developer'],
    estimatedCost: 'Free – $10/month',
    parameters: [
      { name: 'bucket_name', label: 'Bucket Name', description: 'Globally unique bucket name', type: 'string', required: true, validation: { pattern: '^[a-z0-9._-]{3,63}$' } },
      { name: 'location', label: 'Location', description: 'Storage location', type: 'select', required: true, default: 'EU',
        options: [{ label: 'EU (multi-region)', value: 'EU' }, { label: 'europe-west1', value: 'europe-west1' }, { label: 'US (multi-region)', value: 'US' }] },
      { name: 'storage_class', label: 'Storage Class', description: 'Default storage class', type: 'select', required: true, default: 'STANDARD',
        options: [{ label: 'Standard', value: 'STANDARD' }, { label: 'Nearline', value: 'NEARLINE' }, { label: 'Coldline', value: 'COLDLINE' }, { label: 'Archive', value: 'ARCHIVE' }] },
      { name: 'enable_versioning', label: 'Enable Versioning', description: 'Keep previous object versions', type: 'boolean', required: false, default: false },
      { name: 'retention_days', label: 'Retention Policy (days)', description: '0 = no retention lock', type: 'number', required: false, default: 0, validation: { min: 0, max: 36500 } },
    ],
  },
  {
    id: 'pubsub-pipeline',
    name: 'pubsub-eventbridge',
    label: 'Pub/Sub Event Pipeline',
    description: 'Managed Pub/Sub topics and subscriptions with dead-letter queues and schema validation.',
    icon: '📨',
    category: 'messaging',
    version: '1.1.0',
    requiredRoles: ['developer', 'architect'],
    estimatedCost: '$5-80/month',
    parameters: [
      { name: 'topic_name', label: 'Topic Name', description: 'Pub/Sub topic identifier', type: 'string', required: true, validation: { pattern: '^[a-z0-9_-]{3,255}$' } },
      { name: 'message_retention_hours', label: 'Message Retention (hours)', description: 'How long to retain undelivered messages', type: 'number', required: true, default: 24, validation: { min: 1, max: 168 } },
      { name: 'enable_dead_letter', label: 'Enable Dead Letter Queue', description: 'Route failed messages to DLQ topic', type: 'boolean', required: false, default: true },
      { name: 'enable_schema', label: 'Schema Validation', description: 'Enforce Avro/Proto schema on publish', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'bigquery-dataset',
    name: 'bigquery-warehouse',
    label: 'BigQuery Data Warehouse',
    description: 'BigQuery datasets with IAM, column-level security, and scheduled exports.',
    icon: '📈',
    category: 'data',
    version: '1.0.0',
    requiredRoles: ['data-engineer', 'architect'],
    estimatedCost: '$10-200/month',
    parameters: [
      { name: 'dataset_id', label: 'Dataset ID', description: 'BigQuery dataset identifier', type: 'string', required: true, validation: { pattern: '^[a-zA-Z0-9_]{1,1024}$' } },
      { name: 'location', label: 'Location', description: 'Data residency', type: 'select', required: true, default: 'EU',
        options: [{ label: 'EU (multi-region)', value: 'EU' }, { label: 'europe-west1', value: 'europe-west1' }, { label: 'US (multi-region)', value: 'US' }] },
      { name: 'default_table_expiry_days', label: 'Default Table Expiry (days)', description: '0 = no expiry', type: 'number', required: false, default: 0, validation: { min: 0, max: 3650 } },
      { name: 'enable_cmek', label: 'Customer-Managed Encryption (CMEK)', description: 'Use Cloud KMS key for encryption', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'vpc-network',
    name: 'shared-vpc',
    label: 'Shared VPC Network',
    description: 'Host and service project VPC with firewall rules, Cloud NAT, and private DNS zones.',
    icon: '🔒',
    category: 'networking',
    version: '2.1.0',
    requiredRoles: ['admin', 'architect'],
    estimatedCost: '$20-150/month',
    parameters: [
      { name: 'network_name', label: 'Network Name', description: 'VPC network identifier', type: 'string', required: true, validation: { pattern: '^[a-z0-9-]{1,63}$' } },
      { name: 'region', label: 'Primary Region', description: 'Subnet region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'subnet_cidr', label: 'Subnet CIDR', description: 'Primary subnet IP range', type: 'string', required: true, default: '10.0.0.0/24' },
      { name: 'enable_private_google_access', label: 'Private Google Access', description: 'Allow VMs without public IP to reach Google APIs', type: 'boolean', required: false, default: true },
      { name: 'enable_cloud_nat', label: 'Enable Cloud NAT', description: 'Managed NAT for outbound internet access', type: 'boolean', required: false, default: true },
    ],
  },
  {
    id: 'cloud-functions',
    name: 'cloud-functions-v2',
    label: 'Cloud Functions (Gen 2)',
    description: 'Event-driven serverless functions with Eventarc triggers, concurrency & min-instances.',
    icon: '⚡',
    category: 'compute',
    version: '1.2.0',
    requiredRoles: ['developer'],
    estimatedCost: 'Free - $30/month',
    parameters: [
      { name: 'function_name', label: 'Function Name', description: 'Cloud Function identifier', type: 'string', required: true, validation: { pattern: '^[a-z0-9_-]{1,63}$' } },
      { name: 'runtime', label: 'Runtime', description: 'Language runtime', type: 'select', required: true, default: 'python311',
        options: [{ label: 'Python 3.11', value: 'python311' }, { label: 'Node.js 20', value: 'nodejs20' }, { label: 'Go 1.21', value: 'go121' }, { label: 'Java 21', value: 'java21' }] },
      { name: 'region', label: 'Region', description: 'Deployment region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'max_instances', label: 'Max Instances', description: 'Maximum concurrent instances', type: 'number', required: true, default: 100, validation: { min: 1, max: 3000 } },
      { name: 'memory_mb', label: 'Memory (MB)', description: 'Memory per instance', type: 'select', required: true, default: '256',
        options: [{ label: '128 MB', value: '128' }, { label: '256 MB', value: '256' }, { label: '512 MB', value: '512' }, { label: '1024 MB', value: '1024' }, { label: '2048 MB', value: '2048' }] },
    ],
  },
  // ── PAT-001–006: Vodafone NGDI Pattern Catalogue ──────────────────────────
  {
    id: 'pat-001-batch-orchestration',
    name: 'pat-001-batch-orchestration',
    label: 'PAT-001 · Batch Orchestration Pipeline',
    description: 'Managed workflow orchestration with structured storage, object storage, query engine, and deploy chain. Suited for enterprise analytics, data lake, regulatory data storage, and scheduled ETL/ELT.',
    icon: '🔄',
    category: 'data',
    version: '1.0.0',
    requiredRoles: ['developer', 'architect', 'admin'],
    estimatedCost: '$200–800/month',
    parameters: [
      { name: 'service_name', label: 'Service Name', description: 'Identifier for this pipeline deployment', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{1,62}[a-z0-9]$' } },
      { name: 'environment', label: 'Environment', description: 'Deployment environment', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }] },
      { name: 'region', label: 'GCP Region', description: 'Primary deployment region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'workflow_engine', label: 'Workflow Engine', description: 'Orchestration engine for the pipeline', type: 'select', required: true, default: 'composer',
        options: [{ label: 'Cloud Composer (Airflow)', value: 'composer' }, { label: 'GKE Workload', value: 'gke' }] },
      { name: 'enable_bigquery', label: 'Enable BigQuery', description: 'Provision BigQuery dataset and tables for structured storage', type: 'boolean', required: false, default: true },
      { name: 'enable_gcs', label: 'Enable GCS Bucket', description: 'Provision Cloud Storage bucket for staging data', type: 'boolean', required: false, default: true },
      { name: 'enable_pubsub', label: 'Enable Pub/Sub', description: 'Provision Pub/Sub topics for event-driven triggers', type: 'boolean', required: false, default: false },
      { name: 'enable_sql', label: 'Enable Cloud SQL', description: 'Provision managed relational database', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'pat-002-serverless-app',
    name: 'pat-002-serverless-app',
    label: 'PAT-002 · Serverless Application',
    description: 'Serverless compute with a managed relational database and supporting security/identity modules. Suited for internal tooling, lightweight public APIs, and low-traffic web apps.',
    icon: '⚡',
    category: 'compute',
    version: '1.0.0',
    requiredRoles: ['developer', 'architect', 'admin'],
    estimatedCost: '$50–300/month',
    parameters: [
      { name: 'service_name', label: 'Service Name', description: 'Cloud Run service identifier', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{1,62}[a-z0-9]$' } },
      { name: 'environment', label: 'Environment', description: 'Deployment environment', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }] },
      { name: 'region', label: 'GCP Region', description: 'Deployment region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'container_image', label: 'Container Image', description: 'Container image URI for the Cloud Run service', type: 'string', required: true },
      { name: 'db_tier', label: 'Database Tier', description: 'Cloud SQL instance tier (SQL is required)', type: 'select', required: true, default: 'db-f1-micro',
        options: [{ label: 'db-f1-micro (dev/PoC)', value: 'db-f1-micro' }, { label: 'db-g1-small', value: 'db-g1-small' }, { label: 'db-custom-2-8192 (prod)', value: 'db-custom-2-8192' }] },
      { name: 'enable_bigquery', label: 'Enable BigQuery', description: 'Provision BigQuery for analytics', type: 'boolean', required: false, default: false },
      { name: 'enable_pubsub', label: 'Enable Pub/Sub', description: 'Provision Pub/Sub for event messaging', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'pat-003-managed-orchestration',
    name: 'pat-003-managed-orchestration',
    label: 'PAT-003 · Managed Orchestration Application',
    description: 'Managed container orchestration with perimeter security, private networking, managed database access, and shared cluster operations. Also serves as shared runtime for platform and SRE teams.',
    icon: '☸️',
    category: 'compute',
    version: '1.0.0',
    requiredRoles: ['architect', 'admin'],
    estimatedCost: '$300–1500/month',
    parameters: [
      { name: 'cluster_name', label: 'Cluster Name', description: 'GKE cluster identifier', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{1,40}[a-z0-9]$' } },
      { name: 'environment', label: 'Environment', description: 'Deployment environment', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }] },
      { name: 'region', label: 'GCP Region', description: 'Cluster region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'k8s_mode', label: 'Cluster Mode', description: 'GKE cluster type', type: 'select', required: true, default: 'autopilot',
        options: [{ label: 'Autopilot (recommended)', value: 'autopilot' }, { label: 'Standard', value: 'standard' }] },
      { name: 'enable_platform_ops', label: 'Enable Platform Operations', description: 'Include platform-level worker pools and workload identity for SRE teams', type: 'boolean', required: false, default: false },
      { name: 'enable_pubsub', label: 'Enable Pub/Sub', description: 'Provision Pub/Sub messaging', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'pat-004-event-driven',
    name: 'pat-004-event-driven',
    label: 'PAT-004 · Event-Driven Microservices Platform',
    description: 'Decoupled services communicating via an async messaging bus, with event routing, fast in-memory/document stores, and observability tooling. Suited for fan-out/fan-in and event-sourced systems.',
    icon: '📡',
    category: 'messaging',
    version: '1.0.0',
    requiredRoles: ['developer', 'architect', 'admin'],
    estimatedCost: '$100–600/month',
    parameters: [
      { name: 'service_name', label: 'Platform Name', description: 'Identifier for this microservices platform', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{1,62}[a-z0-9]$' } },
      { name: 'environment', label: 'Environment', description: 'Deployment environment', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }] },
      { name: 'region', label: 'GCP Region', description: 'Deployment region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'runtime_type', label: 'Service Runtime', description: 'Runtime for microservices (optional — omit to leave deployment-time choice)', type: 'select', required: false, default: 'cloud-run',
        options: [{ label: 'Cloud Run (serverless)', value: 'cloud-run' }, { label: 'GKE (container)', value: 'gke' }] },
      { name: 'enable_bigquery', label: 'Enable BigQuery', description: 'Provision BigQuery for event analytics', type: 'boolean', required: false, default: false },
      { name: 'enable_sql', label: 'Enable Cloud SQL', description: 'Provision relational database', type: 'boolean', required: false, default: false },
    ],
  },
  {
    id: 'pat-005-data-ingestion',
    name: 'pat-005-data-ingestion',
    label: 'PAT-005 · Data Ingestion Landing Zone',
    description: 'Ingestion and storage foundation centred on object storage, structured datasets, identity controls, and landing-zone access patterns. Suited for data lake raw zones and multi-source ingestion.',
    icon: '🛬',
    category: 'data',
    version: '1.0.0',
    requiredRoles: ['architect', 'admin'],
    estimatedCost: '$30–200/month',
    parameters: [
      { name: 'project_name', label: 'Landing Zone Name', description: 'Identifier for this landing zone', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{1,62}[a-z0-9]$' } },
      { name: 'environment', label: 'Environment', description: 'Deployment environment', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }] },
      { name: 'region', label: 'GCP Region', description: 'Primary storage region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'bq_location', label: 'BigQuery Location', description: 'BigQuery dataset residency', type: 'select', required: true, default: 'EU',
        options: [{ label: 'EU (multi-region)', value: 'EU' }, { label: 'europe-west1', value: 'europe-west1' }, { label: 'US (multi-region)', value: 'US' }] },
      { name: 'gcs_storage_class', label: 'GCS Storage Class', description: 'Default storage class for landing buckets', type: 'select', required: true, default: 'STANDARD',
        options: [{ label: 'Standard', value: 'STANDARD' }, { label: 'Nearline', value: 'NEARLINE' }, { label: 'Coldline', value: 'COLDLINE' }] },
    ],
  },
  {
    id: 'pat-006-vm-workload',
    name: 'pat-006-vm-workload',
    label: 'PAT-006 · Specialised VM Workload Platform',
    description: 'VM-centric stack with network, firewall, and relational database resources for proprietary or specialised software that cannot run in containers (GIS, CAD, legacy licensed workloads).',
    icon: '🖥️',
    category: 'compute',
    version: '1.0.0',
    requiredRoles: ['admin', 'architect'],
    estimatedCost: '$150–1000/month',
    parameters: [
      { name: 'vm_name', label: 'VM Name', description: 'Compute instance identifier', type: 'string', required: true, validation: { pattern: '^[a-z][a-z0-9-]{1,62}[a-z0-9]$' } },
      { name: 'environment', label: 'Environment', description: 'Deployment environment', type: 'select', required: true, default: 'dev',
        options: [{ label: 'Development', value: 'dev' }, { label: 'Staging', value: 'staging' }, { label: 'Production', value: 'prod' }] },
      { name: 'region', label: 'GCP Region', description: 'Deployment region', type: 'select', required: true, default: 'europe-west1',
        options: [{ label: 'Europe West 1', value: 'europe-west1' }, { label: 'Europe West 4', value: 'europe-west4' }, { label: 'US Central 1', value: 'us-central1' }] },
      { name: 'machine_type', label: 'Machine Type', description: 'VM instance machine type', type: 'select', required: true, default: 'n2-standard-4',
        options: [{ label: 'n2-standard-2 (2 vCPU / 8 GB)', value: 'n2-standard-2' }, { label: 'n2-standard-4 (4 vCPU / 16 GB)', value: 'n2-standard-4' }, { label: 'n2-standard-8 (8 vCPU / 32 GB)', value: 'n2-standard-8' }, { label: 'n2-standard-16 (16 vCPU / 64 GB)', value: 'n2-standard-16' }] },
      { name: 'disk_size_gb', label: 'Boot Disk Size (GB)', description: 'Boot disk capacity', type: 'number', required: true, default: 100, validation: { min: 50, max: 10000 } },
      { name: 'workload_type', label: 'Workload Type', description: 'Type of specialised workload running on this VM', type: 'select', required: true, default: 'legacy',
        options: [{ label: 'ArcGIS / GIS Platform', value: 'arcgis' }, { label: 'SAP / ERP System', value: 'sap' }, { label: 'CAD Platform', value: 'cad' }, { label: 'Other Licensed Software', value: 'legacy' }] },
    ],
  },
];

const deployments: DeploymentRequest[] = [];

// ============================================================================
// Middleware Functions
// ============================================================================

const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  // Get user ID from header, fallback to default user for development
  let userId = (req.headers['x-user-id'] as string) || 'user-123';
  
  console.log(`[Auth] Authenticating user: ${userId} for ${req.method} ${req.path}`);
  
  const user = mockUsers.get(userId);

  if (!user) {
    console.error(`[Auth] User not found: ${userId}`);
    console.log(`[Auth] Available users: ${Array.from(mockUsers.keys()).join(', ')}`);
    return res.status(401).json({ 
      error: 'User not found',
      userId: userId,
      availableUsers: Array.from(mockUsers.keys())
    });
  }

  console.log(`[Auth] User authenticated:`, { userId, name: user.name, roles: user.roles });
  (req as any).user = user;
  next();
};

const requireRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredRoles,
        userRoles: user.roles,
      });
    }

    next();
  };
};

// ============================================================================
// Request Logger Middleware
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[BACKEND] ========== INCOMING REQUEST ==========`);
  console.log(`[BACKEND] ${req.method} ${req.path}`);
  console.log(`[BACKEND] Headers:`, { 'x-user-id': req.headers['x-user-id'], 'content-type': req.headers['content-type'] });
  if (Object.keys(req.query || {}).length > 0) console.log(`[BACKEND] Query:`, req.query);
  if (req.method !== 'GET' && req.body) console.log(`[BACKEND] Body:`, JSON.stringify(req.body).substring(0, 200));
  next();
});

// ============================================================================
// Routes
// ============================================================================

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date(),
  });
});

// ============================================================================
// User endpoints
// ============================================================================

app.get('/api/user', authenticateUser, (req: Request, res: Response) => {
  console.log(`[API /user] GET request received`);
  const user = (req as any).user;
  console.log(`[API /user] Returning user data:`, user);
  res.json(user);
});

app.get('/api/user/profile', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    ...user,
    permissions: {
      canDeploy: user.roles.includes('developer') || user.roles.includes('admin'),
      canApprove: user.roles.includes('architect') || user.roles.includes('admin'),
      canManageUsers: user.roles.includes('admin'),
    },
  });
});

app.get('/api/user/deployments', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userDeployments = deployments.filter((d) => d.userId === user.id);
  res.json(userDeployments);
});

// ============================================================================
// Template endpoints
// ============================================================================

app.get('/api/templates', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  const category = req.query.category as string;

  let filtered = templates;

  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }

  filtered = filtered.filter((t) => {
    if (!t.requiredRoles) return true;
    return t.requiredRoles.some((role) => user.roles.includes(role));
  });

  res.json(filtered);
});

app.get('/api/templates/:id', authenticateUser, (req: Request, res: Response) => {
  const template = templates.find((t) => t.id === req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const user = (req as any).user;
  if (template.requiredRoles && !template.requiredRoles.some((role) => user.roles.includes(role))) {
    return res.status(403).json({ error: 'Access denied to this template' });
  }

  res.json(template);
});

// ============================================================================
  // Pattern Catalog endpoints (Backstage-style patterns)
  // ============================================================================

  app.get('/api/catalogs/patterns', authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log(`[API /catalogs/patterns] GET request received`);
      const { tag, domain, lifecycle, search } = req.query;
      console.log(`[API /catalogs/patterns] Query filters:`, { tag, domain, lifecycle, search });
      
      const filters: any = {};
      if (tag) filters.tag = tag as string;
      if (domain) filters.domain = domain as string;
      if (lifecycle) filters.lifecycle = lifecycle as string;
      if (search) filters.search = search as string;

      // Import PatternService dynamically
      const PatternService = require('./services/patternService').PatternService;
      console.log(`[API /catalogs/patterns] Fetching catalog with filters:`, filters);
      const catalog = await PatternService.getCatalog(filters);
      console.log(`[API /catalogs/patterns] Returning ${catalog.patterns?.length || 0} patterns`);
      
      res.json(catalog);
    } catch (error) {
      console.error('[API /catalogs/patterns] Error fetching patterns catalog:', error);
      res.status(500).json({ error: 'Failed to fetch patterns catalog' });
    }
  });

  app.get('/api/catalogs/patterns/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const PatternService = require('./services/patternService').PatternService;
      const pattern = await PatternService.getById(req.params.id);
      
      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }
      
      res.json(pattern);
    } catch (error) {
      console.error('Error fetching pattern:', error);
      res.status(500).json({ error: 'Failed to fetch pattern' });
    }
  });

  app.get('/api/catalogs/patterns/tags/all', authenticateUser, async (req: Request, res: Response) => {
    try {
      const PatternService = require('./services/patternService').PatternService;
      const tags = await PatternService.getTags();
      
      res.json({ tags });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
    }
  });

  app.get('/api/catalogs/patterns/domains/all', authenticateUser, async (req: Request, res: Response) => {
    try {
      const PatternService = require('./services/patternService').PatternService;
      const domains = await PatternService.getDomains();
      
      res.json({ domains });
    } catch (error) {
      console.error('Error fetching domains:', error);
      res.status(500).json({ error: 'Failed to fetch domains' });
    }
  });

  app.get('/api/catalogs/patterns/lifecycles/all', authenticateUser, async (req: Request, res: Response) => {
    try {
      const PatternService = require('./services/patternService').PatternService;
      const lifecycles = await PatternService.getLifecycles();
      
      res.json({ lifecycles });
    } catch (error) {
      console.error('Error fetching lifecycles:', error);
      res.status(500).json({ error: 'Failed to fetch lifecycles' });
    }
  });

  // ============================================================================
  // Building Block Catalog endpoints
  // ============================================================================

  app.get('/api/catalogs/building-blocks', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { BuildingBlockService } = require('./services/buildingBlockService');
      const blocks = await BuildingBlockService.getAllAsync();
      
      res.json({ blocks });
    } catch (error) {
      console.error('Error fetching building blocks:', error);
      res.status(500).json({ error: 'Failed to fetch building blocks' });
    }
  });

  app.get('/api/catalogs/building-blocks/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { BuildingBlockService } = require('./services/buildingBlockService');
      const block = await BuildingBlockService.getByIdAsync(req.params.id);
      
      if (!block) {
        return res.status(404).json({ error: 'Building block not found' });
      }
      
      res.json(block);
    } catch (error) {
      console.error('Error fetching building block:', error);
      res.status(500).json({ error: 'Failed to fetch building block' });
    }
  });

  app.get('/api/catalogs/building-blocks/:id/variables', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { BuildingBlockService } = require('./services/buildingBlockService');
      const block = await BuildingBlockService.getByIdAsync(req.params.id);
      
      if (!block) {
        return res.status(404).json({ error: 'Building block not found' });
      }
      
      res.json({ 
        blockId: req.params.id,
        variables: block.variables,
        outputs: block.outputs,
        dependencies: block.dependencies 
      });
    } catch (error) {
      console.error('Error fetching building block variables:', error);
      res.status(500).json({ error: 'Failed to fetch building block variables' });
    }
  });

  app.get('/api/catalogs/patterns/:id/blocks', authenticateUser, async (req: Request, res: Response) => {
    try {
      const PatternService = require('./services/patternService').PatternService;
      const { BuildingBlockService } = require('./services/buildingBlockService');
      
      const pattern = await PatternService.getById(req.params.id);
      if (!pattern) {
        return res.status(404).json({ error: 'Pattern not found' });
      }

      const buildingBlockIds = pattern.metadata.buildingBlocks?.required || [];
      const optionalBlockIds = pattern.metadata.buildingBlocks?.optional || [];
      console.log(`[API /catalogs/patterns/:id/blocks] Pattern: ${req.params.id}`);
      console.log(`[API /catalogs/patterns/:id/blocks] Building block IDs:`, buildingBlockIds);
      
      const requiredBlocks = await BuildingBlockService.getBlocksForPatternAsync(buildingBlockIds);
      const optionalBlocks = await BuildingBlockService.getBlocksForPatternAsync(optionalBlockIds);
      
      console.log(`[API /catalogs/patterns/:id/blocks] Required blocks returned:`, requiredBlocks.length, requiredBlocks[0]?.id || 'No ID');
      console.log(`[API /catalogs/patterns/:id/blocks] First required block keys:`, requiredBlocks[0] ? Object.keys(requiredBlocks[0]) : 'N/A');
      
      res.json({
        ...pattern,
        requiredBlocks,
        optionalBlocks
      });
    } catch (error) {
      console.error('Error fetching pattern blocks:', error);
      res.status(500).json({ error: 'Failed to fetch pattern blocks' });
    }
  });

  // ============================================================================
  // Deployment endpoints
  // ============================================================================

  app.post('/api/deployments', authenticateUser, (req: Request, res: Response) => {
    const user = (req as any).user;
    const { templateId, projectId, serviceName, parameters } = req.body;

  const template = templates.find((t) => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if (template.requiredRoles && !template.requiredRoles.some((role) => user.roles.includes(role))) {
    return res.status(403).json({ error: 'Access denied to this template' });
  }

  const missingParams = template.parameters
    .filter((p) => p.required && !parameters[p.name])
    .map((p) => p.name);

  if (missingParams.length > 0) {
    return res.status(400).json({
      error: 'Missing required parameters',
      missing: missingParams,
    });
  }

  const deployment: DeploymentRequest = {
    id: `deploy-${Date.now()}`,
    userId: user.id,
    templateId,
    projectId,
    serviceName,
    parameters,
    status: 'draft',
    createdAt: new Date(),
  };

  deployments.push(deployment);

  res.status(201).json({
    ...deployment,
    nextStep: 'review_and_submit',
    estimatedCost: template.estimatedCost,
  });
});

// ============================================================================
// Pattern Deployment endpoints (BEFORE generic :id route to prevent conflicts)
// ============================================================================

app.post('/api/deployments/patterns/submit', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { patternId, projectId, projectName, building_blocks, estimatedMonthlyCost, environment, region } = req.body;
    const user = (req as any).user;

    console.log('[Deployment] ========== NEW DEPLOYMENT SUBMISSION ==========');
    console.log('[Deployment] User:', user.id, user.name);
    console.log('[Deployment] Pattern ID:', patternId);
    console.log('[Deployment] Project ID:', projectId);
    console.log('[Deployment] Project Name:', projectName);
    console.log('[Deployment] Building Blocks:', building_blocks);

    // Validate required fields
    if (!patternId || !projectId || !building_blocks) {
      console.error('[Deployment] ❌ VALIDATION FAILED - Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: patternId, projectId, building_blocks' });
    }

    console.log('[Deployment] ✅ Validation passed');

    // Create deployment ID early
    const deploymentId = `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build deployment payload for resolver
    const innerPayload = {
      patternId,
      projectId,
      projectName: projectName || `project-${projectId}`,
      building_blocks,
      terraform_version: '~> 1.9',
      backend: 'local',
      modules_ref: 'main',
      estimatedMonthlyCost,
      createdBy: user.id,
      timestamp: new Date().toISOString(),
    };

    // Build resolver payload
    const resolverPayload: ResolverDeploymentPayload = {
      deploymentId,
      status: 'pending',
      payload: innerPayload,
      message: 'Pattern deployment submitted for resolution',
      createdBy: user.name,
      timestamp: new Date().toISOString(),
    };

    console.log('[Pattern Deployment] Submitting to resolver:', JSON.stringify(resolverPayload, null, 2));

    // Submit to resolver
    let resolverResponse: ResolverResponse | null = null;
    let resolverError: string | null = null;

    try {
      resolverResponse = await ResolverService.submitDeployment(resolverPayload);
      console.log('[Pattern Deployment] ✅ Resolver returned successfully');
      console.log('[Pattern Deployment] Response status:', resolverResponse.status);

      // Validate Terraform files
      const validation = ResolverService.validateTerraformFiles(resolverResponse);
      if (!validation.valid) {
        console.warn('[Pattern Deployment] ⚠️  Terraform files validation:', validation.errors);
      } else {
        console.log('[Pattern Deployment] ✅ Terraform files validated');
      }

      // Log file sizes
      const fileSizes = ResolverService.getTerraformFileSizes(
        ResolverService.extractTerraformFiles(resolverResponse)
      );
      console.log('[Pattern Deployment] Terraform file sizes:', fileSizes);
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error('[Pattern Deployment] ❌ Resolver API error:', errorMsg);
      resolverError = errorMsg;
    }

    // Store deployment locally
    const deployment: DeploymentRequest = {
      id: deploymentId,
      userId: user.id,
      templateId: patternId,
      projectId,
      serviceName: `${patternId}-${projectId}`,
      parameters: building_blocks,
      status: resolverResponse ? 'resolved' : 'pending',
      resolverStatus: resolverResponse ? 'resolved' : resolverError ? 'error' : 'pending',
      createdAt: new Date(),
    };

    // Store Terraform files if available
    if (resolverResponse) {
      deployment.terraformFiles = ResolverService.extractTerraformFiles(resolverResponse);
      deployment.resolverResponse = ResolverService.formatResolverResponse(resolverResponse);
    }

    deployments.push(deployment);

    // Build response
    const responseData: any = {
      deploymentId: deployment.id,
      status: deployment.status,
      resolverStatus: deployment.resolverStatus,
      projectId,
      projectName: projectName || `project-${projectId}`,
      message: resolverResponse
        ? 'Pattern resolved successfully - Terraform files generated'
        : 'Pattern deployment submitted - awaiting resolution',
      createdBy: user.name,
      timestamp: new Date().toISOString(),
    };

    // Include Terraform files if available
    if (deployment.terraformFiles) {
      responseData.terraformFiles = {
        main_tf_size: Buffer.byteLength(deployment.terraformFiles.main_tf, 'utf-8'),
        variables_tf_size: Buffer.byteLength(deployment.terraformFiles.variables_tf, 'utf-8'),
        terraform_tfvars_size: Buffer.byteLength(deployment.terraformFiles.terraform_tfvars, 'utf-8'),
      };
      responseData.summary = resolverResponse?.summary;
    }

    // Include error if present
    if (resolverError) {
      responseData.error = resolverError;
    }

    console.log('[Deployment] ✅ SUBMISSION SUCCESS');
    console.log('[Deployment] Deployment ID:', deployment.id);
    console.log('[Deployment] Status:', deployment.status);
    console.log('[Deployment] ==========================================================\n');

    res.json(responseData);
  } catch (error) {
    console.error('Error submitting pattern deployment:', error);
    res.status(500).json({ error: 'Failed to submit pattern deployment' });
  }
});

// ============================================================================
// Terraform File Retrieval Endpoints
// ============================================================================

app.get('/api/deployments/:deploymentId/terraform', authenticateUser, (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const deployment = deployments.find((d) => d.id === deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (!deployment.terraformFiles) {
      return res.status(404).json({ 
        error: 'Terraform files not available',
        message: 'Deployment has not been resolved yet or resolver returned no files'
      });
    }

    res.json({
      deploymentId: deployment.id,
      projectId: deployment.projectId,
      status: deployment.resolverStatus,
      terraformFiles: {
        main_tf_size: Buffer.byteLength(deployment.terraformFiles.main_tf, 'utf-8'),
        variables_tf_size: Buffer.byteLength(deployment.terraformFiles.variables_tf, 'utf-8'),
        terraform_tfvars_size: Buffer.byteLength(deployment.terraformFiles.terraform_tfvars, 'utf-8'),
      },
      summary: deployment.resolverResponse?.summary,
    });
  } catch (error) {
    console.error('Error retrieving terraform files:', error);
    res.status(500).json({ error: 'Failed to retrieve terraform files' });
  }
});

app.get('/api/deployments/:deploymentId/terraform/main', authenticateUser, (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const deployment = deployments.find((d) => d.id === deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (!deployment.terraformFiles || !deployment.terraformFiles.main_tf) {
      return res.status(404).json({ error: 'main.tf not available' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="main.tf"`);
    res.send(deployment.terraformFiles.main_tf);
  } catch (error) {
    console.error('Error retrieving main.tf:', error);
    res.status(500).json({ error: 'Failed to retrieve main.tf' });
  }
});

app.get('/api/deployments/:deploymentId/terraform/variables', authenticateUser, (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const deployment = deployments.find((d) => d.id === deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (!deployment.terraformFiles || !deployment.terraformFiles.variables_tf) {
      return res.status(404).json({ error: 'variables.tf not available' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="variables.tf"`);
    res.send(deployment.terraformFiles.variables_tf);
  } catch (error) {
    console.error('Error retrieving variables.tf:', error);
    res.status(500).json({ error: 'Failed to retrieve variables.tf' });
  }
});

app.get('/api/deployments/:deploymentId/terraform/tfvars', authenticateUser, (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const deployment = deployments.find((d) => d.id === deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (!deployment.terraformFiles || !deployment.terraformFiles.terraform_tfvars) {
      return res.status(404).json({ error: 'terraform.tfvars not available' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="terraform.tfvars"`);
    res.send(deployment.terraformFiles.terraform_tfvars);
  } catch (error) {
    console.error('Error retrieving terraform.tfvars:', error);
    res.status(500).json({ error: 'Failed to retrieve terraform.tfvars' });
  }
});

app.post('/api/deployments/patterns/:deploymentId/execute', authenticateUser, requireRole(['architect', 'admin']), async (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const deployment = deployments.find((d) => d.id === deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // In production, this would:
    // 1. Send the payload to an external Terraform API
    // 2. Trigger the actual infrastructure deployment
    // 3. Track deployment status

    deployment.status = 'deployed';
    deployment.deployedAt = new Date();

    const user = (req as any).user;

    res.json({
      deploymentId,
      status: 'deployed',
      message: 'Pattern deployment initiated',
      deployedBy: user.name,
      timestamp: new Date().toISOString(),
      terraformApplied: true,
    });
  } catch (error) {
    console.error('Error executing pattern deployment:', error);
    res.status(500).json({ error: 'Failed to execute pattern deployment' });
  }
});

app.get('/api/deployments/:id', authenticateUser, (req: Request, res: Response) => {
  const deployment = deployments.find((d) => d.id === req.params.id);
  const user = (req as any).user;

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.userId !== user.id && !user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(deployment);
});

app.post('/api/deployments/:id/submit', authenticateUser, (req: Request, res: Response) => {
  const deployment = deployments.find((d) => d.id === req.params.id);
  const user = (req as any).user;

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.userId !== user.id && !user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (deployment.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft deployments can be submitted' });
  }

  deployment.status = 'pending';

  res.json({
    ...deployment,
    message: 'Deployment submitted for approval',
    nextStep: 'awaiting_approval',
  });
});

app.post('/api/deployments/:id/approve', authenticateUser, requireRole(['architect', 'admin']), (req: Request, res: Response) => {
  const deployment = deployments.find((d) => d.id === req.params.id);

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.status !== 'pending') {
    return res.status(400).json({ error: 'Only pending deployments can be approved' });
  }

  const user = (req as any).user;
  deployment.status = 'approved';
  deployment.approvedAt = new Date();

  setTimeout(() => {
    deployment.status = 'deployed';
    deployment.deployedAt = new Date();
  }, 2000);

  res.json({
    ...deployment,
    message: 'Deployment approved and queued for execution',
    approvedBy: user.name,
    estimatedTime: '2-5 minutes',
  });
});

app.post('/api/deployments/:id/reject', authenticateUser, requireRole(['architect', 'admin']), (req: Request, res: Response) => {
  const deployment = deployments.find((d) => d.id === req.params.id);
  const { reason } = req.body;

  if (!deployment) {
    return res.status(404).json({ error: 'Deployment not found' });
  }

  if (deployment.status !== 'pending') {
    return res.status(400).json({ error: 'Only pending deployments can be rejected' });
  }

  deployment.status = 'failed';
  deployment.error = reason || 'Rejected by reviewer';

  const user = (req as any).user;
  res.json({
    ...deployment,
    message: 'Deployment rejected',
    rejectedBy: user.name,
  });
});

// ============================================================================
// Project endpoints
// ============================================================================

app.get('/api/projects', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;

  const projects = [
    {
      id: 'my-project-dev',
      name: 'My Project - Dev',
      projectNumber: '123456789',
      owner: user.name,
      region: 'us-central1',
    },
    {
      id: 'my-project-prod',
      name: 'My Project - Prod',
      projectNumber: '987654321',
      owner: user.name,
      region: 'us-central1',
    },
  ];

  res.json(projects);
});

// ============================================================================
// Statistics endpoints
// ============================================================================

app.get('/api/stats', authenticateUser, requireRole(['admin', 'architect']), (req: Request, res: Response) => {
  res.json({
    totalDeployments: deployments.length,
    activeDeployments: deployments.filter((d) => d.status === 'deployed').length,
    pendingApprovals: deployments.filter((d) => d.status === 'pending').length,
    failedDeployments: deployments.filter((d) => d.status === 'failed').length,
    users: mockUsers.size,
    templates: templates.length,
    deploymentsByTemplate: templates.map((t) => ({
      template: t.label,
      count: deployments.filter((d) => d.templateId === t.id).length,
    })),
  });
});

// ============================================================================
// Error handling
// ============================================================================

// ============================================================================
// Deployment History (for debugging)
// ============================================================================

app.get('/api/deployments', authenticateUser, (req: Request, res: Response) => {
  const user = (req as any).user;
  
  // Admins see all deployments, others see only their own
  const filtered = user.roles.includes('admin')
    ? deployments
    : deployments.filter((d) => d.userId === user.id);

  res.json({
    total: filtered.length,
    deployments: filtered.map((d) => ({
      deploymentId: d.id,
      patternId: d.templateId,
      projectId: d.projectId,
      status: d.status,
      createdAt: d.createdAt,
      deployedAt: d.deployedAt,
    })),
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// ============================================================================
// Start server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     IDP Portal API - Advanced Template Management         ║
╚═══════════════════════════════════════════════════════════╝

✓ Server running on http://localhost:${PORT}
✓ Health check: http://localhost:${PORT}/health

Available Endpoints:
  GET  /api/user - Get current user profile
  GET  /api/templates - List available templates
  GET  /api/templates/:id - Get template details
  
  POST /api/deployments - Create new deployment
  GET  /api/deployments/:id - Get deployment status
  POST /api/deployments/:id/submit - Submit for approval
  POST /api/deployments/:id/approve - Approve deployment (admin only)
  
  GET  /api/projects - List accessible projects
  GET  /api/stats - System statistics (admin only)
  `);
});
