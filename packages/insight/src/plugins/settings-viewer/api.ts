import { json } from "solid-start/api";
import fs from "node:fs/promises";
import path from "node:path";
import type { APIContext } from "~/core/plugin";

export async function getSettings(_ctx: APIContext): Promise<Response> {
  try {
    const configPath = path.resolve(process.cwd(), "opencode.jsonc");
    const content = await fs.readFile(configPath, "utf-8");
    return json({ content });
  } catch {
    return json({ content: "// opencode.jsonc not found\n{\n  \"mock\": true\n}" });
  }
}
