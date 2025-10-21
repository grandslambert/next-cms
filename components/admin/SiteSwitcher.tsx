'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface Site {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  domain?: string;
  is_active: boolean;
  role_name?: string; // For non-super admin users
}

export default function SiteSwitcher() {
  const { data: session, update } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSiteId, setCurrentSiteId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Get current site ID from session
  useEffect(() => {
    if (session?.user) {
      const siteId = (session.user as any).currentSiteId || '';
      setCurrentSiteId(siteId);
    }
  }, [session]);

  // Fetch available sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const response = await fetch('/api/sites/available');
        if (response.ok) {
          const data = await response.json();
          setSites(data.sites || []);
        }
      } catch (error) {
        console.error('Error fetching sites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  const handleSiteSwitch = async (siteId: string) => {
    if (siteId === currentSiteId) return;

    setSwitching(true);
    try {
      console.log('🔄 Switching from site', currentSiteId, 'to site', siteId);
      
      const response = await fetch('/api/auth/switch-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to switch site');
        return;
      }

      // Update session with new site ID
      await update({ currentSiteId: siteId });
      
      console.log('✅ Session updated with site', siteId);
      setCurrentSiteId(siteId);
      toast.success(data.message || `Switched to ${data.site_name}`);
      
      // Reload the page to refresh all data with new site context
      window.location.reload();
    } catch (error) {
      console.error('Error switching site:', error);
      toast.error('Failed to switch site');
    } finally {
      setSwitching(false);
    }
  };

  // Don't show if loading or no sites
  if (loading || sites.length === 0) {
    return null;
  }

  const currentSite = sites.find(s => s.id === currentSiteId);
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

  return (
    <div className="relative">
      <div className="flex items-center space-x-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-lg">🌐</span>
          <div className="flex-1">
            <div className="text-xs text-gray-400 font-medium mb-1">Current Site</div>
            <div className="relative">
              <select
                value={currentSiteId}
                onChange={(e) => handleSiteSwitch(e.target.value)}
                disabled={switching}
                className="block w-full pl-2 pr-8 py-1 text-sm font-semibold border-0 bg-transparent text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer rounded"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id} className="bg-gray-800 text-white">
                    {site.display_name}
                    {site.role_name && !isSuperAdmin ? ` (${site.role_name})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg className="fill-current h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            {currentSite?.domain && (
              <div className="text-xs text-gray-500 mt-0.5">
                {currentSite.domain}
              </div>
            )}
          </div>
        </div>
        {switching && (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
}

