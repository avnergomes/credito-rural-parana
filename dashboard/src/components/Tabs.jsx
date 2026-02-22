import * as LucideIcons from 'lucide-react';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="border-b border-dark-200 mb-6">
      <nav className="flex gap-1 overflow-x-auto pb-px -mb-px scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = LucideIcons[tab.icon];
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300'
                }
              `}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
