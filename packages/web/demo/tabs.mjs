const $ = (selector, root = document) => root.querySelector(selector);

const tabGraphs =
  $('[data-role="tab-graphs"]') ||
  $('[data-tab-role="graphs"]') ||
  $('[data-role="demo-tab"][data-target="graphs"]');
const tabEngine =
  $('[data-role="tab-engine"]') ||
  $('[data-tab-role="engine"]') ||
  $('[data-role="demo-tab"][data-target="engine"]');

const sectionGraphs =
  $('[data-role="section-graphs"]') ||
  $('[data-section-role="graphs"]') ||
  $('[data-role="graph-viewer"]');
const sectionEngine =
  $('[data-role="section-engine"]') ||
  $('[data-section-role="engine"]') ||
  $('[data-role="math-playground"]');

const panelGraphs = sectionGraphs?.closest?.('[data-role="demo-panel"]');
const panelEngine = sectionEngine?.closest?.('[data-role="demo-panel"]');

const setHidden = (element, hidden) => {
  if (!element) {
    return;
  }
  element.classList.toggle('hidden', hidden);
  if ('hidden' in element) {
    element.hidden = hidden;
  }
  if (element.dataset) {
    element.dataset.state = hidden ? 'inactive' : 'active';
  }
};

const setTabState = (tab, isActive) => {
  if (!tab) {
    return;
  }
  tab.classList.toggle('active', isActive);
  tab.classList.toggle('is-active', isActive);
  tab.setAttribute('aria-selected', String(isActive));
  tab.setAttribute('tabindex', isActive ? '0' : '-1');
  if (tab.dataset) {
    tab.dataset.state = isActive ? 'active' : 'inactive';
  }
};

const persistActiveTab = (which) => {
  try {
    localStorage.setItem('motor.activeTab', which);
  } catch (error) {
    // Ignore storage failures (private mode, etc.)
  }
};

const readStoredTab = () => {
  try {
    return localStorage.getItem('motor.activeTab');
  } catch (error) {
    return null;
  }
};

function show(which) {
  const isGraphs = which === 'graphs';

  setHidden(sectionGraphs, !isGraphs);
  setHidden(panelGraphs, !isGraphs);
  setHidden(sectionEngine, isGraphs);
  setHidden(panelEngine, isGraphs);

  setTabState(tabGraphs, isGraphs);
  setTabState(tabEngine, !isGraphs);

  persistActiveTab(which);

  const desiredHash = `#${which}`;
  if (location.hash !== desiredHash) {
    history.replaceState(null, '', desiredHash);
  }
}

function init() {
  const hash = (location.hash || '').replace('#', '');
  const saved = readStoredTab();
  const initial = hash === 'engine' || hash === 'graphs' ? hash : saved || 'graphs';

  show(initial);

  tabGraphs?.addEventListener('click', () => show('graphs'));
  tabEngine?.addEventListener('click', () => show('engine'));
}

init();
