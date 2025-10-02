import React, { useCallback, useMemo, useState } from 'react';
import { applyStep, STEP_EXAMPLES, type StepExample, type StepResult } from '@motor/tsa';

const pageStyle: React.CSSProperties = {
  fontFamily: 'Inter, system-ui, sans-serif',
  minHeight: '100vh',
  background: '#f5f7fb',
  color: '#121418',
  padding: '32px 24px'
};

const contentStyle: React.CSSProperties = {
  display: 'grid',
  gap: 24,
  gridTemplateColumns: '280px minmax(320px, 1fr) minmax(320px, 1fr)',
  alignItems: 'start'
};

const panelStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e1e6ef',
  boxShadow: '0 6px 20px rgba(24, 32, 56, 0.08)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 16
};

const fractionContainer: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  margin: '0 6px',
  fontWeight: 600
};

const fractionBar: React.CSSProperties = {
  width: '100%',
  borderTop: '2px solid currentColor',
  margin: '4px 0'
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 16px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer'
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#f0f2f8',
  color: '#2b303a'
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#1f60ff',
  color: '#fff'
};

const ExampleButton: React.FC<{
  example: StepExample;
  onSelect: (example: StepExample) => void;
  isActive: boolean;
}> = ({ example, onSelect, isActive }) => (
  <button
    type="button"
    onClick={() => onSelect(example)}
    style={{
      ...secondaryButtonStyle,
      width: '100%',
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '12px 14px',
      border: isActive ? '2px solid #1f60ff' : '1px solid #d7dce8',
      background: isActive ? '#e8f0ff' : secondaryButtonStyle.background
    }}
  >
    <span style={{ fontWeight: 700, fontSize: 15 }}>{example.title}</span>
    <span style={{ fontSize: 13, color: '#3f4756' }}>{example.description}</span>
  </button>
);

const renderFraction = (numerator: string, denominator: string, key: string) => (
  <span key={key} style={fractionContainer}>
    <span>{numerator}</span>
    <span style={fractionBar} />
    <span>{denominator}</span>
  </span>
);

const renderExpression = (expression: string) => {
  const nodes: React.ReactNode[] = [];
  const fractionPattern = /(\b-?\d+)\s*\/\s*(\d+\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = fractionPattern.exec(expression);
  let counter = 0;

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(expression.slice(lastIndex, match.index));
    }
    nodes.push(renderFraction(match[1], match[2], `frac-${counter++}`));
    lastIndex = match.index + match[0].length;
    match = fractionPattern.exec(expression);
  }

  if (lastIndex < expression.length) {
    nodes.push(expression.slice(lastIndex));
  }

  return <span style={{ fontSize: 20 }}>{nodes}</span>;
};

const ResultView: React.FC<{ result: StepResult | null }> = ({ result }) => {
  if (!result) {
    return <p style={{ color: '#6c7384' }}>Enter a step to preview the outcome.</p>;
  }

  if (result.status === 'error') {
    return (
      <div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{result.reason.code}</div>
        <div style={{ color: '#6c7384', fontSize: 15 }}>{result.reason.message}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Next expression</div>
      <div>{renderExpression(result.expression)}</div>
    </div>
  );
};

const DevStepPage: React.FC = () => {
  const examples = useMemo(() => STEP_EXAMPLES, []);
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<StepResult | null>(null);
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  const runApply = useCallback(
    (value: string) => {
      const response = applyStep(value);
      setResult(response);
      return response;
    },
    []
  );

  const handleApply = useCallback(() => {
    runApply(inputValue);
  }, [inputValue, runApply]);

  const handleExampleSelect = useCallback(
    (example: StepExample) => {
      setInputValue(example.expression);
      setActiveExampleId(example.id);
      runApply(example.expression);
    },
    [runApply]
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    setResult(null);
    setActiveExampleId(null);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleApply();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClear();
      }
    },
    [handleApply, handleClear]
  );

  return (
    <div style={pageStyle}>
      <header style={{ marginBottom: 24 }}>
        <span style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: 1.4, color: '#647196' }}>
          Dev tools
        </span>
        <h1 style={{ fontSize: 32, marginTop: 8, marginBottom: 8 }}>Step builder</h1>
        <p style={{ color: '#4b5465', maxWidth: 680 }}>
          Explore experimental step transformations. Apply a step description to see the resulting expression or
          validation reason.
        </p>
      </header>
      <div style={contentStyle}>
        <aside style={{ ...panelStyle, gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Examples</h2>
            <p style={{ fontSize: 13, color: '#6c7384' }}>Tap an example to preload the step and run it instantly.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {examples.map(example => (
              <ExampleButton
                key={example.id}
                example={example}
                onSelect={handleExampleSelect}
                isActive={activeExampleId === example.id}
              />
            ))}
          </div>
        </aside>
        <section style={{ ...panelStyle, gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Step input</h2>
            <p style={{ fontSize: 13, color: '#6c7384' }}>Enter a step description and press Enter to apply.</p>
          </div>
          <textarea
            value={inputValue}
            onChange={event => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the step you want to apply"
            rows={6}
            style={{
              resize: 'vertical',
              minHeight: 160,
              fontSize: 16,
              lineHeight: 1.5,
              padding: 14,
              borderRadius: 12,
              border: '1px solid #c9d3e6',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={handleApply} style={primaryButtonStyle}>
              Apply step
            </button>
            <button type="button" onClick={handleClear} style={secondaryButtonStyle}>
              Clear
            </button>
            <span style={{ fontSize: 12, color: '#6c7384' }}>Enter = Apply · Esc = Clear</span>
          </div>
        </section>
        <section style={{ ...panelStyle, gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>Result</h2>
            <p style={{ fontSize: 13, color: '#6c7384' }}>See the transformed expression or the rejection reason.</p>
          </div>
          <ResultView result={result} />
        </section>
      </div>
    </div>
  );
};

export default DevStepPage;
