async function importWithTsFallback(specifier) {
  try {
    return await import(specifier);
  } catch (error) {
    if (
      typeof specifier === 'string' &&
      specifier.endsWith('.js') &&
      error instanceof Error &&
      /Cannot find module/iu.test(error.message ?? '')
    ) {
      const fallbackSpecifier = specifier.replace(/\.js$/u, '.ts');
      return import(fallbackSpecifier);
    }
    throw error;
  }
}

const core = await importWithTsFallback('../src/index.js');

export const {
  createViewer,
  initMath,
  fromRealEngine,
  mountPlayground,
  mountEnginePane,
} = core;
