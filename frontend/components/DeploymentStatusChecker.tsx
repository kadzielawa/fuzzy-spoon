/**
 * DeploymentStatusChecker Component
 * Handles timeout errors and provides retry/poll options
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import styles from '../styles/Form.module.css';

interface DeploymentStatus {
  deploymentId: string;
  status: string;
  resolverStatus: string;
  projectId: string;
  projectName: string;
  message: string;
  error?: string;
  terraformFiles?: {
    main_tf_size: number;
    variables_tf_size: number;
    terraform_tfvars_size: number;
  };
  createdBy: string;
  timestamp: string;
}

interface DeploymentStatusCheckerProps {
  deploymentId: string;
  initialStatus: DeploymentStatus;
  onResolved?: (status: DeploymentStatus) => void;
}

export const DeploymentStatusChecker: React.FC<DeploymentStatusCheckerProps> = ({
  deploymentId,
  initialStatus,
  onResolved,
}) => {
  const [status, setStatus] = useState<DeploymentStatus>(initialStatus);
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [retrying, setRetrying] = useState(false);

  // Auto-poll if status is pending or error
  useEffect(() => {
    if (
      (status.status === 'pending' || status.resolverStatus === 'error') &&
      pollCount < 12 // Max 12 polls (60 seconds with 5s interval)
    ) {
      const timer = setTimeout(() => {
        checkStatus();
      }, 5000); // Poll every 5 seconds

      return () => clearTimeout(timer);
    }
  }, [status, pollCount]);

  const checkStatus = async () => {
    try {
      setPolling(true);
      const response = await api.deployments.patterns.terraform.getMetadata(
        deploymentId
      );

      // Update status
      const updatedStatus: DeploymentStatus = {
        deploymentId,
        status: response.status,
        resolverStatus: response.resolverStatus || status.resolverStatus,
        projectId: response.projectId,
        projectName: response.projectName,
        message: response.message,
        terraformFiles: response.terraformFiles,
        createdBy: status.createdBy,
        timestamp: new Date().toISOString(),
      };

      setStatus(updatedStatus);
      setPollCount((c) => c + 1);

      // If resolved, stop polling and notify
      if (updatedStatus.status === 'resolved') {
        setPolling(false);
        if (onResolved) {
          onResolved(updatedStatus);
        }
      }
    } catch (err) {
      console.error('Error checking status:', err);
      setPollCount((c) => c + 1);
    } finally {
      setPolling(false);
    }
  };

  const retrySubmit = async () => {
    try {
      setRetrying(true);
      // In production, you'd re-submit with the same parameters
      // For now, just check status again
      await checkStatus();
    } finally {
      setRetrying(false);
    }
  };

  const isError = status.resolverStatus === 'error';
  const isResolved = status.status === 'resolved';
  const isPending = status.status === 'pending';

  return (
    <div className={styles.card} style={{ padding: '2rem' }}>
      {/* Status Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          Deployment Status
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          {deploymentId}
        </p>
      </div>

      {/* Status Badge */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '1rem',
            backgroundColor: isResolved
              ? '#d4edda'
              : isError
              ? '#f8d7da'
              : '#fff3cd',
            color: isResolved
              ? '#155724'
              : isError
              ? '#721c24'
              : '#856404',
          }}
        >
          {isResolved ? '✅ RESOLVED' : isError ? '⚠️ TIMEOUT' : '⏳ PENDING'}
        </div>
      </div>

      {/* Message */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: isError ? '#fff5f5' : '#f0f8ff',
          border: `1px solid ${isError ? '#ffcccc' : '#b0d8ff'}`,
          borderRadius: '4px',
          marginBottom: '1.5rem',
          color: isError ? '#c33' : '#0066cc',
        }}
      >
        <strong>{status.message}</strong>
        {status.error && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {status.error}
          </div>
        )}
      </div>

      {/* Error Explanation */}
      {isError && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fffbf0',
            border: '1px solid #ffe4b5',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0' }}>What happened?</h3>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            The Resolver API didn't respond within 30 seconds. This can happen if:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>The resolver service is temporarily overloaded</li>
            <li>Your building blocks configuration is complex</li>
            <li>Network connectivity issue</li>
          </ul>
          <p
            style={{
              margin: '0.5rem 0 0 0',
              fontWeight: 'bold',
              color: '#d97706',
            }}
          >
            ℹ️ The deployment was still created locally. It will continue
            attempting to resolve.
          </p>
        </div>
      )}

      {/* Auto-Polling Info */}
      {isPending && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🔄</span>
            <span>
              Auto-checking status... ({pollCount}/12 checks)
            </span>
          </div>
          <div
            style={{
              marginTop: '0.5rem',
              backgroundColor: 'white',
              borderRadius: '3px',
              height: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(pollCount / 12) * 100}%`,
                backgroundColor: '#1890ff',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {/* Status Details */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
        }}
      >
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Project:</strong> {status.projectName}
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Status:</strong> {status.status}
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Resolver:</strong> {status.resolverStatus}
        </div>
        <div>
          <strong>Created:</strong> {new Date(status.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Files Info (if available) */}
      {status.terraformFiles && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f0fff4',
            border: '1px solid #86efac',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#22863a' }}>
            ✅ Terraform Files Ready
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>main.tf: {(status.terraformFiles.main_tf_size / 1024).toFixed(1)} KB</li>
            <li>
              variables.tf:{' '}
              {(status.terraformFiles.variables_tf_size / 1024).toFixed(1)} KB
            </li>
            <li>
              terraform.tfvars:{' '}
              {(status.terraformFiles.terraform_tfvars_size / 1024).toFixed(1)} KB
            </li>
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {isError && (
          <>
            <button
              onClick={retrySubmit}
              disabled={retrying || polling}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: retrying ? '#ccc' : '#ff7875',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: retrying ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {retrying ? '🔄 Retrying...' : '🔄 Retry Check'}
            </button>
          </>
        )}

        {isPending && (
          <button
            onClick={checkStatus}
            disabled={polling}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: polling ? '#ccc' : '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: polling ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {polling ? '⏳ Checking...' : '🔍 Check Now'}
          </button>
        )}

        {isResolved && (
          <button
            onClick={() => {
              if (onResolved) onResolved(status);
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ✅ View Terraform Files
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
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
          🔄 Refresh Page
        </button>
      </div>

      {/* Poll Status */}
      {isPending && (
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#999' }}>
          Polling status every 5 seconds (max 60 seconds)
        </div>
      )}
    </div>
  );
};

export default DeploymentStatusChecker;
