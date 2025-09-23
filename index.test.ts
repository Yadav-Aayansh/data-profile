import { expect, test } from 'vitest';
import profile from '../src/index';

test('basic profiling', () => {
  const data = [
    { id: 1, name: 'Alice', age: 30, gender: true },
    { id: 2, name: 'Bob', age: 25, gender: false },
    { id: 3, name: 'Charlie', age: 35 },
  ];
  const summary = profile(data);
  expect(summary.rowCount).toBe(3);
  expect(summary.columns.sort()).toEqual(['age', 'gender', 'id', 'name']);
  expect(summary.sampleRows.length).toBe(3);
  expect(summary.columnStats.age.present).toBe(3);
  expect(summary.columnStats.age.types).toEqual(['number']);
  expect(summary.columnStats.age.numericStats?.mean).toBe(30);
  expect(summary.columnStats.name.categoricalStats?.unique).toBe(3);
  expect(summary.columnStats.gender.present).toBe(2);
  expect(summary.columnStats.gender.missing).toBe(1);
  expect(summary.columnStats.gender.types).toEqual(['boolean']);
});

test('numeric stats', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({ value: i + 1 }));
  const summary = profile(data);
  expect(summary.columnStats.value.numericStats?.min).toBe(1);
  expect(summary.columnStats.value.numericStats?.max).toBe(100);
  expect(summary.columnStats.value.numericStats?.mean).toBe(50.5);
  expect(summary.columnStats.value.numericStats?.median).toBe(50.5);
  expect(summary.columnStats.value.numericStats?.stddev).toBeCloseTo(29.0115, 4);
});

test('categorical stats', () => {
  const data = [
    { cat: 'A' }, { cat: 'B' }, { cat: 'A' }, { cat: 'C' }, { cat: 'A' },
    { cat: 'D' }, { cat: 'E' }, { cat: 'F' }, { cat: 'G' }, { cat: 'H' },
    { cat: 'I' }, { cat: 'J' }, { cat: 'K' },
  ];
  const summary = profile(data);
  const catStats = summary.columnStats.cat.categoricalStats;
  expect(catStats?.unique).toBe(11);
  expect(catStats?.top10.length).toBe(10);
  expect(catStats?.top10[0].value).toBe('A');
  expect(catStats?.top10[0].count).toBe(3);
  expect(catStats?.hhi).toBeCloseTo(1124.26, 3); // calculated HHI (scaled)
});

test('association matrix', () => {
  const data = [
    { num1: 1, num2: 2, cat1: 'A', cat2: 'X' },
    { num1: 2, num2: 4, cat1: 'B', cat2: 'Y' },
    { num1: 3, num2: 6, cat1: 'B', cat2: 'X' },
  ];
  const summary = profile(data, { associationMatrix: true });
  const matrix = summary.associationMatrix;
  expect(matrix?.num1.num2).toBeCloseTo(1, 5); // perfect correlation
  expect(matrix?.cat1.cat2).toBeGreaterThan(0);
  expect(matrix?.num1.cat1).toBeGreaterThan(0);
});

test('keys and dependencies', () => {
  const data = [
    { id: 1, code: 'A1', dep: 'X' },
    { id: 2, code: 'A2', dep: 'Y' },
    { id: 3, code: 'A1', dep: 'X' },
  ];
  const summary = profile(data, { keysDependencies: true });
  const kd = summary.keysAndDependencies;
  expect(kd?.candidatePrimaryKeys).toContainEqual(['id']);
  expect(kd?.functionalDependencies.some((fd) => fd.from[0] === 'code' && fd.to === 'dep')).toBe(true);
});

test('missingness patterns', () => {
  const data = [
    { a: 1, b: 2 },
    { a: null, c: 3 },
    { b: null, c: null },
  ];
  const summary = profile(data, { missingnessPatterns: true });
  const mp = summary.missingnessPatterns;
  expect(mp?.perColumnRates.a).toBeCloseTo(2/3, 5);
  expect(mp?.topCoMissingPairs.some((p) => p.pair.includes('b') && p.pair.includes('c') && p.count === 1)).toBe(true);
});

test('outliers', () => {
  const data = Array.from({ length: 10 }, (_, i) => ({ value: i + 1 })).concat({ value: 101 });
  const summary = profile(data, { outliers: true });
  const out = summary.outliers?.value;
  expect(out?.tukeyCount).toBe(1);
  expect(out?.zscoreCount).toBe(1);
});

test('categorical entropy', () => {
  const data = [
    { cat: 'A' }, { cat: 'B' }, { cat: 'C' }, { cat: 'D' }, { cat: 'E' },
    { cat: 'F' }, { cat: 'G' }, { cat: 'H' }, { cat: 'I' }, { cat: 'J' },
    { cat: 'K' }, { cat: 'L' },
  ];
  const summary = profile(data, { categoricalEntropy: true });
  const ce = summary.categoricalEntropy?.cat;
  expect(ce?.entropy).toBeGreaterThan(0);
  expect(ce?.tailShareOutsideTop10).toBeCloseTo(2/12, 5); // assuming top10 covers 10, tail 2
});

test('empty data', () => {
  const summary = profile([]);
  expect(summary.rowCount).toBe(0);
  expect(summary.columns).toEqual([]);
});

test('mixed types skipped', () => {
  const data = [{ mixed: 1 }, { mixed: 'two' }];
  const summary = profile(data);
  expect(summary.columnStats.mixed.types.sort()).toEqual(['number', 'string']);
  expect(summary.columnStats.mixed.numericStats).toBeUndefined();
  expect(summary.columnStats.mixed.categoricalStats).toBeUndefined();
});

test('performance caps', () => {
  const manyColumns = Array.from({ length: 60 }, (_, i) => ({ [`col${i}`]: i }));
  const summaryAssoc = profile(manyColumns, { associationMatrix: true });
  expect(Object.keys(summaryAssoc.associationMatrix || {}).length).toBe(0);
  const summaryKeys = profile(manyColumns, { keysDependencies: true });
  expect(summaryKeys.keysAndDependencies?.candidatePrimaryKeys.length).toBe(0);
  const summaryMissing = profile(manyColumns.slice(0, 51), { missingnessPatterns: true });
  expect(summaryMissing.missingnessPatterns?.topCoMissingPairs.length).toBe(0);
});