import path from "node:path";
import os from "node:os";

/**
 * Resolves ~ to home directory
 */
export function expandHome(filepath: string): string {
    if (filepath.startsWith("~")) {
        return path.join(os.homedir(), filepath.slice(1));
    }
    return filepath;
}

export const CONFIG_SEARCH_PATHS: (string | undefined)[] = [
    process.env.OPENCODE_CONFIG_PATH,
    path.join(process.cwd(), "opencode.jsonc"),
    "~/.config/opencode/opencode.jsonc",
];
