import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

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
  const [currentPage, setCurrentPage] = useState<PageState>('project');
  const [activeBlockTab, setActiveBlockTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string>('');
  const [estimatedMonthlyCost, setEstimatedMonthlyCost] = useState<number>(0);

  // Block configurations: Record<blockId, Record<variableName, value>>
  const [blockConfigs, setBlockConfigs] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    fetchPatternAndBlocks();
    fetchProjects();
  }, [templateId, userId]);

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
      calculateEstimatedCost(blocksData.requiredBlocks);
    } catch (error) {
      console.error('Failed to fetch pattern and blocks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEstimatedCost = (blocks: BuildingBlock[]) => {
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
    }
    
    setEstimatedMonthlyCost(total);
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
    setBlockConfigs((prev) => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        [varName]: value,
      },
    }));
  };

  // Auto-fill project_id for all blocks when project is selected
  const autoFillProjectId = (projectId: string) => {
    const updatedConfigs: Record<string, Record<string, any>> = {};
    for (const block of requiredBlocks) {
      updatedConfigs[block.id] = { ...blockConfigs[block.id] };
      // Check if block has project_id variable
      if (block.variables.find((v) => v.name === 'project_id')) {
        updatedConfigs[block.id]['project_id'] = projectId;
      }
    }
    setBlockConfigs(updatedConfigs);
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
        projectName: currentProject?.name,
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

  if (!pattern) {
    return <div className="p-8 text-center text-red-600">Failed to load pattern</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-8 px-8">
      {/* Header with Pattern Info */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0F172A' }}>
          Deploy {pattern.label}
        </h1>
        <p className="text-gray-600">{pattern.description}</p>
      </div>

      {/* Progress Indicator */}
      {(currentPage === 'blocks' || currentPage === 'review') && (
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
              Deploy Pattern
            </h2>
            <p className="text-gray-600 mb-8">Select your GCP project and configure the deployment</p>

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
                    setSelectedProject(e.target.value);
                    autoFillProjectId(e.target.value);
                  }}
                  className="mt-3 w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 transition-all"
                  style={{ border: '1px solid #E2E8F0', focusRing: '#E60000' }}
                >
                  <option value="">Choose a project...</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.id})
                    </option>
                  ))}
                </select>
              </label>
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
      {(currentPage === 'blocks' || currentPage === 'review') && currentProject && (
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold" style={{ color: '#1A1A1A' }}>
                            {currentBlock.displayName}
                          </p>
                          {!requiredBlocks.some((b) => b.id === currentBlock.id) && (
                            <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                              Optional
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
                  <div className="max-h-[500px] overflow-y-auto space-y-6 pr-4">
                    {currentBlock.variables && currentBlock.variables.map((variable) => (
                    <div key={variable.name} className="space-y-3">
                      <label className="block">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                            {variable.name.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                          {variable.required && (
                            <span className="text-xs font-medium text-red-600">Required</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{variable.description}</p>

                        {/* Disable project_id field - it's auto-filled */}
                        {variable.name === 'project_id' && (
                          <input
                            type="text"
                            value={blockConfigs[currentBlock.id]?.[variable.name] || selectedProject || ''}
                            disabled={true}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-600 cursor-not-allowed outline-none"
                            style={{ border: '1px solid #E0E0E0' }}
                          />
                        )}

                        {/* String input */}
                        {variable.type === 'string' && variable.name !== 'project_id' && (
                          <input
                            type="text"
                            value={blockConfigs[currentBlock.id]?.[variable.name] || ''}
                            onChange={(e) =>
                              handleBlockVarChange(currentBlock.id, variable.name, e.target.value)
                            }
                            disabled={currentPage === 'review'}
                            placeholder={variable.default ? `Default: ${variable.default}` : 'Enter value...'}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 outline-none focus:ring-2 transition-all"
                            style={{ 
                              border: '1px solid #E0E0E0',
                              focusRing: '2px solid #E60000'
                            }}
                          />
                        )}

                        {/* Number input */}
                        {variable.type === 'number' && (
                          <input
                            type="number"
                            value={blockConfigs[currentBlock.id]?.[variable.name] ?? ''}
                            onChange={(e) =>
                              handleBlockVarChange(currentBlock.id, variable.name, e.target.value ? parseInt(e.target.value) : '')
                            }
                            disabled={currentPage === 'review'}
                            min={variable.validation?.min}
                            max={variable.validation?.max}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 outline-none focus:ring-2 transition-all"
                            style={{ 
                              border: '1px solid #E0E0E0',
                              focusRing: '2px solid #E60000'
                            }}
                          />
                        )}

                        {/* Boolean input */}
                        {variable.type === 'boolean' && (
                          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: '#F9F9F9', border: '1px solid #E0E0E0' }}>
                            <input
                              type="checkbox"
                              checked={blockConfigs[currentBlock.id]?.[variable.name] || false}
                              onChange={(e) =>
                                handleBlockVarChange(currentBlock.id, variable.name, e.target.checked)
                              }
                              disabled={currentPage === 'review'}
                              className="w-5 h-5 rounded cursor-pointer"
                              style={{ accentColor: '#E60000' }}
                            />
                            <span className="text-sm" style={{ color: '#1A1A1A' }}>
                              {variable.default ? 'Enabled by default' : 'Disabled by default'}
                            </span>
                          </div>
                        )}

                        {/* Select input */}
                        {variable.type === 'string' && variable.validation?.allowed_values && (
                          <select
                            value={blockConfigs[currentBlock.id]?.[variable.name] || ''}
                            onChange={(e) =>
                              handleBlockVarChange(currentBlock.id, variable.name, e.target.value)
                            }
                            disabled={currentPage === 'review'}
                            className="w-full px-4 py-3 rounded-lg text-sm disabled:bg-gray-100 outline-none focus:ring-2 transition-all"
                            style={{ 
                              border: '1px solid #E0E0E0',
                              focusRing: '2px solid #E60000'
                            }}
                          >
                            <option value="">Select an option...</option>
                            {variable.validation.allowed_values.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </label>
                    </div>
                  ))}
                </div>

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
                  <p className="text-3xl font-bold text-green-600">${estimatedMonthlyCost}</p>
                </div>

                <div className="p-4 rounded-lg border" style={{ background: '#F0FFF4', borderColor: '#C6F6D5' }}>
                  <p className="text-xs text-gray-700 mb-3">Resources:</p>
                  <div className="space-y-3">
                    {requiredBlocks.map((block) => {
                      const blockCosts: Record<string, number> = {
                        network: 30, iam: 0, security_policy: 50, sql: 80,
                        bigquery: 100, bucket: 40, environment: 400, keys: 25,
                      };
                      return (
                        <div key={block.id} className="flex justify-between text-xs">
                          <span className="text-gray-700">{block.displayName}</span>
                          <span className="font-semibold text-gray-900">
                            ${blockCosts[block.id] || 0}
                          </span>
                        </div>
                      );
                    })}
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
                  <p className="text-sm" style={{ color: '#0F172A' }}>
                    {currentProject?.region || 'europe-west3'}
                  </p>
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
              Review & Deploy
            </h2>
            <p className="text-gray-600 mb-10">Verify your configuration before deploying</p>

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
                    <p className="text-base font-bold mt-2">{currentProject?.name}</p>
                    <p className="text-xs text-gray-600 font-mono mt-2">{selectedProject}</p>
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
                <div className="p-8 rounded-xl text-center border-2" style={{ background: '#F0FFF4', borderColor: '#22c55e' }}>
                  <p className="text-2xl mb-3">✓</p>
                  <p className="font-semibold text-green-900">Deployment Created Successfully!</p>
                  <p className="text-sm text-green-700 mt-3">Deployment ID: <span className="font-mono font-semibold">{deploymentId}</span></p>
                  <p className="text-sm text-green-700 mt-2">Your deployment is now awaiting approval.</p>
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
                  {isSubmitting ? 'Creating Deployment...' : 'Deploy Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
