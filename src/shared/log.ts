import { redact } from './mask.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFn = (level: LogLevel, message: string) => void;

const order: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Logger that always writes to stderr (stdout is reserved for results) and always redacts secrets. */
export function stderrLogger(min: LogLevel = 'info'): LogFn {
  return (level, message) => {
    if (order[level] < order[min]) return;
    const tag = level === 'info' ? '' : `${level}: `;
    process.stderr.write(`codewolf: ${tag}${redact(message)}\n`);
  };
}

export const silentLogger: LogFn = () => {};

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
