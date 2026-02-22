import { useState, useEffect } from 'react';
import teamLogo from '../assets/image.png';

interface SidebarProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

const sections = [
  { id: '1-project-overview', number: '01', label: 'Project Overview' },
  { id: '2-architecture', number: '02', label: 'Architecture' },
  { id: '3-repository-structure', number: '03', label: 'Repository Structure' },
  { id: '4-frontend', number: '04', label: 'Frontend' },
  { id: '5-backend-nodejs', number: '05', label: 'Backend (Node.js)' },
  { id: '6-ai-service-fastapi', number: '06', label: 'AI Service (FastAPI)' },
  { id: '7-end-to-end-flow', number: '07', label: 'End-to-End Flow' },
  { id: '8-role-based-access-control-rbac', number: '08', label: 'RBAC' },
  { id: '9-audit-trail--hash-chain', number: '09', label: 'Audit Trail' },
  { id: '10-security-highlights', number: '10', label: 'Security' },
  { id: '11-testing', number: '11', label: 'Testing' },
  { id: '12-future-improvements', number: '12', label: 'Future Improvements' },
];

export default function Sidebar({ activeSection, onSectionClick }: SidebarProps) {
  const [, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      <nav className="sidebar-nav">
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
