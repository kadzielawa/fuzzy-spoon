import { useState } from 'react';
import styles from '../styles/Form.module.css';
import SuccessScreen from './SuccessScreen';

const PATTERNS = [
  {
    value: 'cloud_run',
    label: 'Cloud Run Service',
    description: 'Serverless containerised service on GCP Cloud Run',
  },
  {
    value: 'gke_application',
    label: 'GKE Application',
    description: 'Kubernetes application deployed on Google Kubernetes Engine',
  },
  {
    value: 'data_pipeline',
    label: 'Data Pipeline',
    description: 'Streaming/batch pipeline using Dataflow, BigQuery, and GCS',
  },
] as const;

const REGIONS = [
  'europe-west1',
  'europe-west2',
  'us-central1',
  'us-east1',
  'asia-east1',
] as const;

interface FormState {
  pattern: string;
  service_name: string;
  environment: string;
  region: string;
  enable_db: boolean;
  enable_pubsub: boolean;
}

export default function IDPForm() {
  const [form, setForm] = useState<FormState>({
    pattern: 'cloud_run',
    service_name: '',
    environment: 'dev',
    region: 'europe-west1',
    enable_db: false,
    enable_pubsub: false,
  });
  const [loading, setLoading] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPattern = PATTERNS.find((p) => p.value === form.pattern);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate projectId from service name (convert to kebab-case)
      const projectId = form.service_name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      if (!projectId) {
        throw new Error('Service name is required');
      }

      const response = await fetch(`/api/deployments/patterns/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternId: form.pattern,
          projectId: projectId,
          projectName: form.service_name,
          environment: form.environment,
          region: form.region,
          building_blocks: {
            database: form.enable_db,
            pubsub: form.enable_pubsub,
          },
        }),
      });

      const data: { pr_url?: string; error?: string; prUrl?: string; deploymentId?: string; message?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Request failed');
      }

      console.log('[IDPForm] Deployment submitted:', { deploymentId: data.deploymentId, message: data.message });
      setPrUrl(data.pr_url || data.prUrl || '');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPrUrl(null);
    setForm((f) => ({ ...f, service_name: '' }));
  };

  if (prUrl) {
    return <SuccessScreen prUrl={prUrl} onReset={handleReset} />;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* Pattern */}
      <div className={styles.field}>
        <label htmlFor="pattern" className={styles.label}>
          Pattern (Golden Path)
        </label>
        <select
          id="pattern"
          className={styles.select}
          value={form.pattern}
          onChange={(e) => set('pattern', e.target.value)}
        >
          {PATTERNS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {selectedPattern && (
          <p className={styles.hint}>{selectedPattern.description}</p>
        )}
      </div>

      {/* Service Name */}
      <div className={styles.field}>
        <label htmlFor="service_name" className={styles.label}>
          Service Name
        </label>
        <input
          id="service_name"
          type="text"
          className={styles.input}
          value={form.service_name}
          onChange={(e) => set('service_name', e.target.value)}
          placeholder="my-service"
          required
          minLength={3}
          maxLength={64}
          pattern="[a-z][a-z0-9-]{1,62}[a-z0-9]"
        />
        <p className={styles.hint}>
          Lowercase letters, digits, and hyphens — 3–64 chars, start/end with a
          letter or digit
        </p>
      </div>

      {/* Environment + Region side by side */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="environment" className={styles.label}>
            Environment
          </label>
          <select
            id="environment"
            className={styles.select}
            value={form.environment}
            onChange={(e) => set('environment', e.target.value)}
          >
            <option value="dev">Development</option>
            <option value="test">Test</option>
            <option value="prod">Production</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="region" className={styles.label}>
            Region
          </label>
          <select
            id="region"
            className={styles.select}
            value={form.region}
            onChange={(e) => set('region', e.target.value)}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional modules */}
      <div className={styles.field}>
        <span className={styles.label}>Optional Modules</span>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.enable_db}
              onChange={(e) => set('enable_db', e.target.checked)}
            />
            Enable Database (Cloud SQL)
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.enable_pubsub}
              onChange={(e) => set('enable_pubsub', e.target.checked)}
            />
            Enable Pub/Sub
          </label>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button type="submit" disabled={loading} className={styles.button}>
        {loading ? (
          <span className={styles.spinner}>Creating PR…</span>
        ) : (
          'Submit Service Request'
        )}
      </button>
    </form>
  );
}
