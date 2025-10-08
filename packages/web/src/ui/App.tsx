import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// Lazy import to avoid pulling dev route if not needed
const StepDevRoute = React.lazy(() => import('../routes/dev/step/StepDevRoute'));
const HighlightDemoRoute = React.lazy(() => import('../routes/demo/highlight/HighlightDemoRoute'));

const isTrue = (v: any) => {
  if (v === true) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
};
const EXP = isTrue(import.meta.env.VITE_EXPERIMENTAL_M0);

function DevHome() {
  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ margin: '8px 0 16px' }}>Motor Dev</h1>
      {EXP ? (
        <div>
          <p>Development tools are enabled.</p>
          <a href="/dev/step" style={{ color: '#2563eb', textDecoration: 'underline' }}>/dev/step</a>
          <br />
          <a href="/demo/highlight" style={{ color: '#2563eb', textDecoration: 'underline' }}>/demo/highlight</a>
        </div>
      ) : (
        <div style={{ color: '#555' }}>
          <p>Set <code>VITE_EXPERIMENTAL_M0=true</code> to enable development routes.</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Minimal router to avoid external deps: render StepDevRoute only when path matches
  const atDevStep = typeof window !== 'undefined' && window.location.pathname.startsWith('/dev/step');
  const atHighlightDemo = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo/highlight');

  return (
    <ErrorBoundary>
      <React.Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
        {EXP && atDevStep ? (
          <StepDevRoute />
        ) : EXP && atHighlightDemo ? (
          <HighlightDemoRoute />
        ) : (
          <DevHome />
        )}
      </React.Suspense>
    </ErrorBoundary>
  );
}
