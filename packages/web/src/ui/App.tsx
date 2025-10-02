import React, { useEffect, useMemo, useState } from 'react';
import StageOneDemo from './StageOneDemo';
import DevStepPage from '../routes/dev/step/DevStepPage';

const DEV_STEP_ROUTE_PREFIX = '/dev/step';

const normalizeFlagValue = (value: string | null): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return 'true';
  return null;
};

const searchHasExperimentalFlag = (search: string): boolean => {
  const params = new URLSearchParams(search);
  const direct = normalizeFlagValue(params.get('EXPERIMENTAL_M0'));
  if (direct === 'true') return true;
  const flagParams = params.getAll('flag');
  for (const flagParam of flagParams) {
    const parts = flagParam
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
    if (parts.some(part => part.toUpperCase() === 'EXPERIMENTAL_M0')) {
      return true;
    }
  }
  return false;
};

const hasExperimentalAccess = (): boolean => {
  if (typeof window === 'undefined') return false;
  if ((import.meta as any)?.env?.VITE_EXPERIMENTAL_M0 === 'true') return true;
  if (searchHasExperimentalFlag(window.location.search)) return true;
  try {
    if (window.localStorage.getItem('EXPERIMENTAL_M0') === 'true') return true;
    if (window.sessionStorage.getItem('EXPERIMENTAL_M0') === 'true') return true;
  } catch (error) {
    console.warn('Failed to inspect storage for experimental flag', error);
  }
  return false;
};

const ExperimentalAccessRequired: React.FC = () => (
  <div
    style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: 24,
      maxWidth: 720,
      margin: '80px auto',
      lineHeight: 1.6
    }}
  >
    <h1 style={{ fontSize: 32, marginBottom: 16 }}>Experimental access required</h1>
    <p>
      The <code>/dev/step</code> tooling is behind the <strong>EXPERIMENTAL_M0</strong> flag.
    </p>
    <p style={{ marginTop: 12 }}>
      Enable the flag via query string (<code>?EXPERIMENTAL_M0=1</code>) or by setting{' '}
      <code>localStorage.EXPERIMENTAL_M0 = 'true'</code> before visiting this route.
    </p>
  </div>
);

const getInitialPath = () => {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
};

export default function App() {
  const [path, setPath] = useState<string>(getInitialPath);
  const [hasAccess, setHasAccess] = useState<boolean>(() => hasExperimentalAccess());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleNavigation = () => {
      setPath(window.location.pathname || '/');
      setHasAccess(hasExperimentalAccess());
    };
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'EXPERIMENTAL_M0') {
        setHasAccess(hasExperimentalAccess());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    setHasAccess(hasExperimentalAccess());
  }, [path]);

  const isDevStepRoute = useMemo(() => path.startsWith(DEV_STEP_ROUTE_PREFIX), [path]);

  if (isDevStepRoute) {
    return hasAccess ? <DevStepPage /> : <ExperimentalAccessRequired />;
  }

  return <StageOneDemo />;
}
