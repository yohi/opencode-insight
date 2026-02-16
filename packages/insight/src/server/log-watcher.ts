import fs from "node:fs";
import path from "node:path";
import { broadcastToTopic } from "./ws";

const DEBOUNCE_MS = 50;

async function getFileSize(filePath: string): Promise<number | null> {
  try {
    const stat = await fs.promises.stat(filePath);
    return stat.size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function startLogWatcher(logPath: string) {
  const logDir = path.dirname(logPath);
  const logName = path.basename(logPath);

  let fileOffset = 0;
  let lineBuffer = "";
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isReading = false;
  let hasPendingChange = false;
  let warnedMissingFile = false;

  function emitLogLine(line: string) {
    broadcastToTopic("logs", {
      type: "AGENT_LOG",
      log: line,
    });
  }

  function processChunk(chunk: string) {
    lineBuffer += chunk;
    const lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop() ?? "";

    for (const line of lines) {
      emitLogLine(line);
    }
  }

  async function readDelta() {
    const size = await getFileSize(logPath);
    if (size === null) {
      if (!warnedMissingFile) {
        console.warn(`Log file not found yet: ${logPath}`);
        warnedMissingFile = true;
      }
      fileOffset = 0;
      lineBuffer = "";
      return;
    }

    warnedMissingFile = false;

    if (size < fileOffset) {
      fileOffset = 0;
      lineBuffer = "";
    }

    if (size === fileOffset) {
      return;
    }

    const bytesToRead = size - fileOffset;
    const handle = await fs.promises.open(logPath, "r");
    try {
      const chunkBuffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await handle.read(chunkBuffer, 0, bytesToRead, fileOffset);
      if (bytesRead <= 0) {
        return;
      }

      fileOffset += bytesRead;
      processChunk(chunkBuffer.toString("utf8", 0, bytesRead));
    } finally {
      await handle.close();
    }
  }

  async function flushRead() {
    if (isReading) {
      hasPendingChange = true;
      return;
    }

    isReading = true;
    try {
      do {
        hasPendingChange = false;
        await readDelta();
      } while (hasPendingChange);
    } catch (error) {
      console.error("Error reading agent log file:", error);
    } finally {
      isReading = false;
    }
  }

  function scheduleRead() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void flushRead();
    }, DEBOUNCE_MS);
  }

  if (!fs.existsSync(logDir)) {
    console.warn(`Log directory not found: ${logDir}`);
    return;
  }

  void getFileSize(logPath)
    .then((size) => {
      if (size === null) {
        console.warn(`Log file not found yet: ${logPath}`);
        warnedMissingFile = true;
      } else {
        fileOffset = size;
      }
    })
    .catch((error) => {
      console.error("Failed to initialize log watcher offset:", error);
    })
    .finally(() => {
      console.log(`Watching log directory at ${logDir} for changes to ${logName}`);

      fs.watch(logDir, (eventType, filename) => {
        if (!filename || filename !== logName) {
          return;
        }

        if (eventType === "rename" || eventType === "change") {
          scheduleRead();
        }
      });
    });
}
