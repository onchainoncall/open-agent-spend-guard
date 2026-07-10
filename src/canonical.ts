import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { OasgError } from './errors.js';

function fail(message: string): never {
  throw new OasgError('CANONICALIZATION_ERROR', message);
}

function assertUnicode(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail(`Lone Unicode surrogate at ${path}.`);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      fail(`Lone Unicode surrogate at ${path}.`);
    }
  }
}

function assertIJson(value: unknown, path = '$', seen = new Set<object>()): void {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') return assertUnicode(value, path);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`Non-finite number at ${path}.`);
    return;
  }
  if (typeof value !== 'object') fail(`Non-JSON ${typeof value} value at ${path}.`);
  if (seen.has(value)) fail(`Circular reference at ${path}.`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) fail(`Sparse array entry at ${path}[${index}].`);
      assertIJson(value[index], `${path}[${index}]`, seen);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(`Non-plain object at ${path}.`);
    for (const [key, entry] of Object.entries(value)) {
      assertUnicode(key, `${path} property name`);
      assertIJson(entry, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

export function canonicalJson(value: unknown): string {
  assertIJson(value);
  try {
    const serialized = canonicalize(value);
    if (serialized === undefined) fail('Value cannot be represented as canonical JSON.');
    return serialized;
  } catch (error) {
    if (error instanceof OasgError) throw error;
    return fail(error instanceof Error ? error.message : 'Canonical JSON serialization failed.');
  }
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
