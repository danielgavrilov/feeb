export function normalizeBoolean(value: boolean | string | number | null | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "t", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "f", "0", "no", "n", "off", ""].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return Boolean(value);
}
