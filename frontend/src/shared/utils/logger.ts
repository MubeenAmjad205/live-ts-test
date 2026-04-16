/**
 * Premium logging utility for the frontend.
 * Provides consistent formatting and easy event tracking.
 */

const APP_PREFIX = '[TranscriptionApp]';

const Colors = {
  info: '#10b981', // Emerald 500
  warn: '#f59e0b', // Amber 500
  error: '#ef4444', // Red 500
  debug: '#6366f1', // Indigo 500
};

const formatMessage = (level: string, message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  return `%c${APP_PREFIX} %c${timestamp} %c${level.toUpperCase()}%c ${message}`;
};

const getStyles = (color: string) => [
  `color: ${color}; font-weight: bold;`,
  `color: #6b7280;`, // Gray 500 for timestamp
  `color: ${color}; font-weight: bold;`,
  `color: inherit;`,
];

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(formatMessage('info', message), ...getStyles(Colors.info), ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(formatMessage('warn', message), ...getStyles(Colors.warn), ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(formatMessage('error', message), ...getStyles(Colors.error), ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(formatMessage('debug', message), ...getStyles(Colors.debug), ...args);
    }
  },
};
