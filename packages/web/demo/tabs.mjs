const btnEngine = document.querySelector('[data-tab="engine"]');
const btnGraphs = document.querySelector('[data-tab="graphs"]');
const panelEngine = document.querySelector('[data-panel="engine"]');
const panelGraphs = document.querySelector('[data-panel="graphs"]');

function show(which) {
  const isEngine = which === 'engine';
  btnEngine?.setAttribute('aria-selected', String(isEngine));
  btnGraphs?.setAttribute('aria-selected', String(!isEngine));
  if (panelEngine) panelEngine.hidden = !isEngine;
  if (panelGraphs) panelGraphs.hidden = isEngine;
}

// начальное состояние — показываем Graphs (как было)
show('graphs');

btnEngine?.addEventListener('click', () => show('engine'));
btnGraphs?.addEventListener('click', () => show('graphs'));
