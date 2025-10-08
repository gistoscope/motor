// packages/web/src/routes/demo/highlight/ambient.d.ts
export {};
declare global {
  // Широкое объявление, чтобы демо компилировалось в CI.
  // Позже заменим на импорт из modules/highlight/types.
  type HighlightRole = string;
}
