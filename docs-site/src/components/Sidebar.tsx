import { useState, useEffect, useRef } from 'react';
import teamLogo from '../assets/image.png';

interface SidebarProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

const sections = [
  // index.md
  { id: 'documentation', number: '01', label: 'Documentation' },
  { id: 'the-problem', number: '02', label: 'The Problem' },
  { id: 'the-solution', number: '03', label: 'The Solution' },
  { id: 'core-capabilities', number: '04', label: 'Core Capabilities' },
  { id: 'user-roles', number: '05', label: 'User Roles' },
  { id: 'quick-start', number: '06', label: 'Quick Start' },
  // architecture.md
  { id: 'system-diagram', number: '07', label: 'System Diagram' },
  { id: 'components', number: '08', label: 'Components' },
  { id: 'request-flows', number: '09', label: 'Request Flows' },
  { id: 'repository-structure', number: '10', label: 'Repository Structure' },
  // backend.md
  { id: 'nodejs-backend', number: '11', label: 'Node.js Backend' },
  { id: 'fastapi-ai-service', number: '12', label: 'FastAPI AI Service' },
  // api-reference.md
  { id: 'authentication', number: '13', label: 'API: Auth' },
  { id: 'invoices', number: '14', label: 'API: Invoices' },
  { id: 'audit-logs', number: '15', label: 'API: Audit Logs' },
  { id: 'ai-service-endpoints', number: '16', label: 'API: AI Service' },
  // deployment.md
  { id: 'role-based-access-control-rbac', number: '17', label: 'RBAC' },
  { id: 'security-highlights', number: '18', label: 'Security Highlights' },
  { id: 'audit-trail-hash-chain-mechanics', number: '19', label: 'Audit Trail Mechanics' },
  { id: 'environment-variables', number: '20', label: 'Env Variables' },
  { id: 'running-the-services', number: '21', label: 'Running Services' },
  { id: 'testing', number: '22', label: 'Testing' },
  { id: 'future-improvements', number: '23', label: 'Future Improvements' }
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
        <div className="sidebar-section-label">Sections</div>
        {sections.map((section) => (
          <a
            key={section.id}
            className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onSectionClick(section.id);
            }}
            href={`#${section.id}`}
          >
            <span className="sidebar-item-dot"></span>
            <span className="sidebar-item-number">{section.number}</span>
            <span>{section.label}</span>
          </a>
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
      }}>
        v1.0 — Last C0debenders
      </div>
    </aside>
  );
}
