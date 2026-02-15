import { json } from "solid-start/api";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const configPath = path.resolve(process.cwd(), "opencode.jsonc");
    const content = await fs.readFile(configPath, "utf-8");
    return json({ content });
  } catch (error) {
    return json({ content: "// opencode.jsonc not found\n{\n  \"mock\": true\n}" });
  }
}
