export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function redactToken(raw: string): string {
  if (!raw) return "(empty)";
  if (raw.length <= 32) return raw;
  return `${raw.slice(0, 16)}…${raw.slice(-8)}  (len=${raw.length})`;
}
