/**
 * IDP Portal API - Advanced Template Management & User Services
 * Handles authentication, template queries, deployment management, and user profiles
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
  status: 'draft' | 'pending' | 'approved' | 'deployed' | 'failed';
  createdAt: Date;
  approvedAt?: Date;
  deployedAt?: Date;
  error?: string;
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
];

const deployments: DeploymentRequest[] = [];

// ============================================================================
// Middleware Functions
// ============================================================================

const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.headers['x-user-id'] as string) || 'user-123';
  const user = mockUsers.get(userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

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
  const user = (req as any).user;
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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
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
