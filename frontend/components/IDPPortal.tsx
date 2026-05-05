import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { UserProfile } from './UserProfile';
import { TemplateSelection } from './TemplateSelection';
import { DeploymentConfig } from './DeploymentConfig';
import { VodafoneLogo } from './VodafoneLogo';
import { MyDeployments } from './MyDeployments';
import { DemoDeployment } from './DemoDeployment';
import { Approvals } from './Approvals';
import { Observability } from './Observability';

type PageState = 'login' | 'dashboard' | 'templates' | 'config-template' | 'profile' | 'deployments' | 'demo' | 'approvals' | 'observability';

export const IDPPortal: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageState>('login');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      fetchUserName(storedUserId);
      setCurrentPage('dashboard');
    }
  }, []);

  const fetchUserName = async (uid: string) => {
    try {
      const response = await fetch('/api/user', {
        headers: { 'x-user-id': uid },
      });
      if (response.ok) {
        const user = await response.json();
        setUserName(user.name);
        if (Array.isArray(user.roles)) setUserRoles(user.roles);
      }
    } catch (error) {
      console.error('Failed to fetch user name:', error);
    }
  };

  const handleLogin = (uid: string) => {
    setUserId(uid);
    fetchUserName(uid);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setUserId(null);
    setUserName('');
    localStorage.removeItem('userId');
    setCurrentPage('login');
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCurrentPage('config-template');
  };

  const handleDeploymentCreated = (deploymentId: string) => {
    // After successful deployment, show confirmation and return to dashboard
    setTimeout(() => {
      setCurrentPage('dashboard');
    }, 3000);
  };

  if (currentPage === 'login') {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  if (!userId) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F4F4' }}>
      {/* Navigation Header */}
      <header className="bg-white border-b sticky top-0 z-50" style={{ borderColor: '#E0E0E0' }}>
        <nav className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
            <VodafoneLogo size={36} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'dashboard' ? { background: '#E60000' } : {}}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('templates')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'templates' || currentPage === 'config-template'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'templates' || currentPage === 'config-template' ? { background: '#E60000' } : {}}
            >
              Templates
            </button>
            <button
              onClick={() => setCurrentPage('deployments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'deployments'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'deployments' ? { background: '#E60000' } : {}}
            >
              Deployments
            </button>
            <button
              onClick={() => setCurrentPage('demo')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentPage === 'demo' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'demo' ? { background: '#E60000' } : { border: '1.5px solid #E60000', color: '#E60000', borderRadius: '8px' }}
            >
              <span>▶</span> Demo
            </button>
            <button
              onClick={() => setCurrentPage('observability')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPage === 'observability' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'observability' ? { background: '#E60000' } : {}}
            >
              📊 Observability
            </button>
            <button
              onClick={() => setCurrentPage('approvals')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentPage === 'approvals' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'approvals' ? { background: '#E60000' } : {}}
            >
              Approvals
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ background: currentPage === 'approvals' ? 'rgba(255,255,255,0.3)' : '#E60000' }}>3</span>
            </button>
            <button
              onClick={() => setCurrentPage('profile')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'profile'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={currentPage === 'profile' ? { background: '#E60000' } : {}}
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors hover:bg-gray-50"
              style={{ borderColor: '#E60000', color: '#E60000' }}
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {currentPage === 'dashboard' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
              Welcome back, {userName}
            </h2>
            <p className="text-gray-500 mb-8">Here's your infrastructure overview.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Deploy card */}
              <div
                className="text-white rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow"
                style={{ background: '#E60000' }}
                onClick={() => setCurrentPage('templates')}
              >
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold mb-2">Deploy Infrastructure</h3>
                <p className="opacity-80 text-sm">Browse templates and configure new deployments</p>
              </div>

              {/* Deployments card */}
              <div
                className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow"
                style={{ borderLeft: '4px solid #E60000' }}
                onClick={() => setCurrentPage('deployments')}
              >
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>My Deployments</h3>
                <p className="text-gray-500 text-sm">Track status of your infrastructure deployments</p>
              </div>

              {/* Profile card */}
              <div
                className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow"
                style={{ borderLeft: '4px solid #333333' }}
                onClick={() => setCurrentPage('profile')}
              >
                <div className="text-4xl mb-4">👤</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>My Profile</h3>
                <p className="text-gray-500 text-sm">View your roles, permissions, and deployment history</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8" style={{ border: '1px solid #E0E0E0' }}>
              <h3 className="text-base font-bold mb-6" style={{ color: '#1A1A1A' }}>Quick Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="p-4 rounded-xl" style={{ background: '#FFF5F5' }}>
                  <p className="text-3xl font-bold" style={{ color: '#E60000' }}>4</p>
                  <p className="text-gray-500 text-sm mt-1">Available Templates</p>
                </div>
                <div className="p-4 rounded-xl bg-green-50">
                  <p className="text-3xl font-bold text-green-600">2</p>
                  <p className="text-gray-500 text-sm mt-1">Active Deployments</p>
                </div>
                <div className="p-4 rounded-xl bg-yellow-50">
                  <p className="text-3xl font-bold text-yellow-600">1</p>
                  <p className="text-gray-500 text-sm mt-1">Pending Approval</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: '#F4F4F4' }}>
                  <p className="text-3xl font-bold" style={{ color: '#333333' }}>3</p>
                  <p className="text-gray-500 text-sm mt-1">Roles Assigned</p>
                </div>
              </div>
            </div>

            {/* Feature Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #E0E0E0' }}>
                <h3 className="text-base font-bold mb-4" style={{ color: '#1A1A1A' }}>Key Features</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><span style={{ color: '#E60000' }}>✓</span> Template-based infrastructure deployment</li>
                  <li className="flex items-center gap-2"><span style={{ color: '#E60000' }}>✓</span> Multi-step configuration wizard</li>
                  <li className="flex items-center gap-2"><span style={{ color: '#E60000' }}>✓</span> Role-based access control</li>
                  <li className="flex items-center gap-2"><span style={{ color: '#E60000' }}>✓</span> Cost estimation preview</li>
                  <li className="flex items-center gap-2"><span style={{ color: '#E60000' }}>✓</span> Deployment approval workflow</li>
                  <li className="flex items-center gap-2"><span style={{ color: '#E60000' }}>✓</span> Real-time status tracking</li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #E0E0E0' }}>
                <h3 className="text-base font-bold mb-4" style={{ color: '#1A1A1A' }}>Supported Services</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li>🚀 Cloud Run — Serverless containers</li>
                  <li>☸️ GKE Autopilot — Managed Kubernetes</li>
                  <li>📊 Cloud Composer — Data pipelines</li>
                  <li>🌐 Firebase Hosting — Static sites</li>
                  <li className="text-gray-400">And more coming soon…</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'observability' && (
          <Observability userId={userId} />
        )}

        {currentPage === 'approvals' && (
          <Approvals userId={userId} userRoles={userRoles} />
        )}

        {currentPage === 'demo' && (
          <DemoDeployment />
        )}

        {currentPage === 'deployments' && (
          <MyDeployments userId={userId} />
        )}

        {currentPage === 'templates' && (
          <TemplateSelection userId={userId} onSelectTemplate={handleSelectTemplate} />
        )}

        {currentPage === 'config-template' && selectedTemplateId && (
          <DeploymentConfig
            userId={userId}
            templateId={selectedTemplateId}
            onDeploymentCreated={handleDeploymentCreated}
            onCancel={() => setCurrentPage('templates')}
          />
        )}

        {currentPage === 'profile' && (
          <div className="p-8">
            <UserProfile userId={userId} onLogout={handleLogout} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8" style={{ background: '#1A1A1A' }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <VodafoneLogo size={28} className="" />
          <p className="text-gray-400 text-sm">Infrastructure Deployment Platform — Platform Engineering</p>
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} Vodafone Group</p>
        </div>
      </footer>
    </div>
  );
};

export default IDPPortal;
