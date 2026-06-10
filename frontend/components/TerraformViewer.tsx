/**
 * TerraformViewer Component
 * Displays generated Terraform files after deployment resolution
 * Shows main.tf, variables.tf, and terraform.tfvars with syntax highlighting
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import styles from '../styles/Form.module.css';

interface TerraformViewerProps {
  deploymentId: string;
  projectName?: string;
}

interface TerraformFiles {
  main_tf: string;
  variables_tf: string;
  terraform_tfvars: string;
}

interface FileMetadata {
  main_tf_size: number;
  variables_tf_size: number;
  terraform_tfvars_size: number;
}

type FileType = 'main' | 'variables' | 'tfvars';

const FileTypeConfig = {
  main: {
    label: 'main.tf',
    title: 'Main Configuration',
    description: 'Terraform modules and provider configuration',
    fileName: 'main.tf',
  },
  variables: {
    label: 'variables.tf',
    title: 'Variable Definitions',
    description: 'Input variables for your Terraform configuration',
    fileName: 'variables.tf',
  },
  tfvars: {
    label: 'terraform.tfvars',
    title: 'Variable Values',
    description: 'Default values for Terraform variables',
    fileName: 'terraform.tfvars',
  },
};

export const TerraformViewer: React.FC<TerraformViewerProps> = ({
  deploymentId,
  projectName,
}) => {
  const [files, setFiles] = useState<TerraformFiles | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<FileType>('main');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState<FileType | null>(null);
  const [downloading, setDownloading] = useState<FileType | null>(null);

  useEffect(() => {
    fetchTerraformFiles();
  }, [deploymentId]);

  const fetchTerraformFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch metadata
      const metadataResponse = await api.deployments.patterns.terraform.getMetadata(deploymentId);
      setMetadata(metadataResponse.terraformFiles);

      // Fetch all files
      const [mainTf, variablesTf, tfvars] = await Promise.all([
        api.deployments.patterns.terraform.getMainTf(deploymentId),
        api.deployments.patterns.terraform.getVariablesTf(deploymentId),
        api.deployments.patterns.terraform.getTfvars(deploymentId),
      ]);

      setFiles({
        main_tf: mainTf,
        variables_tf: variablesTf,
        terraform_tfvars: tfvars,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Terraform files';
      setError(message);
      console.error('Error fetching Terraform files:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (content: string, fileType: FileType) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopying(fileType);
      setTimeout(() => setCopying(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = async (fileType: FileType) => {
    try {
      setDownloading(fileType);
      await api.deployments.patterns.terraform.downloadFile(deploymentId, fileType);
    } catch (err) {
      console.error(`Failed to download ${fileType}.tf:`, err);
    } finally {
      setDownloading(null);
    }
  };

  const downloadAllAsZip = async () => {
    if (!files) return;

    // Create a simple text archive with all files
    const content = `# Terraform Configuration Files
Generated: ${new Date().toISOString()}
Project: ${projectName || deploymentId}

## Files included:
- main.tf
- variables.tf
- terraform.tfvars

---

## main.tf
${files.main_tf}

---

## variables.tf
${files.variables_tf}

---

## terraform.tfvars
${files.terraform_tfvars}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terraform-${deploymentId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getFileSizeDisplay = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className={styles.card} style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#666' }}>
          Loading Terraform files...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card} style={{ padding: '2rem' }}>
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
          }}
        >
          <strong>Error loading files:</strong> {error}
        </div>
        <button
          onClick={fetchTerraformFiles}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!files) {
    return (
      <div className={styles.card} style={{ padding: '2rem' }}>
        <div style={{ color: '#999' }}>No Terraform files available</div>
      </div>
    );
  }

  const currentFileKey = `${activeTab}_tf` as keyof TerraformFiles;
  const currentContent = files[currentFileKey];
  const currentConfig = FileTypeConfig[activeTab];

  return (
    <div className={styles.card} style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          Terraform Configuration
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Generated configuration for deployment {deploymentId}
        </p>
      </div>

      {/* File Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #eee',
          overflow: 'x',
        }}
      >
        {(Object.keys(FileTypeConfig) as FileType[]).map((fileType) => (
          <button
            key={fileType}
            onClick={() => setActiveTab(fileType)}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              backgroundColor: activeTab === fileType ? '#007bff' : 'transparent',
              color: activeTab === fileType ? 'white' : '#666',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              fontSize: '0.9rem',
              fontWeight: activeTab === fileType ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {FileTypeConfig[fileType].label}
            {metadata && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.8rem',
                  opacity: 0.7,
                }}
              >
                {getFileSizeDisplay(
                  metadata[`${fileType}_tf_size` as keyof FileMetadata]
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* File Info */}
      <div
        style={{
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
          {currentConfig.title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
          {currentConfig.description}
        </p>
      </div>

      {/* File Content */}
      <div
        style={{
          backgroundColor: '#f9f9f9',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem',
          overflow: 'auto',
          maxHeight: '400px',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {currentContent}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => copyToClipboard(currentContent, activeTab)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: copying === activeTab ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'background-color 0.2s',
          }}
        >
          {copying === activeTab ? '✓ Copied' : 'Copy to Clipboard'}
        </button>

        <button
          onClick={() => downloadFile(activeTab)}
          disabled={downloading === activeTab}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor:
              downloading === activeTab ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: downloading === activeTab ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {downloading === activeTab ? 'Downloading...' : 'Download File'}
        </button>

        <button
          onClick={downloadAllAsZip}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Download All
        </button>

        <button
          onClick={fetchTerraformFiles}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            marginLeft: 'auto',
          }}
        >
          Refresh
        </button>
      </div>

      {/* File Summary */}
      {metadata && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f0f8ff',
            border: '1px solid #b0d8ff',
            borderRadius: '4px',
            fontSize: '0.85rem',
          }}
        >
          <strong>File Summary:</strong>
          <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
            <li>
              main.tf: {getFileSizeDisplay(metadata.main_tf_size)}
            </li>
            <li>
              variables.tf:{' '}
              {getFileSizeDisplay(metadata.variables_tf_size)}
            </li>
            <li>
              terraform.tfvars:{' '}
              {getFileSizeDisplay(metadata.terraform_tfvars_size)}
            </li>
            <li>
              <strong>Total:</strong>{' '}
              {getFileSizeDisplay(
                metadata.main_tf_size +
                  metadata.variables_tf_size +
                  metadata.terraform_tfvars_size
              )}
            </li>
          </ul>
        </div>
      )}

      {/* Usage Instructions */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#fffbf0',
          border: '1px solid #ffe4b5',
          borderRadius: '4px',
          fontSize: '0.85rem',
        }}
      >
        <strong>Next Steps:</strong>
        <ol style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
          <li>Download the Terraform files</li>
          <li>Review the configuration for your project</li>
          <li>Run <code>terraform init</code> to initialize</li>
          <li>Run <code>terraform plan</code> to preview changes</li>
          <li>Run <code>terraform apply</code> to deploy</li>
        </ol>
      </div>
    </div>
  );
};

export default TerraformViewer;
