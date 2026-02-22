import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  children: string;
}

// Languages that have actual syntax highlighting
const HIGHLIGHTED_LANGS = ['ts', 'tsx', 'js', 'jsx', 'json', 'sql', 'bash', 'python', 'env', 'css', 'html'];

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const displayLang = language || 'text';
  const content = String(children).replace(/\n$/, '');
  const isHighlighted = HIGHLIGHTED_LANGS.includes(displayLang);

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <div className="code-block-dot">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="code-block-lang">{displayLang}</div>
      </div>
      {isHighlighted ? (
        <SyntaxHighlighter
          language={displayLang}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '20px',
            background: '#0d1117',
            borderRadius: 0,
            fontSize: '13px',
          }}
          codeTagProps={{
            style: {
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineHeight: '1.65',
            }
          }}
        >
          {content}
        </SyntaxHighlighter>
      ) : (
        <pre className="code-block-pre-raw">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}
