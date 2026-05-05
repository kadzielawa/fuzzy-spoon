import React, { useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface ApprovalItem {
  id: string;
  deploymentName: string;
  templateLabel: string;
  templateIcon: string;
  requestedBy: string;
  requestedByAvatar: string;
  requestedAt: string;
  projectId: string;
  projectName: string;
  environment: 'production' | 'staging' | 'dev';
  region: string;
  status: ApprovalStatus;
  priority: Priority;
  estimatedCost: string;
  costDelta?: string;
  riskScore: number; // 0-100
  description: string;
  changedResources: { action: 'add' | 'change' | 'destroy'; resource: string; detail: string }[];
  securityFlags: string[];
  policyChecks: { name: string; passed: boolean }[];
  rejectionReason?: string;
  approvedBy?: string;
  resolvedAt?: string;
  expiresAt: string;
  comments: { author: string; text: string; time: string; avatar: string }[];
}

/* ─── Mock data ─────────────────────────────────────────────────────────── */
const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id: 'apr-001',
    deploymentName: 'payments-api-v3-upgrade',
    templateLabel: 'Cloud Run Service',
    templateIcon: '🚀',
    requestedBy: 'Alice Johnson',
    requestedByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    requestedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    projectId: 'vf-prod-payments',
    projectName: 'Vodafone Payments (Prod)',
    environment: 'production',
    region: 'europe-west1',
    status: 'pending',
    priority: 'critical',
    estimatedCost: '~€145/month',
    costDelta: '+€22/month',
    riskScore: 72,
    description: 'Upgrade payments API from v2.1 to v3.0. Includes new fraud detection model, updated auth middleware, and increased memory allocation.',
    changedResources: [
      { action: 'change', resource: 'google_cloud_run_v2_service.payments_api', detail: 'image: v2.1.0 → v3.0.0, memory: 1Gi → 2Gi, cpu: 1 → 2' },
      { action: 'change', resource: 'google_compute_backend_service.lb_backend', detail: 'timeout_sec: 30 → 60' },
      { action: 'add', resource: 'google_cloud_armor_security_policy.payments_waf', detail: 'New WAF policy with OWASP rules' },
    ],
    securityFlags: ['Production environment', 'IAM role change', 'Public endpoint'],
    policyChecks: [
      { name: 'TFLint: No violations', passed: true },
      { name: 'Checkov: Security scan', passed: true },
      { name: 'Cost threshold (<€200)', passed: true },
      { name: 'Change window (Tue-Thu 10-16 UTC)', passed: true },
      { name: 'No data destruction', passed: true },
    ],
    expiresAt: new Date(Date.now() + 22 * 3600000).toISOString(),
    comments: [
      { author: 'Alice Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', text: 'Please review — this unblocks the Q2 fraud reduction initiative. The WAF policy is the main addition.', time: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
  },
  {
    id: 'apr-002',
    deploymentName: 'iot-processing-cluster-eu-w4',
    templateLabel: 'GKE Autopilot Cluster',
    templateIcon: '☸️',
    requestedBy: 'Alice Johnson',
    requestedByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    requestedAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    projectId: 'vf-iot-platform',
    projectName: 'Vodafone IoT Platform',
    environment: 'production',
    region: 'europe-west4',
    status: 'pending',
    priority: 'high',
    estimatedCost: '~€640/month',
    costDelta: '+€640/month',
    riskScore: 58,
    description: 'New GKE Autopilot cluster for IoT telemetry processing in Europe West 4 to reduce latency for DE/NL customers.',
    changedResources: [
      { action: 'add', resource: 'google_container_cluster.iot_eu_w4', detail: 'Autopilot cluster, VPC-native, private nodes' },
      { action: 'add', resource: 'google_service_account.gke_node_sa', detail: 'Service account with minimal permissions' },
      { action: 'add', resource: 'google_project_iam_member.gke_node_logs', detail: 'roles/logging.logWriter' },
      { action: 'add', resource: 'google_project_iam_member.gke_node_metrics', detail: 'roles/monitoring.metricWriter' },
    ],
    securityFlags: ['New IAM bindings', 'High cost (+€640)', 'Production environment'],
    policyChecks: [
      { name: 'TFLint: No violations', passed: true },
      { name: 'Checkov: Security scan', passed: true },
      { name: 'Cost threshold (<€200)', passed: false },
      { name: 'Change window (Tue-Thu 10-16 UTC)', passed: false },
      { name: 'No data destruction', passed: true },
    ],
    expiresAt: new Date(Date.now() - 2 * 3600000).toISOString(), // EXPIRED
    comments: [],
  },
  {
    id: 'apr-003',
    deploymentName: 'billing-analytics-pipeline',
    templateLabel: 'Cloud Composer Pipeline',
    templateIcon: '📊',
    requestedBy: 'Bob Smith',
    requestedByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    requestedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    projectId: 'vf-data-analytics',
    projectName: 'Vodafone Data Analytics',
    environment: 'staging',
    region: 'europe-west4',
    status: 'pending',
    priority: 'medium',
    estimatedCost: '~€320/month',
    costDelta: '+€320/month',
    riskScore: 35,
    description: 'New Airflow environment for billing data transformation pipeline. Replaces legacy on-prem ETL job.',
    changedResources: [
      { action: 'add', resource: 'google_composer_environment.billing_pipeline', detail: 'Composer 2, 3 worker nodes, n1-standard-2' },
      { action: 'add', resource: 'google_storage_bucket.dags_bucket', detail: 'DAG source bucket, versioning enabled' },
      { action: 'add', resource: 'google_bigquery_dataset.billing_raw', detail: 'Raw landing dataset, EU region' },
    ],
    securityFlags: ['New GCS bucket (public access check needed)'],
    policyChecks: [
      { name: 'TFLint: No violations', passed: true },
      { name: 'Checkov: Security scan', passed: true },
      { name: 'Cost threshold (<€400)', passed: true },
      { name: 'No data destruction', passed: true },
    ],
    expiresAt: new Date(Date.now() + 44 * 3600000).toISOString(),
    comments: [
      { author: 'Bob Smith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', text: 'Staging deploy first — prod will follow next sprint after validation.', time: new Date(Date.now() - 3.5 * 3600000).toISOString() },
    ],
  },
  {
    id: 'apr-004',
    deploymentName: 'cdn-assets-v2',
    templateLabel: 'Static Assets CDN',
    templateIcon: '🌐',
    requestedBy: 'Bob Smith',
    requestedByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    requestedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    projectId: 'vf-web-assets',
    projectName: 'Vodafone Web Assets',
    environment: 'production',
    region: 'global',
    status: 'approved',
    priority: 'low',
    estimatedCost: '~€18/month',
    costDelta: '+€6/month',
    riskScore: 12,
    description: 'CDN update for static web assets — new routes for video thumbnails and updated cache TTLs.',
    changedResources: [
      { action: 'change', resource: 'google_compute_url_map.cdn_url_map', detail: 'Added /thumbnails/* route' },
      { action: 'change', resource: 'google_compute_backend_bucket.assets', detail: 'cache_mode: CACHE_ALL_STATIC → FORCE_CACHE_ALL' },
    ],
    securityFlags: [],
    policyChecks: [
      { name: 'TFLint: No violations', passed: true },
      { name: 'Checkov: Security scan', passed: true },
      { name: 'Cost threshold (<€200)', passed: true },
      { name: 'No data destruction', passed: true },
    ],
    expiresAt: new Date(Date.now() + 0).toISOString(),
    approvedBy: 'Carol White',
    resolvedAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    comments: [
      { author: 'Carol White', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', text: 'LGTM — low risk change. Approved.', time: new Date(Date.now() - 23 * 3600000).toISOString() },
    ],
  },
  {
    id: 'apr-005',
    deploymentName: 'legacy-db-migration',
    templateLabel: 'Cloud SQL Instance',
    templateIcon: '🗄️',
    requestedBy: 'Alice Johnson',
    requestedByAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    requestedAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    projectId: 'vf-prod-backend',
    projectName: 'Vodafone Backend Services',
    environment: 'production',
    region: 'europe-west1',
    status: 'rejected',
    priority: 'high',
    estimatedCost: '~€290/month',
    costDelta: '+€290/month',
    riskScore: 91,
    description: 'Migrate legacy PostgreSQL to Cloud SQL. Plan includes destroying the old sql instance.',
    changedResources: [
      { action: 'destroy', resource: 'google_sql_database_instance.legacy_postgres', detail: 'DESTRUCTION — data must be backed up first' },
      { action: 'add', resource: 'google_sql_database_instance.cloud_sql_primary', detail: 'PostgreSQL 15, HA enabled' },
    ],
    securityFlags: ['Data destruction planned', 'No backup policy confirmed', 'Production DB'],
    policyChecks: [
      { name: 'TFLint: No violations', passed: true },
      { name: 'Checkov: Security scan', passed: false },
      { name: 'No data destruction', passed: false },
      { name: 'Backup confirmation required', passed: false },
    ],
    expiresAt: new Date(0).toISOString(),
    rejectionReason: 'Rejected: No backup confirmation provided. Checkov flagged missing deletion_protection. Re-submit after adding backup snapshot and setting deletion_protection=true.',
    approvedBy: undefined,
    resolvedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    comments: [
      { author: 'Carol White', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', text: 'Cannot approve without a confirmed backup. Please add a snapshot step and set deletion_protection=true on the old instance.', time: new Date(Date.now() - 2.5 * 24 * 3600000).toISOString() },
    ],
  },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; color: string; border: string }> = {
  critical: { label: 'Critical', bg: '#FFF0F0', color: '#E60000', border: '#E60000' },
  high:     { label: 'High',     bg: '#FFF7ED', color: '#ea580c', border: '#fed7aa' },
  medium:   { label: 'Medium',   bg: '#FFFBEB', color: '#d97706', border: '#fde68a' },
  low:      { label: 'Low',      bg: '#F0FFF4', color: '#16a34a', border: '#bbf7d0' },
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Pending Review', bg: '#FFFBEB', color: '#d97706' },
  approved: { label: 'Approved',       bg: '#F0FFF4', color: '#16a34a' },
  rejected: { label: 'Rejected',       bg: '#FFF0F0', color: '#E60000' },
  expired:  { label: 'Expired',        bg: '#F4F4F4', color: '#999999' },
};

const ENV_BADGE: Record<string, { bg: string; color: string }> = {
  production: { bg: '#FFF0F0', color: '#E60000' },
  staging:    { bg: '#FFFBEB', color: '#d97706' },
  dev:        { bg: '#F0FFF4', color: '#16a34a' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function timeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
  return `${Math.floor(diff / 3600000)}h left`;
}

function RiskMeter({ score }: { score: number }) {
  const color = score >= 70 ? '#E60000' : score >= 40 ? '#d97706' : '#16a34a';
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Medium Risk' : 'Low Risk';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium" style={{ color }}>Risk Score</span>
        <span className="font-bold" style={{ color }}>{score}/100 · {label}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
interface ApprovalsProps {
  userId: string;
  userRoles: string[];
}

export const Approvals: React.FC<ApprovalsProps> = ({ userId, userRoles }) => {
  const [items, setItems] = useState<ApprovalItem[]>(MOCK_APPROVALS);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [filterTab, setFilterTab] = useState<'pending' | 'resolved'>('pending');
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const canApprove = userRoles.some((r) => ['admin', 'architect'].includes(r));

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (item: ApprovalItem) => {
    setActionLoading('approve');
    await new Promise((r) => setTimeout(r, 1200));
    const updated: ApprovalItem = {
      ...item,
      status: 'approved',
      approvedBy: 'Carol White',
      resolvedAt: new Date().toISOString(),
      comments: comment.trim()
        ? [...item.comments, { author: 'Carol White', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', text: comment, time: new Date().toISOString() }]
        : item.comments,
    };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    setSelected(updated);
    setComment('');
    setActionLoading(null);
    showToast(`✓ Deployment "${item.deploymentName}" approved — pipeline triggered`, 'success');
  };

  const handleReject = async (item: ApprovalItem) => {
    if (!rejectionReason.trim()) return;
    setActionLoading('reject');
    await new Promise((r) => setTimeout(r, 1000));
    const updated: ApprovalItem = {
      ...item,
      status: 'rejected',
      rejectionReason: rejectionReason,
      resolvedAt: new Date().toISOString(),
      comments: [
        ...item.comments,
        { author: 'Carol White', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol', text: `Rejected: ${rejectionReason}`, time: new Date().toISOString() },
      ],
    };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    setSelected(updated);
    setRejectionReason('');
    setShowRejectModal(false);
    setActionLoading(null);
    showToast(`Deployment "${item.deploymentName}" rejected`, 'error');
  };

  const displayed = items
    .map((i) => {
      // coerce expired
      if (i.status === 'pending' && new Date(i.expiresAt) < new Date()) {
        return { ...i, status: 'expired' as ApprovalStatus };
      }
      return i;
    })
    .filter((i) => (filterTab === 'pending' ? i.status === 'pending' : ['approved', 'rejected', 'expired'].includes(i.status)));

  const pendingCount = items.filter((i) => {
    if (i.status !== 'pending') return false;
    return new Date(i.expiresAt) >= new Date();
  }).length;

  return (
    <div className="p-8 max-w-7xl relative">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium text-white transition-all"
          style={{ background: toast.type === 'success' ? '#16a34a' : '#E60000' }}
        >
          {toast.msg}
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-1" style={{ color: '#1A1A1A' }}>Reject Deployment</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason — this will be sent to the requester.</p>
            <textarea
              className="w-full border rounded-xl p-3 text-sm outline-none resize-none"
              style={{ borderColor: '#E0E0E0' }}
              rows={4}
              placeholder="e.g. Missing backup confirmation, security check failed..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: '#E0E0E0', color: '#666' }}>
                Cancel
              </button>
              <button
                onClick={() => handleReject(selected)}
                disabled={!rejectionReason.trim() || actionLoading === 'reject'}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40"
                style={{ background: '#E60000' }}
              >
                {actionLoading === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve infrastructure change requests</p>
        </div>
        {!canApprove && (
          <div className="px-4 py-2 rounded-xl text-sm" style={{ background: '#FFF5F5', color: '#E60000', border: '1px solid #fecaca' }}>
            ⚠ View only — architect or admin role required to approve
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit" style={{ border: '1px solid #E0E0E0' }}>
        <button
          onClick={() => { setFilterTab('pending'); setSelected(null); }}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          style={filterTab === 'pending' ? { background: '#E60000', color: 'white' } : { color: '#666' }}
        >
          Pending Review
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: filterTab === 'pending' ? 'rgba(255,255,255,0.25)' : '#E60000', color: 'white' }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setFilterTab('resolved'); setSelected(null); }}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          style={filterTab === 'resolved' ? { background: '#E60000', color: 'white' } : { color: '#666' }}
        >
          Resolved
        </button>
      </div>

      <div className="flex gap-5">
        {/* List */}
        <div className={`flex flex-col gap-3 ${selected ? 'w-2/5' : 'w-full'}`}>
          {displayed.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid #E0E0E0' }}>
              <p className="text-3xl mb-3">✅</p>
              <p className="font-semibold text-gray-700">All caught up!</p>
              <p className="text-gray-400 text-sm mt-1">No pending approvals.</p>
            </div>
          )}
          {displayed.map((item) => {
            const pCfg = PRIORITY_CONFIG[item.priority];
            const sCfg = STATUS_CONFIG[item.status];
            const expiredStatus = item.status === 'expired';
            const tLeft = item.status === 'pending' ? timeLeft(item.expiresAt) : null;
            const isActive = selected?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                className="bg-white rounded-2xl p-5 cursor-pointer transition-all"
                style={{
                  border: isActive ? '2px solid #E60000' : '1px solid #E0E0E0',
                  boxShadow: isActive ? '0 0 0 3px #FFF0F0' : undefined,
                  opacity: expiredStatus ? 0.6 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{item.templateIcon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1A1A1A' }}>{item.deploymentName}</p>
                      <p className="text-xs text-gray-400 truncate">{item.templateLabel}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: sCfg.bg, color: sCfg.color }}>
                      {sCfg.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ background: pCfg.bg, color: pCfg.color, borderColor: pCfg.border }}>
                      {pCfg.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <img src={item.requestedByAvatar} alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-xs text-gray-500">{item.requestedBy}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{timeAgo(item.requestedAt)}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  <span className="px-2 py-0.5 rounded font-medium capitalize" style={{ background: ENV_BADGE[item.environment].bg, color: ENV_BADGE[item.environment].color }}>
                    {item.environment}
                  </span>
                  <span>📁 {item.projectId}</span>
                  <span>💰 {item.costDelta || item.estimatedCost}</span>
                  {tLeft && <span className="font-medium text-yellow-600">⏱ {tLeft}</span>}
                  {!tLeft && item.status === 'pending' && <span className="font-medium text-gray-400">⏱ Expired</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const item = displayed.find((i) => i.id === selected.id) ?? selected;
          const pCfg = PRIORITY_CONFIG[item.priority];
          const sCfg = STATUS_CONFIG[item.status];
          return (
            <div className="flex-1 min-w-0 bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
              {/* Panel header */}
              <div className="px-6 py-4 flex items-start justify-between gap-2" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{item.templateIcon}</span>
                    <h2 className="font-bold" style={{ color: '#1A1A1A' }}>{item.deploymentName}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: sCfg.bg, color: sCfg.color }}>{sCfg.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold border" style={{ background: pCfg.bg, color: pCfg.color, borderColor: pCfg.border }}>{pCfg.label} priority</span>
                    <span className="px-2 py-0.5 rounded text-xs capitalize font-medium" style={{ background: ENV_BADGE[item.environment].bg, color: ENV_BADGE[item.environment].color }}>{item.environment}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none flex-shrink-0">×</button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: '75vh' }}>
                <div className="p-6 space-y-6">

                  {/* Requester + meta */}
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#F8F8F8' }}>
                    <img src={item.requestedByAvatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{item.requestedBy}</p>
                      <p className="text-xs text-gray-400">requested {timeAgo(item.requestedAt)} · {item.projectName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#E60000' }}>{item.costDelta || item.estimatedCost}</p>
                      <p className="text-xs text-gray-400">cost impact</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">{item.description}</p>

                  {/* Risk score */}
                  <RiskMeter score={item.riskScore} />

                  {/* Security flags */}
                  {item.securityFlags.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: '#FFF5F5', border: '1px solid #fecaca' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#E60000' }}>⚠ Security Flags</p>
                      <div className="flex flex-wrap gap-2">
                        {item.securityFlags.map((f) => (
                          <span key={f} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: 'white', color: '#E60000', border: '1px solid #fecaca' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Policy checks */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400">Policy Checks</p>
                    <div className="space-y-2">
                      {item.policyChecks.map((c) => (
                        <div key={c.name} className="flex items-center gap-2.5">
                          <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs" style={{ background: c.passed ? '#16a34a' : '#E60000' }}>
                            {c.passed ? '✓' : '✗'}
                          </span>
                          <span className="text-sm" style={{ color: c.passed ? '#333' : '#E60000' }}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Terraform changes */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400">Terraform Plan</p>
                    <div className="rounded-xl overflow-hidden" style={{ background: '#0D1117', border: '1px solid #30363D' }}>
                      <div className="px-4 py-2 text-xs font-mono text-gray-400" style={{ borderBottom: '1px solid #30363D' }}>
                        {item.changedResources.filter((r) => r.action === 'add').length} to add,{' '}
                        {item.changedResources.filter((r) => r.action === 'change').length} to change,{' '}
                        <span style={{ color: item.changedResources.some((r) => r.action === 'destroy') ? '#F85149' : '#3FB950' }}>
                          {item.changedResources.filter((r) => r.action === 'destroy').length} to destroy
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {item.changedResources.map((r, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold" style={{ color: r.action === 'add' ? '#3FB950' : r.action === 'change' ? '#E3B341' : '#F85149' }}>
                                {r.action === 'add' ? '+' : r.action === 'change' ? '~' : '−'}
                              </span>
                              <span className="font-mono text-xs" style={{ color: r.action === 'add' ? '#3FB950' : r.action === 'change' ? '#E3B341' : '#F85149' }}>
                                {r.resource}
                              </span>
                            </div>
                            <p className="ml-4 text-xs mt-0.5" style={{ color: '#8B949E' }}>{r.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {item.status === 'rejected' && item.rejectionReason && (
                    <div className="p-4 rounded-xl" style={{ background: '#FFF5F5', border: '1px solid #fecaca' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#E60000' }}>Rejection Reason</p>
                      <p className="text-sm text-gray-700">{item.rejectionReason}</p>
                    </div>
                  )}

                  {/* Approval confirmation */}
                  {item.status === 'approved' && (
                    <div className="p-4 rounded-xl" style={{ background: '#F0FFF4', border: '1px solid #bbf7d0' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-1 text-green-700">Approved</p>
                      <p className="text-sm text-green-800">Approved by <strong>{item.approvedBy}</strong> · {item.resolvedAt ? timeAgo(item.resolvedAt) : ''}</p>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3 text-gray-400">Discussion ({item.comments.length})</p>
                    {item.comments.length === 0 && <p className="text-xs text-gray-400 italic">No comments yet.</p>}
                    <div className="space-y-3 mb-4">
                      {item.comments.map((c, i) => (
                        <div key={i} className="flex gap-3">
                          <img src={c.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>{c.author}</span>
                              <span className="text-xs text-gray-400">{timeAgo(c.time)}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 border rounded-xl p-3 text-sm outline-none resize-none"
                          style={{ borderColor: '#E0E0E0' }}
                          rows={2}
                          placeholder="Add a comment…"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {item.status === 'pending' && canApprove && (
                    <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid #F0F0F0' }}>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={actionLoading !== null}
                        className="flex-1 py-3 text-white text-sm font-bold rounded-xl transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: '#16a34a' }}
                      >
                        {actionLoading === 'approve' ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                        ) : '✓'} Approve &amp; Deploy
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading !== null}
                        className="flex-1 py-3 text-sm font-bold rounded-xl border transition-opacity disabled:opacity-40"
                        style={{ borderColor: '#E60000', color: '#E60000' }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {item.status === 'pending' && !canApprove && (
                    <div className="p-3 rounded-xl text-sm text-center" style={{ background: '#F4F4F4', color: '#999' }}>
                      Architect or admin role required to approve
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
