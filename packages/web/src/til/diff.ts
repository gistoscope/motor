export type TokenDiff = {
  original: string[];
  modified: string[];
};

export function diffTokens(original: string[], modified: string[]): TokenDiff {
  return {
    original: [...original],
    modified: [...modified],
  };
}
