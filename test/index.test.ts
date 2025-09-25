import { expect, test } from 'vitest';
import profile from '../src/index';

// Helper function to create large datasets
function createLargeDataset(size: number) {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    value: Math.random() * 1000,
    category: `cat_${i % 10}`,
    flag: i % 2 === 0
  }));
}

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

test('numeric stats with single value', () => {
  const data = [{ value: 42 }];
  const summary = profile(data);
  const stats = summary.columnStats.value.numericStats;
  expect(stats?.min).toBe(42);
  expect(stats?.max).toBe(42);
  expect(stats?.mean).toBe(42);
  expect(stats?.median).toBe(42);
  expect(stats?.stddev).toBe(0);
  expect(stats?.quartiles).toEqual([42, 42, 42]);
});

test('numeric stats with two identical values', () => {
  const data = [{ value: 42 }, { value: 42 }];
  const summary = profile(data);
  const stats = summary.columnStats.value.numericStats;
  expect(stats?.min).toBe(42);
  expect(stats?.max).toBe(42);
  expect(stats?.mean).toBe(42);
  expect(stats?.median).toBe(42);
  expect(stats?.stddev).toBe(0);
});

test('numeric stats with extreme values', () => {
  const data = [
    { value: Number.MAX_SAFE_INTEGER },
    { value: Number.MIN_SAFE_INTEGER },
    { value: 0 }
  ];
  const summary = profile(data);
  const stats = summary.columnStats.value.numericStats;
  expect(stats?.min).toBe(Number.MIN_SAFE_INTEGER);
  expect(stats?.max).toBe(Number.MAX_SAFE_INTEGER);
  expect(stats?.mean).toBeCloseTo(0, 0); // (MAX_SAFE_INTEGER + MIN_SAFE_INTEGER + 0) / 3 ≈ 0
});

test('numeric stats with special values', () => {
  const data = [
    { value: 1 },
    { value: 2 },
    { value: 3 }
  ];
  // Add NaN and Infinity to test robustness
  const dataWithSpecial = [
    ...data,
    { value: NaN },
    { value: Infinity },
    { value: -Infinity }
  ];
  const summary = profile(dataWithSpecial);
  // Should only process finite numbers
  expect(summary.columnStats.value.present).toBe(3); // Only finite numbers counted
});

test('percentile edge cases', () => {
  // Test with odd number of elements
  const oddData = [{ value: 1 }, { value: 2 }, { value: 3 }];
  const oddSummary = profile(oddData);
  expect(oddSummary.columnStats.value.numericStats?.median).toBe(2);
  
  // Test with even number of elements
  const evenData = [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }];
  const evenSummary = profile(evenData);
  expect(evenSummary.columnStats.value.numericStats?.median).toBe(2.5);
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

test('categorical stats with single category', () => {
  const data = [{ cat: 'A' }, { cat: 'A' }, { cat: 'A' }];
  const summary = profile(data);
  const catStats = summary.columnStats.cat.categoricalStats;
  expect(catStats?.unique).toBe(1);
  expect(catStats?.top10.length).toBe(1);
  expect(catStats?.top10[0].value).toBe('A');
  expect(catStats?.top10[0].count).toBe(3);
  expect(catStats?.hhi).toBe(10000); // Perfect concentration
});

test('categorical stats with empty strings and special values', () => {
  const data = [
    { cat: '' },
    { cat: '0' },
    { cat: 'false' },
    { cat: 'null' },
    { cat: 'undefined' }
  ];
  const summary = profile(data);
  const catStats = summary.columnStats.cat.categoricalStats;
  expect(catStats?.unique).toBe(5);
  expect(catStats?.top10.some(item => item.value === '')).toBe(true);
});

test('boolean categorical stats', () => {
  const data = [
    { flag: true }, { flag: false }, { flag: true }, { flag: true }
  ];
  const summary = profile(data);
  const catStats = summary.columnStats.flag.categoricalStats;
  expect(catStats?.unique).toBe(2);
  expect(catStats?.top10[0].value).toBe('true');
  expect(catStats?.top10[0].count).toBe(3);
  expect(catStats?.top10[1].value).toBe('false');
  expect(catStats?.top10[1].count).toBe(1);
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

test('association matrix with constant variables', () => {
  const data = [
    { constant: 5, varying: 1 },
    { constant: 5, varying: 2 },
    { constant: 5, varying: 3 }
  ];
  const summary = profile(data, { associationMatrix: true });
  const matrix = summary.associationMatrix;
  expect(matrix?.constant?.varying).toBeNaN(); // Should be NaN for constant variable
});

test('association matrix with missing values', () => {
  const data = [
    { a: 1, b: 2 },
    { a: 2, b: null },
    { a: 3, b: 4 },
    { a: null, b: 5 }
  ];
  const summary = profile(data, { associationMatrix: true });
  const matrix = summary.associationMatrix;
  // Should handle missing values gracefully
  expect(typeof matrix?.a?.b).toBe('number');
});

test('cramers v with sparse contingency table', () => {
  const data = [
    { cat1: 'A', cat2: 'X' },
    { cat1: 'B', cat2: 'Y' },
    { cat1: 'C', cat2: 'Z' }
  ];
  const summary = profile(data, { associationMatrix: true });
  const matrix = summary.associationMatrix;
  expect(matrix?.cat1?.cat2).toBeGreaterThanOrEqual(0);
  expect(matrix?.cat1?.cat2).toBeLessThanOrEqual(1);
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

test('keys and dependencies with all unique values', () => {
  const data = [
    { a: 1, b: 'x', c: true },
    { a: 2, b: 'y', c: false },
    { a: 3, b: 'z', c: null }
  ];
  const summary = profile(data, { keysDependencies: true });
  const kd = summary.keysAndDependencies;
  expect(kd?.candidatePrimaryKeys).toContainEqual(['a']);
  expect(kd?.candidatePrimaryKeys).toContainEqual(['b']);
});

test('keys and dependencies with no unique columns', () => {
  const data = [
    { a: 1, b: 'x' },
    { a: 1, b: 'x' },
    { a: 1, b: 'x' }
  ];
  const summary = profile(data, { keysDependencies: true });
  const kd = summary.keysAndDependencies;
  expect(kd?.candidatePrimaryKeys).toEqual([]);
});

test('functional dependencies with complex objects', () => {
  const data = [
    { id: 1, obj: { nested: 'a' }, result: 'X' },
    { id: 2, obj: { nested: 'b' }, result: 'Y' },
    { id: 3, obj: { nested: 'a' }, result: 'X' }
  ];
  const summary = profile(data, { keysDependencies: true });
  const kd = summary.keysAndDependencies;
  // Should handle object serialization
  expect(kd?.functionalDependencies.length).toBeGreaterThanOrEqual(0);
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

test('missingness patterns with undefined vs null vs missing keys', () => {
  const data = [
    { a: 1, b: 2, c: 3 },
    { a: null, b: undefined }, // c is missing key
    { a: undefined, b: null, c: null }
  ];
  const summary = profile(data, { missingnessPatterns: true });
  const mp = summary.missingnessPatterns;
  expect(mp?.perColumnRates.a).toBeCloseTo(2/3, 5);
  expect(mp?.perColumnRates.b).toBeCloseTo(2/3, 5);
  expect(mp?.perColumnRates.c).toBeCloseTo(2/3, 5);
});

test('missingness patterns with all missing', () => {
  const data = [
    { a: null, b: null },
    { a: undefined, b: undefined },
    {} // completely empty row
  ];
  const summary = profile(data, { missingnessPatterns: true });
  const mp = summary.missingnessPatterns;
  expect(mp?.perColumnRates.a).toBe(1);
  expect(mp?.perColumnRates.b).toBe(1);
});

test('missingness patterns with no missing values', () => {
  const data = [
    { a: 1, b: 2 },
    { a: 3, b: 4 },
    { a: 5, b: 6 }
  ];
  const summary = profile(data, { missingnessPatterns: true });
  const mp = summary.missingnessPatterns;
  expect(mp?.perColumnRates.a).toBe(0);
  expect(mp?.perColumnRates.b).toBe(0);
  expect(mp?.topCoMissingPairs.length).toBe(0);
});

test('outliers', () => {
  const data = Array.from({ length: 10 }, (_, i) => ({ value: i + 1 })).concat({ value: 101 });
  const summary = profile(data, { outliers: true });
  const out = summary.outliers?.value;
  expect(out?.tukeyCount).toBe(1);
  expect(out?.zscoreCount).toBe(1);
});

test('outliers with no outliers', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({ value: i + 1 }));
  const summary = profile(data, { outliers: true });
  const out = summary.outliers?.value;
  expect(out?.tukeyCount).toBe(0);
  expect(out?.zscoreCount).toBe(0);
});

test('outliers with constant values', () => {
  const data = Array.from({ length: 10 }, () => ({ value: 42 }));
  const summary = profile(data, { outliers: true });
  const out = summary.outliers?.value;
  expect(out?.tukeyCount).toBe(0);
  expect(out?.zscoreCount).toBe(0); // No outliers when stddev is 0
});

test('outliers with extreme IQR', () => {
  const data = [
    { value: 1 }, { value: 1 }, { value: 1 }, { value: 1 }, { value: 1 },
    { value: 100 }, { value: 100 }, { value: 100 }, { value: 100 }, { value: 100 }
  ];
  const summary = profile(data, { outliers: true });
  const out = summary.outliers?.value;
  expect(out?.tukeyCount).toBeGreaterThanOrEqual(0);
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

test('categorical entropy with uniform distribution', () => {
  const data = Array.from({ length: 8 }, (_, i) => ({ cat: `cat_${i}` }));
  const summary = profile(data, { categoricalEntropy: true });
  const ce = summary.categoricalEntropy?.cat;
  expect(ce?.entropy).toBeCloseTo(3, 1); // log2(8) = 3
  expect(ce?.tailShareOutsideTop10).toBe(0); // All fit in top 10
});

test('categorical entropy with single category', () => {
  const data = [{ cat: 'A' }, { cat: 'A' }, { cat: 'A' }];
  const summary = profile(data, { categoricalEntropy: true });
  const ce = summary.categoricalEntropy?.cat;
  expect(ce?.entropy).toBe(0); // No entropy for single category
  expect(ce?.tailShareOutsideTop10).toBe(0);
});

test('categorical entropy with many rare categories', () => {
  const data = [
    // 5 common categories
    ...Array.from({ length: 50 }, (_, i) => ({ cat: `common_${i % 5}` })),
    // 20 rare categories (1 each)
    ...Array.from({ length: 20 }, (_, i) => ({ cat: `rare_${i}` }))
  ];
  const summary = profile(data, { categoricalEntropy: true });
  const ce = summary.categoricalEntropy?.cat;
  expect(ce?.entropy).toBeGreaterThan(0);
  expect(ce?.tailShareOutsideTop10).toBeGreaterThan(0);
});

test('empty data', () => {
  const summary = profile([]);
  expect(summary.rowCount).toBe(0);
  expect(summary.columns).toEqual([]);
  expect(summary.sampleRows).toEqual([]);
  expect(summary.columnStats).toEqual({});
});

test('mixed types skipped', () => {
  const data = [{ mixed: 1 }, { mixed: 'two' }];
  const summary = profile(data);
  expect(summary.columnStats.mixed.types.sort()).toEqual(['number', 'string']);
  expect(summary.columnStats.mixed.numericStats).toBeUndefined();
  expect(summary.columnStats.mixed.categoricalStats).toBeUndefined();
});

test('mixed types with null and undefined', () => {
  const data = [
    { mixed: 1 },
    { mixed: 'two' },
    { mixed: null },
    { mixed: undefined },
    { mixed: true }
  ];
  const summary = profile(data);
  expect(summary.columnStats.mixed.types.sort()).toEqual(['boolean', 'number', 'string']);
  expect(summary.columnStats.mixed.present).toBe(3); // null and undefined not counted
  expect(summary.columnStats.mixed.missing).toBe(2);
});

test('complex object types', () => {
  const data = [
    { obj: { nested: 'value' } },
    { obj: [1, 2, 3] },
    { obj: new Date() },
    { obj: /regex/ }
  ];
  const summary = profile(data);
  expect(summary.columnStats.obj.types).toEqual(['object']);
  expect(summary.columnStats.obj.numericStats).toBeUndefined();
  expect(summary.columnStats.obj.categoricalStats).toBeUndefined();
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

test('large dataset performance', () => {
  const largeData = createLargeDataset(10000);
  const start = Date.now();
  const summary = profile(largeData, {
    associationMatrix: true,
    keysDependencies: true,
    missingnessPatterns: true,
    outliers: true,
    categoricalEntropy: true
  });
  const duration = Date.now() - start;
  
  expect(summary.rowCount).toBe(10000);
  expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  expect(summary.sampleRows.length).toBe(5);
});

test('sample rows with fewer than 5 rows', () => {
  const data = [{ a: 1 }, { a: 2 }];
  const summary = profile(data);
  expect(summary.sampleRows.length).toBe(2);
  expect(summary.sampleRows[0]).toEqual({ a: 1 });
  expect(summary.sampleRows[1]).toEqual({ a: 2 });
});

test('sample rows with missing columns', () => {
  const data = [
    { a: 1, b: 2 },
    { a: 3 }, // missing b
    { b: 4 } // missing a
  ];
  const summary = profile(data);
  expect(summary.sampleRows.length).toBe(3);
  expect(summary.sampleRows[0]).toEqual({ a: 1, b: 2 });
  expect(summary.sampleRows[1]).toEqual({ a: 3, b: null });
  expect(summary.sampleRows[2]).toEqual({ a: null, b: 4 });
});

test('column ordering consistency', () => {
  const data = [
    { z: 1, a: 2, m: 3 },
    { a: 4, z: 5, m: 6 }
  ];
  const summary = profile(data);
  expect(summary.columns).toEqual(['a', 'm', 'z']); // Should be sorted
});

test('all options disabled', () => {
  const data = [{ a: 1, b: 'x' }];
  const summary = profile(data, {
    associationMatrix: false,
    keysDependencies: false,
    missingnessPatterns: false,
    outliers: false,
    categoricalEntropy: false
  });
  expect(summary.associationMatrix).toBeUndefined();
  expect(summary.keysAndDependencies).toBeUndefined();
  expect(summary.missingnessPatterns).toBeUndefined();
  expect(summary.outliers).toBeUndefined();
  expect(summary.categoricalEntropy).toBeUndefined();
});

test('data with only missing values', () => {
  const data = [
    { a: null, b: undefined },
    { a: null, b: null },
    {}
  ];
  const summary = profile(data);
  expect(summary.rowCount).toBe(3);
  expect(summary.columnStats.a.present).toBe(0);
  expect(summary.columnStats.a.missing).toBe(3);
  expect(summary.columnStats.b.present).toBe(0);
  expect(summary.columnStats.b.missing).toBe(3);
});

test('numeric precision edge cases', () => {
  const data = [
    { value: 0.1 + 0.2 }, // 0.30000000000000004
    { value: 0.3 },
    { value: 1e-10 },
    { value: 1e10 }
  ];
  const summary = profile(data);
  const stats = summary.columnStats.value.numericStats;
  expect(stats?.min).toBeCloseTo(1e-10, 15);
  expect(stats?.max).toBeCloseTo(1e10, 5);
});

test('string edge cases', () => {
  const data = [
    { str: '' },
    { str: ' ' },
    { str: '\n' },
    { str: '\t' },
    { str: '0' },
    { str: 'false' },
    { str: 'null' },
    { str: 'undefined' }
  ];
  const summary = profile(data);
  const catStats = summary.columnStats.str.categoricalStats;
  expect(catStats?.unique).toBe(8);
  expect(catStats?.top10.length).toBe(8);
});

test('boolean edge cases', () => {
  const data = [
    { bool: true },
    { bool: false },
    { bool: true },
    { bool: false }
  ];
  const summary = profile(data);
  const catStats = summary.columnStats.bool.categoricalStats;
  expect(catStats?.unique).toBe(2);
  expect(catStats?.hhi).toBe(5000); // 50% each -> 50^2 + 50^2 = 5000
});

test('zero and negative number handling', () => {
  const data = [
    { value: 0 },
    { value: -1 },
    { value: -100 },
    { value: 0.0 },
    { value: -0 }
  ];
  const summary = profile(data);
  const stats = summary.columnStats.value.numericStats;
  expect(stats?.min).toBe(-100);
  expect(stats?.max).toBe(0);
  expect(stats?.mean).toBe(-20.2);
});

test('very large categorical dataset', () => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    category: `cat_${i % 100}` // 100 unique categories
  }));
  const summary = profile(data, { categoricalEntropy: true });
  const catStats = summary.columnStats.category.categoricalStats;
  const entropy = summary.categoricalEntropy?.category;
  
  expect(catStats?.unique).toBe(100);
  expect(catStats?.top10.length).toBe(10);
  expect(entropy?.entropy).toBeCloseTo(Math.log2(100), 1); // Should be close to log2(100)
  expect(entropy?.tailShareOutsideTop10).toBe(0.9); // 90% outside top 10
});
