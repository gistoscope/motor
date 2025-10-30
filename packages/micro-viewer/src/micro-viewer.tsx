import React from 'react';
import katex from './vendor/katex';
import '../vendor/katex/katex.css';
import './styles.css';

export interface MicroViewerProps {
  latex: string;
  plain?: string;
  className?: string;
  statusLabel?: string;
  'data-testid'?: string;
}

const DEFAULT_STATUS = 'Hover or focus a bracket to highlight its pair.';

const BRACKET_ID_PATTERN = /^mv-bracket-([^\s]+)-(open|close)$/;

function normalizeBracketNode(node: HTMLElement): { pair: string; role: string | null } | null {
  let pair: string | undefined;
  let role: string | null | undefined;

  const raw = node.dataset.bracket ?? '';
  if (raw) {
    const [fromDataPair, fromDataRole] = raw.split(':');
    if (fromDataPair) {
      pair = fromDataPair;
      role = fromDataRole ?? null;
    }
  }

  if (!pair && node.id) {
    const match = node.id.match(BRACKET_ID_PATTERN);
    if (match) {
      pair = match[1];
      role = (match[2] as 'open' | 'close') ?? null;
    }
  }

  if (!pair) {
    return null;
  }

  node.dataset.bracketPair = pair;
  if (role) {
    node.dataset.bracketRole = role;
  } else {
    node.removeAttribute('data-bracket-role');
  }
  node.dataset.bracket = role ? `${pair}:${role}` : pair;
  node.setAttribute('tabindex', '0');
  return { pair, role: role ?? null };
}

function cleanupBracketNode(node: HTMLElement): void {
  node.removeAttribute('data-bracket');
  node.removeAttribute('data-bracket-pair');
  node.removeAttribute('data-bracket-role');
  node.removeAttribute('data-bracket-active');
  node.removeAttribute('tabindex');
}

export function MicroViewer({
  latex,
  plain,
  className,
  statusLabel = DEFAULT_STATUS,
  'data-testid': dataTestId,
}: MicroViewerProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [activePair, setActivePair] = React.useState<string | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    try {
      katex.render(latex, container, {
        throwOnError: false,
        trust: true,
      });
    } catch (error) {
      console.warn('[MicroViewer] Failed to render KaTeX expression', error);
      container.textContent = plain ?? latex ?? '';
    }

    const bracketNodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-bracket], [id^="mv-bracket-"]'),
    ).filter((node) => normalizeBracketNode(node));

    const handleEnter = (event: Event) => {
      const target = event.currentTarget as HTMLElement | null;
      if (!target) {
        return;
      }
      const pair = target.dataset.bracketPair;
      if (pair) {
        setActivePair(pair);
      }
    };
    const handleLeave = () => {
      setActivePair(null);
    };

    bracketNodes.forEach((node) => {
      node.addEventListener('mouseenter', handleEnter);
      node.addEventListener('mouseleave', handleLeave);
      node.addEventListener('focus', handleEnter);
      node.addEventListener('blur', handleLeave);
    });

    return () => {
      bracketNodes.forEach((node) => {
        node.removeEventListener('mouseenter', handleEnter);
        node.removeEventListener('mouseleave', handleLeave);
        node.removeEventListener('focus', handleEnter);
        node.removeEventListener('blur', handleLeave);
        cleanupBracketNode(node);
      });
      container.innerHTML = '';
    };
  }, [latex, plain]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const bracketNodes = Array.from(
      container.querySelectorAll<HTMLElement>('[data-bracket-pair]'),
    );
    bracketNodes.forEach((node) => {
      if (node.dataset.bracketPair === activePair) {
        node.dataset.bracketActive = 'true';
      } else {
        delete node.dataset.bracketActive;
      }
    });
  }, [activePair]);

  const statusMessage = activePair ? `Active pair: ${activePair}` : statusLabel;
  const classes = ['micro-viewer', className].filter(Boolean).join(' ');

  return (
    <div className={classes} data-testid={dataTestId ?? 'micro-viewer'}>
      <div className="micro-viewer__surface" data-active={activePair ? 'true' : undefined}>
        <div ref={containerRef} data-testid="micro-viewer-katex" />
      </div>
      <div className="micro-viewer__status" data-testid="micro-viewer-status">
        {statusMessage}
      </div>
    </div>
  );
}
