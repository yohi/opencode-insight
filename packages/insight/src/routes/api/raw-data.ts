import { APIEvent, json } from "solid-start/api";
import { rawQuery } from "~/core/db";

export async function GET({ request }: APIEvent) {
  const url = new URL(request.url);
  const table = url.searchParams.get("table");

  // Fetch all table names to whitelist
  const tables = rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tableNames = tables.map((t: any) => t.name);

  if (!table) {
    return json(tables);
  }

  // Security Check: Ensure table exists in the whitelist to prevent SQL Injection
  if (!tableNames.includes(table)) {
    return json({ error: "Invalid table name" }, { status: 400 });
  }

  try {
    // Now safe to interpolate as we verified it against the DB schema
    const data = rawQuery(`SELECT * FROM ${table} LIMIT 100`);
    return json(data);
  } catch (error) {
    return json({ error: error.message }, { status: 400 });
  }
}
