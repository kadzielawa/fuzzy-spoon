import React, { useState, useEffect, useRef } from 'react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
type HealthStatus = 'healthy' | 'degraded' | 'down';
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
type AlertState = 'firing' | 'resolved' | 'acknowledged';
type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

interface Service {
  id: string;
  name: string;
  type: string;
  environment: 'production' | 'staging' | 'dev';
  status: HealthStatus;
  uptime: string;
  latencyP50: number;
  latencyP99: number;
  errorRate: number;        // percent
  requestsPerMin: number;
  lastChecked: string;
  region: string;
  deployment: string;
}

interface Alert {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  state: AlertState;
  firedAt: string;
  resolvedAt?: string;
  runbook?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId?: string;
}

interface MetricPoint { t: number; v: number }

/* ─── Mock data ───────────────────────────────────────────────────────────── */
const SERVICES: Service[] = [
  { id: 's1', name: 'checkout-api',        type: 'Cloud Run',   environment: 'production', status: 'healthy',  uptime: '99.98%', latencyP50: 42,  latencyP99: 187, errorRate: 0.12, requestsPerMin: 3840, lastChecked: '10s ago', region: 'europe-west1', deployment: 'checkout-api-v2.3.1' },
  { id: 's2', name: 'product-catalog',     type: 'Cloud Run',   environment: 'production', status: 'degraded', uptime: '98.72%', latencyP50: 234, latencyP99: 980, errorRate: 3.40, requestsPerMin: 1250, lastChecked: '10s ago', region: 'europe-west1', deployment: 'product-catalog-v1.8.0' },
  { id: 's3', name: 'data-ingestion-job',  type: 'Dataflow',    environment: 'production', status: 'healthy',  uptime: '100%',   latencyP50: 0,   latencyP99: 0,   errorRate: 0.00, requestsPerMin: 0,    lastChecked: '30s ago', region: 'europe-west4', deployment: 'ingestion-pipeline-r45' },
  { id: 's4', name: 'auth-service',        type: 'GKE',         environment: 'production', status: 'healthy',  uptime: '99.99%', latencyP50: 18,  latencyP99: 76,  errorRate: 0.03, requestsPerMin: 6200, lastChecked: '10s ago', region: 'europe-west1', deployment: 'auth-svc-3.1.4' },
  { id: 's5', name: 'analytics-worker',    type: 'Cloud Run',   environment: 'staging',    status: 'down',     uptime: '94.10%', latencyP50: 0,   latencyP99: 0,   errorRate: 100,  requestsPerMin: 0,    lastChecked: '2m ago',  region: 'europe-west1', deployment: 'analytics-worker-v0.9.2' },
  { id: 's6', name: 'notification-svc',    type: 'Cloud Run',   environment: 'production', status: 'healthy',  uptime: '99.95%', latencyP50: 31,  latencyP99: 112, errorRate: 0.08, requestsPerMin: 820,  lastChecked: '10s ago', region: 'europe-west1', deployment: 'notification-svc-v1.4.3' },
  { id: 's7', name: 'ml-inference',        type: 'Cloud Run',   environment: 'production', status: 'degraded', uptime: '99.20%', latencyP50: 620, latencyP99: 4500, errorRate: 1.80, requestsPerMin: 340,  lastChecked: '10s ago', region: 'us-central1',  deployment: 'ml-inference-v2.0.0' },
  { id: 's8', name: 'cache-layer',         type: 'Redis',       environment: 'production', status: 'healthy',  uptime: '100%',   latencyP50: 2,   latencyP99: 8,   errorRate: 0.00, requestsPerMin: 12400, lastChecked: '10s ago', region: 'europe-west1', deployment: 'redis-cache-v7.2' },
];

const ALERTS: Alert[] = [
  { id: 'a1', serviceId: 's2', serviceName: 'product-catalog',   title: 'High latency P99 > 900ms',       description: 'P99 response time has exceeded 900ms threshold for 10+ minutes. SLO breach imminent.', severity: 'high',     state: 'firing',       firedAt: '14 min ago', runbook: 'https://runbook.internal/latency' },
  { id: 'a2', serviceId: 's5', serviceName: 'analytics-worker',  title: 'Service is DOWN',                description: 'Health checks have been failing for 2 minutes. All instances are unreachable.', severity: 'critical', state: 'firing',       firedAt: '2 min ago' },
  { id: 'a3', serviceId: 's7', serviceName: 'ml-inference',      title: 'Error rate > 1% (SLO burn)',     description: 'Error budget burn rate is 4x normal. Current error rate: 1.80%.', severity: 'high',     state: 'acknowledged', firedAt: '47 min ago' },
  { id: 'a4', serviceId: 's1', serviceName: 'checkout-api',      title: 'Memory pressure on instance',    description: 'Memory utilisation reached 89% on 2 of 5 instances. Consider scaling up.', severity: 'medium',   state: 'firing',       firedAt: '6 min ago' },
  { id: 'a5', serviceId: 's4', serviceName: 'auth-service',      title: 'Elevated 4xx rate',              description: 'Client error rate increased to 2.1% — likely misconfigured client tokens.', severity: 'low',      state: 'resolved',     firedAt: '2h ago', resolvedAt: '1h ago' },
  { id: 'a6', serviceId: 's3', serviceName: 'data-ingestion-job','title': 'Lag on subscription growing',  description: 'Pub/Sub subscription lag has grown 8× in the last 30 min.', severity: 'medium',   state: 'firing',       firedAt: '31 min ago' },
];

const LOGS: LogEntry[] = [
  { id: 'l1',  timestamp: '2026-04-30T14:03:41Z', level: 'ERROR', service: 'product-catalog',   message: 'Upstream timeout after 1000ms calling inventory-service: context deadline exceeded', traceId: 'abc123ef' },
  { id: 'l2',  timestamp: '2026-04-30T14:03:39Z', level: 'ERROR', service: 'analytics-worker',  message: 'Failed to connect to CloudSQL: dial tcp: connection refused (attempt 47)', traceId: 'ff002abc' },
  { id: 'l3',  timestamp: '2026-04-30T14:03:38Z', level: 'WARN',  service: 'ml-inference',      message: 'Model inference took 4312ms (SLO: 2000ms). Batch size: 64', traceId: 'de44321a' },
  { id: 'l4',  timestamp: '2026-04-30T14:03:37Z', level: 'ERROR', service: 'analytics-worker',  message: 'OOMKilled: container exceeded memory limit 512Mi. Restarting.', traceId: 'ff002abc' },
  { id: 'l5',  timestamp: '2026-04-30T14:03:35Z', level: 'INFO',  service: 'checkout-api',      message: 'POST /v2/checkout → 200 OK (38ms) user=usr_8821 amount=£129.99' },
  { id: 'l6',  timestamp: '2026-04-30T14:03:33Z', level: 'WARN',  service: 'checkout-api',      message: 'Memory usage at 89% on instance checkout-api-00004-zxl. GC pressure detected.' },
  { id: 'l7',  timestamp: '2026-04-30T14:03:30Z', level: 'INFO',  service: 'auth-service',      message: 'Token validated for sub=user-123 iss=accounts.google.com (18ms)' },
  { id: 'l8',  timestamp: '2026-04-30T14:03:28Z', level: 'DEBUG', service: 'notification-svc',  message: 'Email queued: id=notif_7712 template=order_confirmation recipient=****@gmail.com' },
  { id: 'l9',  timestamp: '2026-04-30T14:03:24Z', level: 'ERROR', service: 'product-catalog',   message: 'Redis GET timeout after 500ms key=catalog:sku:VF-0023. Falling back to DB.' },
  { id: 'l10', timestamp: '2026-04-30T14:03:20Z', level: 'INFO',  service: 'data-ingestion-job','message': 'Processed 24,512 messages in batch #r45-288. Throughput: 4,082 msg/s' },
  { id: 'l11', timestamp: '2026-04-30T14:03:17Z', level: 'WARN',  service: 'ml-inference',      message: 'GPU memory fragmentation detected. Recommend restart during low-traffic window.' },
  { id: 'l12', timestamp: '2026-04-30T14:03:10Z', level: 'INFO',  service: 'cache-layer',       message: 'PING OK. hit_rate=98.4% evicted_keys=0 used_memory=1.2GB/2GB' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function generateSparkline(seed: number, points = 20): MetricPoint[] {
  const result: MetricPoint[] = [];
  let v = 30 + (seed % 40);
  for (let i = 0; i < points; i++) {
    v = Math.max(0, Math.min(100, v + (Math.sin(i * 0.7 + seed) * 8) + (Math.random() * 6 - 3)));
    result.push({ t: i, v });
  }
  return result;
}

function Sparkline({ data, color, height = 32 }: { data: MetricPoint[]; color: string; height?: number }) {
  const W = 80; const H = height;
  const max = Math.max(...data.map((d) => d.v), 1);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - (d.v / max) * H}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

const STATUS_CFG: Record<HealthStatus, { color: string; bg: string; dot: string; label: string }> = {
  healthy:  { color: '#16a34a', bg: '#F0FFF4', dot: '#22c55e', label: 'Healthy' },
  degraded: { color: '#d97706', bg: '#FFFBEB', dot: '#f59e0b', label: 'Degraded' },
  down:     { color: '#E60000', bg: '#FFF5F5', dot: '#E60000', label: 'Down' },
};

const SEVERITY_CFG: Record<AlertSeverity, { color: string; bg: string; border: string }> = {
  critical: { color: '#E60000', bg: '#FFF5F5', border: '#E60000' },
  high:     { color: '#d97706', bg: '#FFFBEB', border: '#f59e0b' },
  medium:   { color: '#2563eb', bg: '#EFF6FF', border: '#93c5fd' },
  low:      { color: '#6b7280', bg: '#F9FAFB', border: '#E0E0E0' },
};

const LOG_COLOR: Record<LogLevel, string> = {
  ERROR: '#E60000',
  WARN:  '#d97706',
  INFO:  '#2563eb',
  DEBUG: '#9ca3af',
};

/* ─── Component ───────────────────────────────────────────────────────────── */
interface ObservabilityProps { userId: string }

type Tab = 'overview' | 'services' | 'alerts' | 'logs';

export const Observability: React.FC<ObservabilityProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedEnv, setSelectedEnv] = useState<'all' | 'production' | 'staging' | 'dev'>('all');
  const [logFilter, setLogFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [ackedAlerts, setAckedAlerts] = useState<Set<string>>(new Set());
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>(ALERTS);
  const [tick, setTick] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // "live" ticker — increments every 5s to animate sparklines & timestamp feel
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const filteredServices = SERVICES.filter((s) => selectedEnv === 'all' || s.environment === selectedEnv);

  const summary = {
    total:    filteredServices.length,
    healthy:  filteredServices.filter((s) => s.status === 'healthy').length,
    degraded: filteredServices.filter((s) => s.status === 'degraded').length,
    down:     filteredServices.filter((s) => s.status === 'down').length,
  };

  const firingAlerts = liveAlerts.filter((a) => a.state === 'firing');
  const criticalCount = firingAlerts.filter((a) => a.severity === 'critical').length;

  const filteredLogs = LOGS.filter((l) => {
    if (logFilter !== 'ALL' && l.level !== logFilter) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return l.message.toLowerCase().includes(q) || l.service.toLowerCase().includes(q) || (l.traceId ?? '').includes(q);
    }
    return true;
  });

  const handleAck = (alertId: string) => {
    setAckedAlerts((prev) => new Set([...prev, alertId]));
    setLiveAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, state: 'acknowledged' as const } : a));
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview',  icon: '📊' },
    { key: 'services', label: 'Services',  icon: '⚙️' },
    { key: 'alerts',   label: 'Alerts',    icon: '🔔' },
    { key: 'logs',     label: 'Logs',      icon: '📋' },
  ];

  return (
    <div className="p-8 max-w-7xl">
      {/* Page header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Observability & Status</h1>
            {criticalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white animate-pulse" style={{ background: '#E60000' }}>
                {criticalCount} CRITICAL
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">Service health, metrics, active alerts and log streams.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">Last refresh: {tick === 0 ? 'just now' : `${tick * 5}s ago`}</span>
          <button onClick={() => setTick(0)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid #E0E0E0', color: '#666' }}>
            ↻ Refresh
          </button>
          {(['all', 'production', 'staging', 'dev'] as const).map((env) => (
            <button key={env} onClick={() => setSelectedEnv(env)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={selectedEnv === env ? { background: '#E60000', color: 'white' } : { border: '1px solid #E0E0E0', color: '#666' }}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: '#F4F4F4' }}>
        {tabs.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
            style={activeTab === key ? { background: 'white', color: '#1A1A1A', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#666' }}
          >
            <span>{icon}</span>{label}
            {key === 'alerts' && firingAlerts.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#E60000' }}>{firingAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Services', value: summary.total,    color: '#1A1A1A', bg: 'white', icon: '🔌' },
              { label: 'Healthy',        value: summary.healthy,  color: '#16a34a', bg: '#F0FFF4', icon: '✅' },
              { label: 'Degraded',       value: summary.degraded, color: '#d97706', bg: '#FFFBEB', icon: '⚠️' },
              { label: 'Down',           value: summary.down,     color: '#E60000', bg: '#FFF5F5', icon: '🔴' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: bg, border: `1px solid ${color}22` }}>
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Service health heatmap */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E0E0E0' }}>
            <h2 className="text-sm font-bold mb-4" style={{ color: '#1A1A1A' }}>Service Health Map</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filteredServices.map((svc) => {
                const cfg = STATUS_CFG[svc.status];
                return (
                  <div key={svc.id} className="rounded-xl p-3 cursor-pointer transition-transform hover:scale-105"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}44` }}
                    onClick={() => setActiveTab('services')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate" style={{ color: '#1A1A1A' }}>{svc.name}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0 ml-1" style={{ background: cfg.dot }} />
                    </div>
                    <p className="text-xs" style={{ color: cfg.color }}>{cfg.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{svc.type} · {svc.environment}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Firing alerts banner */}
          {firingAlerts.length > 0 && (
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E0E0E0' }}>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                🔔 Active Alerts
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#E60000' }}>{firingAlerts.length}</span>
              </h2>
              <div className="space-y-2">
                {firingAlerts.slice(0, 4).map((alert) => {
                  const cfg = SEVERITY_CFG[alert.severity];
                  return (
                    <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: cfg.border, color: 'white', fontSize: '10px' }}>{alert.severity}</span>
                          <span className="text-xs font-semibold" style={{ color: '#1A1A1A' }}>{alert.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.serviceName} · {alert.firedAt}</p>
                      </div>
                      <button onClick={() => handleAck(alert.id)} className="text-xs px-2.5 py-1 rounded-lg font-medium flex-shrink-0" style={{ border: `1px solid ${cfg.color}`, color: cfg.color }}>Ack</button>
                    </div>
                  );
                })}
                {firingAlerts.length > 4 && (
                  <button onClick={() => setActiveTab('alerts')} className="text-xs text-gray-400 hover:underline w-full text-left">
                    + {firingAlerts.length - 4} more alerts → View all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recent errors */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E0E0E0' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: '#1A1A1A' }}>Recent Errors</h2>
            <div className="space-y-2">
              {LOGS.filter((l) => l.level === 'ERROR').map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#FFF5F5' }}>
                  <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: '#E60000' }}>ERR</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#1A1A1A' }}>{log.service}</p>
                    <p className="text-xs text-gray-500 truncate">{log.message}</p>
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0 font-mono">{log.timestamp.slice(11, 19)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F4F4F4', borderBottom: '1px solid #E0E0E0' }}>
                {['Service', 'Type', 'Env', 'Status', 'Uptime', 'P50 ms', 'P99 ms', 'Error %', 'Req/min', 'Trend'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((svc, i) => {
                const cfg = STATUS_CFG[svc.status];
                const sparkData = generateSparkline(i * 7 + tick, 20);
                const sparkColor = svc.status === 'healthy' ? '#16a34a' : svc.status === 'degraded' ? '#d97706' : '#E60000';
                return (
                  <tr key={svc.id} style={{ borderBottom: '1px solid #F4F4F4', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-xs" style={{ color: '#1A1A1A' }}>{svc.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{svc.region}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{svc.type}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ background: '#F4F4F4', color: '#666' }}>{svc.environment}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: '#1A1A1A' }}>{svc.uptime}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: svc.latencyP50 > 200 ? '#d97706' : '#16a34a' }}>{svc.latencyP50 || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: svc.latencyP99 > 500 ? '#E60000' : '#1A1A1A' }}>{svc.latencyP99 || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono font-bold" style={{ color: svc.errorRate > 1 ? '#E60000' : svc.errorRate > 0 ? '#d97706' : '#16a34a' }}>
                      {svc.errorRate.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{svc.requestsPerMin.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Sparkline data={sparkData} color={sparkColor} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ALERTS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="flex gap-3 flex-wrap">
            {(['critical', 'high', 'medium', 'low'] as AlertSeverity[]).map((sev) => {
              const count = liveAlerts.filter((a) => a.severity === sev && a.state === 'firing').length;
              const cfg = SEVERITY_CFG[sev];
              return (
                <div key={sev} className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                  <span className="capitalize">{sev}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-white" style={{ background: cfg.color, fontSize: '10px' }}>{count}</span>
                </div>
              );
            })}
          </div>

          {liveAlerts.map((alert) => {
            const cfg = SEVERITY_CFG[alert.severity];
            const stateColor: Record<AlertState, string> = { firing: '#E60000', acknowledged: '#d97706', resolved: '#16a34a' };
            return (
              <div key={alert.id} className="bg-white rounded-2xl p-5" style={{ border: `1.5px solid ${alert.state === 'firing' ? cfg.border : '#E0E0E0'}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded text-white" style={{ background: cfg.color }}>{alert.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize" style={{ background: `${stateColor[alert.state]}15`, color: stateColor[alert.state] }}>{alert.state}</span>
                      <span className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{alert.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{alert.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>🔌 {alert.serviceName}</span>
                      <span>⏱ Fired: {alert.firedAt}</span>
                      {alert.resolvedAt && <span>✅ Resolved: {alert.resolvedAt}</span>}
                      {alert.runbook && <a href={alert.runbook} target="_blank" rel="noreferrer" className="underline" style={{ color: '#E60000' }}>📖 Runbook</a>}
                    </div>
                  </div>
                  {alert.state === 'firing' && (
                    <button onClick={() => handleAck(alert.id)}
                      className="px-4 py-2 text-xs font-bold rounded-xl flex-shrink-0 transition-opacity hover:opacity-80"
                      style={{ background: '#E60000', color: 'white' }}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input type="text" placeholder="Search message, service, trace ID…" value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
                style={{ border: '1px solid #E0E0E0' }}
              />
            </div>
            <div className="flex gap-2">
              {(['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const).map((lvl) => (
                <button key={lvl} onClick={() => setLogFilter(lvl)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={logFilter === lvl
                    ? { background: lvl === 'ALL' ? '#1A1A1A' : LOG_COLOR[lvl as LogLevel], color: 'white' }
                    : { border: '1px solid #E0E0E0', color: '#666' }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Log stream */}
          <div className="rounded-2xl overflow-hidden font-mono text-xs" style={{ background: '#0F0F14', border: '1px solid #333' }}>
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#1A1A1A', borderBottom: '1px solid #333' }}>
              <span className="w-3 h-3 rounded-full" style={{ background: '#E60000' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
              <span className="ml-3 text-gray-400 text-xs">Log stream — {filteredLogs.length} entries</span>
            </div>
            <div className="overflow-y-auto p-4 space-y-1" style={{ maxHeight: '480px' }}>
              {filteredLogs.length === 0 && (
                <p className="text-gray-500 text-center py-8">No matching log entries.</p>
              )}
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-1 hover:bg-white/5 px-1 rounded">
                  <span className="text-gray-500 flex-shrink-0 select-none">{log.timestamp.slice(11, 23)}</span>
                  <span className="font-bold w-10 flex-shrink-0 text-right" style={{ color: LOG_COLOR[log.level] }}>{log.level}</span>
                  <span className="flex-shrink-0" style={{ color: '#7dd3fc', minWidth: '130px' }}>{log.service}</span>
                  <span className="text-gray-300 flex-1 break-all">{log.message}</span>
                  {log.traceId && (
                    <span className="text-gray-600 flex-shrink-0 hidden md:block">trace:{log.traceId}</span>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
