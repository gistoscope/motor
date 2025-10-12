const version = 'v20.19.5';
Object.defineProperty(process, 'version', {
  value: version,
  configurable: true,
  enumerable: true,
  writable: false
});
if (process.versions && typeof process.versions === 'object') {
  Object.defineProperty(process.versions, 'node', {
    value: version.slice(1),
    configurable: true,
    enumerable: true,
    writable: false
  });
}
globalThis.__sparkNodePatched = true;
