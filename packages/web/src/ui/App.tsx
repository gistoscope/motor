import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// Lazy import to avoid pulling dev route if not needed
const StepDevRoute = React.lazy(() => import('../routes/dev/step/StepDevRoute'));
const MicroViewerRoute = React.lazy(() => import('../routes/micro/MicroViewerRoute'));

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
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 24,
          padding: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          maxWidth: 360,
          background: '#fff',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>MicroViewer</h2>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.4 }}>
          Explore KaTeX rendering with bracket pairing at <code>/micro</code>.
        </p>
        <a href="/micro" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}>
          Open MicroViewer demo
        </a>
      </section>
      {EXP ? (
        <div>
          <p>Development tools are enabled.</p>
          <a href="/dev/step" style={{ color: '#2563eb', textDecoration: 'underline' }}>/dev/step</a>
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
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const atDevStep = pathname.startsWith('/dev/step');
  const atMicro = pathname.startsWith('/micro');

  let content: React.ReactNode = <DevHome />;

  if (atMicro) {
    content = <MicroViewerRoute />;
  } else if (EXP && atDevStep) {
    content = <StepDevRoute />;
  }

  return (
    <ErrorBoundary>
      <React.Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
        {content}
      </React.Suspense>
    </ErrorBoundary>
  );
}
