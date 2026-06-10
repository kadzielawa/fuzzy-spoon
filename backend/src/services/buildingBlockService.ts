/**
 * Building Block Service
 * Fetches Terraform building block modules from external catalog API
 * Caches blocks and provides access to module metadata and variable schemas
 */

import { curlFetch } from './curlFetch';

const CATALOG_API_BASE = 'https://catalog-api-479677124022.europe-west2.run.app';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'list' | 'map' | 'object';
  description: string;
  required: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowed_values?: string[];
  };
}

export interface BuildingBlock {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'network' | 'security' | 'compute' | 'storage' | 'data' | 'monitoring' | 'iam';
  version: string;
  variables: Variable[];
  outputs: Array<{ name: string; description: string; type: string }>;
  dependencies: string[]; // IDs of blocks this depends on
  tags: string[];
}

// ─── Catalog API response shape ──────────────────────────────────────────────
interface CatalogBlockResponse {
  building_block: string;
  modules: string[];
  variables_tf: string;
}

// ─── Category lookup ──────────────────────────────────────────────────────────
const BLOCK_CATEGORIES: Record<string, BuildingBlock['category']> = {
  network: 'network', firewall: 'network', dns: 'network', external_global_address: 'network',
  external_global_loadbalancer: 'network', network_policy: 'network', integration: 'network',
  iam: 'iam', keys: 'security', security_policy: 'security', security_operations: 'security',
  bastion: 'security',
  bigquery: 'data', analytics: 'data', environment: 'data', workflow: 'data',
  bucket: 'storage', sql: 'storage',
  delivery: 'compute', serverless_app: 'compute', k8s: 'compute', K8s: 'compute', helm: 'compute',
  pubsub: 'monitoring',
};

/**
 * Parse a variables.tf HCL string into Variable[]
 */
function parseVariablesTf(hcl: string): Variable[] {
  const variables: Variable[] = [];
  let i = 0;

  while (i < hcl.length) {
    const varStart = hcl.indexOf('variable "', i);
    if (varStart === -1) break;

    const nameStart = varStart + 10;
    const nameEnd = hcl.indexOf('"', nameStart);
    if (nameEnd === -1) break;
    const name = hcl.slice(nameStart, nameEnd);

    const braceStart = hcl.indexOf('{', nameEnd);
    if (braceStart === -1) break;

    // Find matching closing brace
    let depth = 1;
    let j = braceStart + 1;
    while (j < hcl.length && depth > 0) {
      if (hcl[j] === '{') depth++;
      else if (hcl[j] === '}') depth--;
      j++;
    }

    const body = hcl.slice(braceStart + 1, j - 1);

    const descMatch = body.match(/description\s*=\s*"([^"]*?)"/);
    const typeMatch = body.match(/type\s*=\s*(\S+(?:\([^)]*\))?)/);
    const hasDefault = /default\s*=/.test(body);

    let defaultValue: any = undefined;
    if (hasDefault) {
      const defStr = body.match(/default\s*=\s*"([^"]*?)"/);
      const defBool = body.match(/default\s*=\s*(true|false)/);
      const defNull = /default\s*=\s*null/.test(body);
      const defNum  = body.match(/default\s*=\s*(-?\d+(?:\.\d+)?)(?:\s|$)/);

      if (defStr)  defaultValue = defStr[1];
      else if (defBool) defaultValue = defBool[1] === 'true';
      else if (defNull) defaultValue = null;
      else if (defNum)  defaultValue = parseFloat(defNum[1]);
    }

    const rawType = typeMatch ? typeMatch[1] : 'string';
    let type: Variable['type'] = 'string';
    if (rawType === 'number')          type = 'number';
    else if (rawType === 'bool')       type = 'boolean';
    else if (rawType.startsWith('list'))   type = 'list';
    else if (rawType.startsWith('map') || rawType.startsWith('object') || rawType === 'any') type = 'map';

    const v: Variable = { name, type, description: descMatch ? descMatch[1] : '', required: !hasDefault };
    if (hasDefault) v.default = defaultValue;
    variables.push(v);

    i = j;
  }

  return variables;
}

/**
 * Transform a CatalogBlockResponse from the catalog API into the internal BuildingBlock shape
 */
function catalogResponseToBlock(blockId: string, resp: CatalogBlockResponse): BuildingBlock {
  const displayName = blockId
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    id: blockId,
    name: resp.building_block,
    displayName,
    description: `${displayName} building block (modules: ${resp.modules.join(', ')})`,
    category: BLOCK_CATEGORIES[blockId] ?? 'compute',
    version: '1.0.0',
    variables: parseVariablesTf(resp.variables_tf),
    outputs: [],
    dependencies: [],
    tags: resp.modules,
  };
}

// Cache for fetched blocks
interface CacheEntry {
  data: BuildingBlock;
  timestamp: number;
}

const blockCache: Map<string, CacheEntry> = new Map();
const BUILDING_BLOCKS: Record<string, BuildingBlock> = {
  network: {
    id: 'network',
    name: 'network',
    displayName: 'VPC Network',
    description: 'Google Cloud VPC network with routing, subnets, and NAT configuration',
    category: 'network',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'The GCP project ID where resources will be created',
        required: true,
      },
      {
        name: 'region',
        type: 'string',
        description: 'The GCP region to deploy resources into',
        required: false,
        default: 'europe-west3',
      },
      {
        name: 'custom_vpc_name',
        type: 'string',
        description: 'Custom name for the VPC network',
        required: false,
        default: '',
      },
      {
        name: 'routing_mode',
        type: 'string',
        description: 'Routing mode for the VPC network (REGIONAL or GLOBAL)',
        required: false,
        default: 'REGIONAL',
        validation: { allowed_values: ['REGIONAL', 'GLOBAL'] },
      },
      {
        name: 'auto_create_subnetworks',
        type: 'boolean',
        description: 'Whether to create subnetworks automatically',
        required: false,
        default: false,
      },
      {
        name: 'create_nat',
        type: 'boolean',
        description: 'If false, do not create Cloud NAT or NAT external IPs',
        required: false,
        default: true,
      },
      {
        name: 'ingress_ssh_via_IAP',
        type: 'boolean',
        description: 'Allow SSH ingress traffic via Google Cloud Identity-Aware Proxy',
        required: false,
        default: true,
      },
    ],
    outputs: [
      { name: 'network_name', description: 'The name of the VPC network', type: 'string' },
      { name: 'network_id', description: 'The ID of the VPC network', type: 'string' },
      { name: 'router_id', description: 'The ID of the Cloud Router', type: 'string' },
    ],
    dependencies: [],
    tags: ['networking', 'vpc', 'infrastructure'],
  },
  iam: {
    id: 'iam',
    name: 'iam_service_account',
    displayName: 'IAM & Service Accounts',
    description: 'Service accounts, IAM roles, and workload identity configuration',
    category: 'iam',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'Project ID where service account will be created',
        required: true,
      },
      {
        name: 'service_account_name',
        type: 'string',
        description: 'Name of the service account',
        required: true,
      },
      {
        name: 'display_name',
        type: 'string',
        description: 'Display name for the service account',
        required: false,
        default: 'Terraform-managed',
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of the service account',
        required: false,
      },
      {
        name: 'service_account_prefix',
        type: 'string',
        description: 'Prefix for service account resource names',
        required: false,
      },
    ],
    outputs: [
      { name: 'service_account_email', description: 'Email of the service account', type: 'string' },
      { name: 'service_account_unique_id', description: 'Unique ID of the service account', type: 'string' },
    ],
    dependencies: [],
    tags: ['identity', 'access-control', 'security'],
  },
  security_policy: {
    id: 'security_policy',
    name: 'vf_security_policy',
    displayName: 'Cloud Armor Security',
    description: 'Cloud Armor security policies for DDoS and threat protection',
    category: 'security',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'GCP project ID',
        required: true,
      },
      {
        name: 'policy_name',
        type: 'string',
        description: 'Name of the security policy',
        required: true,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of the security policy',
        required: false,
      },
      {
        name: 'enable_layer7_ddos_defense',
        type: 'boolean',
        description: 'Enable Layer 7 DDoS defense',
        required: false,
        default: true,
      },
      {
        name: 'custom_rules',
        type: 'list',
        description: 'Custom security rules',
        required: false,
      },
    ],
    outputs: [
      { name: 'policy_id', description: 'ID of the security policy', type: 'string' },
      { name: 'policy_name', description: 'Name of the security policy', type: 'string' },
    ],
    dependencies: [],
    tags: ['security', 'ddos-protection', 'cloud-armor'],
  },
  sql: {
    id: 'sql',
    name: 'cloud_sql',
    displayName: 'Cloud SQL Database',
    description: 'Managed relational database with automated backups and high availability',
    category: 'storage',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'GCP project ID',
        required: true,
      },
      {
        name: 'database_version',
        type: 'string',
        description: 'Database version (MYSQL_8_0, POSTGRES_14, etc)',
        required: true,
        validation: { allowed_values: ['MYSQL_8_0', 'POSTGRES_14', 'POSTGRES_15', 'SQLSERVER_2019'] },
      },
      {
        name: 'instance_name',
        type: 'string',
        description: 'Name of the Cloud SQL instance',
        required: true,
      },
      {
        name: 'tier',
        type: 'string',
        description: 'Machine type tier (db-f1-micro, db-g1-small, etc)',
        required: false,
        default: 'db-f1-micro',
      },
      {
        name: 'region',
        type: 'string',
        description: 'GCP region for the database instance',
        required: true,
        default: 'europe-west3',
      },
      {
        name: 'availability_type',
        type: 'string',
        description: 'Availability type (REGIONAL or ZONAL)',
        required: false,
        default: 'REGIONAL',
        validation: { allowed_values: ['REGIONAL', 'ZONAL'] },
      },
    ],
    outputs: [
      { name: 'instance_connection_name', description: 'Connection name of the instance', type: 'string' },
      { name: 'private_ip_address', description: 'Private IP address', type: 'string' },
      { name: 'public_ip_address', description: 'Public IP address', type: 'string' },
    ],
    dependencies: ['network'],
    tags: ['database', 'sql', 'persistence'],
  },
  bigquery: {
    id: 'bigquery',
    name: 'bigquery',
    displayName: 'BigQuery Data Warehouse',
    description: 'Serverless data warehouse for analytics and queries',
    category: 'data',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'GCP project ID',
        required: true,
      },
      {
        name: 'dataset_id',
        type: 'string',
        description: 'BigQuery dataset ID',
        required: true,
      },
      {
        name: 'location',
        type: 'string',
        description: 'Location for the dataset (EU, US, etc)',
        required: false,
        default: 'EU',
        validation: { allowed_values: ['EU', 'US', 'asia-northeast1', 'europe-west3'] },
      },
      {
        name: 'description',
        type: 'string',
        description: 'Description of the dataset',
        required: false,
      },
    ],
    outputs: [
      { name: 'dataset_id', description: 'ID of the BigQuery dataset', type: 'string' },
      { name: 'dataset_name', description: 'Friendly name of the dataset', type: 'string' },
    ],
    dependencies: [],
    tags: ['data-warehouse', 'analytics', 'bigquery'],
  },
  bucket: {
    id: 'bucket',
    name: 'gcs',
    displayName: 'Cloud Storage Bucket',
    description: 'Cloud Storage bucket for object storage and file management',
    category: 'storage',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'GCP project ID',
        required: true,
      },
      {
        name: 'bucket_name',
        type: 'string',
        description: 'Name of the Cloud Storage bucket',
        required: true,
      },
      {
        name: 'location',
        type: 'string',
        description: 'Location for the bucket (EU, US, etc)',
        required: false,
        default: 'EU',
        validation: { allowed_values: ['EU', 'US', 'asia-northeast1', 'europe-west3'] },
      },
      {
        name: 'storage_class',
        type: 'string',
        description: 'Storage class (STANDARD, NEARLINE, COLDLINE, ARCHIVE)',
        required: false,
        default: 'STANDARD',
        validation: { allowed_values: ['STANDARD', 'NEARLINE', 'COLDLINE', 'ARCHIVE'] },
      },
      {
        name: 'versioning_enabled',
        type: 'boolean',
        description: 'Enable object versioning',
        required: false,
        default: false,
      },
      {
        name: 'lifecycle_days_to_delete',
        type: 'number',
        description: 'Days before objects are deleted (0 = no deletion)',
        required: false,
        default: 0,
        validation: { min: 0 },
      },
    ],
    outputs: [
      { name: 'bucket_name', description: 'Name of the created bucket', type: 'string' },
      { name: 'bucket_url', description: 'URL of the bucket', type: 'string' },
    ],
    dependencies: [],
    tags: ['storage', 'object-storage', 'gcs'],
  },
  environment: {
    id: 'environment',
    name: 'composer_environment',
    displayName: 'Cloud Composer Environment',
    description: 'Apache Airflow environment for workflow orchestration and data pipelines',
    category: 'data',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'GCP project ID',
        required: true,
      },
      {
        name: 'environment_name',
        type: 'string',
        description: 'Name of the Composer environment',
        required: true,
      },
      {
        name: 'region',
        type: 'string',
        description: 'GCP region for the environment',
        required: true,
        default: 'europe-west3',
      },
      {
        name: 'node_count',
        type: 'number',
        description: 'Number of nodes in the environment',
        required: false,
        default: 3,
        validation: { min: 3, max: 10 },
      },
      {
        name: 'machine_type',
        type: 'string',
        description: 'Machine type for the nodes',
        required: false,
        default: 'n1-standard-4',
      },
      {
        name: 'enable_high_resilience',
        type: 'boolean',
        description: 'Enable high resilience',
        required: false,
        default: false,
      },
    ],
    outputs: [
      { name: 'airflow_uri', description: 'URI to access Airflow webserver', type: 'string' },
      { name: 'gke_cluster', description: 'GKE cluster name', type: 'string' },
    ],
    dependencies: ['network'],
    tags: ['orchestration', 'airflow', 'data-pipeline'],
  },
  keys: {
    id: 'keys',
    name: 'kms',
    displayName: 'Cloud KMS Keys',
    description: 'Key management and encryption keys for data protection',
    category: 'security',
    version: '1.0.0',
    variables: [
      {
        name: 'project_id',
        type: 'string',
        description: 'GCP project ID',
        required: true,
      },
      {
        name: 'keyring_name',
        type: 'string',
        description: 'Name of the KMS keyring',
        required: true,
      },
      {
        name: 'region',
        type: 'string',
        description: 'Region for the keyring',
        required: true,
        default: 'europe-west3',
      },
      {
        name: 'key_names',
        type: 'list',
        description: 'Names of the cryptographic keys to create',
        required: false,
      },
      {
        name: 'key_rotation_period_days',
        type: 'number',
        description: 'Key rotation period in days',
        required: false,
        default: 90,
        validation: { min: 1 },
      },
    ],
    outputs: [
      { name: 'keyring_id', description: 'ID of the KMS keyring', type: 'string' },
      { name: 'key_names', description: 'Names of the created keys', type: 'list' },
    ],
    dependencies: [],
    tags: ['encryption', 'key-management', 'security'],
  },
};

export class BuildingBlockService {
  /**
   * Fetch a building block from the catalog API
   * Uses cache to avoid repeated API calls
   */
  static async fetchBlockFromAPI(blockId: string): Promise<BuildingBlock | undefined> {
    // Check cache
    const cached = blockCache.get(blockId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await curlFetch(`${CATALOG_API_BASE}/buildingblock/${blockId}`, { timeoutMs: 10000 });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const apiResp = response.json() as CatalogBlockResponse;
      const block = catalogResponseToBlock(blockId, apiResp);

      // Cache the result
      blockCache.set(blockId, {
        data: block,
        timestamp: Date.now(),
      });

      return block;
    } catch (error) {
      console.warn(`Failed to fetch building block ${blockId}, using fallback:`, error instanceof Error ? error.message : error);
      // Fallback to mock data if available
      return BUILDING_BLOCKS[blockId];
    }
  }

  /**
   * Get all available building blocks
   * For backward compatibility, returns mock blocks synchronously
   */
  static getAll(): BuildingBlock[] {
    return Object.values(BUILDING_BLOCKS);
  }

  /**
   * Get all available building blocks (async, fetches from API)
   */
  static async getAllAsync(blockIds?: string[]): Promise<BuildingBlock[]> {
    const ids = blockIds || Object.keys(BUILDING_BLOCKS);
    const blocks = await Promise.all(
      ids.map((id) => this.fetchBlockFromAPI(id))
    );
    return blocks.filter((block) => block !== undefined) as BuildingBlock[];
  }

  /**
   * Get a specific building block by ID (async)
   */
  static async getByIdAsync(id: string): Promise<BuildingBlock | undefined> {
    return this.fetchBlockFromAPI(id);
  }

  /**
   * Get a specific building block by ID (sync fallback)
   */
  static getById(id: string): BuildingBlock | undefined {
    return BUILDING_BLOCKS[id];
  }

  /**
   * Get building blocks by category
   */
  static getByCategory(category: string): BuildingBlock[] {
    return Object.values(BUILDING_BLOCKS).filter((block) => block.category === category);
  }

  /**
   * Get building blocks for a pattern (by IDs) - async
   */
  static async getBlocksForPatternAsync(blockIds: string[]): Promise<BuildingBlock[]> {
    const blocks = await Promise.all(
      blockIds.map((id) => this.fetchBlockFromAPI(id))
    );
    return blocks.filter((block) => block !== undefined) as BuildingBlock[];
  }

  /**
   * Get building blocks for a pattern (by IDs)
   */
  static getBlocksForPattern(blockIds: string[]): BuildingBlock[] {
    return blockIds
      .map((id) => BUILDING_BLOCKS[id])
      .filter((block) => block !== undefined);
  }

  /**
   * Get building block with resolved dependencies
   */
  static getBlockWithDependencies(blockId: string): BuildingBlock | undefined {
    const block = BUILDING_BLOCKS[blockId];
    if (!block) return undefined;
    return { ...block };
  }

  /**
   * Get all dependencies for a block (recursive)
   */
  static resolveDependencies(blockId: string, resolved: Set<string> = new Set()): string[] {
    if (resolved.has(blockId)) return [];

    const block = BUILDING_BLOCKS[blockId];
    if (!block) return [];

    resolved.add(blockId);
    const deps: string[] = [...block.dependencies];

    for (const dep of block.dependencies) {
      deps.push(...this.resolveDependencies(dep, resolved));
    }

    return Array.from(new Set(deps)); // Remove duplicates
  }

  /**
   * Get variables for multiple blocks
   */
  static getBlocksVariables(blockIds: string[]): Record<string, Variable[]> {
    const result: Record<string, Variable[]> = {};
    for (const id of blockIds) {
      const block = BUILDING_BLOCKS[id];
      if (block) {
        result[id] = block.variables;
      }
    }
    return result;
  }

  /**
   * Clear the cache (useful for testing or refresh)
   */
  static clearCache(): void {
    blockCache.clear();
  }
}
