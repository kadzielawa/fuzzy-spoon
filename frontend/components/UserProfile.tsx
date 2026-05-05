import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  department: string;
  avatar?: string;
  permissions?: {
    canDeploy: boolean;
    canApprove: boolean;
    canManageUsers: boolean;
  };
}

interface UserProfileProps {
  userId: string;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onLogout }) => {
  const [user, setUser] = useState<User | null>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchUserDeployments();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const profile = await api.user.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchUserDeployments = async () => {
    try {
      const data = await api.user.getDeployments();
      setDeployments(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-red-600">Failed to load profile</div>;
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    architect: 'bg-purple-100 text-purple-800',
    developer: 'bg-blue-100 text-blue-800',
    'team-lead': 'bg-green-100 text-green-800',
    'data-engineer': 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl" style={{ border: '1px solid #E0E0E0' }}>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center">
          <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full" style={{ border: '3px solid #E60000' }} />
          <div className="ml-6">
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{user.name}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <p className="text-gray-400 text-xs mt-1">Department: {user.department}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E60000', color: '#E60000' }}
        >
          Sign out
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#666666' }}>Roles &amp; Permissions</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          {user.roles.map((role) => (
            <span key={role} className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ background: '#E60000' }}>
              {role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' ')}
            </span>
          ))}
        </div>

        {user.permissions && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#FFF5F5' }}>
              <div className={`text-lg font-semibold ${user.permissions.canDeploy ? 'text-green-600' : 'text-gray-400'}`}>
                {user.permissions.canDeploy ? '✓' : '✗'}
              </div>
              <p className="text-sm text-gray-700 mt-1">Can Deploy</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#F4F4F4' }}>
              <div className={`text-lg font-semibold ${user.permissions.canApprove ? 'text-green-600' : 'text-gray-400'}`}>
                {user.permissions.canApprove ? '✓' : '✗'}
              </div>
              <p className="text-sm text-gray-700 mt-1">Can Approve</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#F4F4F4' }}>
              <div className={`text-lg font-semibold ${user.permissions.canManageUsers ? 'text-green-600' : 'text-gray-400'}`}>
                {user.permissions.canManageUsers ? '✓' : '✗'}
              </div>
              <p className="text-sm text-gray-700 mt-1">Can Manage Users</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: '#666666' }}>Recent Deployments</h2>
        {deployments.length === 0 ? (
          <p className="text-gray-400 text-sm">No deployments yet</p>
        ) : (
          <div className="space-y-3">
            {deployments.slice(0, 5).map((deploy) => (
              <div key={deploy.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#F4F4F4' }}>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#1A1A1A' }}>{deploy.serviceName}</p>
                  <p className="text-xs text-gray-400">{deploy.templateId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  deploy.status === 'deployed' ? 'bg-green-100 text-green-800' :
                  deploy.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  deploy.status === 'draft' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {deploy.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
