import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
// Remove unused import
import rehypeExternalLinks from "rehype-external-links";
import DOMPurify from "dompurify";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import GrammarRenderer from "./GrammarRenderer";
import 'katex/dist/katex.min.css';
import { Copy, Check } from 'lucide-react';
import MermaidRenderer from './MermaidRenderer';
import TypogramRenderer from './TypogramRenderer';
import AutomataRenderer from './AutomataRenderer';
import Image from 'next/image'; // Import Next.js Image component

interface MarkdownRendererProps {
  content: string;
}

const parseAndFormatContent = (content: string): string => {
  // Regular expression to match code blocks (with optional language)
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const segments: string[] = [];
  let lastIndex = 0;
  let match;

  // Iterate over code blocks and split text into non-code and code segments
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Sanitize text before the current code block
    const nonCodeSegment = content.substring(lastIndex, match.index);
    const sanitizedNonCode = DOMPurify.sanitize(nonCodeSegment, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style'],
      ADD_TAGS: ['script'],
      ADD_ATTR: ['type'],
    });
    segments.push(sanitizedNonCode);

    // Keep the code block intact, but trim the inner code
    const lang = match[1];
    const code = match[2].trim();
    segments.push(`\n\n<pre><code class="language-${lang}">${code}</code></pre>\n\n`);
    lastIndex = match.index + match[0].length;
  }
  // Sanitize any remaining part after the last code block
  const remaining = content.substr(lastIndex);
  const sanitizedRemaining = DOMPurify.sanitize(remaining, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
    ADD_TAGS: ['script'],
    ADD_ATTR: ['type'],
  });
  segments.push(sanitizedRemaining);

  // Return the combined content
  return segments.join("");
};

// Function to detect if a code string represents an FSM/automaton ASCII diagram
const isAutomataAscii = (code: string): boolean => {
  // Check for the typical pattern of ASCII-based state machine diagrams
  // Common patterns in ASCII automata: state identifiers (q0, q1), transition arrows (--->, <---), and the (final) marker
  const hasStateIdentifiers = /q\d+/i.test(code);
  const hasTransitionArrows = /(-{2,}>|<-{2,}|\|)/.test(code);
  const hasStateMarkers = /[\+\-]{3,}|[\(\[]final[\]\)]/.test(code);
  
  // Additional pattern checks for more complex state diagrams
  const hasStateBoxes = /\+-+\+/.test(code);
  
  return (hasStateIdentifiers && (hasTransitionArrows || hasStateMarkers || hasStateBoxes));
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // First, handle horizontal rules separately
  let processedContent = content.replace(
    /^ {0,3}([-*_]){3,}\s*$/gm,
    '\n\n<hr />\n\n'
  );
  // Use the new parser for improved sanitization (code blocks are preserved)
  processedContent = parseAndFormatContent(processedContent);

  // Additional replacements for spacing in lists and headings
  processedContent = processedContent
    .replace(/\n(#{1,6}\s)/g, "\n\n$1")
    .replace(/\n([*-]\s)/g, "\n$1")
    .replace(/\n(\d+\.\s)/g, "\n$1")
    .replace(/(\n\s*\n)/g, "$1\n");

  // Better handling for math expressions
  processedContent = processedContent
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => `\n\n$$${math.trim()}$$\n\n`)
    .replace(/\\\(/g, "$\$").replace(/\\\)/g, "$\$")
    .replace(/\$([^$\n]+?)\$/g, (match, math) => `$${math.trim().replace(/\s+/g, ' ')}$`)
    .replace(/\\vec\{([^}]*)\}/g, "\\vec{$1}")
    .replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, "\\sum_{$1}^{$2}")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "\\frac{$1}{$2}")
    .replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, "\\int_{$1}^{$2}")
    .replace(/\\frac\{d\}\{d([a-zA-Z])\}/g, "\\frac{d}{d$1}")
    .replace(/\\frac\{\\partial\}\{\\partial ([a-zA-Z])\}/g, "\\frac{\\partial}{\\partial $1}")
    .replace(/\\boxed\{([\s\S]*?)\}/g, "$1")
    .replace(/\\(sin|cos|tan|log|ln|exp|sec|csc|cot|arcsin|arccos|arctan)\{([^}]*)\}/g, "\\$1($2)")
    .replace(/([a-zA-Z])\s*\(\s*([a-zA-Z0-9+\-*/^_]+)\s*\)/g, "$1($2)")
    .replace(/\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}/g, "\\begin{matrix}$1\\end{matrix}")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\\theta/g, "θ")
    .replace(/\\lambda/g, "λ")
    .replace(/\\pi/g, "π")
    .replace(/\\sigma/g, "σ")
    .replace(/\\omega/g, "ω");

  return (
    <div className="prose max-w-none dark:prose-invert prose-lg">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkBreaks,
          remarkEmoji,
          [remarkMath, { singleDollarTextMath: true, doubleBacktickMathDisplay: false }],
        ]}
        rehypePlugins={[
          rehypeHighlight,
          [rehypeKatex, { strict: false, trust: true, macros: { "\\vec": "\\overrightarrow{#1}" } }],
          rehypeRaw,
          rehypeSlug,
          [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }],
        ]}
        components={{
          code(props) {
            const { className, children, ...restProps } = props as { className?: string; children: React.ReactNode; [key: string]: unknown };
            const isInline = !className || !/language-(\w+)/.test(className);
            if (isInline) {
              return <code className={`${className} text-base md:text-lg`} {...restProps}>{children}</code>;
            }
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, "");
            const language = match ? match[1] : '';
            // Typogram rendering for ASCII diagrams
            if (language === 'typogram') {
              return <TypogramRenderer source={codeString} zoom={0.3} debug={false} />;
            }
            // Grammar rendering for automata languages
            if (language === 'grammar') {
              return <GrammarRenderer grammar={codeString} />;
            }
            // Automata rendering for finite state machines
            if (language === 'automata') {
              return <AutomataRenderer automata={codeString} />;
            }
            // Detect Mermaid diagrams by keywords even if no language tag is provided
            const trimmed = codeString.trim();
            const mermaidKeywords = /^(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|pie|erDiagram)/;
            const isMermaid = (language === 'mermaid') || (!language && mermaidKeywords.test(trimmed));
            if (isMermaid) {
              return <MermaidRenderer chart={codeString} />;
            }
            
            // Enhanced ASCII FSM/automata diagram detection
            if (!language && isAutomataAscii(codeString)) {
              return (
                <div className="relative my-6">
                  <div className="px-3 py-1.5 bg-gray-800 text-xs text-gray-300 rounded-t-md border-b border-gray-700 flex justify-between items-center">
                    <span>Finite State Machine / Automaton Diagram (ASCII)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeString);
                        setCopiedCode(codeString);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      className="p-1 rounded hover:bg-gray-700 transition-colors"
                      aria-label="Copy diagram"
                    >
                      {copiedCode === codeString ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-gray-900 font-mono text-sm overflow-x-auto rounded-b-md whitespace-pre leading-snug text-gray-200 border border-gray-700">
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            }
            
            // Enhanced ASCII diagram detection
            const isNetworkDiagram = !language && codeString.includes('(') && 
              (codeString.includes('|') || codeString.includes('/') || codeString.includes('\\'));
            
            // General ASCII art pattern detection (improved)
            const asciiArtPattern = /[\/\\|\-_]{2,}|[A-Z]\([0-9]\)|[A-Z]\([0-9]+\)/;
            const multilineWithSpecialChars = codeString.split('\n').length > 1 && 
              (asciiArtPattern.test(codeString) || 
               /[|\/\\]{2,}/.test(codeString) || 
               (/\([0-9]+\)/.test(codeString) && /[A-Z][\/|\\]/.test(codeString)));
            
            const isAsciiArt = !language && (multilineWithSpecialChars || isNetworkDiagram);
            
            // Render ASCII diagrams with preserved whitespace and monospace font
            if (isAsciiArt) {
              return (
                <div className="relative group my-6">
                  <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 rounded-t-md border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span>ASCII Diagram</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeString);
                        setCopiedCode(codeString);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      className="p-1 rounded hover:bg-gray-700 transition-colors"
                      aria-label="Copy diagram"
                    >
                      {copiedCode === codeString ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 font-mono text-sm overflow-x-auto rounded-b-md whitespace-pre leading-snug">
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            }
            
            if (match) {
              return (
                <div className="relative group my-4 overflow-hidden rounded-lg bg-[#1E1E1E] dark:bg-[#1E1E1E] shadow-lg">
                 {/* Language display */}
                 <div className="flex items-center justify-between px-4 py-1.5 bg-[#2D2D2D] dark:bg-[#2D2D2D] text-gray-300 border-b border-[#3E3E3E]">
                   <span className="text-xs font-mono font-medium">{language}</span>
                   {/* Copy button */}
                   <button
                     onClick={() => {
                       navigator.clipboard.writeText(codeString);
                       setCopiedCode(codeString);
                       setTimeout(() => setCopiedCode(null), 2000);
                     }}
                     className="p-1 rounded hover:bg-gray-700 transition-colors"
                     aria-label="Copy code"
                   >
                     {copiedCode === codeString ? (
                       <Check className="h-4 w-4 text-green-500" />
                     ) : (
                       <Copy className="h-4 w-4 text-gray-400" />
                     )}
                   </button>
                 </div>

                 {/* Enhanced code syntax highlighting */}
                    <div className="syntax-highlighting-wrapper font-mono text-[15px] p-4">
                      <SyntaxHighlighter
                        style={{
                          ...vscDarkPlus,
                          'hljs-keyword':    { color: '#C678DD', fontWeight: '600' },
                          'hljs-built_in':   { color: '#61AFEF' },
                          'hljs-string':     { color: '#98C379' },
                          'hljs-literal':    { color: '#56B6C2' },
                          'hljs-number':     { color: '#D19A66' },
                          'hljs-comment':    { color: '#5C6370', fontStyle: 'italic' },
                          'hljs-function':   { color: '#E5C07B' },
                          'hljs-params':     { color: '#ABB2BF' },
                          'hljs-variable':   { color: '#E06C75' },
                          'hljs-operator':   { color: '#56B6C2' },
                          'hljs-punctuation':{ color: '#ABB2BF' },
                          'hljs-property':   { color: '#61AFEF' },
                          'hljs-title':      { color: '#E5C07B' }
                        }}
                        language={language}
                        showLineNumbers={true}
                        wrapLines={false}
                        customStyle={{
                          margin: 0,
                          padding: 0,
                          backgroundColor: 'transparent',
                          lineHeight: 1.5,
                          fontSize: '0.95em',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                        }}
                        codeTagProps={{ style: { fontSize: 'inherit', lineHeight: 'inherit' } }}
                        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', marginRight: '1em', textAlign: 'right', borderRight: '1px solid #4B5563', color: '#0c0c0c', fontSize: '0.85em', userSelect: 'none' }}
                        lineProps={() => ({ style: { display: 'table-row', width: '100%' } })}
                        wrapLongLines={true}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  </div>
              );
            }
            return <code className={`${className} text-base md:text-lg`} {...restProps}>{children}</code>;
          },
          pre({ children }) { return <div>{children}</div>; },
          img({ src, alt, ...props }) { 
            if (!src) return null;
            
            // Destructure and omit potential width and height props to satisfy Next.js Image requirements
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { width: _width, height: _height, ...restProps } = props as React.ComponentPropsWithoutRef<'img'>;
            
            return (
              <span className="relative block w-full max-w-full my-4">
                <div className="relative w-full max-w-full" style={{ maxHeight: '500px' }}>
                  <Image 
                    src={src} 
                    alt={alt || ""} 
                    className="rounded-lg object-contain mx-auto" 
                    fill 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    style={{ objectFit: 'contain' }}
                    priority={false}
                    {...restProps} 
                  />
                </div>
                {alt && <span className="block text-center text-sm md:text-base text-gray-500 mt-1">{alt}</span>}
              </span>
            );
          },
          table({ children }) { return (<div className="overflow-x-auto my-4"><table className="border-collapse w-full border border-gray-700 text-base md:text-lg">{children}</table></div>); },
          th({ children }) { return <th className="border border-gray-700 bg-gray-800 px-4 py-2 text-left text-base md:text-lg">{children}</th>; },
          td({ children }) { return <td className="border border-gray-700 px-4 py-2 text-base md:text-lg">{children}</td>; },
          blockquote({ children }) { return <blockquote className="border-l-4 pl-4 italic my-4 text-lg md:text-xl">{children}</blockquote>; },
          h1({ children }) { return <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>; },
          h2({ children }) { return <h2 className="text-2xl font-bold mt-5 mb-3">{children}</h2>; },
          h3({ children }) { return <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>; },
          ul({ children }) { return <ul className="list-disc list-inside pl-4 my-4 space-y-1 text-base md:text-lg">{children}</ul>; },
          ol({ children }) { return <ol className="list-decimal list-inside pl-4 my-4 space-y-1 text-base md:text-lg">{children}</ol>; },
          li({ children }) { return <li className="text-base md:text-lg flex"><span className="mr-2">•</span><span className="flex-1">{children}</span></li>; },
          p({ children }) { return <p className="text-base md:text-lg my-3">{children}</p>; },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
