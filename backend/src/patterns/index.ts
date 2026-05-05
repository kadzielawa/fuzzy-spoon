export interface Pattern {
  name: string;
  description: string;
  modules: string[];
  optionalModules: {
    db?: string;
    pubsub?: string;
  };
}

export const ALLOWED_PATTERNS = [
  'cloud_run',
  'gke_application',
  'data_pipeline',
] as const;

export type PatternKey = (typeof ALLOWED_PATTERNS)[number];

export const ALLOWED_ENVIRONMENTS = ['dev', 'test', 'prod'] as const;
export type EnvironmentKey = (typeof ALLOWED_ENVIRONMENTS)[number];

export const ALLOWED_REGIONS = [
  'europe-west1',
  'europe-west2',
  'us-central1',
  'us-east1',
  'asia-east1',
] as const;

export const patterns: Record<PatternKey, Pattern> = {
  cloud_run: {
    name: 'Cloud Run Service',
    description: 'Serverless containerised service on GCP Cloud Run',
    modules: [
      'cloud_run',
      'iam_service_account',
      'artifact_registry',
      'network',
      'dns',
    ],
    optionalModules: {
      db: 'cloud_sql',
      pubsub: 'pubsub',
    },
  },

  gke_application: {
    name: 'GKE Application',
    description: 'Kubernetes application deployed on Google Kubernetes Engine',
    modules: [
      'gke_cluster',
      'gke_node_pool',
      'iam_service_account',
      'artifact_registry',
      'network',
      'dns',
    ],
    optionalModules: {
      db: 'cloud_sql',
      pubsub: 'pubsub',
    },
  },

  data_pipeline: {
    name: 'Data Pipeline',
    description:
      'Streaming/batch data pipeline using Dataflow, BigQuery, and GCS',
    modules: [
      'dataflow',
      'bigquery',
      'gcs_bucket',
      'iam_service_account',
      'pubsub',
      'network',
    ],
    optionalModules: {
      db: 'cloud_sql',
    },
  },
};
