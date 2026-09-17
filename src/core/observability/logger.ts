// Modül etiketli loglama. Faz 25'te error_logs tablosuna yazan bir hedef eklenecek;
// çağıranlar değişmesin diye arayüz şimdiden sabit.

type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  readonly module: string;
  readonly [key: string]: unknown;
}

function write(level: LogLevel, message: string, context: LogContext): void {
  const { module, ...rest } = context;
  console[level](`[${module}] ${message}`, rest);
}

export const logger = {
  info: (message: string, context: LogContext): void => write('info', message, context),
  warn: (message: string, context: LogContext): void => write('warn', message, context),
  error: (message: string, context: LogContext): void => write('error', message, context),
};
