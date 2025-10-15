import type { GraspId, GraspNode } from './types';
import { makeId, node } from './api';

// Базовый переносимый формат:
export interface GraphJSON {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}

// Внутренний тип графа, совместимый с нашим ядром:
export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, GraspNode>;
};

// Валидация без внешних либ
export function validateGraphJSON(j: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const add = (m: string) => errors.push(m);

  if (typeof j !== 'object' || j === null) return { ok: false, errors: ['root must be an object'] };
  const obj = j as Record<string, unknown>;
  const nodes = obj.nodes;
  const edges = obj.edges;

  if (!Array.isArray(nodes)) add('nodes must be an array');
  if (!Array.isArray(edges)) add('edges must be an array');

  const idSet = new Set<string>();
  if (Array.isArray(nodes)) {
    nodes.forEach((n, i) => {
      if (typeof n !== 'object' || n === null) { add(`nodes[${i}] must be object`); return; }
      const { id, label } = n as any;
      if (typeof id !== 'string' || id.trim() === '') add(`nodes[${i}].id must be non-empty string`);
      if (typeof label !== 'string') add(`nodes[${i}].label must be string`);
      if (typeof id === 'string') {
        if (idSet.has(id)) add(`duplicate node id "${id}"`);
        idSet.add(id);
      }
    });
  }

  if (Array.isArray(edges)) {
    edges.forEach((e, i) => {
      if (typeof e !== 'object' || e === null) { add(`edges[${i}] must be object`); return; }
      const { from, to, label } = e as any;
      if (typeof from !== 'string' || from.trim() === '') add(`edges[${i}].from must be non-empty string`);
      if (typeof to   !== 'string' || to.trim()   === '') add(`edges[${i}].to must be non-empty string`);
      if (label !== undefined && typeof label !== 'string') add(`edges[${i}].label must be string if present`);
      // Ссылки на существующие узлы
      if (typeof from === 'string' && !idSet.has(from)) add(`edges[${i}].from references missing node "${from}"`);
      if (typeof to   === 'string' && !idSet.has(to))   add(`edges[${i}].to references missing node "${to}"`);
    });
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidGraphJSON(j: unknown): asserts j is GraphJSON {
  const res = validateGraphJSON(j);
  if (!res.ok) {
    throw new Error('Invalid GraphJSON:\n' + res.errors.map(e => ' - ' + e).join('\n'));
  }
}

// Экспорт из нашего графа → JSON
export function toJSON(g: GraspGraph): GraphJSON {
  const nodes: GraphJSON['nodes'] = [];
  const edges: GraphJSON['edges'] = [];

  // Узлы (если есть карта узлов — используем её; иначе собираем из ключей adj)
  const nodeIds = g.nodes ? Array.from(g.nodes.keys()) : Array.from(g.adj.keys());
  for (const id of nodeIds) {
    const label = g.nodes?.get(id)?.label ?? String(id);
    nodes.push({ id: String(id), label });
  }

  // Рёбра
  for (const [from, tos] of g.adj) {
    for (const to of tos) {
      const lbl = undefined; // хранимых меток рёбер в ядре нет — опускаем
      edges.push({ from: String(from), to: String(to), label: lbl });
    }
  }

  return { nodes, edges };
}

// Импорт JSON → новый граф (наши конструкторы из @motor/grasp/api)
export function fromJSON(j: unknown): GraspGraph {
  assertValidGraphJSON(j);
  const data = j as GraphJSON;

  const g: GraspGraph = { adj: new Map<GraspId, Set<GraspId>>(), nodes: new Map<GraspId, GraspNode>() };

  // Узлы
  for (const n of data.nodes) {
    const id = makeId(n.id);
    g.adj.set(id, new Set());
    g.nodes!.set(id, node(id, n.label));
  }

  // Рёбра
  for (const e of data.edges) {
    const f = makeId(e.from);
    const t = makeId(e.to);
    if (!g.adj.has(f) || !g.adj.has(t)) {
      // защита от гонок/рассинхронизаций (не должна сработать после validate)
      continue;
    }
    g.adj.get(f)!.add(t);
  }

  return g;
}
