import { BlockMath, InlineMath } from 'react-katex';

interface MathRendererProps {
  text: string;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
  '⁼': '=',
  '⁽': '(',
  '⁾': ')',
  'ⁿ': 'n',
  'ᵃ': 'a',
  'ᵇ': 'b',
  'ᶜ': 'c',
  'ᵈ': 'd',
  'ᵉ': 'e',
  'ᶠ': 'f',
  'ᵍ': 'g',
  'ʰ': 'h',
  'ⁱ': 'i',
  'ʲ': 'j',
  'ᵏ': 'k',
  'ˡ': 'l',
  'ᵐ': 'm',
  'ᵒ': 'o',
  'ᵖ': 'p',
  'ʳ': 'r',
  'ˢ': 's',
  'ᵗ': 't',
  'ᵘ': 'u',
  'ᵛ': 'v',
  'ʷ': 'w',
  'ˣ': 'x',
  'ʸ': 'y',
  'ᶻ': 'z',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '₊': '+',
  '₋': '-',
  '₌': '=',
  '₍': '(',
  '₎': ')',
  'ₐ': 'a',
  'ₑ': 'e',
  'ₕ': 'h',
  'ᵢ': 'i',
  'ⱼ': 'j',
  'ₖ': 'k',
  'ₗ': 'l',
  'ₘ': 'm',
  'ₙ': 'n',
  'ₒ': 'o',
  'ₚ': 'p',
  'ᵣ': 'r',
  'ₛ': 's',
  'ₜ': 't',
  'ᵤ': 'u',
  'ᵥ': 'v',
  'ₓ': 'x',
};

function convertUnicodeScripts(input: string): string {
  let output = '';
  for (const char of input) {
    if (SUPERSCRIPT_MAP[char]) {
      output += `^${SUPERSCRIPT_MAP[char]}`;
    } else if (SUBSCRIPT_MAP[char]) {
      output += `_${SUBSCRIPT_MAP[char]}`;
    } else {
      output += char;
    }
  }
  return output;
}

function normalizePlainMath(text: string): string {
  let normalized = text
    .replace(/\u2212/g, '-')
    .replace(/\u00d7/g, '\\times ')
    .replace(/\u00f7/g, '\\div ')
    .replace(/\u2264/g, '\\le ')
    .replace(/\u2265/g, '\\ge ')
    .replace(/\u2260/g, '\\ne ')
    .replace(/\u03c0/g, '\\pi ')
    .replace(/\u03b8/g, '\\theta ')
    .replace(/\u03b1/g, '\\alpha ')
    .replace(/\u03b2/g, '\\beta ')
    .replace(/\u221e/g, '\\infty ')
    .replace(/\u00b0/g, '^{\\circ}');

  normalized = convertUnicodeScripts(normalized);

  // Advanced patterns
  normalized = normalized.replace(/∛\s*([A-Za-z0-9().+\-]+)/g, '\\sqrt[3]{$1}');
  normalized = normalized.replace(/√\s*([A-Za-z0-9().+\-]+)/g, '\\sqrt{$1}');
  
  // Fractions: detect "number / number" or "(expr) / (expr)"
  normalized = normalized.replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');
  
  // Powers: detect basic variable^exponent
  normalized = normalized.replace(/([A-Za-z0-9)])\^([A-Za-z0-9+\-()]+)/g, '$1^{$2}');
  normalized = normalized.replace(/([A-Za-z0-9)])_([A-Za-z0-9+\-()]+)/g, '$1_{$2}');

  return normalized;
}

function shouldRenderAsMath(text: string): boolean {
  // Catch standard math symbols, greek letters, or algebraic expressions
  const hasMathSymbols = /[√∛≤≥≠πθαβ∞²³⁻₀-₉]/.test(text);
  const hasLatexCommands = /\\(sqrt|times|div|pi|theta|alpha|beta|le|ge|ne|frac|hat|bar|vec|infinity)/.test(text);
  const hasAlgebraicPattern = /([a-z]\s*[+\-/*=]\s*[a-z0-9])|([0-9]\s*[+\-/*=]\s*[a-z])|(\d+\^)/i.test(text);
  
  return hasMathSymbols || hasLatexCommands || hasAlgebraicPattern;
}

function preprocessText(text: string): string {
  const lines = text.split('\n');
  const processed = lines.map((line) => {
    if (!line.trim()) return line;
    if (line.includes('$')) return line;
    const normalized = normalizePlainMath(line);
    return shouldRenderAsMath(normalized) ? `$${normalized}$` : line;
  });
  return processed.join('\n');
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text }) => {
  if (!text) return null;

  const prepared = preprocessText(text);
  const parts = prepared.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <span className="math-container">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          return <BlockMath key={index} math={math} />;
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          return <InlineMath key={index} math={math} />;
        }
        return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
      })}
    </span>
  );
};

export default MathRenderer;
