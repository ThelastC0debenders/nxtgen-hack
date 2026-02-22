import { useState, useEffect, useRef } from 'react';
import teamLogo from '../assets/image.png';

interface SidebarProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

const navCategories = [
  {
    title: 'Overview',
    items: [
      { id: 'documentation', label: 'Documentation' },
      { id: 'the-problem', label: 'The Problem' },
      { id: 'the-solution', label: 'The Solution' },
      { id: 'core-capabilities', label: 'Core Capabilities' },
      { id: 'user-roles', label: 'User Roles' },
      { id: 'quick-start', label: 'Quick Start' },
    ]
  },
  {
    title: 'Architecture',
    items: [
      { id: 'system-diagram', label: 'System Diagram' },
      { id: 'components', label: 'Components' },
      { id: 'request-flows', label: 'Request Flows' },
      { id: 'repository-structure', label: 'Repository Structure' },
    ]
  },
  {
    title: 'SDK & Integration',
    items: [
      { id: 'sdk-integration-guide', label: 'Getting Started' },
      { id: 'prerequisites', label: 'Prerequisites' },
      { id: 'nodejs-sdk-typescript', label: 'Node.js SDK' },
      { id: 'python-sdk', label: 'Python SDK' },
      { id: 'required-header-content-type', label: 'Headers' },
      { id: 'error-handling-pattern', label: 'Error Handling' },
    ]
  },
  {
    title: 'API Reference',
    items: [
      { id: 'authentication', label: 'Auth Endpoints' },
      { id: 'invoices', label: 'Invoice Endpoints' },
      { id: 'audit-logs', label: 'Audit Endpoints' },
      { id: 'ai-service-endpoints', label: 'AI Endpoints' },
    ]
  }
];

export default function Sidebar({ activeSection, onSectionClick }: SidebarProps) {
  const [, setScrollY] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll the sidebar to keep the active item in view
  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector('.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSection]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src={teamLogo} alt="TheLastCodeBenders" className="sidebar-logo-icon" />
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">TheLastCodeBenders</div>
            <div className="sidebar-logo-subtitle">Documentation</div>
          </div>
        </div>
      </div>

      <nav ref={navRef} className="sidebar-nav">
        {navCategories.map((category) => (
          <div key={category.title} className="sidebar-category">
            <div className="sidebar-section-label" style={{ marginTop: '24px', marginBottom: '8px', color: '#888' }}>
              {category.title}
            </div>
            {category.items.map((item) => (
              <a
                key={item.id}
                className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSectionClick(item.id);
                }}
                href={`#${item.id}`}
                style={{ paddingLeft: '16px', fontSize: '14px', borderLeft: activeSection === item.id ? '2px solid #00ff88' : '2px solid transparent' }}
              >
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-primary)',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        marginTop: 'auto'
      }}>
        v2.0 — SDK API Ref
      </div>
    </aside>
  );
}
