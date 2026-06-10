import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

// ── Pattern Deployment types ────────────────────────────────────────────────
interface TerraformFiles {
  main_tf: string;
  variables_tf: string;
  terraform_tfvars: string;
}

const NGDI_REPO = 'VFGROUP-NSE-DNOSS/DNE-PE-NGDI-TERRAFORM-MODULES';
const NGDI_REPO_URL = `https://github.com/${NGDI_REPO}`;

/** Derive a deterministic demo PR number from the deployment ID */
function demoPrNumber(deploymentId: string): number {
  const hex = deploymentId.replace(/-/g, '').slice(-4);
  return 40 + (parseInt(hex, 16) % 60);
}

interface PatternDeployment {
  deploymentId: string;
  patternId: string;
  projectId: string;
  projectName: string;
  status: string;
  resolverStatus: string;
  createdBy: string;
  createdAt: string;
  buildingBlocks: string[];
  prUrl?: string;
  prNumber?: number;
  prBranch?: string;
  prStatus?: 'open' | 'merged' | 'closed';
  summary: {
    building_blocks_requested: string[];
    building_blocks_resolved: string[];
    building_blocks_unresolved: string[];
    modules_resolved: string[];
    variables_extracted: number;
    modules_with_fetch_errors: string[];
  };
  fileSizes: {
    main_tf_size: number;
    variables_tf_size: number;
    terraform_tfvars_size: number;
  };
  terraformFiles?: TerraformFiles;
}

// ── Terraform console component ─────────────────────────────────────────────
const TerraformConsole: React.FC<{ dep: PatternDeployment; onClose: () => void }> = ({ dep, onClose }) => {
  const [activeFile, setActiveFile] = useState<'main_tf' | 'variables_tf' | 'terraform_tfvars'>('main_tf');
  const [files, setFiles] = useState<TerraformFiles | null>(dep.terraformFiles || null);
  const [loading, setLoading] = useState(!dep.terraformFiles);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!files) {
      setLoading(true);
      api.patternDeployments.get(dep.deploymentId)
        .then((full: PatternDeployment) => { setFiles(full.terraformFiles || null); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [dep.deploymentId]);

  const fileLabels = { main_tf: 'main.tf', variables_tf: 'variables.tf', terraform_tfvars: 'terraform.tfvars' };
  const currentContent = files?.[activeFile] ?? '';

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = (key: 'main_tf' | 'variables_tf' | 'terraform_tfvars') => {
    const content = files?.[key] ?? '';
    const name = fileLabels[key];
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    if (!files) return;
    const content = `# Terraform Configuration\n# Deployment: ${dep.deploymentId}\n# Project: ${dep.projectName}\n# Generated: ${dep.createdAt}\n\n---\n## main.tf\n${files.main_tf}\n\n---\n## variables.tf\n${files.variables_tf}\n\n---\n## terraform.tfvars\n${files.terraform_tfvars}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `terraform-${dep.deploymentId}.txt`;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: '#0D1117', borderRadius: '12px', width: '100%', maxWidth: '960px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
        {/* Terminal title bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', background: '#161b22', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #30363d', gap: '0.5rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ flex: 1, textAlign: 'center', color: '#8b949e', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            terraform — {dep.projectName} / {dep.patternId}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleDownloadAll} style={{ padding: '0.25rem 0.75rem', background: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
              ⬇ Download All
            </button>
            <button onClick={onClose} style={{ padding: '0.25rem 0.75rem', background: 'transparent', color: '#8b949e', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ padding: '0.75rem 1.25rem', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ color: '#3fb950' }}>✓ {dep.summary.building_blocks_resolved.length} blocks resolved</span>
          <span style={{ color: '#79c0ff' }}>⧉ {dep.summary.modules_resolved.length} modules</span>
          <span style={{ color: '#e3b341' }}>⬡ {dep.summary.variables_extracted} variables extracted</span>
          {dep.summary.building_blocks_unresolved.length > 0 && (
            <span style={{ color: '#f85149' }}>⚠ {dep.summary.building_blocks_unresolved.length} unresolved</span>
          )}
          <span style={{ color: '#8b949e', marginLeft: 'auto' }}>🕐 {new Date(dep.createdAt).toLocaleString()}</span>
        </div>

        {/* File tabs */}
        <div style={{ display: 'flex', background: '#161b22', borderBottom: '1px solid #30363d', padding: '0 1rem', gap: '0' }}>
          {(Object.keys(fileLabels) as Array<keyof typeof fileLabels>).map((key) => (
            <button key={key} onClick={() => setActiveFile(key)} style={{
              padding: '0.6rem 1.25rem',
              background: activeFile === key ? '#0D1117' : 'transparent',
              color: activeFile === key ? '#f0f6fc' : '#8b949e',
              border: 'none',
              borderTop: activeFile === key ? '2px solid #f78166' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
            }}>
              {fileLabels[key]}
              <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#6e7681' }}>
                {formatBytes(dep.fileSizes[`${key}_size` as keyof typeof dep.fileSizes])}
              </span>
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem' }}>
            <button onClick={handleCopy} style={{ padding: '0.25rem 0.6rem', background: '#21262d', color: copied ? '#3fb950' : '#8b949e', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
            <button onClick={() => handleDownload(activeFile)} style={{ padding: '0.25rem 0.6rem', background: '#21262d', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
              ⬇ Save
            </button>
          </div>
        </div>

        {/* Code area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem', fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.6', color: '#e6edf3', minHeight: '300px', maxHeight: '50vh' }}>
          {loading ? (
            <div style={{ color: '#8b949e', padding: '2rem', textAlign: 'center' }}>⟳ Loading terraform files...</div>
          ) : !files ? (
            <div style={{ color: '#f85149' }}>Files not available</div>
          ) : (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {currentContent.split('\n').map((line, i) => {
                let color = '#e6edf3';
                if (/^\s*(module|resource|variable|output|locals|terraform|provider|data)\s/.test(line)) color = '#ff7b72';
                else if (/^\s*(source|version|description|type|default|value|region|project)\s*=/.test(line)) color = '#79c0ff';
                else if (/=\s*"/.test(line)) color = '#a5d6ff';
                else if (/^\s*#/.test(line)) color = '#6e7681';
                else if (/^\s*\}/.test(line) || /^\s*\{$/.test(line)) color = '#ffa657';
                return (
                  <span key={i} style={{ display: 'block' }}>
                    <span style={{ color: '#3d444d', userSelect: 'none', marginRight: '1rem', minWidth: '2.5rem', display: 'inline-block', textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ color }}>{line}</span>
                  </span>
                );
              })}
            </pre>
          )}
        </div>

        {/* Modules panel */}
        <div style={{ padding: '0.75rem 1.25rem', background: '#161b22', borderTop: '1px solid #30363d', borderRadius: '0 0 12px 12px' }}>
          <div style={{ fontSize: '0.7rem', color: '#6e7681', marginBottom: '0.4rem' }}>RESOLVED MODULES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {dep.summary.modules_resolved.map((m) => (
              <span key={m} style={{ padding: '0.15rem 0.5rem', background: '#1f2937', color: '#79c0ff', borderRadius: '4px', fontSize: '0.7rem', fontFamily: 'monospace', border: '1px solid #30363d' }}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};



interface DeploymentVariable {
  name: string;
  label: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'select';
  options?: string[];
  description?: string;
}

interface Deployment {
  id: string;
  serviceName: string;
  templateId: string;
  templateLabel: string;
  templateIcon: string;
  projectId: string;
  projectName: string;
  status: 'deployed' | 'pending_approval' | 'draft' | 'failed' | 'updating';
  region: string;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  requestedBy: string;
  approvedBy?: string;
  estimatedCost: string;
  variables: DeploymentVariable[];
  history: { date: string; action: string; user: string; note?: string }[];
}

const MOCK_DEPLOYMENTS: Deployment[] = [
  {
    id: 'dep-001',
    serviceName: 'payments-api',
    templateId: 'cloud-run',
    templateLabel: 'Cloud Run Service',
    templateIcon: '🚀',
    projectId: 'vodafone-prod-payments',
    projectName: 'Vodafone Payments (Prod)',
    status: 'deployed',
    region: 'europe-west1',
    createdAt: '2026-04-10T09:00:00Z',
    updatedAt: '2026-04-15T14:22:00Z',
    deployedAt: '2026-04-15T14:22:00Z',
    requestedBy: 'Alice Johnson',
    approvedBy: 'Carol White',
    estimatedCost: '~€145/month',
    variables: [
      { name: 'service_name', label: 'Service Name', value: 'payments-api', type: 'string', description: 'The Cloud Run service name' },
      { name: 'image', label: 'Container Image', value: 'europe-west1-docker.pkg.dev/vodafone-prod/payments/api:v2.1.0', type: 'string', description: 'Docker image URL' },
      { name: 'min_instances', label: 'Min Instances', value: 2, type: 'number', description: 'Minimum running instances' },
      { name: 'max_instances', label: 'Max Instances', value: 20, type: 'number', description: 'Maximum scaling instances' },
      { name: 'memory', label: 'Memory', value: '1Gi', type: 'select', options: ['256Mi', '512Mi', '1Gi', '2Gi', '4Gi'], description: 'Memory per instance' },
      { name: 'cpu', label: 'CPU', value: '2', type: 'select', options: ['1', '2', '4', '8'], description: 'vCPUs per instance' },
      { name: 'allow_unauthenticated', label: 'Public Access', value: false, type: 'boolean', description: 'Allow unauthenticated requests' },
      { name: 'enable_cdn', label: 'Enable CDN', value: true, type: 'boolean', description: 'Enable Cloud CDN caching' },
    ],
    history: [
      { date: '2026-04-15T14:22:00Z', action: 'Deployed', user: 'Carol White', note: 'Approved and deployed to production' },
      { date: '2026-04-12T10:00:00Z', action: 'Submitted for approval', user: 'Alice Johnson' },
      { date: '2026-04-10T09:00:00Z', action: 'Draft created', user: 'Alice Johnson' },
    ],
  },
  {
    id: 'dep-002',
    serviceName: 'data-pipeline-billing',
    templateId: 'cloud-composer',
    templateLabel: 'Cloud Composer Pipeline',
    templateIcon: '📊',
    projectId: 'vodafone-data-analytics',
    projectName: 'Vodafone Data Analytics',
    status: 'pending_approval',
    region: 'europe-west4',
    createdAt: '2026-04-28T11:30:00Z',
    updatedAt: '2026-04-28T11:30:00Z',
    requestedBy: 'Alice Johnson',
    estimatedCost: '~€320/month',
    variables: [
      { name: 'environment_name', label: 'Environment Name', value: 'billing-pipeline-prod', type: 'string' },
      { name: 'node_count', label: 'Node Count', value: 3, type: 'number', description: 'Number of Composer worker nodes' },
      { name: 'machine_type', label: 'Machine Type', value: 'n1-standard-2', type: 'select', options: ['n1-standard-1', 'n1-standard-2', 'n1-standard-4'], description: 'GCE machine type for workers' },
      { name: 'python_version', label: 'Python Version', value: '3.11', type: 'select', options: ['3.9', '3.10', '3.11'], description: 'Python version for DAGs' },
      { name: 'enable_private_ip', label: 'Private IP Only', value: true, type: 'boolean', description: 'Use private IP networking' },
    ],
    history: [
      { date: '2026-04-28T11:30:00Z', action: 'Submitted for approval', user: 'Alice Johnson', note: 'Awaiting architect sign-off' },
      { date: '2026-04-27T16:00:00Z', action: 'Draft created', user: 'Alice Johnson' },
    ],
  },
  {
    id: 'dep-003',
    serviceName: 'customer-portal-gke',
    templateId: 'gke-autopilot',
    templateLabel: 'GKE Autopilot Cluster',
    templateIcon: '☸️',
    projectId: 'vodafone-customer-services',
    projectName: 'Vodafone Customer Services',
    status: 'deployed',
    region: 'europe-west1',
    createdAt: '2026-03-20T08:00:00Z',
    updatedAt: '2026-04-20T09:15:00Z',
    deployedAt: '2026-03-22T12:00:00Z',
    requestedBy: 'Alice Johnson',
    approvedBy: 'Carol White',
    estimatedCost: '~€890/month',
    variables: [
      { name: 'cluster_name', label: 'Cluster Name', value: 'customer-portal-autopilot', type: 'string' },
      { name: 'network', label: 'VPC Network', value: 'vodafone-customer-vpc', type: 'string', description: 'VPC network name' },
      { name: 'subnetwork', label: 'Subnetwork', value: 'customer-services-subnet-eu-w1', type: 'string' },
      { name: 'release_channel', label: 'Release Channel', value: 'REGULAR', type: 'select', options: ['RAPID', 'REGULAR', 'STABLE'] },
      { name: 'enable_workload_identity', label: 'Workload Identity', value: true, type: 'boolean' },
      { name: 'enable_binary_authorization', label: 'Binary Authorization', value: true, type: 'boolean' },
    ],
    history: [
      { date: '2026-04-20T09:15:00Z', action: 'Variables updated', user: 'Alice Johnson', note: 'Updated release channel to REGULAR' },
      { date: '2026-03-22T12:00:00Z', action: 'Deployed', user: 'Carol White' },
      { date: '2026-03-21T10:00:00Z', action: 'Submitted for approval', user: 'Alice Johnson' },
      { date: '2026-03-20T08:00:00Z', action: 'Draft created', user: 'Alice Johnson' },
    ],
  },
  {
    id: 'dep-004',
    serviceName: 'static-assets-cdn',
    templateId: 'firebase-hosting',
    templateLabel: 'Firebase Hosting',
    templateIcon: '🌐',
    projectId: 'vodafone-web-assets',
    projectName: 'Vodafone Web Assets',
    status: 'failed',
    region: 'global',
    createdAt: '2026-04-25T14:00:00Z',
    updatedAt: '2026-04-25T14:45:00Z',
    requestedBy: 'Alice Johnson',
    estimatedCost: '~€12/month',
    variables: [
      { name: 'site_id', label: 'Site ID', value: 'vodafone-static-assets', type: 'string' },
      { name: 'custom_domain', label: 'Custom Domain', value: 'assets.vodafone.example.com', type: 'string' },
      { name: 'enable_versioning', label: 'Enable Versioning', value: true, type: 'boolean' },
    ],
    history: [
      { date: '2026-04-25T14:45:00Z', action: 'Deployment failed', user: 'System', note: 'Error: Domain verification failed. Please verify DNS records.' },
      { date: '2026-04-25T14:10:00Z', action: 'Submitted for approval', user: 'Alice Johnson' },
      { date: '2026-04-25T14:00:00Z', action: 'Draft created', user: 'Alice Johnson' },
    ],
  },
];

const STATUS_CONFIG = {
  deployed: { label: 'Deployed', bg: '#F0FFF4', color: '#16a34a', dot: '#16a34a' },
  pending_approval: { label: 'Pending Approval', bg: '#FFFBEB', color: '#d97706', dot: '#d97706' },
  draft: { label: 'Draft', bg: '#F4F4F4', color: '#666666', dot: '#999999' },
  failed: { label: 'Failed', bg: '#FFF5F5', color: '#E60000', dot: '#E60000' },
  updating: { label: 'Updating', bg: '#EFF6FF', color: '#2563eb', dot: '#2563eb' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface MyDeploymentsProps {
  userId: string;
}

export const MyDeployments: React.FC<MyDeploymentsProps> = ({ userId }) => {
  const [deployments, setDeployments] = useState<Deployment[]>(MOCK_DEPLOYMENTS);
  const [selected, setSelected] = useState<Deployment | null>(null);
  const [activeTab, setActiveTab] = useState<'variables' | 'history'>('variables');
  const [editedVars, setEditedVars] = useState<Record<string, string | number | boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Pattern deployments
  const [patternDeps, setPatternDeps] = useState<PatternDeployment[]>([]);
  const [terraformOpen, setTerraformOpen] = useState<PatternDeployment | null>(null);
  const [patternLoading, setPatternLoading] = useState(true);

  useEffect(() => {
    api.patternDeployments.list()
      .then((data: PatternDeployment[]) => setPatternDeps(data))
      .catch(() => setPatternDeps([]))
      .finally(() => setPatternLoading(false));
  }, []);

  const openDeployment = (d: Deployment) => {
    setSelected(d);
    setActiveTab('variables');
    setEditedVars(Object.fromEntries(d.variables.map((v) => [v.name, v.value])));
    setIsDirty(false);
    setSaveSuccess(false);
  };

  const handleVarChange = (name: string, value: string | number | boolean) => {
    setEditedVars((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = () => {
    if (!selected) return;
    setDeployments((prev) =>
      prev.map((d) => {
        if (d.id !== selected.id) return d;
        const updatedVars = d.variables.map((v) => ({ ...v, value: editedVars[v.name] ?? v.value }));
        const updatedDeploy: Deployment = {
          ...d,
          variables: updatedVars,
          status: d.status === 'deployed' ? 'updating' : d.status,
          updatedAt: new Date().toISOString(),
          history: [
            { date: new Date().toISOString(), action: 'Variables updated', user: 'You', note: 'Configuration saved — re-deployment triggered' },
            ...d.history,
          ],
        };
        setSelected(updatedDeploy);
        return updatedDeploy;
      })
    );
    setIsDirty(false);
    setSaveSuccess(true);
  };

  const filtered = filterStatus === 'all' ? deployments : deployments.filter((d) => d.status === filterStatus);

  return (
    <div className="p-8 max-w-7xl">
      {/* Terraform Console overlay */}
      {terraformOpen && <TerraformConsole dep={terraformOpen} onClose={() => setTerraformOpen(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>My Deployments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and monitor your infrastructure deployments</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'deployed', 'pending_approval', 'failed', 'draft'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={
                filterStatus === s
                  ? { background: '#E60000', color: 'white' }
                  : { background: 'white', color: '#666', border: '1px solid #E0E0E0' }
              }
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pattern Deployments ─────────────────────────────────────────────── */}
      {(patternLoading || patternDeps.length > 0) && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#8b5cf6', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '4px', padding: '0.2rem 0.6rem' }}>PR DEPLOYMENT REQUESTS</span>
            <span className="text-xs text-gray-400">{patternDeps.length} request{patternDeps.length !== 1 ? 's' : ''} · Terraform generated by resolver · GitHub Actions runs plan/apply</span>
          </div>

          {patternLoading ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm" style={{ border: '1px solid #E0E0E0' }}>Loading pattern deployments…</div>
          ) : (
            <div className="flex flex-col gap-3">
              {patternDeps.map((pd) => {
                const resolved = pd.resolverStatus === 'resolved';
                const hasErrors = (pd.summary?.modules_with_fetch_errors?.length ?? 0) > 0;
                const prNum = pd.prNumber ?? demoPrNumber(pd.deploymentId);
                const prUrl = pd.prUrl ?? `${NGDI_REPO_URL}/pull/${prNum}`;
                const prBranch = pd.prBranch ?? `infra/request-${pd.patternId}-${pd.deploymentId.slice(0, 8)}`;
                const prStatus: 'open' | 'merged' | 'closed' = pd.prStatus ?? 'open';
                const prStatusCfg = {
                  open:   { label: 'Open',   bg: '#dafbe1', color: '#1a7f37', border: '#aceebb', icon: '🟢' },
                  merged: { label: 'Merged', bg: '#f3e8ff', color: '#7c3aed', border: '#ddd6fe', icon: '🟣' },
                  closed: { label: 'Closed', bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: '🔴' },
                }[prStatus];

                return (
                  <div key={pd.deploymentId} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #ddd6fe', background: 'linear-gradient(135deg,#faf5ff 0%,#fff 60%)' }}>

                    {/* ── Top row: pattern info + action buttons ── */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏗️</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{pd.patternId}</p>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', background: resolved ? '#f0fdf4' : '#fff7ed', color: resolved ? '#16a34a' : '#ea580c', border: `1px solid ${resolved ? '#bbf7d0' : '#fed7aa'}` }}>
                              {resolved ? '✓ RESOLVED' : '⟳ PENDING'}
                            </span>
                            {hasErrors && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}>⚠ fetch errors</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{pd.projectName} · by {pd.createdBy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-gray-400 mr-2">
                          <div>{pd.summary?.modules_resolved?.length ?? 0} modules · {pd.summary?.variables_extracted ?? 0} vars</div>
                          <div>{new Date(pd.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                        {resolved && (
                          <button
                            onClick={() => setTerraformOpen(pd)}
                            className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                            style={{ background: '#0D1117', color: '#e6edf3', border: '1px solid #30363d' }}
                          >
                            {'</> Terraform'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── PR info panel ── */}
                    {resolved && (
                      <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid #d0d7de' }}>
                        {/* PR header */}
                        <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#f6f8fa', borderBottom: '1px solid #d0d7de' }}>
                          <svg height="16" width="16" viewBox="0 0 16 16" fill="#24292f" style={{ flexShrink: 0 }}>
                            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h.'.'.5A1.5 1.5 0 0 1 12 4v9.5a2.25 2.25 0 1 1-1.5 0V4a.5.5 0 0 0-.5-.5H10v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"/>
                          </svg>
                          <span className="text-sm font-semibold" style={{ color: '#24292f' }}>Pull Request</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '99px', background: prStatusCfg.bg, color: prStatusCfg.color, border: `1px solid ${prStatusCfg.border}` }}>
                            {prStatusCfg.icon} {prStatusCfg.label}
                          </span>
                          <span className="text-xs ml-auto" style={{ color: '#57606a' }}>Demo</span>
                        </div>

                        {/* PR body */}
                        <div className="px-4 py-3" style={{ background: '#ffffff' }}>
                          {/* PR title + number */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: '#24292f' }}>
                                feat(infra): {pd.patternId} — {pd.projectName}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: '#57606a' }}>
                                <span style={{ fontFamily: 'monospace', background: '#f1f8ff', color: '#0969da', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #d0e5ff' }}>
                                  #{prNum}
                                </span>
                                {' '}&nbsp;into{' '}
                                <code style={{ background: '#f6f8fa', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.72rem' }}>main</code>
                                {' '}from{' '}
                                <code style={{ background: '#f6f8fa', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.72rem' }}>{prBranch}</code>
                              </p>
                            </div>
                            <a
                              href={prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ flexShrink: 0, padding: '0.3rem 0.8rem', background: '#f6f8fa', color: '#24292f', border: '1px solid #d0d7de', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                              View PR ↗
                            </a>
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#57606a', borderTop: '1px solid #f3f4f6', paddingTop: '0.6rem' }}>
                            <span>📁 <strong style={{ color: '#24292f' }}>{NGDI_REPO}</strong></span>
                            <span>📅 {new Date(pd.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span>📦 {pd.summary?.modules_resolved?.length ?? 0} modules resolved</span>
                            <span>🔧 {pd.summary?.variables_extracted ?? 0} variables</span>
                          </div>

                          {/* GitHub Actions CI status */}
                          <div className="flex items-center gap-3 mt-3 px-3 py-2 rounded-lg" style={{ background: '#f6f8fa', border: '1px solid #d0d7de' }}>
                            <span style={{ fontSize: '0.75rem' }}>⚡</span>
                            <div className="flex-1">
                              <p className="text-xs font-semibold" style={{ color: '#24292f' }}>GitHub Actions</p>
                              <p className="text-xs" style={{ color: '#57606a' }}>CI / terraform plan (pull_request)</p>
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.6rem', borderRadius: '99px', background: '#dafbe1', color: '#1a7f37', border: '1px solid #aceebb' }}>✓ passing</span>
                          </div>

                          {/* File listing */}
                          {pd.fileSizes && (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <span className="text-xs" style={{ color: '#57606a' }}>Generated files:</span>
                              {(['main.tf', 'variables.tf', 'terraform.tfvars'] as const).map((name, i) => {
                                const sizes = [pd.fileSizes.main_tf_size, pd.fileSizes.variables_tf_size, pd.fileSizes.terraform_tfvars_size];
                                return (
                                  <span key={name} style={{ fontSize: '0.65rem', fontFamily: 'monospace', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#f1f8ff', color: '#0969da', border: '1px solid #d0e5ff' }}>
                                    {name} <span style={{ color: '#57606a' }}>({(sizes[i] / 1024).toFixed(1)} KB)</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Building blocks chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pd.buildingBlocks?.map((b) => (
                        <span key={b} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe', fontFamily: 'monospace' }}>{b}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Standard Deployments ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-3">
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#E60000', background: '#FFF5F5', border: '1px solid #fecaca', borderRadius: '4px', padding: '0.2rem 0.6rem' }}>DEMO DEPLOYMENTS</span>
        <span className="text-xs text-gray-400">Mock data for demonstration</span>
      </div>

      <div className="flex gap-6">
        {/* Deployment list */}
        <div className={`flex flex-col gap-3 ${selected ? 'w-2/5' : 'w-full'}`}>
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid #E0E0E0' }}>
              <p className="text-gray-400">No deployments found</p>
            </div>
          )}
          {filtered.map((d) => {
            const sc = STATUS_CONFIG[d.status];
            const isActive = selected?.id === d.id;
            return (
              <div
                key={d.id}
                onClick={() => openDeployment(d)}
                className="bg-white rounded-2xl p-5 cursor-pointer transition-all"
                style={{
                  border: isActive ? '2px solid #E60000' : '1px solid #E0E0E0',
                  boxShadow: isActive ? '0 0 0 3px #FFF0F0' : undefined,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{d.templateIcon}</span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{d.serviceName}</p>
                      <p className="text-xs text-gray-400">{d.templateLabel}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5" style={{ background: sc.bg, color: sc.color }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: sc.dot }} />
                    {sc.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                  <span>📁 {d.projectName}</span>
                  <span>🌍 {d.region}</span>
                  <span>💰 {d.estimatedCost}</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Updated {formatDate(d.updatedAt)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E0E0E0', height: 'fit-content' }}>
            {/* Panel header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{selected.templateIcon}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#1A1A1A' }}>{selected.serviceName}</p>
                  <p className="text-xs text-gray-400">{selected.projectName}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Status bar */}
            <div className="px-6 py-3 flex gap-6 text-xs" style={{ background: '#F8F8F8', borderBottom: '1px solid #E0E0E0' }}>
              <span><span className="text-gray-400">Status: </span>
                <span className="font-medium" style={{ color: STATUS_CONFIG[selected.status].color }}>{STATUS_CONFIG[selected.status].label}</span>
              </span>
              <span><span className="text-gray-400">Region: </span><span className="font-medium">{selected.region}</span></span>
              <span><span className="text-gray-400">Cost: </span><span className="font-medium">{selected.estimatedCost}</span></span>
              {selected.approvedBy && (
                <span><span className="text-gray-400">Approved by: </span><span className="font-medium">{selected.approvedBy}</span></span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: '1px solid #E0E0E0' }}>
              {(['variables', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-6 py-3 text-sm font-medium capitalize transition-colors"
                  style={
                    activeTab === tab
                      ? { borderBottom: '2px solid #E60000', color: '#E60000', marginBottom: '-1px' }
                      : { color: '#666' }
                  }
                >
                  {tab === 'variables' ? 'Variables' : 'History'}
                </button>
              ))}
            </div>

            {/* Variables tab */}
            {activeTab === 'variables' && (
              <div className="p-6">
                {saveSuccess && (
                  <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: '#F0FFF4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                    ✓ Variables saved — re-deployment queued
                  </div>
                )}
                {selected.status === 'failed' && (
                  <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FFF5F5', color: '#E60000', border: '1px solid #fecaca' }}>
                    ⚠ This deployment failed. Fix the variables below and save to retry.
                  </div>
                )}
                <div className="space-y-5 max-h-[480px] overflow-y-auto pr-1">
                  {selected.variables.map((v) => (
                    <div key={v.name}>
                      <label className="block text-xs font-semibold mb-1" style={{ color: '#333' }}>
                        {v.label}
                        <span className="ml-2 font-mono font-normal text-gray-400">{v.name}</span>
                      </label>
                      {v.description && <p className="text-xs text-gray-400 mb-2">{v.description}</p>}

                      {v.type === 'boolean' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div
                            className="relative w-10 h-5 rounded-full transition-colors"
                            style={{ background: editedVars[v.name] ? '#E60000' : '#E0E0E0' }}
                            onClick={() => handleVarChange(v.name, !editedVars[v.name])}
                          >
                            <div
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                              style={{ transform: editedVars[v.name] ? 'translateX(22px)' : 'translateX(2px)' }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{editedVars[v.name] ? 'Enabled' : 'Disabled'}</span>
                        </label>
                      ) : v.type === 'select' ? (
                        <select
                          value={String(editedVars[v.name] ?? '')}
                          onChange={(e) => handleVarChange(v.name, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{ border: '1px solid #E0E0E0' }}
                        >
                          {v.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={v.type === 'number' ? 'number' : 'text'}
                          value={String(editedVars[v.name] ?? '')}
                          onChange={(e) => handleVarChange(v.name, v.type === 'number' ? Number(e.target.value) : e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-sm font-mono outline-none"
                          style={{ border: '1px solid #E0E0E0' }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40"
                    style={{ background: '#E60000' }}
                  >
                    Save &amp; Re-deploy
                  </button>
                  <button
                    onClick={() => {
                      setEditedVars(Object.fromEntries(selected.variables.map((v) => [v.name, v.value])));
                      setIsDirty(false);
                    }}
                    disabled={!isDirty}
                    className="px-6 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
                    style={{ border: '1px solid #E0E0E0', color: '#666' }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* History tab */}
            {activeTab === 'history' && (
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-2.5 top-0 bottom-0 w-px" style={{ background: '#E0E0E0' }} />
                  <div className="space-y-6">
                    {selected.history.map((h, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center z-10 mt-0.5"
                          style={{ background: i === 0 ? '#E60000' : '#E0E0E0' }}>
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{h.action}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(h.date)} · {h.user}</p>
                          {h.note && <p className="text-xs text-gray-500 mt-1 italic">{h.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
