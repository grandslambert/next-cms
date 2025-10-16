'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import DashboardHelp from '@/components/admin/help/DashboardHelp';
import PostsHelp from '@/components/admin/help/PostsHelp';
import MediaHelp from '@/components/admin/help/MediaHelp';
import TaxonomiesHelp from '@/components/admin/help/TaxonomiesHelp';
import UsersHelp from '@/components/admin/help/UsersHelp';
import AppearanceHelp from '@/components/admin/help/AppearanceHelp';
import SettingsHelp from '@/components/admin/help/SettingsHelp';
import ToolsHelp from '@/components/admin/help/ToolsHelp';
import TipsHelp from '@/components/admin/help/TipsHelp';

type Section = {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType;
};

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const sections: Section[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      component: DashboardHelp,
    },
    {
      id: 'posts',
      title: 'Posts & Custom Post Types',
      icon: '📝',
      component: PostsHelp,
    },
    {
      id: 'media',
      title: 'Media Library',
      icon: '🖼️',
      component: MediaHelp,
    },
    {
      id: 'taxonomies',
      title: 'Taxonomies (Categories & Tags)',
      icon: '🏷️',
      component: TaxonomiesHelp,
    },
    {
      id: 'users',
      title: 'Users & Roles',
      icon: '👥',
      component: UsersHelp,
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: '🎨',
      component: AppearanceHelp,
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: '⚙️',
      component: SettingsHelp,
    },
    {
      id: 'tools',
      title: 'Tools',
      icon: '🛠️',
      component: ToolsHelp,
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      icon: '💡',
      component: TipsHelp,
    },
  ];

  const activeContentSection = sections.find(s => s.id === activeSection);
  const ActiveComponent = activeContentSection?.component;

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-sm text-gray-600 mt-1">Documentation &amp; guides</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full text-left flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    activeSection === section.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-sm font-medium">{section.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
