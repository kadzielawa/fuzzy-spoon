import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../lib/api';

/* ── Animated number counter hook ─────────────────────────────────────────── */
function useAnimatedNumber(target: number, durationMs = 600) {
  const [displayed, setDisplayed] = useState(target);
  const prev = useRef(target);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = prev.current;
    const delta = target - start;
    if (delta === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(start + delta * ease));
      if (t < 1) raf.current = requestAnimationFrame(animate);
      else { setDisplayed(target); prev.current = target; }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, durationMs]);
  return displayed;
}

/* ── Submission overlay phases ─────────────────────────────────────────────── */
const SUBMIT_PHASES = [
  { icon: '🔍', label: 'Validating configuration', sub: 'Checking building block compatibility…' },
  { icon: '🔗', label: 'Resolving building blocks', sub: 'Fetching module definitions from catalog API…' },
  { icon: '⚙️',  label: 'Generating Terraform code', sub: 'Writing main.tf, variables.tf with resource dependencies…' },
  { icon: '📦', label: 'Preparing tf variables', sub: 'Extracting variable declarations and defaults…' },
  { icon: '📄', label: 'Compiling terraform.tfvars', sub: 'Serialising project-specific values…' },
  { icon: '🚀', label: 'Raising GitHub Pull Request', sub: 'Opening PR on NGDI repo — GitHub Actions will run terraform plan…' },
];

const DEMO_PR_URL = 'https://github.com/VFGROUP-NSE-DNOSS/DNE-PE-NGDI-TERRAFORM-MODULES/pull/42';

const TERMINAL_LINES: string[][] = [
  ['$ terraform validate', '✓ Configuration is valid'],
  ['$ curl catalog-api/buildingblock/network', '→ 200 OK · module.network loaded', '→ source: git::https://github.com/VFGROUP-NSE-DNOSS/DNE-PE-NGDI-TERRAFORM-MODULES'],
  ['$ resolver generate main.tf variables.tf', 'module "network" {', '  source  = "git::https://github.com/…//network"', '  version = "~> 2.1.0"', '}'],
  ['$ extract variables', '→ variable "project_id" { type = string }', '→ variable "region"    { type = string }', '→ 12 variables extracted'],
  ['$ write terraform.tfvars', 'project_id = "' + '${PROJECT}' + '"', 'region     = "europe-west3"'],
  ['$ gh pr create --repo VFGROUP-NSE-DNOSS/DNE-PE-NGDI-TERRAFORM-MODULES', '→ Pushing branch infra/request-cloud-run-…', '→ PR #42 opened · GitHub Actions triggered', '→ terraform plan will run on PR merge ✓'],
];

const SubmitOverlay: React.FC<{ projectName: string }> = ({ projectName }) => {
  const [phase, setPhase] = useState(0);
  const [termLines, setTermLines] = useState<string[]>([]);
  const [termIdx, setTermIdx] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    // Advance phases
    const advance = () => {
      setPhase((p) => {
        const next = Math.min(p + 1, SUBMIT_PHASES.length - 1);
        setBarWidth(((next + 1) / SUBMIT_PHASES.length) * 100);
        return next;
      });
    };
    const timers = SUBMIT_PHASES.map((_, i) => setTimeout(advance, i * 1800 + 600));
    setBarWidth((1 / SUBMIT_PHASES.length) * 100);
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Stream terminal lines for current phase
    const lines = (TERMINAL_LINES[phase] || []).filter(Boolean);
    let i = 0;
    setTermLines([]);
    const interval = setInterval(() => {
      if (i < lines.length) {
        setTermLines((prev) => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase]);

  const current = SUBMIT_PHASES[phase];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Top label */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Raising PR for</p>
          <p style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700 }}>{projectName || 'your pattern'}</p>
        </div>

        {/* Phase card */}
        <div style={{ background: '#1e293b', borderRadius: '16px', padding: '1.75rem 2rem', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ fontSize: '2rem', flexShrink: 0, animation: 'vf-spin-slow 3s linear infinite' }}>{current.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{current.label}</p>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{current.sub}</p>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0,1,2].map((i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#E60000', opacity: 0.4 + i * 0.3, animation: `vf-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#1e293b', borderRadius: '8px', height: '6px', overflow: 'hidden', border: '1px solid #334155' }}>
          <div style={{ height: '100%', width: `${barWidth}%`, background: 'linear-gradient(90deg,#E60000,#ff6b6b)', borderRadius: '8px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 0 10px rgba(230,0,0,0.5)' }} />
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {SUBMIT_PHASES.map((p, i) => (
            <div key={i} title={p.label} style={{ width: i === phase ? 20 : 8, height: 8, borderRadius: '4px', background: i <= phase ? '#E60000' : '#334155', transition: 'all 0.4s ease', opacity: i < phase ? 0.5 : 1 }} />
          ))}
        </div>

        {/* Mini terminal */}
        <div style={{ background: '#0D1117', borderRadius: '12px', border: '1px solid #30363d', overflow: 'hidden' }}>
          <div style={{ background: '#161b22', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #30363d' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            <span style={{ marginLeft: '0.5rem', color: '#8b949e', fontSize: '0.72rem', fontFamily: 'monospace' }}>resolver — generating Terraform &amp; opening PR on NGDI repo</span>
          </div>
          <div style={{ padding: '0.75rem 1rem', minHeight: '80px', maxHeight: '120px', overflow: 'hidden', fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: '1.7' }}>
            {termLines.map((line, i) => (
              <div key={i} style={{ color: line?.startsWith('$') ? '#58a6ff' : line?.startsWith('→') ? '#3fb950' : line?.startsWith('✓') ? '#3fb950' : '#e6edf3', animation: 'vf-fadein 0.3s ease' }}>{line}</div>
            ))}
            <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#E60000', marginLeft: '2px', animation: 'vf-blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.72rem' }}>Phase {phase + 1} of {SUBMIT_PHASES.length} · Resolver → Catalog API → Terraform files → GitHub PR</p>
      </div>

      <style>{`
        @keyframes vf-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes vf-blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes vf-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        @keyframes vf-spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

interface Variable {
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

interface BuildingBlock {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  variables: Variable[];
  outputs: Array<{ name: string; description: string; type: string }>;
  dependencies: string[];
  tags: string[];
}

interface Project {
  id: string;
  name: string;
  projectNumber: string;
  region: string;
}

interface Template {
  id: string;
  label: string;
  description?: string;
  tags?: string[];
  lifecycle?: string;
  owner?: string;
  runtimeType?: string;
  buildingBlocks?: any;
  links?: Array<{ title: string; url: string }>;
}

interface DeploymentConfigV2Props {
  userId: string;
  templateId: string;
  onDeploymentCreated: (deploymentId: string) => void;
  onCancel: () => void;
}

/* ── GCP Regions catalogue ─────────────────────────────────────────────── */
const GCP_REGIONS: { value: string; label: string; flag: string; zone: string }[] = [
  // Europe
  { value: 'europe-west1',        label: 'Belgium',            flag: '🇧🇪', zone: 'Europe'        },
  { value: 'europe-west2',        label: 'London',             flag: '🇬🇧', zone: 'Europe'        },
  { value: 'europe-west3',        label: 'Frankfurt',          flag: '🇩🇪', zone: 'Europe'        },
  { value: 'europe-west4',        label: 'Netherlands',        flag: '🇳🇱', zone: 'Europe'        },
  { value: 'europe-west6',        label: 'Zürich',             flag: '🇨🇭', zone: 'Europe'        },
  { value: 'europe-west8',        label: 'Milan',              flag: '🇮🇹', zone: 'Europe'        },
  { value: 'europe-west9',        label: 'Paris',              flag: '🇫🇷', zone: 'Europe'        },
  { value: 'europe-west10',       label: 'Berlin',             flag: '🇩🇪', zone: 'Europe'        },
  { value: 'europe-west12',       label: 'Turin',              flag: '🇮🇹', zone: 'Europe'        },
  { value: 'europe-central2',     label: 'Warsaw',             flag: '🇵🇱', zone: 'Europe'        },
  { value: 'europe-north1',       label: 'Finland',            flag: '🇫🇮', zone: 'Europe'        },
  { value: 'europe-southwest1',   label: 'Madrid',             flag: '🇪🇸', zone: 'Europe'        },
  // Americas
  { value: 'us-central1',         label: 'Iowa',               flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-east1',            label: 'South Carolina',     flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-east4',            label: 'Northern Virginia',  flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-east5',            label: 'Columbus',           flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-south1',           label: 'Dallas',             flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-west1',            label: 'Oregon',             flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-west2',            label: 'Los Angeles',        flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-west3',            label: 'Salt Lake City',     flag: '🇺🇸', zone: 'Americas'      },
  { value: 'us-west4',            label: 'Las Vegas',          flag: '🇺🇸', zone: 'Americas'      },
  { value: 'northamerica-northeast1', label: 'Montréal',       flag: '🇨🇦', zone: 'Americas'      },
  { value: 'northamerica-northeast2', label: 'Toronto',        flag: '🇨🇦', zone: 'Americas'      },
  { value: 'southamerica-east1',  label: 'São Paulo',          flag: '🇧🇷', zone: 'Americas'      },
  { value: 'southamerica-west1',  label: 'Santiago',           flag: '🇨🇱', zone: 'Americas'      },
  // Asia Pacific
  { value: 'asia-east1',          label: 'Taiwan',             flag: '🇹🇼', zone: 'Asia Pacific'  },
  { value: 'asia-east2',          label: 'Hong Kong',          flag: '🇭🇰', zone: 'Asia Pacific'  },
  { value: 'asia-northeast1',     label: 'Tokyo',              flag: '🇯🇵', zone: 'Asia Pacific'  },
  { value: 'asia-northeast2',     label: 'Osaka',              flag: '🇯🇵', zone: 'Asia Pacific'  },
  { value: 'asia-northeast3',     label: 'Seoul',              flag: '🇰🇷', zone: 'Asia Pacific'  },
  { value: 'asia-south1',         label: 'Mumbai',             flag: '🇮🇳', zone: 'Asia Pacific'  },
  { value: 'asia-south2',         label: 'Delhi',              flag: '🇮🇳', zone: 'Asia Pacific'  },
  { value: 'asia-southeast1',     label: 'Singapore',          flag: '🇸🇬', zone: 'Asia Pacific'  },
  { value: 'asia-southeast2',     label: 'Jakarta',            flag: '🇮🇩', zone: 'Asia Pacific'  },
  { value: 'australia-southeast1',label: 'Sydney',             flag: '🇦🇺', zone: 'Asia Pacific'  },
  { value: 'australia-southeast2',label: 'Melbourne',          flag: '🇦🇺', zone: 'Asia Pacific'  },
  // Middle East & Africa
  { value: 'me-central1',         label: 'Doha',               flag: '🇶🇦', zone: 'Middle East'   },
  { value: 'me-central2',         label: 'Dammam',             flag: '🇸🇦', zone: 'Middle East'   },
  { value: 'me-west1',            label: 'Tel Aviv',           flag: '🇮🇱', zone: 'Middle East'   },
  { value: 'africa-south1',       label: 'Johannesburg',       flag: '🇿🇦', zone: 'Africa'        },
];

/* ── RegionPicker combobox ─────────────────────────────────────────────── */
const RegionPicker: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = GCP_REGIONS.find((r) => r.value === value);

  const filtered = query.trim()
    ? GCP_REGIONS.filter(
        (r) =>
          r.value.includes(query.toLowerCase()) ||
          r.label.toLowerCase().includes(query.toLowerCase()) ||
          r.zone.toLowerCase().includes(query.toLowerCase())
      )
    : GCP_REGIONS;

  // Group by zone
  const grouped = filtered.reduce<Record<string, typeof GCP_REGIONS>>((acc, r) => {
    if (!acc[r.zone]) acc[r.zone] = [];
    acc[r.zone].push(r);
    return acc;
  }, {});

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (regionValue: string) => {
    onChange(regionValue);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
        style={{
          border: open ? '1.5px solid #E60000' : '1px solid #E2E8F0',
          background: disabled ? '#f8fafc' : 'white',
          color: disabled ? '#94a3b8' : '#0f172a',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {selected ? (
            <>
              <span style={{ fontSize: '1.1rem' }}>{selected.flag}</span>
              <span style={{ fontWeight: 600 }}>{selected.value}</span>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{selected.label}</span>
            </>
          ) : (
            <span style={{ color: '#94a3b8' }}>Select a GCP region…</span>
          )}
        </span>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', borderRadius: '12px', zIndex: 999,
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.4rem 0.75rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🔍</span>
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search region or city…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.82rem', color: '#0f172a', background: 'transparent' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {Object.keys(grouped).length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>No regions match "{query}"</div>
            ) : (
              Object.entries(grouped).map(([zone, regions]) => (
                <div key={zone}>
                  <div style={{ padding: '0.35rem 1rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', background: '#f8fafc', textTransform: 'uppercase' }}>{zone}</div>
                  {regions.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleSelect(r.value)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '0.55rem 1rem',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: r.value === value ? '#fff5f5' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        borderLeft: r.value === value ? '3px solid #E60000' : '3px solid transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { if (r.value !== value) (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; }}
                      onMouseLeave={(e) => { if (r.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{r.flag}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{r.value}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>{r.label}</span>
                      </span>
                      {r.value === value && <span style={{ color: '#E60000', fontSize: '0.8rem' }}>✓</span>}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type PageState = 'project' | 'blocks' | 'review' | 'submitted';

export const DeploymentConfigV2: React.FC<DeploymentConfigV2Props> = ({
  userId,
  templateId,
  onDeploymentCreated,
  onCancel,
}) => {
  const [pattern, setPattern] = useState<Template | null>(null);
  const [requiredBlocks, setRequiredBlocks] = useState<BuildingBlock[]>([]);
  const [optionalBlocks, setOptionalBlocks] = useState<BuildingBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectNameInput, setProjectNameInput] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('europe-west3');
  const [currentPage, setCurrentPage] = useState<PageState>('project');
  const [activeBlockTab, setActiveBlockTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string>('');
  const [estimatedMonthlyCost, setEstimatedMonthlyCost] = useState<number>(0);
  const [prevCost, setPrevCost] = useState<number>(0);
  const [costDelta, setCostDelta] = useState<number>(0);
  const [showDelta, setShowDelta] = useState(false);
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatedCost = useAnimatedNumber(estimatedMonthlyCost);

  // Block configurations: Record<blockId, Record<variableName, value>>
  const [blockConfigs, setBlockConfigs] = useState<Record<string, Record<string, any>>>({});
  // Per-block live variable definitions from catalog API
  const [blockApiVars, setBlockApiVars] = useState<Record<string, Variable[]>>({});
  const [blockFetchStatus, setBlockFetchStatus] = useState<Record<string, 'idle' | 'loading' | 'live' | 'fallback'>>({});
  const fetchedBlocks = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchPatternAndBlocks();
    fetchProjects();
  }, [templateId, userId]);

  // Eager-fetch live variable definitions for ALL blocks as soon as blocks are loaded
  useEffect(() => {
    const allB = [...requiredBlocks, ...optionalBlocks];
    if (allB.length === 0) return;
    for (const block of allB) {
      if (fetchedBlocks.current.has(block.id)) continue;
      fetchedBlocks.current.add(block.id);
      setBlockFetchStatus((prev) => ({ ...prev, [block.id]: 'loading' }));
      api.catalogs.buildingBlocks.get(block.id)
        .then((liveBlock: BuildingBlock) => {
          const vars: Variable[] = (liveBlock.variables || []).filter((v) => v.name !== 'project_id');
          setBlockApiVars((prev) => ({ ...prev, [block.id]: vars }));
          setBlockFetchStatus((prev) => ({ ...prev, [block.id]: 'live' }));
          // Pre-fill defaults from live API if not already touched by user
          setBlockConfigs((prev) => {
            const existing = prev[block.id] || {};
            const filled: Record<string, any> = {};
            for (const v of vars) {
              if (v.name === 'region') { filled[v.name] = selectedRegion; continue; }
              filled[v.name] = existing[v.name] !== undefined ? existing[v.name] : (v.default ?? '');
            }
            return { ...prev, [block.id]: filled };
          });
        })
        .catch(() => {
          setBlockFetchStatus((prev) => ({ ...prev, [block.id]: 'fallback' }));
        });
    }
  }, [requiredBlocks, optionalBlocks]);

  const fetchPatternAndBlocks = async () => {
    try {
      if (!templateId.startsWith('pat-')) {
        throw new Error('Invalid pattern ID');
      }

      // Fetch pattern details
      const patternData = await api.catalogs.patterns.get(templateId);
      setPattern({
        id: patternData.id,
        label: patternData.metadata.title,
        description: patternData.metadata.description,
        tags: patternData.metadata.tags,
        lifecycle: patternData.metadata.lifecycle,
        owner: patternData.metadata.owner,
        runtimeType: patternData.metadata.runtimeType,
        buildingBlocks: patternData.metadata.buildingBlocks,
        links: patternData.metadata.links,
      });

      // Fetch building blocks for this pattern
      const blocksData = await api.catalogs.patterns.blocks(templateId);
      setRequiredBlocks(blocksData.requiredBlocks);
      setOptionalBlocks(blocksData.optionalBlocks || []);

      // Initialize block configurations with defaults
      const configs: Record<string, Record<string, any>> = {};
      for (const block of blocksData.requiredBlocks) {
        configs[block.id || block] = {};
        if (block.variables && Array.isArray(block.variables)) {
          for (const variable of block.variables) {
            configs[block.id][variable.name] = variable.default ?? '';
          }
        }
      }
      setBlockConfigs(configs);
      
      // Calculate estimated cost (mock calculation)
      calculateEstimatedCost(blocksData.requiredBlocks, []);
    } catch (error) {
      console.error('Failed to fetch pattern and blocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Cost drivers: block var changes that affect price ───────────────────
  const COST_DRIVERS: Record<string, Record<string, (v: any) => number>> = {
    sql:         { disk_size_gb: (v) => Math.max(0, Number(v) - 10) * 0.1,
                   high_availability: (v) => v ? 40 : 0,
                   backup_enabled:    (v) => v ? 5  : 0 },
    network:     { nat_enabled:       (v) => v ? 8  : 0 },
    environment: { node_count:        (v) => (Number(v) || 1) * 120,
                   disk_size_gb:      (v) => Math.max(0, Number(v) - 50) * 0.15 },
    bucket:      { versioning:        (v) => v ? 3  : 0,
                   storage_class:     (v) => v === 'STANDARD' ? 20 : v === 'NEARLINE' ? 12 : 8 },
  };

  const calculateEstimatedCost = (blocks: BuildingBlock[], configs: Array<{id: string; vars: Record<string, any>}>) => {
    // Mock pricing: each block has a base cost + variable costs
    const baseCosts: Record<string, number> = {
      network: 30,
      iam: 0,
      security_policy: 50,
      sql: 80,
      bigquery: 100,
      bucket: 40,
      environment: 400,
      keys: 25,
    };
    
    let total = 0;
    for (const block of blocks) {
      total += baseCosts[block.id] || 0;
      const drivers = COST_DRIVERS[block.id];
      if (drivers) {
        const cfg = configs.find((c) => c.id === block.id)?.vars || {};
        for (const [varName, fn] of Object.entries(drivers)) {
          if (cfg[varName] !== undefined) total += fn(cfg[varName]);
        }
      }
    }
    
    setEstimatedMonthlyCost((prev) => {
      const delta = total - prev;
      if (delta !== 0) {
        setCostDelta(delta);
        setShowDelta(true);
        if (deltaTimer.current) clearTimeout(deltaTimer.current);
        deltaTimer.current = setTimeout(() => setShowDelta(false), 2000);
      }
      return total;
    });
  };

  // Helper function to check if a block has unfilled required fields
  const hasUnfilledRequired = (blockId: string): boolean => {
    const block = requiredBlocks.find((b) => b.id === blockId) || optionalBlocks.find((b) => b.id === blockId);
    if (!block || !block.variables) return false;
    
    return block.variables.some(
      (v) => v.required && (!blockConfigs[blockId]?.[v.name] || blockConfigs[blockId][v.name] === '')
    );
  };

  // Get all blocks (both required and optional)
  const allBlocks = [...requiredBlocks, ...optionalBlocks];
  const allBlocksWithUnfilled = allBlocks.map((block) => ({
    ...block,
    hasUnfilled: hasUnfilledRequired(block.id),
  }));

  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleBlockVarChange = (blockId: string, varName: string, value: any) => {
    setBlockConfigs((prev) => {
      const next = { ...prev, [blockId]: { ...prev[blockId], [varName]: value } };
      // Recalculate cost with updated configs
      const allB = [...requiredBlocks, ...optionalBlocks];
      const cfgArr = Object.entries(next).map(([id, vars]) => ({ id, vars }));
      calculateEstimatedCost(allB, cfgArr);
      return next;
    });
  };

  // Auto-fill region for all blocks (project_id is NOT passed to blocks — it's a global param)
  const autoFillProjectId = (projectId: string, region?: string) => {
    const updatedConfigs: Record<string, Record<string, any>> = {};
    for (const block of requiredBlocks) {
      updatedConfigs[block.id] = { ...blockConfigs[block.id] };
      if (region && block.variables.find((v) => v.name === 'region')) {
        updatedConfigs[block.id]['region'] = region;
      }
    }
    setBlockConfigs(updatedConfigs);
  };

  const autoFillRegion = (region: string) => {
    setBlockConfigs((prev) => {
      const next = { ...prev };
      for (const block of requiredBlocks) {
        if (block.variables.find((v) => v.name === 'region')) {
          next[block.id] = { ...next[block.id], region };
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedProject || !pattern) return;

    setIsSubmitting(true);
    try {
      // Prepare building_blocks payload
      const building_blocks: Record<string, any> = {};
      for (const block of allBlocks) {
        const config = blockConfigs[block.id] || {};
        // Filter out empty/default values, keep only user-configured values
        const filteredConfig = Object.entries(config)
          .filter(([key, value]) => {
            // Keep non-empty, non-project_id values
            if (key === 'project_id') return false;
            if (value === '' || value === null || value === undefined) return false;
            return true;
          })
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as Record<string, any>);
        
        building_blocks[block.id] = filteredConfig;
      }

      // Create deployment payload
      const deploymentPayload = {
        patternId: pattern.id,
        projectId: selectedProject,
        projectName: projectNameInput || currentProject?.name,
        region: selectedRegion,
        building_blocks,
        estimatedMonthlyCost,
      };

      // Submit to pattern deployment endpoint
      const response = await api.deployments.patterns.submit(deploymentPayload);

      if (response.deploymentId) {
        setDeploymentId(response.deploymentId);
        setCurrentPage('submitted');
        setTimeout(() => {
          onDeploymentCreated(response.deploymentId);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit pattern deployment:', error);
      alert('Failed to submit pattern deployment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProject);
  const currentBlock = allBlocks[activeBlockTab];
  const requiredBlocksCount = requiredBlocks.length;
  const totalBlocksCount = allBlocks.length;

  if (isLoading) {
    return <div className="p-8 text-center">Loading pattern configuration...</div>;
  }

  if (isSubmitting) {
    return <SubmitOverlay projectName={projectNameInput || currentProject?.name || pattern?.label || ''} />;
  }

  if (!pattern) {
    return <div className="p-8 text-center text-red-600">Failed to load pattern</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8 px-8">
      <style>{`@keyframes vf-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      {/* Header with Pattern Info */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0F172A' }}>
          Deploy {pattern.label}
        </h1>
        <p className="text-gray-600">{pattern.description}</p>
      </div>

      {/* Progress Indicator */}
      {currentPage === 'blocks' && (
        <div className="mb-8 p-6 rounded-2xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Step 2 of 3: Configure Building Blocks</p>
              <p className="text-xs text-gray-600 mt-2">
                {activeBlockTab + 1} of {totalBlocksCount} blocks
                {requiredBlocksCount < totalBlocksCount && ` (${requiredBlocksCount} required, ${totalBlocksCount - requiredBlocksCount} optional)`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Monthly Estimate</p>
              <p className="text-lg font-bold text-green-600 mt-2">${estimatedMonthlyCost}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full text-white font-bold"
            style={{ background: currentPage !== 'project' ? '#4CAF50' : '#E60000' }}
          >
            {currentPage !== 'project' ? '✓' : '1'}
          </div>
          <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
            Project
          </span>

          <div
            className="h-1 flex-1 rounded-full"
            style={{ background: currentPage !== 'project' ? '#E60000' : '#E2E8F0', maxWidth: '100px', minWidth: '40px' }}
          />

          <div
            className="flex items-center justify-center w-10 h-10 rounded-full text-white font-bold"
            style={{ background: currentPage === 'review' || currentPage === 'submitted' ? '#4CAF50' : '#E60000' }}
          >
            {currentPage === 'review' || currentPage === 'submitted' ? '✓' : '2'}
          </div>
          <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
            Configure Blocks
          </span>

          <div
            className="h-1 flex-1 rounded-full"
            style={{
              background: currentPage === 'submitted' ? '#E60000' : '#E2E8F0',
              maxWidth: '100px',
              minWidth: '40px'
            }}
          />

          <div
            className="flex items-center justify-center w-10 h-10 rounded-full text-white font-bold"
            style={{
              background: currentPage === 'submitted' ? '#4CAF50' : '#E2E8F0',
              color: currentPage === 'submitted' ? 'white' : '#94A3B8',
            }}
          >
            {currentPage === 'submitted' ? '✓' : '3'}
          </div>
          <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
            Review
          </span>
        </div>
      </div>

      {/* Step 1: Project Selection */}
      {currentPage === 'project' && (
        <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid #E2E8F0' }}>
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
              Request Infrastructure
            </h2>
            <p className="text-gray-600 mb-8">Select your GCP project — a PR will be raised on the NGDI repo with generated Terraform files</p>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8 mb-10">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-xl" style={{ background: '#E60000' }}>
                  <span className="text-white text-xl">📋</span>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold" style={{ color: '#0F172A' }}>
                    {pattern.label}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{pattern.description}</p>
                  {pattern.runtimeType && (
                    <p className="text-sm text-gray-600 mt-3">
                      <strong>Runtime Type:</strong> {pattern.runtimeType}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                  GCP Project <span style={{ color: '#E60000' }}>*</span>
                </span>
                <p className="text-xs text-gray-600 mt-1">Select the project where resources will be deployed</p>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    const proj = projects.find((p) => p.id === e.target.value);
                    setSelectedProject(e.target.value);
                    if (proj && !projectNameInput) setProjectNameInput(proj.name);
                    autoFillProjectId(e.target.value, selectedRegion);
                  }}
                  className="mt-3 w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 transition-all"
                  style={{ border: '1px solid #E2E8F0' }}
                >
                  <option value="">Choose a project...</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                  Project Display Name <span style={{ color: '#64748B', fontWeight: 400 }}>(optional override)</span>
                </span>
                <p className="text-xs text-gray-600 mt-1">Customise the name shown in the portal and Terraform outputs</p>
                <input
                  type="text"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  placeholder={currentProject?.name || 'e.g. NGDI Fraud Detection Platform'}
                  className="mt-3 w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1px solid #E2E8F0' }}
                />
              </label>

              <div>
                <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                  GCP Region <span style={{ color: '#E60000' }}>*</span>
                </span>
                <p className="text-xs text-gray-600 mt-1 mb-3">Region where infrastructure will be provisioned</p>
                <RegionPicker
                  value={selectedRegion}
                  onChange={(r) => {
                    setSelectedRegion(r);
                    autoFillRegion(r);
                  }}
                />
              </div>
            </div>

            <div className="mt-10 flex gap-4 justify-between">
              <button
                onClick={onCancel}
                className="px-6 py-3 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E0E0E0' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setCurrentPage('blocks')}
                disabled={!selectedProject}
                className="px-8 py-3 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ background: '#E60000' }}
              >
                Configure Building Blocks →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure Building Blocks */}
      {currentPage === 'blocks' && currentProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns wide */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            {/* Block Tabs Header */}
            <div className="border-b px-8 py-6" style={{ borderColor: '#E2E8F0' }}>
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>
                Building Blocks
              </h2>
              <p className="text-xs text-gray-600 mt-2">
                {activeBlockTab + 1} of {totalBlocksCount} blocks
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="px-8 overflow-x-auto border-b" style={{ borderColor: '#E2E8F0' }}>
              <div className="flex gap-2 py-5">
                {allBlocks.map((block, idx) => {
                  const isRequired = requiredBlocks.some((b) => b.id === block.id);
                  const hasUnfilled = allBlocksWithUnfilled[idx]?.hasUnfilled;
                  
                  return (
                    <button
                      key={`block-${idx}`}
                      onClick={() => setActiveBlockTab(idx)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all flex items-center gap-2 ${
                        activeBlockTab === idx
                          ? 'text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                      style={{
                        background: 
                          activeBlockTab === idx 
                            ? '#E60000' 
                            : isRequired 
                              ? '#f3f4f6' 
                              : '#e8e8e8',
                      }}
                      title={isRequired ? 'Required' : 'Optional'}
                    >
                      {block.displayName}
                      {hasUnfilled && isRequired && (
                        <span className="text-red-500 font-bold">*</span>
                      )}
                      {!isRequired && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                          opt
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Block Content */}
            <div className="p-8 space-y-8">
              {currentBlock && (
                <div className="space-y-6">
                  {/* Block Info Card */}
                  <div 
                    className="p-6 rounded-xl border"
                    style={{
                      background: requiredBlocks.some((b) => b.id === currentBlock.id) ? '#FFF5F5' : '#FEF3C7',
                      borderColor: requiredBlocks.some((b) => b.id === currentBlock.id) ? '#FFE6E6' : '#FCD34D'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚙️</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                            {currentBlock.displayName}
                          </p>
                          {!requiredBlocks.some((b) => b.id === currentBlock.id) && (
                            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                              Optional
                            </span>
                          )}
                          {/* Catalog API fetch status badge */}
                          {blockFetchStatus[currentBlock.id] === 'loading' && (
                            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'vf-blink 1s step-end infinite' }} />
                              fetching from catalog API…
                            </span>
                          )}
                          {blockFetchStatus[currentBlock.id] === 'live' && (
                            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                              ✓ live · catalog-api/{currentBlock.id}
                            </span>
                          )}
                          {blockFetchStatus[currentBlock.id] === 'fallback' && (
                            <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}>
                              ⚠ offline · using cached schema
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{currentBlock.description}</p>
                        {currentBlock.dependencies && currentBlock.dependencies.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            <strong>Depends on:</strong> {currentBlock.dependencies.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Variables Form */}
                  {blockFetchStatus[currentBlock.id] === 'loading' ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-3 rounded animate-pulse" style={{ background: '#e2e8f0', width: `${40 + i * 10}%` }} />
                          <div className="h-2 rounded animate-pulse" style={{ background: '#f1f5f9', width: '70%' }} />
                          <div className="h-11 rounded-lg animate-pulse" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                        </div>
                      ))}
                      <p className="text-xs text-center" style={{ color: '#94a3b8' }}>Loading variable schema from catalog-api/{currentBlock.id}…</p>
                    </div>
                  ) : (
                  <div className="max-h-[500px] overflow-y-auto space-y-6 pr-4">
                    {/* Global params banner */}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
                      <span>🔒</span>
                      <span><strong>project_id</strong> (<code style={{ background: '#f1f5f9', padding: '0 3px', borderRadius: 3 }}>{selectedProject}</code>) and <strong>region</strong> are shared across all blocks and set globally above.</span>
                    </div>

                    {(blockApiVars[currentBlock.id] || currentBlock.variables?.filter(v => v.name !== 'project_id') || []).map((variable) => {
                      const fieldId = `${currentBlock.id}-${variable.name}`;
                      const typeLabel = variable.type === 'boolean' ? 'bool' : variable.type === 'number' ? 'number' : variable.validation?.allowed_values ? 'enum' : 'string';
                      const hasAllowed = !!(variable.validation?.allowed_values?.length);
                      const val = blockConfigs[currentBlock.id]?.[variable.name];
                      return (
                    <div key={variable.name} className="space-y-1">
                      <label htmlFor={fieldId}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                            {variable.name}
                          </span>
                          <code style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>{typeLabel}</code>
                          {variable.required && <span className="text-xs font-bold" style={{ color: '#E60000' }}>required</span>}
                          {variable.default !== undefined && variable.default !== '' && (
                            <span className="text-xs" style={{ color: '#94a3b8' }}>default: <code style={{ background: '#f8fafc', padding: '0 3px', borderRadius: 3 }}>{String(variable.default)}</code></span>
                          )}
                        </div>
                        {variable.description && (
                          <p className="text-xs mb-2" style={{ color: '#64748b' }}>{variable.description}</p>
                        )}

                        {/* Region field — use RegionPicker */}
                        {variable.name === 'region' && (
                          <RegionPicker
                            value={val || selectedRegion}
                            onChange={(r) => handleBlockVarChange(currentBlock.id, variable.name, r)}
                            disabled={false}
                          />
                        )}

                        {/* Enum / allowed values → select */}
                        {variable.name !== 'region' && hasAllowed && (
                          <select
                            id={fieldId}
                            value={val || ''}
                            onChange={(e) => handleBlockVarChange(currentBlock.id, variable.name, e.target.value)}
                            disabled={false}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 outline-none transition-all"
                            style={{ border: '1px solid #E0E0E0' }}
                          >
                            <option value="">Select…</option>
                            {variable.validation!.allowed_values!.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {/* Boolean → toggle */}
                        {variable.type === 'boolean' && !hasAllowed && variable.name !== 'region' && (
                          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#F9F9F9', border: '1px solid #E0E0E0' }}>
                            <input
                              id={fieldId}
                              type="checkbox"
                              checked={!!val}
                              onChange={(e) => handleBlockVarChange(currentBlock.id, variable.name, e.target.checked)}
                              disabled={false}
                              className="w-5 h-5 rounded cursor-pointer"
                              style={{ accentColor: '#E60000' }}
                            />
                            <span className="text-sm" style={{ color: '#1A1A1A' }}>
                              {val ? 'Enabled' : 'Disabled'}{variable.default !== undefined ? ` (default: ${variable.default})` : ''}
                            </span>
                          </div>
                        )}

                        {/* Number → number input */}
                        {variable.type === 'number' && !hasAllowed && variable.name !== 'region' && (
                          <input
                            id={fieldId}
                            type="number"
                            value={val ?? ''}
                            onChange={(e) => handleBlockVarChange(currentBlock.id, variable.name, e.target.value ? parseInt(e.target.value) : '')}
                            disabled={false}
                            min={variable.validation?.min}
                            max={variable.validation?.max}
                            placeholder={variable.default !== undefined ? `Default: ${variable.default}` : ''}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 outline-none transition-all"
                            style={{ border: '1px solid #E0E0E0' }}
                          />
                        )}

                        {/* String → text input (catch-all) */}
                        {variable.type !== 'boolean' && variable.type !== 'number' && !hasAllowed && variable.name !== 'region' && (
                          <input
                            id={fieldId}
                            type="text"
                            value={val || ''}
                            onChange={(e) => handleBlockVarChange(currentBlock.id, variable.name, e.target.value)}
                            disabled={false}
                            placeholder={variable.default !== undefined ? `Default: ${variable.default}` : `Enter ${variable.name}…`}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 outline-none transition-all"
                            style={{ border: '1px solid #E0E0E0' }}
                          />
                        )}
                      </label>
                    </div>
                    );
                    })}
                  </div>
                  )} {/* end loading conditional */}

                {/* Navigation Buttons */}
                <div className="mt-10 pt-8 border-t flex gap-3 justify-between" style={{ borderColor: '#E0E0E0' }}>
                  <div className="flex gap-3">
                    {activeBlockTab > 0 && (
                      <button
                        onClick={() => setActiveBlockTab((prev) => prev - 1)}
                        className="px-5 py-3 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#E0E0E0' }}
                      >
                        ← Previous
                      </button>
                    )}
                    {activeBlockTab < totalBlocksCount - 1 && (
                      <button
                        onClick={() => setActiveBlockTab((prev) => prev + 1)}
                        className="px-5 py-3 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#E0E0E0' }}
                      >
                        Next →
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentPage('project')}
                      className="px-5 py-3 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E0E0E0' }}
                    >
                      ← Back to Project
                    </button>
                    <button
                      onClick={() => setCurrentPage('review')}
                      className="px-7 py-3 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg"
                      style={{ background: '#E60000' }}
                    >
                      Review →
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Sidebar - Pricing & Info */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-white rounded-2xl shadow-sm p-8 sticky top-6" style={{ border: '1px solid #E2E8F0' }}>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#0F172A' }}>
                Pricing Estimate
              </h3>
              
              <div className="space-y-5 mb-8">
                <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                  <p className="text-xs text-gray-600 mb-2">Monthly Estimate</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <p className="text-3xl font-bold text-green-600" style={{ fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s' }}>${animatedCost}</p>
                    {showDelta && (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px',
                        background: costDelta > 0 ? '#fef2f2' : '#f0fdf4',
                        color: costDelta > 0 ? '#dc2626' : '#16a34a',
                        border: `1px solid ${costDelta > 0 ? '#fecaca' : '#bbf7d0'}`,
                        animation: 'vf-fadein 0.3s ease',
                      }}>
                        {costDelta > 0 ? '+' : ''}{costDelta > 0 ? Math.ceil(costDelta) : Math.floor(costDelta)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.25rem' }}>Updates as you configure blocks</p>
                </div>

                <div className="p-4 rounded-lg border" style={{ background: '#F0FFF4', borderColor: '#C6F6D5' }}>
                  <p className="text-xs text-gray-700 mb-3">Resources:</p>
                  <div className="space-y-3">
                    {requiredBlocks.map((block) => {
                      const blockCosts: Record<string, number> = {
                        network: 30, iam: 0, security_policy: 50, sql: 80,
                        bigquery: 100, bucket: 40, environment: 400, keys: 25,
                      };
                      const drivers = COST_DRIVERS[block.id];
                      const cfg = blockConfigs[block.id] || {};
                      let varExtra = 0;
                      if (drivers) {
                        for (const [varName, fn] of Object.entries(drivers)) {
                          if (cfg[varName] !== undefined) varExtra += fn(cfg[varName]);
                        }
                      }
                      const blockTotal = (blockCosts[block.id] || 0) + varExtra;
                      return (
                        <div key={block.id} className="flex justify-between text-xs" style={{ padding: '0.25rem 0', borderBottom: '1px solid #e2e8f0' }}>
                          <span className="text-gray-700">{block.displayName}</span>
                          <span className="font-semibold text-gray-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ${blockTotal}
                            {varExtra > 0 && <span style={{ color: '#dc2626', marginLeft: '4px', fontSize: '0.65rem' }}>+{Math.round(varExtra)}</span>}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-xs font-bold border-t pt-2" style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>
                      <span>Total</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>${animatedCost}/mo</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center border-t pt-6" style={{ borderColor: '#E2E8F0' }}>
                Estimate based on standard configuration. Actual costs may vary.
              </p>
            </div>

            {/* Block Status Card */}
            <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid #E2E8F0' }}>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#0F172A' }}>
                Block Status
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#F0FFF4', borderColor: '#C6F6D5' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✓</span>
                    <span className="text-sm" style={{ color: '#15803D' }}>
                      {requiredBlocks.length} Required
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">Complete</span>
                </div>

                {optionalBlocks.length > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#FEF3C7', borderColor: '#FCD34D' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">○</span>
                      <span className="text-sm" style={{ color: '#92400E' }}>
                        {optionalBlocks.length} Optional
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">Available</span>
                  </div>
                )}

                {/* Required fields status */}
                <div className="mt-6 p-4 rounded-lg" style={{ background: '#FEE2E2', borderColor: '#FECACA' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: '#991B1B' }}>
                    Fields to Complete:
                  </p>
                  <div className="space-y-2">
                    {allBlocksWithUnfilled.map((block) => {
                      if (!block.hasUnfilled) return null;
                      return (
                        <div key={block.id} className="flex items-center gap-2 text-xs">
                          <span>⚠️</span>
                          <span style={{ color: '#991B1B' }}>
                            {block.displayName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Project Info Card */}
            <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid #E2E8F0' }}>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#0F172A' }}>
                Project Info
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-2">Name</p>
                  <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>
                    {currentProject?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-2">Project ID</p>
                  <p className="text-xs font-mono" style={{ color: '#64748B' }}>
                    {selectedProject}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-2">Region</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1rem' }}>{GCP_REGIONS.find((r) => r.value === selectedRegion)?.flag ?? '🌍'}</span>
                    <p className="text-sm font-mono" style={{ color: '#0F172A' }}>{selectedRegion}</p>
                  </div>
                  <p className="text-xs" style={{ color: '#64748b', marginTop: '0.2rem' }}>{GCP_REGIONS.find((r) => r.value === selectedRegion)?.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {(currentPage === 'review' || currentPage === 'submitted') && (
        <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
          <div className="p-10">
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#0F172A' }}>
              Review & Submit PR Request
            </h2>
            <p className="text-gray-600 mb-10">Verify your configuration — submitting will open a Pull Request on the NGDI repo with generated Terraform files</p>

            <div className="space-y-6">
              {/* Pattern Info */}
              <div className="p-6 rounded-xl border" style={{ background: '#FFF5F5', borderColor: '#FFE6E6' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                      Pattern
                    </p>
                    <p className="text-base font-bold mt-2">{pattern.label}</p>
                    <p className="text-sm text-gray-600 mt-3">{pattern.description}</p>
                  </div>
                  <span className="text-3xl">📋</span>
                </div>
              </div>

              {/* Project Info */}
              <div className="p-6 rounded-xl border" style={{ background: '#F0FFF4', borderColor: '#C6F6D5' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                      GCP Project
                    </p>
                    <p className="text-base font-bold mt-2">{projectNameInput || currentProject?.name}</p>
                    <p className="text-xs text-gray-600 font-mono mt-2">{selectedProject}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span>{GCP_REGIONS.find((r) => r.value === selectedRegion)?.flag ?? '🌍'}</span>
                      <span className="text-xs font-mono" style={{ color: '#0f172a' }}>{selectedRegion}</span>
                      <span className="text-xs" style={{ color: '#64748b' }}>· {GCP_REGIONS.find((r) => r.value === selectedRegion)?.label}</span>
                    </div>
                  </div>
                  <span className="text-3xl">☁️</span>
                </div>
              </div>

              {/* Building Blocks Summary */}
              <div>
                <p className="text-sm font-semibold mb-5" style={{ color: '#0F172A' }}>
                  Building Blocks Configuration ({requiredBlocks.length} blocks)
                </p>
                <div className="space-y-4">
                  {requiredBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-6 rounded-xl border hover:border-red-300 transition-colors cursor-pointer"
                      style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold" style={{ color: '#0F172A' }}>
                            {block.displayName}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">{block.description}</p>

                          {/* Show key variables */}
                          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            {Object.entries(blockConfigs[block.id] || {})
                              .filter(([key]) => key !== 'project_id') // Hide project_id
                              .slice(0, 2)
                              .map(([key, value]) => (
                                <div key={`${block.id}-${key}`} className="space-y-1">
                                  <p className="text-gray-500">{key.replace(/_/g, ' ')}</p>
                                  <p className="font-mono text-gray-800">
                                    {String(value).substring(0, 25)}
                                    {String(value).length > 25 ? '...' : ''}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                        <span className="text-2xl ml-4">⚙️</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {currentPage === 'submitted' && (
                <div className="p-8 rounded-xl border-2" style={{ background: '#F0FFF4', borderColor: '#22c55e' }}>
                  <div className="flex items-start gap-5">
                    <div className="text-3xl flex-shrink-0">🎉</div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-green-900">Pull Request Raised Successfully!</p>
                      <p className="text-sm text-green-700 mt-1">The Resolver generated your Terraform files and opened a PR on the NGDI repository. GitHub Actions will now run <strong>terraform plan</strong> — actual infrastructure will be created on merge and <strong>terraform apply</strong>.</p>
                      <div className="mt-4 p-3 rounded-lg" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                        <p className="text-xs text-green-800 font-semibold mb-1">Request ID</p>
                        <p className="font-mono text-sm text-green-900">{deploymentId}</p>
                      </div>
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
                        <p className="text-xs text-green-800 font-semibold mb-2">📎 Pull Request (Demo)</p>
                        <a
                          href={DEMO_PR_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium"
                          style={{ color: '#16a34a', textDecoration: 'underline' }}
                        >
                          <span>🔗</span>
                          <span>VFGROUP-NSE-DNOSS/DNE-PE-NGDI-TERRAFORM-MODULES/pull/42</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>↗</span>
                        </a>
                        <p className="text-xs text-green-700 mt-1">Status: <span className="font-semibold">Open · terraform plan pending review</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-10 pt-8 border-t flex gap-3 justify-between" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex gap-3">
                {currentPage !== 'submitted' && (
                  <>
                    <button
                      onClick={() => setCurrentPage('blocks')}
                      className="px-5 py-3 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E0E0E0' }}
                    >
                      ← Back to Blocks
                    </button>
                    <button
                      onClick={() => setCurrentPage('project')}
                      className="px-5 py-3 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E0E0E0' }}
                    >
                      ← Change Project
                    </button>
                  </>
                )}
              </div>

              {currentPage !== 'submitted' && (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#E60000' }}
                >
                  🚀 Submit PR Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
