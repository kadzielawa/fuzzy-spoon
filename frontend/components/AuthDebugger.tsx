/**
 * AuthDebugger Component
 * Shows authentication status and debugging information
 */

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const AuthDebugger: React.FC = () => {
  const [authInfo, setAuthInfo] = useState<{
    userId: string | null;
    userFound: boolean;
    userName: string | null;
    userRoles: string[];
    error: string | null;
  }>({
    userId: null,
    userFound: false,
    userName: null,
    userRoles: [],
    error: null,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

      console.log('[AuthDebugger] Checking auth with userId:', userId);

      if (!userId) {
        setAuthInfo({
          userId: null,
          userFound: false,
          userName: null,
          userRoles: [],
          error: 'No userId in localStorage',
        });
        return;
      }

      try {
        const profile = await api.user.getProfile();
        setAuthInfo({
          userId,
          userFound: true,
          userName: profile.name,
          userRoles: profile.roles,
          error: null,
        });
      } catch (err) {
        setAuthInfo({
          userId,
          userFound: false,
          userName: null,
          userRoles: [],
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = () => {
    localStorage.removeItem('userId');
    setAuthInfo({
      userId: null,
      userFound: false,
      userName: null,
      userRoles: [],
      error: 'Storage cleared',
    });
  };

  const testLogin = (userId: string) => {
    localStorage.setItem('userId', userId);
    checkAuth();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '350px',
        padding: '15px',
        backgroundColor: '#f0f0f0',
        border: '2px solid #ddd',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 9999,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
        🔐 Auth Debugger
      </div>

      {loading ? (
        <div>Checking auth...</div>
      ) : (
        <>
          {/* Status */}
          <div
            style={{
              marginBottom: '10px',
              padding: '8px',
              backgroundColor: authInfo.userFound ? '#d4edda' : '#f8d7da',
              border: `1px solid ${authInfo.userFound ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              color: authInfo.userFound ? '#155724' : '#721c24',
            }}
          >
            {authInfo.userFound
              ? `✅ Authenticated: ${authInfo.userName}`
              : `❌ Not Authenticated${authInfo.error ? `: ${authInfo.error}` : ''}`}
          </div>

          {/* Details */}
          <div style={{ marginBottom: '10px', lineHeight: '1.6' }}>
            <div>
              <strong>UserId:</strong>{' '}
              {authInfo.userId ? (
                <code style={{ backgroundColor: '#e0e0e0', padding: '2px 4px' }}>
                  {authInfo.userId}
                </code>
              ) : (
                'None'
              )}
            </div>
            <div>
              <strong>Name:</strong> {authInfo.userName || 'N/A'}
            </div>
            <div>
              <strong>Roles:</strong> {authInfo.userRoles.join(', ') || 'N/A'}
            </div>
            {authInfo.error && (
              <div style={{ color: '#d32f2f', marginTop: '5px' }}>
                <strong>Error:</strong> {authInfo.error}
              </div>
            )}
          </div>

          {/* Test Buttons */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ marginBottom: '5px', fontSize: '11px', fontWeight: 'bold' }}>
              Test Login:
            </div>
            <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
              <button
                onClick={() => testLogin('user-123')}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Alice (user-123)
              </button>
              <button
                onClick={() => testLogin('user-456')}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Bob (user-456)
              </button>
              <button
                onClick={() => testLogin('user-789')}
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  backgroundColor: '#e3f2fd',
                  border: '1px solid #90caf9',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Carol (user-789)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={checkAuth}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: '#fff9c4',
                border: '1px solid #fbc02d',
                borderRadius: '3px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              Refresh
            </button>
            <button
              onClick={clearStorage}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                backgroundColor: '#ffccbc',
                border: '1px solid #ff7043',
                borderRadius: '3px',
                cursor: 'pointer',
                flex: 1,
              }}
            >
              Clear
            </button>
          </div>

          {/* Valid Users */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #ddd',
              fontSize: '10px',
              color: '#666',
            }}
          >
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>Valid Users:</div>
            <ul style={{ margin: '0', paddingLeft: '15px' }}>
              <li>user-123 (Alice - developer)</li>
              <li>user-456 (Bob - developer)</li>
              <li>user-789 (Carol - admin)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default AuthDebugger;
