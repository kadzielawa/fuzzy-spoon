/**
 * Pattern Service
 * Manages Backstage-style pattern definitions and catalog
 */

import yaml from 'js-yaml';
import { curlFetch } from './curlFetch';

// Pattern Metadata from Backstage format
export interface PatternMetadata {
  name: string;
  title: string;
  description: string;
  tags: string[];
  links?: Array<{ title: string; url: string }>;
  owner: string;
  domain: string;
  lifecycle: string;
  status: string;
  releaseBucket: string;
  runtimeType: string;
  buildingBlocks: {
    required: string[];
    optional: string[];
    default: string[];
  };
}

export interface Pattern {
  id: string;
  apiVersion: string;
  kind: string;
  metadata: PatternMetadata;
}

export interface CatalogResponse {
  patterns: Pattern[];
  total: number;
  timestamp: string;
}

// Cache for patterns loaded from external catalog
let cachedPatterns: Pattern[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fallback patterns from real catalog when API is not accessible
 */
const FALLBACK_PATTERNS: Pattern[] = [
  {
    id: 'pat-001',
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'pat-001-data-ingestion',
      title: 'PAT-001 – Data Ingestion',
      description:
        'Ingestion and storage foundation centred on object storage, structured datasets, identity controls, and landing-zone access patterns.',
      tags: ['pattern', 'data-ingestion', 'landing-zone', 'data-lake', 'storage'],
      links: [{ title: 'Pattern Registry', url: 'https://internal.vodafone.com/patterns/pat-005' }],
      owner: 'platform-engineering',
      domain: 'data-platform',
      lifecycle: 'candidate_requires_review',
      status: 'candidate_requires_review',
      releaseBucket: 'candidate_requires_review',
      runtimeType: 'Data foundation',
      buildingBlocks: {
        required: ['bigquery', 'bucket', 'environment', 'iam', 'keys', 'network'],
        optional: [],
        default: ['bigquery', 'bucket', 'environment', 'iam', 'keys', 'network'],
      },
    },
  },
  {
    id: 'pat-002',
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'pat-002-data-processing-pipeline',
      title: 'PAT-002 – Data Processing',
      description:
        'Managed workflow orchestration with structured storage, object storage, query engine, and deploy chain.',
      tags: ['pattern', 'analytics', 'orchestration', 'data-pipeline', 'workflow', 'batch'],
      links: [{ title: 'Pattern Registry', url: 'https://internal.vodafone.com/patterns/pat-001' }],
      owner: 'platform-engineering',
      domain: 'data-platform',
      lifecycle: 'released_reusable_pattern',
      status: 'first_release_candidate',
      releaseBucket: 'released_reusable_pattern',
      runtimeType: 'Workflow / data orchestration',
      buildingBlocks: {
        required: ['bastion', 'delivery', 'environment', 'integration', 'keys', 'network', 'security_operations'],
        optional: [
          'bigquery',
          'bucket',
          'workflow',
          'K8s',
          'iam',
          'network_policy',
          'pubsub',
          'security_policy',
          'sql',
        ],
        default: [
          'bastion',
          'delivery',
          'environment',
          'integration',
          'keys',
          'network',
          'security_operations',
          'iam',
          'bigquery',
          'bucket',
        ],
      },
    },
  },
  {
    id: 'pat-003',
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'pat-003-application',
      title: 'PAT-003 – Application',
      description:
        'Serverless compute with a managed relational database and supporting security/identity modules OR Managed container orchestration with perimeter security, private networking, managed database access, and shared cluster operations for platform/SRE teams.',
      tags: [
        'pattern',
        'cloud-run',
        'serverless',
        'application-platform',
        'database',
        'sql',
        'gke',
        'helm',
        'kubernetes',
        'container-orchestration',
        'multi-tenant',
      ],
      links: [{ title: 'Pattern Registry', url: 'https://internal.vodafone.com/patterns/pat-002' }],
      owner: 'platform-engineering',
      domain: 'application-platform',
      lifecycle: 'released_reusable_pattern',
      status: 'first_release_candidate',
      releaseBucket: 'released_reusable_pattern',
      runtimeType: 'Serverless container runtime',
      buildingBlocks: {
        required: ['bastion', 'bucket', 'iam', 'keys', 'network', 'security_operations', 'security_policy', 'sql'],
        optional: [
          'serverless_app',
          'K8s',
          'helm',
          'analytics',
          'workflow',
          'delivery',
          'environment',
          'integration',
          'network_policy',
          'pubsub',
        ],
        default: [
          'bastion',
          'bucket',
          'iam',
          'keys',
          'network',
          'security_operations',
          'security_policy',
          'sql',
          'serverless_app',
          'analytics',
          'integration',
        ],
      },
    },
  },
];

/**
 * Fetch and parse patterns from external Backstage catalog API
 */
async function fetchCatalogPatterns(): Promise<Pattern[]> {
  try {
    console.log('[PatternService] Fetching patterns from catalog API...');
    
    const response = await curlFetch('https://catalog-api-479677124022.europe-west2.run.app/catalog');
    if (!response.ok) {
      throw new Error(`Catalog API returned ${response.status}`);
    }

    const yamlText = response.text();
    const documents = yamlText.split('---').filter((doc) => doc.trim());

    const patterns: Pattern[] = [];

    for (const doc of documents) {
      try {
        const parsed = yaml.load(doc.trim()) as any;

        if (parsed && parsed.kind === 'System' && parsed.metadata && parsed.metadata.name) {
          const patternId = parsed.metadata.name.replace(/pat-(\d+).*/, 'pat-$1');
          
          // Log the raw parsed object to see the structure
          console.log(`[PatternService] Raw parsed object for ${patternId}:`, JSON.stringify(parsed, null, 2).substring(0, 500));
          
          // Extract building blocks from various possible locations in the YAML
          let buildingBlocks = {
            required: [] as string[],
            optional: [] as string[],
            default: [] as string[],
          };
          
          // Try different paths where building blocks might be stored
          if (parsed.metadata?.buildingBlocks) {
            console.log(`[PatternService] Found buildingBlocks at metadata.buildingBlocks`);
            buildingBlocks = parsed.metadata.buildingBlocks;
          } else if (parsed.spec?.metadata?.buildingBlocks) {
            console.log(`[PatternService] Found buildingBlocks at spec.metadata.buildingBlocks`);
            buildingBlocks = parsed.spec.metadata.buildingBlocks;
          } else if (parsed.spec?.buildingBlocks) {
            console.log(`[PatternService] Found buildingBlocks at spec.buildingBlocks`);
            buildingBlocks = parsed.spec.buildingBlocks;
          } else if (parsed.spec?.profile?.metadata?.buildingBlocks) {
            console.log(`[PatternService] Found buildingBlocks at spec.profile.metadata.buildingBlocks`);
            buildingBlocks = parsed.spec.profile.metadata.buildingBlocks;
          } else {
            console.log(`[PatternService] No buildingBlocks found at expected locations. Full spec: ${JSON.stringify(parsed.spec, null, 2).substring(0, 500)}`);
          }
          
          const pattern: Pattern = {
            id: patternId,
            apiVersion: parsed.apiVersion || 'backstage.io/v1alpha1',
            kind: parsed.kind,
            metadata: {
              name: parsed.metadata.name,
              title: parsed.metadata.title || parsed.metadata.name,
              description: parsed.metadata.description || '',
              tags: parsed.metadata.tags || [],
              links: parsed.metadata.links,
              owner: parsed.metadata?.owner || parsed.spec?.owner || 'unknown',
              domain: parsed.metadata?.domain || parsed.spec?.domain || 'unknown',
              lifecycle: parsed.metadata?.lifecycle || parsed.spec?.lifecycle || 'unknown',
              status: parsed.metadata?.status || parsed.spec?.profile?.metadata?.status || 'unknown',
              releaseBucket: parsed.metadata?.releaseBucket || parsed.spec?.profile?.metadata?.releaseBucket || 'unknown',
              runtimeType: parsed.metadata?.runtimeType || parsed.spec?.profile?.metadata?.runtimeType || 'unknown',
              buildingBlocks: buildingBlocks,
            },
          };

          console.log(`[PatternService] Parsed pattern ${patternId}: ${pattern.metadata.title}, building blocks: ${JSON.stringify(buildingBlocks)}`);
          patterns.push(pattern);
        }
      } catch (error) {
        console.warn('[PatternService] Failed to parse YAML document:', error);
        continue;
      }
    }

    if (patterns.length > 0) {
      console.log(`[PatternService] Successfully fetched ${patterns.length} patterns from catalog API`);
      return patterns;
    } else {
      throw new Error('No valid patterns found in catalog response');
    }
  } catch (error) {
    console.warn('[PatternService] Failed to fetch patterns from catalog API, using fallback patterns:', error);
    return FALLBACK_PATTERNS;
  }
}

/**
 * Get patterns with caching
 */
async function getPatternsWithCache(): Promise<Pattern[]> {
  const now = Date.now();
  if (cachedPatterns.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedPatterns;
  }

  const patterns = await fetchCatalogPatterns();
  if (patterns.length > 0) {
    cachedPatterns = patterns;
    cacheTimestamp = now;
  }

  return patterns;
}

/**
 * PatternService class for managing pattern catalog
 */
export class PatternService {
  /**
   * Get all patterns from the catalog
   */
  static async getAll(): Promise<Pattern[]> {
    return await getPatternsWithCache();
  }

  /**
   * Get pattern by ID
   */
  static async getById(id: string): Promise<Pattern | undefined> {
    const patterns = await getPatternsWithCache();
    return patterns.find((p) => p.id === id);
  }

  /**
   * Get patterns by tag
   */
  static async getByTag(tag: string): Promise<Pattern[]> {
    const patterns = await getPatternsWithCache();
    return patterns.filter((p) => p.metadata.tags.includes(tag));
  }

  /**
   * Get patterns by domain
   */
  static async getByDomain(domain: string): Promise<Pattern[]> {
    const patterns = await getPatternsWithCache();
    return patterns.filter((p) => p.metadata.domain === domain);
  }

  /**
   * Get patterns by lifecycle status
   */
  static async getByLifecycle(lifecycle: string): Promise<Pattern[]> {
    const patterns = await getPatternsWithCache();
    return patterns.filter((p) => p.metadata.lifecycle === lifecycle);
  }

  /**
   * Search patterns by query
   */
  static async search(query: string): Promise<Pattern[]> {
    const patterns = await getPatternsWithCache();
    const lowerQuery = query.toLowerCase();
    return patterns.filter((p) => {
      const titleMatch = p.metadata.title.toLowerCase().includes(lowerQuery);
      const descMatch = p.metadata.description.toLowerCase().includes(lowerQuery);
      const tagMatch = p.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      return titleMatch || descMatch || tagMatch;
    });
  }

  /**
   * Get catalog with optional filtering
   */
  static async getCatalog(filters?: {
    tag?: string;
    domain?: string;
    lifecycle?: string;
    search?: string;
  }): Promise<CatalogResponse> {
    const patterns = await getPatternsWithCache();
    let result = [...patterns];

    if (filters?.tag) {
      result = result.filter((p) => p.metadata.tags.includes(filters.tag!));
    }

    if (filters?.domain) {
      result = result.filter((p) => p.metadata.domain === filters.domain!);
    }

    if (filters?.lifecycle) {
      result = result.filter((p) => p.metadata.lifecycle === filters.lifecycle!);
    }

    if (filters?.search) {
      result = await this.search(filters.search);
    }

    return {
      patterns: result,
      total: result.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all available tags
   */
  static async getTags(): Promise<string[]> {
    const patterns = await getPatternsWithCache();
    const tags = new Set<string>();
    patterns.forEach((p) => {
      p.metadata.tags.forEach((t) => tags.add(t));
    });
    return Array.from(tags).sort();
  }

  /**
   * Get all available domains
   */
  static async getDomains(): Promise<string[]> {
    const patterns = await getPatternsWithCache();
    const domains = new Set<string>();
    patterns.forEach((p) => {
      domains.add(p.metadata.domain);
    });
    return Array.from(domains).sort();
  }

  /**
   * Get all available lifecycles
   */
  static async getLifecycles(): Promise<string[]> {
    const patterns = await getPatternsWithCache();
    const lifecycles = new Set<string>();
    patterns.forEach((p) => {
      lifecycles.add(p.metadata.lifecycle);
    });
    return Array.from(lifecycles).sort();
  }
}
