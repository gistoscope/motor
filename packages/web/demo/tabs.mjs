const $ = (selector, root = document) => root.querySelector(selector);

const tabGraphs = $('[data-role="tab-graphs"]');
const tabEngine = $('[data-role="tab-engine"]');

function show(which) {
  const target = which === 'engine' ? 'engine' : which === 'graphs' ? 'graphs' : null;
  if (!target) {
    return;
  }

  const hash = `#${target}`;
  if (window.location.hash !== hash) {
    try {
      history.replaceState(null, '', hash);
    } catch (error) {
      window.location.hash = hash;
    }
  }

  try {
    localStorage.setItem('motor.activeTab', target);
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

  if (saved === 'engine' || saved === 'graphs') {
    show(saved);
  }

  tabGraphs && tabGraphs.addEventListener('click', () => show('graphs'));
  tabEngine && tabEngine.addEventListener('click', () => show('engine'));
});
