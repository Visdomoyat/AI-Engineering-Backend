type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object') return null;
  return value as UnknownRecord;
}

function readString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  const record = asRecord(error);
  if (record) {
    const message =
      readString(record, 'message') ||
      readString(record, 'error') ||
      readString(record, 'msg') ||
      readString(record, 'details') ||
      readString(record, 'hint');

    if (message) return message;

    try {
      const serialized = JSON.stringify(record);
      if (serialized && serialized !== '{}') {
        return serialized.slice(0, 500);
      }
    } catch {
      // Ignore serialization failure and return fallback below.
    }
  }

  return fallback;
}
