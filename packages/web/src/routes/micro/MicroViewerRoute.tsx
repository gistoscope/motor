import React from 'react';
import { MicroViewer } from '@motor/micro-viewer';

interface SampleExpression {
  id: string;
  label: string;
  latex: string;
  plain?: string;
  description: string;
}

const SAMPLES: SampleExpression[] = [
  {
    id: 'nested',
    label: 'Nested parentheses',
    latex:
      '\\htmlId{mv-bracket-0-open}{(}x + \\htmlId{mv-bracket-1-open}{(}y + 1\\htmlId{mv-bracket-1-close}{)}' +
      '\\htmlId{mv-bracket-0-close}{)}^2',
    plain: '(x + (y + 1))^2',
    description: 'Highlights nested pairs and shows how multiple levels interact.',
  },
  {
    id: 'fraction',
    label: 'Fraction with braces',
    latex:
      '\\frac{\\htmlId{mv-bracket-2-open}{\\lbrace}a + b\\htmlId{mv-bracket-2-close}{\\rbrace}}' +
      '{\\htmlId{mv-bracket-3-open}{\\langle}c + d\\htmlId{mv-bracket-3-close}{\\rangle}}',
    plain: '{a + b}/{⟨c + d⟩}',
    description: 'Mixes different bracket glyphs to ensure the hover logic stays in sync.',
  },
  {
    id: 'series',
    label: 'Series upper bound',
    latex:
      '\\sum_{n=1}^{\\htmlId{mv-bracket-4-open}{(}k + 1\\htmlId{mv-bracket-4-close}{)}}' +
      '\\,\\frac{1}{n^2}',
    plain: '∑_{n=1}^{(k + 1)} 1/n^2',
    description: 'Demonstrates hover markers inside exponents.',
  },
];

export default function MicroViewerRoute(): React.ReactElement {
  const [activeId, setActiveId] = React.useState<string>(SAMPLES[0]?.id ?? '');
  const activeSample = React.useMemo(() => {
    return SAMPLES.find((sample) => sample.id === activeId) ?? SAMPLES[0];
  }, [activeId]);

  return (
    <div
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        background: '#f8fafc',
        minHeight: '100vh',
      }}
      data-testid="micro-viewer-page"
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>MicroViewer Demo</h1>
        <p style={{ margin: 0, maxWidth: '640px', color: '#475569', lineHeight: 1.5 }}>
          Select a sample expression to preview KaTeX rendering and verify bracket-pair highlighting.
          Hover or focus a bracket to see the matching glyphs light up.
        </p>
      </header>

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignSelf: 'flex-start',
          background: '#fff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
        }}
      >
        <label
          htmlFor="micro-sample"
          style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
        >
          Sample expression
        </label>
        <select
          id="micro-sample"
          value={activeSample?.id ?? ''}
          onChange={(event) => setActiveId(event.target.value)}
          style={{
            fontSize: '1rem',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5f5',
            background: '#f1f5f9',
            color: '#0f172a',
            minWidth: '220px',
          }}
          data-testid="micro-sample-select"
        >
          {SAMPLES.map((sample) => (
            <option key={sample.id} value={sample.id}>
              {sample.label}
            </option>
          ))}
        </select>
        <p style={{ margin: 0, color: '#475569', maxWidth: '420px', lineHeight: 1.45 }}>
          {activeSample?.description}
        </p>
      </section>

      {activeSample ? (
        <MicroViewer latex={activeSample.latex} plain={activeSample.plain} />
      ) : null}
    </div>
  );
}
