const $ = (selector, root = document) => root.querySelector(selector);

const tabGraphs = $('[data-role="tab-graphs"]');
const tabEngine = $('[data-role="tab-engine"]');

const sectionGraphs = $('[data-role="section-graphs"]') || $('[data-role="graph-viewer"]');
const sectionEngine = $('[data-role="section-engine"]') || $('[data-role="math-playground"]');
const panelGraphs = sectionGraphs?.closest('[data-role="demo-panel"]');
const panelEngine = sectionEngine?.closest('[data-role="demo-panel"]');

const toggleHidden = (element, hidden) => {
  if (!element) {
    return;
  }
  element.classList.toggle('hidden', hidden);
  if ('hidden' in element) {
    element.hidden = hidden;
  }
};

function show(which) {
  const isGraphs = which === 'graphs';

  toggleHidden(sectionGraphs, !isGraphs);
  toggleHidden(panelGraphs, !isGraphs);
  toggleHidden(sectionEngine, isGraphs);
  toggleHidden(panelEngine, isGraphs);

  tabGraphs && tabGraphs.classList.toggle('active', isGraphs);
  tabEngine && tabEngine.classList.toggle('active', !isGraphs);

  tabGraphs && tabGraphs.setAttribute('aria-selected', String(isGraphs));
  tabEngine && tabEngine.setAttribute('aria-selected', String(!isGraphs));
  tabGraphs && tabGraphs.setAttribute('tabindex', isGraphs ? '0' : '-1');
  tabEngine && tabEngine.setAttribute('tabindex', isGraphs ? '-1' : '0');

  try {
    localStorage.setItem('motor.activeTab', which);
  } catch (error) {
    // Ignore storage failures (private mode, etc.)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = (() => {
    try {
      return localStorage.getItem('motor.activeTab');
    } catch (error) {
      return null;
    }
  })();

  show(saved === 'engine' ? 'engine' : 'graphs');

  tabGraphs && tabGraphs.addEventListener('click', () => show('graphs'));
  tabEngine && tabEngine.addEventListener('click', () => show('engine'));
});
