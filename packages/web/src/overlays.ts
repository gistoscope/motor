import type { CycleAnalysis, SCCAnalysis } from './analysis';
import { makeEdgeKey } from './analysis';

const SCC_CLASS_PREFIX = 'motor-scc-';
const SCC_COLOR_CLASSES = [
  'motor-scc-0',
  'motor-scc-1',
  'motor-scc-2',
  'motor-scc-3',
  'motor-scc-4',
  'motor-scc-5',
  'motor-scc-6',
  'motor-scc-7',
];

function pickClass(index: number): string {
  const paletteSize = SCC_COLOR_CLASSES.length;
  if (paletteSize === 0) return 'motor-scc';
  return SCC_COLOR_CLASSES[index % paletteSize];
}

function clearSccClasses(group: SVGGElement): void {
  const toRemove: string[] = [];
  group.classList.forEach((cls) => {
    if (cls.startsWith(SCC_CLASS_PREFIX) || cls === 'motor-node--scc') {
      toRemove.push(cls);
    }
  });
  toRemove.forEach((cls) => group.classList.remove(cls));
  group.removeAttribute('data-scc-index');
}

export function applySccOverlay(root: HTMLElement, analysis: SCCAnalysis | null, enabled: boolean): void {
  const svg = root.querySelector('svg');
  if (!svg) return;
  const nodes = svg.querySelectorAll<SVGGElement>('.motor-node');
  nodes.forEach((group) => clearSccClasses(group));
  if (!enabled || !analysis) {
    return;
  }

  const classByComponent = new Map<number, string>();
  analysis.components.forEach((component) => {
    classByComponent.set(component.index, pickClass(component.index));
  });

  nodes.forEach((group) => {
    const nodeId = group.getAttribute('data-node-id');
    if (!nodeId) return;
    const componentIndex = analysis.nodeToComponent.get(nodeId);
    if (componentIndex == null) return;
    const className = classByComponent.get(componentIndex);
    if (!className) return;
    group.classList.add('motor-node--scc', className);
    group.setAttribute('data-scc-index', String(componentIndex));
  });
}

export function applyCycleOverlay(root: HTMLElement, analysis: CycleAnalysis | null, enabled: boolean): number {
  const svg = root.querySelector('svg');
  if (!svg) return 0;
  const edges = svg.querySelectorAll<SVGPathElement>('.motor-edge');
  let applied = 0;
  edges.forEach((edge) => {
    const fromId = edge.getAttribute('data-from') ?? '';
    const toId = edge.getAttribute('data-to') ?? '';
    const key = makeEdgeKey(fromId, toId);
    const shouldMark = Boolean(enabled && analysis && analysis.edgeKeys.has(key));
    edge.classList.toggle('motor-edge--cycle', shouldMark);
    if (shouldMark) {
      applied += 1;
    }
  });
  return applied;
}
