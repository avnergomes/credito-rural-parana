import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export default function Tabs({ tabs, activeTab, onChange }) {
  const navRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    setCanScrollLeft(nav.scrollLeft > 2);
    setCanScrollRight(nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    checkScroll();
    nav.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      nav.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction) => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({ left: direction * 150, behavior: 'smooth' });
  };

  return (
    <div className="relative border-b border-dark-200 mb-6">
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="tab-scroll-btn left"
          aria-label="Rolar abas para a esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <nav
        ref={navRef}
        role="tablist"
        className="flex gap-1 overflow-x-auto pb-px -mb-px scrollbar-hide"
      >
        {tabs.map((tab) => {
          const Icon = LucideIcons[tab.icon];
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium
                border-b-2 whitespace-nowrap
                transition-all duration-200 origin-bottom
                ${isActive
                  ? 'border-primary-600 text-primary-600 scale-[1.03]'
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

      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="tab-scroll-btn right"
          aria-label="Rolar abas para a direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
