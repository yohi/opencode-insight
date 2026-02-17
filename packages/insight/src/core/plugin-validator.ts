import type { InsightPlugin } from "./plugin";

/**
 * Validates if the provided module conforms to the InsightPlugin interface.
 * Logs specific errors if validation fails and returns false.
 */
export function validatePlugin(module: unknown): module is InsightPlugin {
  if (typeof module !== "object" || module === null) {
    console.error("Plugin validation failed: module is not an object");
    return false;
  }

  const m = module as Partial<InsightPlugin>;

  // Check 'id'
  if (typeof m.id !== "string" || m.id.trim() === "") {
    console.error("Plugin validation failed: Missing or invalid 'id' (must be a non-empty string)");
    return false;
  }

  // Check 'name'
  if (typeof m.name !== "string" || m.name.trim() === "") {
    console.error("Plugin validation failed: Missing or invalid 'name' (must be a non-empty string)");
    return false;
  }

  // Check 'api' (optional)
  if (m.api !== undefined) {
    if (typeof m.api !== "object" || m.api === null) {
      console.error("Plugin validation failed: 'api' must be an object if provided");
      return false;
    }
  }

  // Check 'onLoad' (optional)
  if (m.onLoad !== undefined) {
    if (typeof m.onLoad !== "function") {
      console.error("Plugin validation failed: 'onLoad' must be a function if provided");
      return false;
    }
  }

  return true;
}
