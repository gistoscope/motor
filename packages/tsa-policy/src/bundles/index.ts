import common from './common.json';

export const bundles = { common } as const;
export type BundleId = keyof typeof bundles;
