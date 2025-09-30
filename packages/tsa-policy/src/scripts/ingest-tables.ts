import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AtomicRow = { id: string; action: string; description?: string; tags?: string[] };
type MultistepRow = { id: string; plan: string[]; title?: string };

type OpIndex = Record<string, {
  action?: string;
  plan?: string[];
  source: 'atomic' | 'multistep';
  description?: string;
  tags?: string[];
}>;

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../../docs/data');

async function loadJson<T>(file: string): Promise<T> {
  const payload = await fs.readFile(path.join(dataDir, file), 'utf8');
  return JSON.parse(payload) as T;
}

async function main() {
  const atomic = await loadJson<AtomicRow[]>('atomic_one_step_v5.json');
  const multistep = await loadJson<MultistepRow[]>('multistep_v1.json');
  const index: OpIndex = {};

  for (const row of atomic) {
    index[row.id] = {
      action: row.action,
      source: 'atomic',
      description: row.description,
      tags: row.tags
    };
  }

  for (const row of multistep) {
    index[row.id] = {
      plan: row.plan,
      source: 'multistep',
      description: row.title
    };
  }

  await fs.writeFile(path.join(dataDir, 'opIndex.json'), JSON.stringify(index, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
