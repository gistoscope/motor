export function initTabs(root = document) {
  const engineTab = root.querySelector('[data-tab="engine"]');
  const graphsTab = root.querySelector('[data-tab="graphs"]');
  const enginePane = root.querySelector('[data-pane="engine"]');
  const graphsPane = root.querySelector('[data-pane="graphs"]');

  if (!engineTab || !graphsTab || !enginePane || !graphsPane) {
    return;
  }

  const select = (which) => {
    const isEngine = which === 'engine';
    engineTab.setAttribute('aria-selected', isEngine ? 'true' : 'false');
    graphsTab.setAttribute('aria-selected', isEngine ? 'false' : 'true');
    enginePane.hidden = !isEngine;
    graphsPane.hidden = isEngine;
  };

  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    select(tab === 'engine' ? 'engine' : 'graphs');
  } catch (error) {
    select('graphs');
  }

  const onEngineClick = (event) => {
    event.preventDefault();
    select('engine');
  };

  const onGraphsClick = (event) => {
    event.preventDefault();
    select('graphs');
  };

  engineTab.addEventListener('click', onEngineClick);
  graphsTab.addEventListener('click', onGraphsClick);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initTabs(document);
  });
}
