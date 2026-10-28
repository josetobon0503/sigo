import en from '../en.json';
import es from '../es.json';
import { FORBIDDEN_WORDS } from '../forbiddenWords';

type Tree = { [key: string]: string | Tree };

function flattenKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : flattenKeys(value, path);
  });
}

function flattenValues(tree: Tree): string[] {
  return Object.values(tree).flatMap((value) =>
    typeof value === 'string' ? [value] : flattenValues(value),
  );
}

describe('translations', () => {
  it('es.json and en.json have exactly the same keys', () => {
    expect(flattenKeys(es).sort()).toEqual(flattenKeys(en).sort());
  });

  it('has no empty strings', () => {
    for (const value of [...flattenValues(es), ...flattenValues(en)]) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('never uses medical claims', () => {
    for (const value of [...flattenValues(es), ...flattenValues(en)]) {
      for (const pattern of FORBIDDEN_WORDS) {
        expect(value).not.toMatch(pattern);
      }
    }
  });

  it('keeps the brand name untranslated', () => {
    expect(es.app.name).toBe('Sigo');
    expect(en.app.name).toBe('Sigo');
  });
});
