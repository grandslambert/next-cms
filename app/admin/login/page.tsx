'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hideDefaultUser, setHideDefaultUser] = useState(false);
  const router = useRouter();

  // Fetch auth settings
  useEffect(() => {
    axios.get('/api/settings/authentication')
      .then(res => {
        if (res.data.settings) {
          setHideDefaultUser(res.data.settings.hide_default_user);
        }
      })
      .catch(err => console.error('Error fetching auth settings:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: emailOrUsername,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid username/email or password');
        setLoading(false);
      } else {
        toast.success('Login successful');
        // Use window.location to force a full page reload with the new session
        window.location.href = '/admin';
      }
    } catch (error) {
      toast.error('An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Next CMS</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700">
              Email or Username
            </label>
            <input
              id="emailOrUsername"
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="admin or superadmin"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {!hideDefaultUser && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">Default Accounts:</p>
            <div className="space-y-3 text-sm">
              <div className="font-mono text-gray-900">
                <p className="font-semibold text-blue-700">👑 Super Admin (Site Management):</p>
                <p>Username: <span className="font-bold">superadmin</span></p>
                <p>Email: admin@example.com</p>
                <p className="text-gray-600">Password: <span className="font-bold">SuperAdmin123!</span></p>
              </div>
              <div className="font-mono text-gray-900">
                <p className="font-semibold text-green-700">👤 Site Admin (Content Management):</p>
                <p>Username: <span className="font-bold">admin</span></p>
                <p>Email: siteadmin@example.com</p>
                <p className="text-gray-600">Password: <span className="font-bold">Admin123!</span></p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">⚠️ Change these passwords after first login</p>
          </div>
        )}
      </div>
    </div>
  );
}

