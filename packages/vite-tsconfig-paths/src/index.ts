import fs from "node:fs";
import path from "node:path";
type Alias = { find: string | RegExp; replacement: string };

interface ResolveConfig {
  alias?: Alias | Alias[];
}

interface UserConfig {
  root?: string;
  resolve?: ResolveConfig;
}

interface Plugin {
  name: string;
  enforce?: "pre" | "post";
  config?(config: UserConfig): void;
}

interface TsConfig {
  readonly compilerOptions?: {
    readonly baseUrl?: string;
    readonly paths?: Record<string, string[]>;
  };
}

function loadTsconfig(root: string): TsConfig | null {
  const configPath = path.resolve(root, "tsconfig.base.json");
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return JSON.parse(raw) as TsConfig;
  } catch {
    return null;
  }
}

function toAliasEntries(root: string, tsconfig: TsConfig): Alias[] {
  const baseUrl = tsconfig.compilerOptions?.baseUrl ?? ".";
  const baseDir = path.resolve(root, baseUrl);
  const paths = tsconfig.compilerOptions?.paths ?? {};

  const entries: Alias[] = [];
  for (const [alias, targets] of Object.entries(paths)) {
    const [target] = targets ?? [];
    if (!target) {
      continue;
    }

    if (alias.endsWith("/*") && target.endsWith("/*")) {
      const prefix = alias.slice(0, -2);
      const targetDir = target.slice(0, -2);
      const replacement = path.resolve(baseDir, targetDir).replace(/\\/g, "/");
      entries.push({ find: new RegExp(`^${prefix}/(?<segment>.+)$`), replacement: `${replacement}/$<segment>` });
      continue;
    }

    const replacement = path.resolve(baseDir, target).replace(/\\/g, "/");
    entries.push({ find: alias, replacement });
  }

  return entries;
}

export default function tsconfigPaths(): Plugin {
  return {
    name: "vite-tsconfig-paths-lite",
    enforce: "pre",
    config(config: UserConfig) {
      const root = config.root ? path.resolve(config.root) : process.cwd();
      const tsconfig = loadTsconfig(root);
      if (!tsconfig) {
        return;
      }

      const alias = toAliasEntries(root, tsconfig);
      if (alias.length === 0) {
        return;
      }

      config.resolve = config.resolve ?? {};
      const existing = Array.isArray(config.resolve.alias)
        ? config.resolve.alias
        : config.resolve.alias
          ? [config.resolve.alias]
          : [];

      config.resolve.alias = [...existing, ...alias];
    }
  };
}
