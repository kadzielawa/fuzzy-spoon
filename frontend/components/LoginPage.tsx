import React, { useState } from 'react';
import { api } from '../lib/api';
import { VodafoneLogo } from './VodafoneLogo';

interface LoginProps {
  onLoginSuccess: (userId: string) => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [selectedUserId, setSelectedUserId] = useState('user-123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoUsers = [
    {
      id: 'user-123',
      name: 'Alice Johnson',
      email: '[REDACTED_EMAIL_ADDRESS_2]',
      roles: ['developer', 'team-lead'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    },
    {
      id: 'user-456',
      name: 'Bob Smith',
      email: '[REDACTED_EMAIL_ADDRESS_3]',
      roles: ['developer'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    },
    {
      id: 'user-789',
      name: 'Carol White',
      email: '[REDACTED_EMAIL_ADDRESS_4]',
      roles: ['admin', 'architect'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      localStorage.setItem('userId', selectedUserId);
      const profile = await api.user.getProfile();
      onLoginSuccess(selectedUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      localStorage.removeItem('userId');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F4F4' }}>
      {/* Left panel — Vodafone brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: '#E60000' }}>
        <VodafoneLogo size={48} className="" />
        <div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Infrastructure<br />Deployment<br />Platform
          </h2>
          <p className="text-red-100 text-lg">
            Provision and manage cloud infrastructure with confidence — at Vodafone speed.
          </p>
        </div>
        <p className="text-red-200 text-sm">© {new Date().getFullYear()} Vodafone Group</p>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <VodafoneLogo size={44} />
          </div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Sign in</h1>
            <p className="text-gray-500 mt-1 text-sm">Select your demo account to continue</p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: '#333333' }}>
                Select Demo User
              </label>
              <div className="space-y-3">
                {demoUsers.map((user) => (
                  <label key={user.id} className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-colors" style={{ borderColor: selectedUserId === user.id ? '#E60000' : '#E0E0E0', background: selectedUserId === user.id ? '#FFF5F5' : 'white' }}>
                    <input
                      type="radio"
                      name="user"
                      value={user.id}
                      checked={selectedUserId === user.id}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full ml-3" />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.roles.join(', ')}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-semibold py-3 rounded-xl transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: isLoading ? '#BD0000' : '#E60000' }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Demo mode — select any user to continue
          </p>
        </div>
      </div>
    </div>
  );
};
