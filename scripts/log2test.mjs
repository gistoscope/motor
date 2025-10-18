#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_TEMPLATE = path.resolve(repoRoot, 'tests/templates/session.test.tpl');
const DEFAULT_OUTPUT_DIR = path.resolve(repoRoot, 'tests/sessions');

function printUsage() {
  const scriptPath = path.relative(process.cwd(), fileURLToPath(import.meta.url));
  console.log(`Usage: node ${scriptPath} <session.json> [--out <file>] [options]\n`);
  console.log('Options:');
  console.log('  --out <file>          Explicit output file path');
  console.log('  --out-dir <dir>       Directory for generated tests (default: tests/sessions)');
  console.log('  --template <file>     Path to template file');
  console.log('  --slug <name>         Override slug used for the output file name');
  console.log('  --name <title>        Override human readable session name');
  console.log('  --force               Overwrite existing output file');
  console.log('  --dry-run             Show generated output without writing to disk');
  console.log('  --help                Show this message');
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return null;
}

function toRecord(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return null;
}

function readString(value, fallback = null) {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  return fallback;
}

function normalizeAction(source, index) {
  if (typeof source === 'string') {
    return { id: source, label: source, kind: 'action' };
  }
  if (typeof source === 'number' && Number.isFinite(source)) {
    const id = String(source);
    return { id, label: id, kind: 'action' };
  }
  const record = toRecord(source) ?? {};
  const id =
    readString(record.id) ??
    readString(record.actionId) ??
    readString(record.key) ??
    readString(record.uuid) ??
    (typeof record.stepId === 'number' ? String(record.stepId) : readString(record.stepId)) ??
    String(index);
  const label =
    readString(record.label) ??
    readString(record.title) ??
    readString(record.name) ??
    readString(record.description) ??
    id;
  const kind = readString(record.kind) ?? readString(record.type) ?? readString(record.category) ?? 'action';
  return { id, label, kind };
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function gatherActions(frame, fallback = []) {
  if (!frame) {
    return fallback;
  }
  const arraysToInspect = [frame.actions, frame.legalActions, frame.availableActions];
  const record = toRecord(frame.state);
  if (record) {
    arraysToInspect.push(record.legalActions, record.actions, record.availableActions);
  }
  for (const candidate of arraysToInspect) {
    const list = toArray(candidate);
    if (list && list.length > 0) {
      return list;
    }
  }
  return fallback;
}

function normalizeFrame(frame, index) {
  const record = toRecord(frame);
  if (!record) {
    throw new Error(`Frame at index ${index} must be an object`);
  }

  const rawActionId =
    readString(record.actionId) ??
    readString(record.action) ??
    (typeof record.step === 'number' ? String(record.step) : readString(record.step)) ??
    null;
  const actionId = index === 0 ? null : rawActionId;

  const hostHtml =
    readString(record.hostHtml) ??
    readString(record.html) ??
    readString(record.snapshotHtml) ??
    readString(record.snapshot) ??
    null;
  if (hostHtml === null) {
    throw new Error(`Frame at index ${index} is missing "hostHtml"`);
  }

  const actions = gatherActions(record).map((item, actionIndex) => normalizeAction(item, actionIndex));

  const stateRecord = toRecord(record.state);
  const state = stateRecord ? cloneDeep(stateRecord) : null;
  if (state && !toArray(state.legalActions)) {
    state.legalActions = actions.map((action) => ({ ...action }));
  }

  const exportSnapshotRecord =
    toRecord(record.exportSnapshot) ??
    toRecord(record.export) ??
    toRecord(record.snapshot?.export) ??
    null;
  const exportSnapshot = exportSnapshotRecord ? cloneDeep(exportSnapshotRecord) : null;

  return { actionId, hostHtml, actions, state, exportSnapshot };
}

function normalizeSession(raw, options) {
  const record = toRecord(raw);
  if (!record) {
    throw new Error('Session log must be an object');
  }

  const framesSource = toArray(record.frames) ?? toArray(record.steps);
  if (!framesSource || framesSource.length === 0) {
    throw new Error('Session log must include a non-empty "frames" or "steps" array');
  }

  const frames = framesSource.map((frame, index) => normalizeFrame(frame, index));
  frames[0] = { ...frames[0], actionId: null };

  const name =
    readString(options.name) ??
    readString(record.name) ??
    readString(record.title) ??
    readString(record.sessionName) ??
    options.slug ??
    'session-log';
  const description =
    readString(record.description) ??
    readString(record.summary) ??
    readString(record.meta?.description) ??
    null;
  const initialExpression =
    readString(record.initialExpression) ??
    readString(record.initial?.expression) ??
    readString(record.meta?.initialExpression) ??
    '';

  const sequence = frames
    .map((frame) => frame.actionId)
    .filter((actionId) => typeof actionId === 'string');

  const slug =
    options.slug ??
    readString(record.slug) ??
    readString(record.id) ??
    slugify(name);

  return {
    name,
    description,
    slug,
    initialExpression,
    frames,
    sequence,
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    return;
  }

  const options = {
    template: DEFAULT_TEMPLATE,
    outDir: DEFAULT_OUTPUT_DIR,
    outFile: null,
    slug: null,
    name: null,
    force: false,
    dryRun: false,
  };

  const inputs = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case '--template': {
        const next = args[++index];
        if (!next) {
          throw new Error('--template requires a value');
        }
        options.template = path.resolve(process.cwd(), next);
        break;
      }
      case '--out-dir': {
        const next = args[++index];
        if (!next) {
          throw new Error('--out-dir requires a value');
        }
        options.outDir = path.resolve(process.cwd(), next);
        break;
      }
      case '--out': {
        const next = args[++index];
        if (!next) {
          throw new Error('--out requires a value');
        }
        options.outFile = path.resolve(process.cwd(), next);
        break;
      }
      case '--slug': {
        const next = args[++index];
        if (!next) {
          throw new Error('--slug requires a value');
        }
        options.slug = slugify(next);
        break;
      }
      case '--name': {
        const next = args[++index];
        if (!next) {
          throw new Error('--name requires a value');
        }
        options.name = next;
        break;
      }
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        printUsage();
        return;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        inputs.push(arg);
    }
  }

  if (inputs.length === 0) {
    throw new Error('Missing input session JSON file');
  }
  if (inputs.length > 1) {
    throw new Error('Multiple input files are not supported');
  }

  const sourcePath = path.resolve(process.cwd(), inputs[0]);
  const templatePath = options.template;
  const template = await fs.readFile(templatePath, 'utf8');
  const raw = await fs.readFile(sourcePath, 'utf8');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON from ${sourcePath}: ${reason}`);
  }

  const session = normalizeSession(parsed, { slug: options.slug, name: options.name });

  const outputFile = options.outFile
    ? options.outFile
    : path.resolve(options.outDir, `${session.slug}.test.ts`);

  const sourceRelPath = path.relative(repoRoot, sourcePath) || path.basename(sourcePath);
  const generatedAt = new Date().toISOString();

  const sessionJson = JSON.stringify(
    {
      name: session.name,
      description: session.description,
      initialExpression: session.initialExpression,
      frames: session.frames,
    },
    null,
    2,
  );

  const actionSequenceJson = JSON.stringify(session.sequence, null, 2);

  let output = template
    .replaceAll('%%SOURCE_PATH%%', sourceRelPath)
    .replaceAll('%%GENERATED_AT%%', generatedAt)
    .replaceAll('%%SESSION_NAME%%', session.name)
    .replaceAll('%%SESSION_JSON%%', sessionJson)
    .replaceAll('%%ACTION_SEQUENCE%%', actionSequenceJson);

  if (!options.dryRun) {
    await ensureDir(path.dirname(outputFile));
    if (!options.force) {
      let exists = false;
      try {
        await fs.access(outputFile);
        exists = true;
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        } else if (error) {
          throw error;
        }
      }
      if (exists) {
        throw new Error(`Refusing to overwrite existing file: ${outputFile}`);
      }
    }
    await fs.writeFile(outputFile, `${output}\n`, 'utf8');
    console.log(`Generated test: ${path.relative(process.cwd(), outputFile)}`);
  } else {
    console.log(output);
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

try {
  await main();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
}
