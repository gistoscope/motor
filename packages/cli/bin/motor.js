#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function getPkg() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const pkgPath = join(__dirname, '..', 'package.json');
  const text = readFileSync(pkgPath, 'utf8');
  return JSON.parse(text);
}

function printHelp() {
  console.log(
`motor — GRASP CLI
Usage:
  motor --help        Show this help
  motor -h
  motor --version     Print CLI version
  motor -v

Examples:
  motor --help
  motor --version`
  );
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  if (args.includes('--version') || args.includes('-v')) {
    const pkg = getPkg();
    console.log(pkg.version ?? '0.0.0');
    process.exit(0);
  }
  // По умолчанию просто показываем help (минимально полезное поведение)
  printHelp();
  process.exit(0);
}

main(process.argv);
