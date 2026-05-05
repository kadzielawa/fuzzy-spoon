import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type ScenarioId = 'cloud-run' | 'gke' | 'composer';
type StepStatus = 'waiting' | 'running' | 'success' | 'failed' | 'skipped';
type DemoPhase = 'select' | 'configure' | 'pipeline' | 'complete';

interface Scenario {
  id: ScenarioId;
  icon: string;
  name: string;
  description: string;
  service: string;
  region: string;
  projectId: string;
  estimatedTime: string;
  resources: string[];
  cost: string;
}

interface PipelineStep {
  id: string;
  name: string;
  status: StepStatus;
  durationMs: number;
  logs: string[];
  requiresApproval?: boolean;
}

interface DeployedResource {
  type: string;
  name: string;
  url?: string;
  region: string;
  status: 'healthy';
  metric: string;
  metricLabel: string;
}

/* ─── Scenarios ────────────────────────────────────────────────────────── */
const SCENARIOS: Scenario[] = [
  {
    id: 'cloud-run',
    icon: '🚀',
    name: 'Cloud Run Microservice',
    description: 'Deploy a containerised API with global load balancing, CDN, and auto-scaling.',
    service: 'vf-fraud-detection-api',
    region: 'europe-west1',
    projectId: 'vf-prod-security',
    estimatedTime: '~3 min',
    resources: ['Cloud Run Service', 'Global Load Balancer', 'Cloud Armor Policy', 'Monitoring Dashboard'],
    cost: '~€120/month',
  },
  {
    id: 'gke',
    icon: '☸️',
    name: 'GKE Autopilot Cluster',
    description: 'Provision a fully managed Kubernetes cluster with Workload Identity and VPC-native networking.',
    service: 'vf-iot-processing-cluster',
    region: 'europe-west4',
    projectId: 'vf-iot-platform',
    estimatedTime: '~6 min',
    resources: ['GKE Autopilot Cluster', 'Node Pool', 'Service Account + IAM', 'VPC Peering'],
    cost: '~€640/month',
  },
  {
    id: 'composer',
    icon: '📊',
    name: 'Data Pipeline (Cloud Composer)',
    description: 'Create an Apache Airflow environment for orchestrating data transformation and ML pipelines.',
    service: 'vf-billing-analytics-pipeline',
    region: 'europe-west4',
    projectId: 'vf-data-platform',
    estimatedTime: '~8 min',
    resources: ['Cloud Composer Environment', 'GCS Bucket (DAGs)', 'BigQuery Datasets', 'Dataproc Cluster'],
    cost: '~€380/month',
  },
];

/* ─── Log generators ────────────────────────────────────────────────────── */
function buildSteps(s: Scenario): PipelineStep[] {
  const svc = s.service;
  const proj = s.projectId;
  const reg = s.region;

  return [
    {
      id: 'checkout',
      name: 'Checkout repository',
      status: 'waiting',
      durationMs: 800,
      logs: [
        `Run actions/checkout@v4`,
        `Cloning into '/home/runner/work/infra-repo'...`,
        `HEAD is now at a3f9c12 feat: add ${svc} config`,
        `✓ Checked out ref: refs/heads/main`,
      ],
    },
    {
      id: 'setup-tf',
      name: 'Setup Terraform 1.7',
      status: 'waiting',
      durationMs: 1200,
      logs: [
        `Downloading Terraform 1.7.5 (linux_amd64)...`,
        `Verifying checksums...`,
        `Installing Terraform to /usr/local/bin/terraform`,
        `terraform version: Terraform v1.7.5`,
        `on linux_amd64`,
        `✓ Terraform installed`,
      ],
    },
    {
      id: 'auth',
      name: 'Authenticate to Google Cloud',
      status: 'waiting',
      durationMs: 900,
      logs: [
        `Authenticating using Workload Identity Federation`,
        `Service Account: terraform-sa@${proj}.iam.gserviceaccount.com`,
        `Requesting access token...`,
        `✓ Successfully authenticated`,
        `✓ Access token expires: ${new Date(Date.now() + 3600000).toISOString()}`,
      ],
    },
    {
      id: 'init',
      name: 'Terraform Init',
      status: 'waiting',
      durationMs: 1800,
      logs: [
        `Initializing the backend...`,
        `  Acquiring state lock. This may take a few moments...`,
        `Backend config: bucket=vf-terraform-state, prefix=${proj}/${svc}`,
        ``,
        `Initializing provider plugins...`,
        `- Finding hashicorp/google versions matching "~> 5.0"...`,
        `- Installing hashicorp/google v5.22.0...`,
        `- Installed hashicorp/google v5.22.0 (signed by HashiCorp)`,
        ``,
        `Terraform has been successfully initialized!`,
      ],
    },
    {
      id: 'validate',
      name: 'Terraform Validate & Lint',
      status: 'waiting',
      durationMs: 1100,
      logs: [
        `Running: terraform validate`,
        `Success! The configuration is valid.`,
        ``,
        `Running: tflint --format=compact`,
        `0 issue(s) found`,
        ``,
        `Running: checkov -d . --framework terraform --quiet`,
        `Passed checks: 42, Failed checks: 0, Skipped checks: 3`,
        `✓ All security checks passed`,
      ],
    },
    {
      id: 'plan',
      name: 'Terraform Plan',
      status: 'waiting',
      durationMs: 2800,
      logs: [
        `Running: terraform plan -out=tfplan`,
        `Refreshing state...`,
        ``,
        `Terraform will perform the following actions:`,
        ``,
        `  # google_cloud_run_v2_service.${svc} will be created`,
        `  + resource "google_cloud_run_v2_service" "${svc}" {`,
        `      + name     = "${svc}"`,
        `      + location = "${reg}"`,
        `      + project  = "${proj}"`,
        `      + ingress  = "INGRESS_TRAFFIC_ALL"`,
        `    }`,
        ``,
        `  # google_compute_backend_service.lb_backend will be created`,
        `  + resource "google_compute_backend_service" "lb_backend" {`,
        `      + name    = "${svc}-lb"`,
        `      + project = "${proj}"`,
        `    }`,
        ``,
        `  # google_monitoring_dashboard.main will be created`,
        `  + resource "google_monitoring_dashboard" "main" {`,
        `      + dashboard_json = (known after apply)`,
        `    }`,
        ``,
        `Plan: 7 to add, 0 to change, 0 to destroy.`,
        ``,
        `✓ Plan saved to tfplan`,
      ],
    },
    {
      id: 'approval',
      name: 'Manual Approval Gate',
      status: 'waiting',
      durationMs: 0,
      requiresApproval: true,
      logs: [
        `⏸  Workflow paused — awaiting approval`,
        `Reviewers notified: carol.white@vodafone.com`,
        `Environment: production`,
        `Approval window: 24 hours`,
      ],
    },
    {
      id: 'apply',
      name: 'Terraform Apply',
      status: 'waiting',
      durationMs: 4500,
      logs: [
        `Running: terraform apply tfplan`,
        ``,
        `google_project_service.run_api: Creating...`,
        `google_service_account.cloud_run_sa: Creating...`,
        `google_service_account.cloud_run_sa: Creation complete after 2s`,
        `google_project_iam_member.run_invoker: Creating...`,
        `google_project_iam_member.run_invoker: Creation complete after 1s`,
        `google_cloud_run_v2_service.${svc}: Creating...`,
        `google_cloud_run_v2_service.${svc}: Still creating... [10s elapsed]`,
        `google_cloud_run_v2_service.${svc}: Still creating... [20s elapsed]`,
        `google_cloud_run_v2_service.${svc}: Creation complete after 28s`,
        `google_compute_backend_service.lb_backend: Creating...`,
        `google_compute_backend_service.lb_backend: Creation complete after 4s`,
        `google_compute_global_forwarding_rule.https: Creating...`,
        `google_compute_global_forwarding_rule.https: Creation complete after 3s`,
        `google_monitoring_dashboard.main: Creating...`,
        `google_monitoring_dashboard.main: Creation complete after 2s`,
        ``,
        `Apply complete! Resources: 7 added, 0 changed, 0 destroyed.`,
        ``,
        `Outputs:`,
        `  service_url = "https://${svc}-abc123-ew.a.run.app"`,
        `  lb_ip       = "34.120.88.47"`,
      ],
    },
    {
      id: 'healthcheck',
      name: 'Post-deploy Health Check',
      status: 'waiting',
      durationMs: 1600,
      logs: [
        `Waiting for service to become healthy...`,
        `GET https://${svc}-abc123-ew.a.run.app/health`,
        `  → HTTP 200 OK (234ms)`,
        `GET https://${svc}-abc123-ew.a.run.app/health`,
        `  → HTTP 200 OK (187ms)`,
        `GET https://${svc}-abc123-ew.a.run.app/health`,
        `  → HTTP 200 OK (201ms)`,
        ``,
        `✓ Health check passed (3/3 requests successful)`,
        `✓ Avg latency: 207ms`,
      ],
    },
    {
      id: 'notify',
      name: 'Notify & Update CMDB',
      status: 'waiting',
      durationMs: 700,
      logs: [
        `Posting deployment summary to #platform-deployments...`,
        `✓ Slack notification sent`,
        `Updating ServiceNow CMDB...`,
        `✓ CI record created: CI0012847`,
        `Tagging GitHub PR #482 as deployed...`,
        `✓ All notifications sent`,
      ],
    },
  ];
}

function buildResources(s: Scenario): DeployedResource[] {
  return [
    {
      type: 'Cloud Run',
      name: s.service,
      url: `https://${s.service}-abc123-ew.a.run.app`,
      region: s.region,
      status: 'healthy',
      metric: '0 / 10',
      metricLabel: 'Instances (idle)',
    },
    {
      type: 'Load Balancer',
      name: `${s.service}-lb`,
      region: 'global',
      status: 'healthy',
      metric: '34.120.88.47',
      metricLabel: 'Anycast IP',
    },
    {
      type: 'Monitoring',
      name: `${s.service}-dashboard`,
      url: `https://console.cloud.google.com/monitoring/dashboards`,
      region: s.region,
      status: 'healthy',
      metric: '100%',
      metricLabel: 'Uptime (1h)',
    },
    {
      type: 'IAM',
      name: `${s.service}-sa@${s.projectId}.iam.gserviceaccount.com`,
      region: 'global',
      status: 'healthy',
      metric: '3',
      metricLabel: 'Roles bound',
    },
  ];
}

/* ─── Sub-components ────────────────────────────────────────────────────── */
function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'success')
    return <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold" style={{ background: '#16a34a' }}>✓</span>;
  if (status === 'failed')
    return <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold" style={{ background: '#E60000' }}>✗</span>;
  if (status === 'running')
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ background: '#E60000' }}>
        <svg className="animate-spin w-3 h-3 text-white" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </span>
    );
  if (status === 'waiting')
    return <span className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-gray-300 text-xs text-gray-400">○</span>;
  return <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs text-gray-400">–</span>;
}

/* ─── Main component ────────────────────────────────────────────────────── */
export const DemoDeployment: React.FC = () => {
  const [phase, setPhase] = useState<DemoPhase>('select');
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [resources, setResources] = useState<DeployedResource[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [configDone, setConfigDone] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  // auto-scroll logs
  useEffect(() => {
    logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleLogs]);

  // elapsed timer
  useEffect(() => {
    if (phase === 'pipeline') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const startPipeline = useCallback(() => {
    const built = buildSteps(scenario);
    setSteps(built);
    setCurrentStepIdx(-1);
    setVisibleLogs([]);
    setAwaitingApproval(false);
    setElapsed(0);
    setPhase('pipeline');
  }, [scenario]);

  // Step runner
  useEffect(() => {
    if (phase !== 'pipeline' || runningRef.current) return;

    const runNext = async () => {
      runningRef.current = true;
      const allSteps = buildSteps(scenario);
      setSteps(allSteps);

      for (let i = 0; i < allSteps.length; i++) {
        const step = allSteps[i];

        // mark running
        setCurrentStepIdx(i);
        setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
        setVisibleLogs((prev) => [...prev, ``, `  ┌─ ${step.name.toUpperCase()} ─────────────────────────────`]);

        if (step.requiresApproval) {
          // stream approval logs
          for (const line of step.logs) {
            await new Promise((r) => setTimeout(r, 150));
            setVisibleLogs((prev) => [...prev, `  │ ${line}`]);
          }
          setAwaitingApproval(true);
          // wait for approval click
          await new Promise<void>((resolve) => {
            const check = setInterval(() => {
              if (!awaitingApproval) { clearInterval(check); resolve(); }
            }, 300);
            (window as any).__approvalResolve = resolve;
          });
          setAwaitingApproval(false);
          setVisibleLogs((prev) => [...prev, `  │ ✓ Approved by carol.white@vodafone.com`, `  │ Proceeding with deployment...`]);
        } else {
          // stream logs timed
          const perLog = step.durationMs / Math.max(step.logs.length, 1);
          for (const line of step.logs) {
            await new Promise((r) => setTimeout(r, perLog));
            if (line === '') {
              setVisibleLogs((prev) => [...prev, `  │`]);
            } else {
              setVisibleLogs((prev) => [...prev, `  │ ${line}`]);
            }
          }
        }

        setVisibleLogs((prev) => [...prev, `  └─ completed`]);
        setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s));

        await new Promise((r) => setTimeout(r, 200));
      }

      // done
      setResources(buildResources(scenario));
      runningRef.current = false;
      setTimeout(() => setPhase('complete'), 600);
    };

    runNext();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleApprove = () => {
    setAwaitingApproval(false);
    if ((window as any).__approvalResolve) {
      (window as any).__approvalResolve();
      (window as any).__approvalResolve = null;
    }
  };

  const reset = () => {
    runningRef.current = false;
    setPhase('select');
    setSteps([]);
    setVisibleLogs([]);
    setConfigDone(false);
    setElapsed(0);
  };

  const completedSteps = steps.filter((s) => s.status === 'success').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  /* ── Phase: select ── */
  if (phase === 'select') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 text-white" style={{ background: '#E60000' }}>
            ▶ LIVE DEMO
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>End-to-End Deployment Demo</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Watch a complete Terraform + GitHub Actions pipeline run in real time — from code checkout to live infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              onClick={() => setScenario(sc)}
              className="bg-white rounded-2xl p-6 cursor-pointer transition-all"
              style={{
                border: scenario.id === sc.id ? '2px solid #E60000' : '1px solid #E0E0E0',
                boxShadow: scenario.id === sc.id ? '0 0 0 4px #FFF0F0' : undefined,
              }}
            >
              <div className="text-4xl mb-4">{sc.icon}</div>
              <h3 className="font-bold text-base mb-2" style={{ color: '#1A1A1A' }}>{sc.name}</h3>
              <p className="text-gray-500 text-xs mb-4">{sc.description}</p>
              <div className="space-y-1 text-xs text-gray-400">
                <div>⏱ {sc.estimatedTime}</div>
                <div>💰 {sc.cost}</div>
                <div>🌍 {sc.region}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {sc.resources.map((r) => (
                  <span key={r} className="px-2 py-0.5 rounded text-xs" style={{ background: '#F4F4F4', color: '#666' }}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => { setConfigDone(true); setPhase('configure'); }}
            className="px-10 py-3.5 text-white text-sm font-bold rounded-xl shadow-lg transition-opacity hover:opacity-90"
            style={{ background: '#E60000' }}
          >
            Configure & Launch Demo →
          </button>
        </div>
      </div>
    );
  }

  /* ── Phase: configure ── */
  if (phase === 'configure') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">← Back</button>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#1A1A1A' }}>Review Configuration</h2>
        <p className="text-gray-500 text-sm mb-8">These values will be passed to the Terraform workflow.</p>

        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E0E0E0' }}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{scenario.icon}</span>
            <div>
              <p className="font-bold" style={{ color: '#1A1A1A' }}>{scenario.name}</p>
              <p className="text-xs text-gray-400">{scenario.projectId}</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Service Name', value: scenario.service, mono: true },
              { label: 'GCP Project', value: scenario.projectId, mono: true },
              { label: 'Region', value: scenario.region, mono: true },
              { label: 'Terraform Backend', value: `gs://vf-terraform-state/${scenario.projectId}`, mono: true },
              { label: 'Workflow Trigger', value: 'Manual dispatch (this demo)', mono: false },
              { label: 'Approval Required', value: 'Yes — architect role', mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #F4F4F4' }}>
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-medium ${mono ? 'font-mono' : ''}`} style={{ color: '#1A1A1A' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 mb-8" style={{ border: '1px solid #E0E0E0' }}>
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide text-gray-400">Resources to be created</p>
          <div className="grid grid-cols-2 gap-2">
            {scenario.resources.map((r) => (
              <div key={r} className="flex items-center gap-2 text-sm">
                <span style={{ color: '#E60000' }}>+</span>
                <span style={{ color: '#333' }}>{r}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={reset} className="px-6 py-3 rounded-xl text-sm font-medium border" style={{ borderColor: '#E0E0E0', color: '#666' }}>
            Cancel
          </button>
          <button
            onClick={startPipeline}
            className="flex-1 py-3 text-white text-sm font-bold rounded-xl shadow transition-opacity hover:opacity-90"
            style={{ background: '#E60000' }}
          >
            🚀 Start Deployment Pipeline
          </button>
        </div>
      </div>
    );
  }

  /* ── Phase: pipeline ── */
  if (phase === 'pipeline') {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{scenario.icon}</span>
              <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{scenario.service}</h2>
              {awaitingApproval ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">⏸ Awaiting Approval</span>
              ) : phase === 'pipeline' ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white animate-pulse" style={{ background: '#E60000' }}>● Running</span>
              ) : null}
            </div>
            <p className="text-xs text-gray-400">Triggered by: you • {scenario.projectId} • {new Date().toLocaleTimeString()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold" style={{ color: '#1A1A1A' }}>
              {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
            </p>
            <p className="text-xs text-gray-400">elapsed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{completedSteps} / {totalSteps} steps complete</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: '#E60000' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {/* Step list */}
          <div className="col-span-2 space-y-1">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  background: currentStepIdx === i ? '#FFF5F5' : 'white',
                  border: currentStepIdx === i ? '1px solid #E60000' : '1px solid #F0F0F0',
                }}
              >
                <StepIcon status={step.status} />
                <span
                  className="text-sm"
                  style={{
                    color: step.status === 'success' ? '#16a34a'
                          : step.status === 'running' ? '#E60000'
                          : step.status === 'waiting' ? '#999'
                          : '#1A1A1A',
                    fontWeight: currentStepIdx === i ? 600 : 400,
                  }}
                >
                  {step.name}
                </span>
              </div>
            ))}
          </div>

          {/* Log terminal */}
          <div className="col-span-3">
            <div className="rounded-2xl overflow-hidden h-full" style={{ background: '#0D1117' }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#161B22', borderBottom: '1px solid #30363D' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-400 ml-2 font-mono">deployment-pipeline.yml</span>
              </div>
              <div
                ref={logsRef}
                className="p-4 font-mono text-xs overflow-y-auto"
                style={{ height: '420px', color: '#C9D1D9' }}
              >
                <div className="text-green-400 mb-2">$ github-actions/deploy-pipeline@v3</div>
                {visibleLogs.map((line, i) => {
                  const color = line.includes('✓') || line.includes('complete') || line.includes('passed') || line.includes('installed')
                    ? '#3FB950'
                    : line.includes('Error') || line.includes('failed') || line.includes('✗')
                    ? '#F85149'
                    : line.includes('  +') || line.includes('Plan:') || line.includes('Apply complete')
                    ? '#79C0FF'
                    : line.includes('┌─') || line.includes('└─')
                    ? '#E3B341'
                    : '#C9D1D9';
                  return (
                    <div key={i} style={{ color, lineHeight: '1.6', whiteSpace: 'pre' }}>{line}</div>
                  );
                })}
                {(currentStepIdx >= 0 && steps[currentStepIdx]?.status === 'running' && !awaitingApproval) && (
                  <span className="animate-pulse" style={{ color: '#E60000' }}>▋</span>
                )}
              </div>
            </div>

            {/* Approval banner */}
            {awaitingApproval && (
              <div className="mt-4 p-4 rounded-2xl flex items-center justify-between" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <div>
                  <p className="font-semibold text-sm text-yellow-800">⏸ Approval Required</p>
                  <p className="text-xs text-yellow-600 mt-0.5">This deployment targets <strong>production</strong>. Review the Terraform plan above and approve to proceed.</p>
                </div>
                <button
                  onClick={handleApprove}
                  className="ml-4 px-5 py-2.5 text-white text-sm font-bold rounded-xl flex-shrink-0 transition-opacity hover:opacity-90"
                  style={{ background: '#16a34a' }}
                >
                  ✓ Approve
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Phase: complete ── */
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Success banner */}
      <div className="rounded-2xl p-6 mb-8 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #E60000 0%, #BD0000 100%)' }}>
        <div className="text-white">
          <p className="text-xl font-bold mb-1">🎉 Deployment Successful!</p>
          <p className="text-red-100 text-sm">{scenario.service} is live on {scenario.projectId} — {scenario.region}</p>
          <p className="text-red-200 text-xs mt-1">
            {totalSteps} steps · {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} total time
          </p>
        </div>
        <div className="text-white text-right">
          <p className="text-xs text-red-200 mb-1">Deployed by</p>
          <p className="font-semibold text-sm">You</p>
          <p className="text-xs text-red-200">Approved by carol.white</p>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E0E0E0' }}>
        <h3 className="text-sm font-bold mb-4 uppercase tracking-wide text-gray-400">Pipeline Summary</h3>
        <div className="flex flex-wrap gap-2">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: '#F0FFF4', color: '#16a34a' }}>
              <span>✓</span>
              <span>{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deployed resources */}
      <h3 className="text-sm font-bold mb-4 uppercase tracking-wide text-gray-400">Deployed Resources</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {resources.map((r) => (
          <div key={r.name} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #E0E0E0' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-white mb-2" style={{ background: '#E60000' }}>{r.type}</span>
                <p className="font-mono text-xs font-semibold" style={{ color: '#1A1A1A' }}>{r.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">🌍 {r.region}</p>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: '#F0FFF4', color: '#16a34a' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Healthy
              </span>
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F4F4F4' }}>
              <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{r.metric}</p>
              <p className="text-xs text-gray-400">{r.metricLabel}</p>
            </div>
            {r.url && (
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="mt-3 text-xs font-mono truncate block transition-colors hover:underline"
                style={{ color: '#E60000' }}
              >
                {r.url}
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 text-white text-sm font-bold rounded-xl transition-opacity hover:opacity-90"
          style={{ background: '#E60000' }}
        >
          ↺ Run Another Demo
        </button>
        <button
          className="px-6 py-3 text-sm font-medium rounded-xl border"
          style={{ borderColor: '#E0E0E0', color: '#666' }}
          onClick={() => alert('In production this would open the GCP Console')}
        >
          Open GCP Console ↗
        </button>
        <button
          className="px-6 py-3 text-sm font-medium rounded-xl border"
          style={{ borderColor: '#E0E0E0', color: '#666' }}
          onClick={() => alert('In production this would open the GitHub Actions run')}
        >
          View GitHub Actions ↗
        </button>
      </div>
    </div>
  );
};
