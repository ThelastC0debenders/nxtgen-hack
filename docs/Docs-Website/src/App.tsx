import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import Sidebar from './components/Sidebar';
import CodeBlock from './components/CodeBlock';
import './index.css';

// We'll fetch the markdown at runtime
function App() {
  const [markdown, setMarkdown] = useState('');
  const [activeSection, setActiveSection] = useState('1-project-overview');

  useEffect(() => {
    fetch('/src/content.md')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.text();
      })
      .then(text => setMarkdown(text))
      .catch(() => {
        // Fallback: try the public path
        fetch('/content.md')
          .then(res => res.text())
          .then(text => setMarkdown(text))
          .catch(console.error);
      });
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (!markdown) return;

    const headings = document.querySelectorAll('.markdown-body h2[id]');
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the first visible one
          const id = visible[0].target.getAttribute('id');
          if (id) setActiveSection(id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    headings.forEach(h => observer.observe(h));
    return () => observer.disconnect();
  }, [markdown]);

  const handleSectionClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  // Generate slug from heading text
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Custom components for react-markdown
  const components: Components = {
    h1: () => null, // We render the hero manually
    h2: ({ children }) => {
      const text = String(children);
      const id = slugify(text);
      return (
        <h2 id={id} className="section-anchor">
          {children}
        </h2>
      );
    },
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    code: ({ className, children, node, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      
      // Check if this code is inside a <pre> (block-level code) 
      // by checking the parent node
      const isBlock = node?.position && String(children).includes('\n');
      const isInline = !className && !isBlock;

      if (isInline) {
        return <code {...props}>{children}</code>;
      }

      return (
        <CodeBlock language={match ? match[1] : 'text'}>
          {String(children)}
        </CodeBlock>
      );
    },
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => <table>{children}</table>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  };

  if (!markdown) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: '#00ff88',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '14px',
        letterSpacing: '2px',
      }}>
        LOADING DOCUMENTATION...
      </div>
    );
  }

  // Strip the H1 and TOC from the top of the markdown for manual hero rendering
  const normalized = markdown.replace(/\r\n/g, '\n');
  const contentWithoutHero = normalized
    .replace(/^#\s+[^\n]*\n/, '')
    .replace(/## Table of Contents\n[\s\S]*?\n---\n/, '\n---\n');

  return (
    <div className="app-layout">
      <Sidebar activeSection={activeSection} onSectionClick={handleSectionClick} />

      <main className="main-content">
        {/* Hero */}
        <div className="doc-hero">
          <h1>
            NxtGen <span className="green">Hack</span>
          </h1>
          <p className="doc-hero-tagline">
            Invoice Verification & Fraud Intelligence Platform — real-time verification,
            AI-powered fraud scoring, and immutable audit trails.
          </p>
          <div className="doc-hero-badges">
            <span className="doc-hero-badge">● React 19 + Vite</span>
            <span className="doc-hero-badge">● Express + PostgreSQL</span>
            <span className="doc-hero-badge">● FastAPI + Isolation Forest</span>
            <span className="doc-hero-badge">● SHA-256 Hash Chain</span>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {contentWithoutHero}
          </ReactMarkdown>
        </div>
      </main>
    </div>
  );
}

export default App;
