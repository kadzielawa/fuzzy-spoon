import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

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
  label: string;
  parameters: TemplateParameter[];
  estimatedCost?: string;
}

interface Project {
  id: string;
  name: string;
  projectNumber: string;
  region: string;
}

interface DeploymentConfigProps {
  userId: string;
  templateId: string;
  onDeploymentCreated: (deploymentId: string) => void;
  onCancel: () => void;
}

export const DeploymentConfig: React.FC<DeploymentConfigProps> = ({
  userId,
  templateId,
  onDeploymentCreated,
  onCancel,
}) => {
  const [template, setTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projectInput, setProjectInput] = useState<string>('');
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [step, setStep] = useState<'project' | 'configure' | 'review' | 'submitted'>('project');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string>('');

  useEffect(() => {
    fetchTemplate();
    fetchProjects();
  }, [templateId, userId]);

  const fetchTemplate = async () => {
    try {
      const data = await api.templates.get(templateId);
      setTemplate(data);
      const initialParams: Record<string, any> = {};
      data.parameters.forEach((p: TemplateParameter) => {
        initialParams[p.name] = p.default ?? '';
      });
      setParameters(initialParams);
    } catch (error) {
      console.error('Failed to fetch template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
        setProjectInput(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedProject || !template) return;

    setIsSubmitting(true);
    try {
      const deployment = await api.deployments.create({
        templateId,
        projectId: selectedProject,
        serviceName: parameters.service_name || parameters.cluster_name || parameters.site_name || 'service',
        parameters,
      });

      setDeploymentId(deployment.id);
      setStep('submitted');
      setTimeout(() => {
        onDeploymentCreated(deployment.id);
      }, 2000);
    } catch (error) {
      console.error('Failed to create deployment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading template...</div>;
  }

  if (!template) {
    return <div className="p-8 text-center text-red-600">Failed to load template</div>;
  }

  const currentProject = projects.find((p) => p.id === selectedProject);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{template.label}</h1>
        <div className="flex items-center gap-2 mt-3 text-sm">
          <span className="px-3 py-1 rounded-full text-white font-medium" style={{
            background: step === 'project' || step === 'configure' || step === 'review' || step === 'submitted' ? '#E60000' : '#E0E0E0'
          }}>1. Project</span>
          <span className="text-gray-300">&#8594;</span>
          <span className="px-3 py-1 rounded-full font-medium" style={{
            background: step === 'configure' || step === 'review' || step === 'submitted' ? '#E60000' : '#E0E0E0',
            color: step === 'configure' || step === 'review' || step === 'submitted' ? 'white' : '#666'
          }}>2. Configure</span>
          <span className="text-gray-300">&#8594;</span>
          <span className="px-3 py-1 rounded-full font-medium" style={{
            background: step === 'review' || step === 'submitted' ? '#E60000' : '#E0E0E0',
            color: step === 'review' || step === 'submitted' ? 'white' : '#666'
          }}>3. Review</span>
        </div>
      </div>

      {/* Step 1: Project Selection */}
      {(step === 'project' || step === 'configure' || step === 'review') && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ border: '1px solid #E0E0E0' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1A1A1A' }}>Step 1: Select GCP Project</h2>
          {projects.length === 0 ? (
            <p className="text-red-600">No projects available</p>
          ) : (
            <div className="space-y-3">
              {/* Combobox: pick from list or type a custom project ID */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A1A1A' }}>
                  Project ID <span style={{ color: '#E60000' }}>*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">Choose from the list or type a project ID manually.</p>
                <div className="relative">
                  <input
                    list="project-list"
                    type="text"
                    value={projectInput}
                    onChange={(e) => {
                      setProjectInput(e.target.value);
                      setSelectedProject(e.target.value);
                    }}
                    disabled={step !== 'project'}
                    placeholder="e.g. my-gcp-project-id"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none disabled:bg-gray-50"
                    style={{ border: `2px solid ${selectedProject ? '#E60000' : '#E0E0E0'}` }}
                  />
                  <datalist id="project-list">
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.region}</option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Selected project info card */}
              {(() => {
                const proj = projects.find((p) => p.id === selectedProject);
                if (!proj) return selectedProject ? (
                  <div className="p-4 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #fbbf24' }}>
                    <p className="text-sm font-medium text-yellow-800">Custom project: <strong>{selectedProject}</strong></p>
                    <p className="text-xs text-yellow-600 mt-0.5">This project ID is not in the managed list — ensure you have the correct permissions.</p>
                  </div>
                ) : null;
                return (
                  <div className="p-4 rounded-xl flex items-start gap-4" style={{ background: '#FFF5F5', border: '1px solid #E60000' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: '#E60000' }}>
                      {proj.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-semibold" style={{ color: '#1A1A1A' }}>{proj.name}</p>
                      <p className="text-gray-500">Project ID: <span className="font-mono">{proj.id}</span></p>
                      <p className="text-gray-500">Project #: {proj.projectNumber} &nbsp;·&nbsp; Region: {proj.region}</p>
                    </div>
                    <span className="text-green-600 font-bold text-lg">✓</span>
                  </div>
                );
              })()}
            </div>
          )}
          {(step === 'project' || step === 'configure' || step === 'review') && (
            <div className="mt-6 flex gap-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E0E0E0' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('configure')}
                disabled={step !== 'project'}
                className="px-6 py-2 text-white rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
                style={{ background: '#E60000' }}
              >
                Continue to Configuration
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configuration */}
      {(step === 'configure' || step === 'review') && currentProject && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ border: '1px solid #E0E0E0' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1A1A1A' }}>Step 2: Configure Parameters</h2>
          <div className="max-h-96 overflow-y-auto space-y-6">
            {template.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1A1A' }}>
                  {param.label} {param.required && <span style={{ color: '#E60000' }}>*</span>}
                </label>
                <p className="text-sm text-gray-400 mb-3">{param.description}</p>

                {param.type === 'string' && (
                  <input
                    type="text"
                    value={parameters[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.default || ''}
                    disabled={step === 'review'}
                    className="w-full px-4 py-2 rounded-xl text-sm disabled:bg-gray-50 outline-none transition-colors"
                    style={{ border: '1px solid #E0E0E0' }}
                  />
                )}

                {param.type === 'number' && (
                  <input
                    type="number"
                    value={parameters[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    min={param.validation?.min || 0}
                    max={param.validation?.max || 1000}
                    disabled={step === 'review'}
                    className="w-full px-4 py-2 rounded-xl text-sm disabled:bg-gray-50 outline-none"
                    style={{ border: '1px solid #E0E0E0' }}
                  />
                )}

                {param.type === 'boolean' && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parameters[param.name] || false}
                      onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                      disabled={step === 'review'}
                      className="w-4 h-4 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{param.label}</span>
                  </label>
                )}

                {param.type === 'select' && param.options && (
                  <select
                    value={parameters[param.name] || param.default || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    disabled={step === 'review'}
                    className="w-full px-4 py-2 rounded-xl text-sm disabled:bg-gray-50 outline-none"
                    style={{ border: '1px solid #E0E0E0' }}
                  >
                    <option value="">Select an option</option>
                    {param.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {param.type === 'textarea' && (
                  <textarea
                    value={parameters[param.name] || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.default || ''}
                    disabled={step === 'review'}
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl text-sm disabled:bg-gray-50 outline-none"
                    style={{ border: '1px solid #E0E0E0' }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setStep('project')}
              disabled={step === 'review'}
              className="px-6 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              style={{ borderColor: '#E0E0E0' }}
            >
              Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={step === 'review'}
              className="px-6 py-2 text-white rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: '#E60000' }}
            >
              Review Configuration
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {(step === 'review' || step === 'submitted') && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6" style={{ border: '1px solid #E0E0E0' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#1A1A1A' }}>Step 3: Review &amp; Submit</h2>

          <div className="space-y-4 mb-6">
            <div className="p-4 rounded-xl" style={{ background: '#FFF5F5' }}>
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Project</p>
              <p className="text-sm text-gray-500 mt-1">{currentProject?.name ?? selectedProject}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedProject}</p>
            </div>

            <div className="p-4 rounded-xl" style={{ background: '#F4F4F4' }}>
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>Configuration Summary</p>
              <div className="mt-2 space-y-1 text-sm">
                {template.parameters
                  .filter((p) => parameters[p.name] !== undefined && parameters[p.name] !== '')
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.name} className="flex justify-between">
                      <span className="text-gray-500">{p.label}:</span>
                      <span className="font-mono font-semibold text-xs" style={{ color: '#333' }}>{String(parameters[p.name])}</span>
                    </div>
                  ))}
                {template.parameters.filter((p) => parameters[p.name] !== undefined && parameters[p.name] !== '').length > 5 && (
                  <p className="text-gray-400 italic text-xs">... and more parameters</p>
                )}
              </div>
            </div>

            {template.estimatedCost && (
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm font-semibold text-green-900">Estimated Monthly Cost</p>
                <p className="text-green-700 text-lg font-bold mt-1">{template.estimatedCost}</p>
              </div>
            )}
          </div>

          {step === 'submitted' && (
            <div className="p-4 rounded-xl text-center mb-6" style={{ background: '#F0FFF4', border: '2px solid #22c55e' }}>
              <p className="font-semibold text-green-900">✓ Deployment Created Successfully!</p>
              <p className="text-green-700 text-sm mt-1">ID: {deploymentId}</p>
              <p className="text-green-700 text-sm">Your deployment is now awaiting approval.</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('configure')}
              disabled={step === 'submitted'}
              className="px-6 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
              style={{ borderColor: '#E0E0E0' }}
            >
              Back to Configuration
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || step === 'submitted'}
              className="px-6 py-2 text-white rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
              style={{ background: '#E60000' }}
            >
              {isSubmitting ? 'Creating Deployment...' : 'Create Deployment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
