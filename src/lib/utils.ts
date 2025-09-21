export function deepMerge<T = any>(...objects: (Record<string, any> | undefined)[]) {
  const out: any = {};

  for (const object of objects) {
    for (let key in object) {
      const value = object[key];

      out[key] = key in out && typeof value == "object" ? deepMerge(out[key], value) : value;
    }
  }

  return out as T;
}

export const makeLogMessage = (message: string) => `[api-maker]: ${message}`;
