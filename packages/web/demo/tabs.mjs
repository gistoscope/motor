function findTab(name) {
  const candidate =
    document.querySelector(`[data-role="tab-${name}"]`) ||
    document.querySelector(`[data-tab-role="${name}"]`) ||
    document.querySelector(`[data-role="demo-tab"][data-target="${name}"]`);
  return candidate?.closest?.('button') ?? candidate;
}

function findSection(name) {
  const primary =
    document.querySelector(`[data-section-role="${name}"]`) ||
    document.querySelector(`[data-role="section-${name}"]`);
  if (primary) {
    return primary;
  }

  if (name === 'engine') {
    return document.querySelector('[data-role="math-playground"]');
  }

  if (name === 'graphs') {
    const graph = document.querySelector('[data-role="graph-viewer"]');
    return graph?.closest?.('[data-role="demo-panel"]') ?? graph;
  }

  return null;
}

const tabEngine = findTab('engine');
const tabGraphs = findTab('graphs');
const sectionEngine = findSection('engine');
const sectionGraphs = findSection('graphs');

function toggleSection(element, isActive) {
  if (!element) {
    return;
  }
  element.classList.toggle('hidden', !isActive);
  if ('hidden' in element) {
    element.hidden = !isActive;
  }
}

function toggleTab(element, isActive) {
  if (!element) {
    return;
  }
  element.classList.toggle('active', isActive);
  element.classList.toggle('is-active', isActive);
  element.setAttribute('aria-selected', isActive ? 'true' : 'false');
  element.setAttribute('tabindex', isActive ? '0' : '-1');
  if (element.dataset) {
    element.dataset.state = isActive ? 'active' : 'inactive';
  }
}

function show(which) {
  const isEngine = which === 'engine';
  const isGraphs = which === 'graphs';
  toggleSection(sectionEngine, isEngine);
  toggleSection(sectionGraphs, isGraphs);
  toggleTab(tabEngine, isEngine);
  toggleTab(tabGraphs, isGraphs);
}

show('graphs');

tabEngine?.addEventListener('click', () => show('engine'));
tabGraphs?.addEventListener('click', () => show('graphs'));
