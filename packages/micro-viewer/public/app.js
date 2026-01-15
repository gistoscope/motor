import { buildPairs, describeBrackets, ensureIdsForBrackets, HoverPainter } from '../pairs.js';

const textarea = document.querySelector('#expression');
const renderButton = document.querySelector('#render-button');
const diagnosticsButton = document.querySelector('#diagnostics-button');
const output = document.querySelector('#output');
const diagnosticsPanel = document.querySelector('#diagnostics-panel');

let cleanupListeners = [];
let painter;
let currentDescriptors = [];
let currentAnalysis = null;
let diagnosticsVisible = false;

function readyKatex() {
  return typeof window !== 'undefined' && window.katex;
}

function waitForKatex() {
  return new Promise((resolve) => {
    if (readyKatex()) {
      resolve(window.katex);
      return;
    }
    const timer = setInterval(() => {
      if (readyKatex()) {
        clearInterval(timer);
        resolve(window.katex);
      }
    }, 30);
  });
}

function cleanup() {
  for (const fn of cleanupListeners) {
    fn();
  }
  cleanupListeners = [];
  if (painter) {
    painter.clear();
  }
}

function bindHover(elements, analysis) {
  if (!painter) {
    painter = new HoverPainter(output);
  }

  const pairMap = new Map();
  for (const pair of analysis.pairs) {
    pairMap.set(pair.openId, pair);
    pairMap.set(pair.closeId, pair);
  }

  for (const element of elements) {
    const id = element.dataset.bracketId;
    if (!id) continue;
    const handleEnter = () => {
      const pair = pairMap.get(id);
      if (pair) {
        painter.paint([pair.openId, pair.closeId]);
      } else {
        painter.paint([id]);
      }
    };
    const handleLeave = () => {
      painter.clear();
    };
    element.addEventListener('mouseenter', handleEnter);
    element.addEventListener('mouseleave', handleLeave);
    cleanupListeners.push(() => {
      element.removeEventListener('mouseenter', handleEnter);
      element.removeEventListener('mouseleave', handleLeave);
    });
  }
}

function formatDiagnostics(descriptors, analysis) {
  return JSON.stringify(
    {
      descriptors: descriptors.map((descriptor) => ({
        id: descriptor.id,
        side: descriptor.side,
        text: descriptor.text,
        sizeClass: descriptor.sizeClass,
        symmetric: descriptor.symmetric,
        isNull: descriptor.isNull,
        family: descriptor.family,
      })),
      pairs: analysis.pairs,
      openOrphans: analysis.openOrphans,
      closeOrphans: analysis.closeOrphans,
    },
    null,
    2,
  );
}

function refreshDiagnostics() {
  if (!currentAnalysis) return;
  diagnosticsPanel.textContent = formatDiagnostics(currentDescriptors, currentAnalysis);
}

async function renderKatex() {
  if (!textarea || !output) return;
  await waitForKatex();
  cleanup();

  const tex = textarea.value;
  window.katex.render(tex, output, {
    throwOnError: false,
    displayMode: true,
  });

  const elements = ensureIdsForBrackets(output);
  currentDescriptors = describeBrackets(elements);
  currentAnalysis = buildPairs(currentDescriptors);
  bindHover(elements, currentAnalysis);
  refreshDiagnostics();
}

function toggleDiagnostics() {
  diagnosticsVisible = !diagnosticsVisible;
  if (diagnosticsVisible) {
    diagnosticsPanel.hidden = false;
    diagnosticsButton.textContent = 'Hide diagnostics';
    refreshDiagnostics();
  } else {
    diagnosticsPanel.hidden = true;
    diagnosticsButton.textContent = 'Diagnostics';
  }
}

if (renderButton) {
  renderButton.addEventListener('click', () => {
    renderKatex();
  });
}

if (diagnosticsButton) {
  diagnosticsButton.addEventListener('click', () => {
    toggleDiagnostics();
  });
}

if (textarea) {
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      renderKatex();
    }
  });
}

renderKatex();
