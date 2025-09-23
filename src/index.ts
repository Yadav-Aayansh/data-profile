export type ProfileSummary = {
  rowCount: number;
  columns: string[];
  columnStats: Record<
    string,
    {
      present: number;
      missing: number;
      types: string[];
      numericStats?: {
        min: number;
        max: number;
        mean: number;
        median: number;
        quartiles: [number, number, number];
        stddev: number;
        percentiles: Record<number, number>;
      };
      categoricalStats?: {
        unique: number;
        top10: Array<{ value: string; count: number }>;
        hhi: number;
      };
    }
  >;
  associationMatrix?: Record<string, Record<string, number>>;
  keysAndDependencies?: {
    candidatePrimaryKeys: string[][];
    functionalDependencies: Array<{ from: string[]; to: string }>;
  };
  missingnessPatterns?: {
    perColumnRates: Record<string, number>;
    topCoMissingPairs: Array<{ pair: [string, string]; count: number }>;
  };
  outliers?: Record<string, { tukeyCount: number; zscoreCount: number }>;
  categoricalEntropy?: Record<string, { entropy: number; tailShareOutsideTop10: number }>;
  sampleRows: Array<Record<string, unknown>>;
};

export type ProfileOptions = {
  associationMatrix?: boolean;
  keysDependencies?: boolean;
  missingnessPatterns?: boolean;
  outliers?: boolean;
  categoricalEntropy?: boolean;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index - lower;
  if (upper >= sorted.length) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function computeNumericStats(nums: number[]) {
  if (nums.length === 0) return undefined;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const median = percentile(sorted, 50);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const quartiles: [number, number, number] = [q1, median, q3];
  const variance = nums.length > 1 ? nums.reduce((a, x) => a + (x - mean) ** 2, 0) / (nums.length - 1) : 0;
  const stddev = Math.sqrt(variance);
  const percentiles = {
    10: percentile(sorted, 10),
    90: percentile(sorted, 90),
  };
  return { min, max, mean, median, quartiles, stddev, percentiles };
}

function computeCategoricalStats(cats: string[]) {
  if (cats.length === 0) return undefined;
  const freq: Map<string, number> = new Map();
  cats.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
  const unique = freq.size;
  const top10 = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));
  let hhi = 0;
  for (const count of freq.values()) {
    const share = count / cats.length;
    hhi += (share * 100) ** 2;
  }
  return { unique, top10, hhi };
}

function getType(stat: ProfileSummary['columnStats'][string]) {
  if (stat.numericStats) return 'numeric';
  if (stat.categoricalStats) return 'categorical';
  return 'other';
}

function pearsonFromData(data: Array<Record<string, unknown>>, c1: string, c2: string): number {
  const paired: [number, number][] = [];
  data.forEach((row) => {
    const v1 = row[c1];
    const v2 = row[c2];
    if (typeof v1 === 'number' && v1 !== null && typeof v2 === 'number' && v2 !== null) {
      paired.push([v1, v2]);
    }
  });
  if (paired.length < 2) return NaN;
  const n = paired.length;
  const mx = paired.reduce((a, [x]) => a + x, 0) / n;
  const my = paired.reduce((a, [, y]) => a + y, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  paired.forEach(([x, y]) => {
    const dx = x - mx;
    const dy = y - my;
    cov += dx * dy;
    vx += dx ** 2;
    vy += dy ** 2;
  });
  cov /= n - 1;
  const stdx = Math.sqrt(vx / (n - 1));
  const stdy = Math.sqrt(vy / (n - 1));
  if (stdx === 0 || stdy === 0) return NaN;
  return cov / (stdx * stdy);
}

function etaSquaredFromData(data: Array<Record<string, unknown>>, numCol: string, catCol: string): number {
  const groups: Map<string, number[]> = new Map();
  const allNums: number[] = [];
  data.forEach((row) => {
    const cat = row[catCol];
    const num = row[numCol];
    if (typeof num === 'number' && num !== null && cat !== null && cat !== undefined) {
      const key = cat.toString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(num);
      allNums.push(num);
    }
  });
  if (allNums.length < 2 || groups.size < 2) return NaN;
  const grandMean = allNums.reduce((a, b) => a + b, 0) / allNums.length;
  let ssBetween = 0;
  groups.forEach((nums) => {
    const groupMean = nums.reduce((a, b) => a + b, 0) / nums.length;
    ssBetween += nums.length * (groupMean - grandMean) ** 2;
  });
  const ssTotal = allNums.reduce((a, x) => a + (x - grandMean) ** 2, 0);
  if (ssTotal === 0) return NaN;
  return ssBetween / ssTotal;
}

function cramersVFromData(data: Array<Record<string, unknown>>, cat1: string, cat2: string): number {
  const contingency: Map<string, Map<string, number>> = new Map();
  let n = 0;
  data.forEach((row) => {
    const v1 = row[cat1];
    const v2 = row[cat2];
    if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
      const k1 = v1.toString();
      const k2 = v2.toString();
      if (!contingency.has(k1)) contingency.set(k1, new Map());
      contingency.get(k1)!.set(k2, (contingency.get(k1)!.get(k2) || 0) + 1);
      n++;
    }
  });
  if (n < 2) return NaN;
  const rows = Array.from(contingency.keys());
  const colsSet = new Set<string>();
  contingency.forEach((m) => m.forEach((_, k) => colsSet.add(k)));
  const cols = Array.from(colsSet);
  const rowTotals: Map<string, number> = new Map();
  contingency.forEach((m, r) => {
    let tot = 0;
    m.forEach((c) => (tot += c));
    rowTotals.set(r, tot);
  });
  const colTotals: Map<string, number> = new Map();
  cols.forEach((c) => {
    let tot = 0;
    contingency.forEach((m) => {
      tot += m.get(c) || 0;
    });
    colTotals.set(c, tot);
  });
  let chi2 = 0;
  rows.forEach((r) => {
    cols.forEach((c) => {
      const o = contingency.get(r)!.get(c) || 0;
      const e = (rowTotals.get(r)! * colTotals.get(c)!) / n;
      if (e > 0) chi2 += (o - e) ** 2 / e;
    });
  });
  const minDim = Math.min(rows.length - 1, cols.length - 1);
  if (minDim <= 0) return NaN;
  return Math.sqrt(chi2 / (n * minDim));
}

function computeAssociationMatrix(
  columns: string[],
  columnStats: ProfileSummary['columnStats'],
  data: Array<Record<string, unknown>>
) {
  if (columns.length > 50) return {}; // performance cap
  const assoc: Record<string, Record<string, number>> = {};
  columns.forEach((c) => (assoc[c] = {}));
  for (let i = 0; i < columns.length; i++) {
    const c1 = columns[i];
    const t1 = getType(columnStats[c1]);
    for (let j = i + 1; j < columns.length; j++) {
      const c2 = columns[j];
      const t2 = getType(columnStats[c2]);
      let value = NaN;
      if (t1 === 'numeric' && t2 === 'numeric') {
        value = pearsonFromData(data, c1, c2);
      } else if (t1 === 'categorical' && t2 === 'categorical') {
        value = cramersVFromData(data, c1, c2);
      } else if ((t1 === 'numeric' && t2 === 'categorical') || (t1 === 'categorical' && t2 === 'numeric')) {
        const numC = t1 === 'numeric' ? c1 : c2;
        const catC = t1 === 'categorical' ? c1 : c2;
        value = etaSquaredFromData(data, numC, catC);
      }
      if (!isNaN(value)) {
        assoc[c1][c2] = value;
        assoc[c2][c1] = value;
      }
    }
  }
  return assoc;
}

function computeKeysAndDeps(columns: string[], data: Array<Record<string, unknown>>, rowCount: number) {
  if (columns.length > 20) {
    return { candidatePrimaryKeys: [], functionalDependencies: [] }; // performance cap
  }
  const colValues: Record<string, unknown[]> = {};
  const uniqueCols: string[] = [];
  columns.forEach((col) => {
    const nonMissing = data
      .map((row) => (col in row ? row[col] : undefined))
      .filter((v) => v !== undefined && v !== null);
    colValues[col] = nonMissing;
    if (nonMissing.length === rowCount && new Set(nonMissing).size === rowCount) {
      uniqueCols.push(col);
    }
  });
  const candidatePrimaryKeys = uniqueCols.map((col) => [col]);
  const functionalDependencies: { from: string[]; to: string }[] = [];
  for (let i = 0; i < columns.length; i++) {
    const a = columns[i];
    if (colValues[a].length < 2) continue;
    for (let j = 0; j < columns.length; j++) {
      if (i === j) continue;
      const b = columns[j];
      if (uniqueCols.includes(a)) continue;
      const groups: Map<string, Set<string>> = new Map();
      data.forEach((row) => {
        const va = row[a];
        const vb = row[b];
        if (va !== undefined && va !== null) {
          const key = typeof va === 'object' && va !== null ? JSON.stringify(va) : String(va);
          if (!groups.has(key)) groups.set(key, new Set());
          if (vb !== undefined && vb !== null) {
            const vbKey = typeof vb === 'object' && vb !== null ? JSON.stringify(vb) : String(vb);
            groups.get(key)!.add(vbKey);
          }
        }
      });
      let isFD = true;
      for (const s of groups.values()) {
        if (s.size > 1) {
          isFD = false;
          break;
        }
      }
      if (isFD && groups.size > 1) {
        functionalDependencies.push({ from: [a], to: b });
      }
    }
  }
  return { candidatePrimaryKeys, functionalDependencies };
}

function computeMissingPatterns(columns: string[], data: Array<Record<string, unknown>>, rowCount: number) {
  const perColumnRates: Record<string, number> = {};
  columns.forEach((c) => {
    const missing = rowCount - data.filter((row) => c in row && row[c] !== undefined && row[c] !== null).length;
    perColumnRates[c] = missing / rowCount;
  });
  let topCoMissingPairs: { pair: [string, string]; count: number }[] = [];
  if (columns.length <= 50) {
    const pairCounts: Array<{ pair: [string, string]; count: number }> = [];
    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const c1 = columns[i];
        const c2 = columns[j];
        let count = 0;
        data.forEach((row) => {
          const m1 = !(c1 in row) || row[c1] === undefined || row[c1] === null;
          const m2 = !(c2 in row) || row[c2] === undefined || row[c2] === null;
          if (m1 && m2) count++;
        });
        if (count > 0) pairCounts.push({ pair: [c1, c2], count });
      }
    }
    topCoMissingPairs = pairCounts.sort((a, b) => b.count - a.count).slice(0, 10);
  }
  return { perColumnRates, topCoMissingPairs };
}

function computeCatEntropy(
  columns: string[],
  columnStats: ProfileSummary['columnStats'],
  data: Array<Record<string, unknown>>  // Use original data
) {
  const categoricalEntropy: Record<string, { entropy: number; tailShareOutsideTop10: number }> = {};
  columns.forEach((col) => {
    const catStat = columnStats[col].categoricalStats;
    if (!catStat) return;
    const cats = data
      .map(row => row[col])
      .filter(v => v !== null && v !== undefined)
      .map(v => v.toString());
    const freq: Map<string, number> = new Map();
    cats.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
    let entropy = 0;
    const total = cats.length;
    freq.forEach((count) => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });
    const top10Values = catStat.top10.map((t) => t.value);
    let tailCount = 0;
    freq.forEach((count, value) => {
      if (!top10Values.includes(value)) tailCount += count;
    });
    const tailShareOutsideTop10 = tailCount / total;
    categoricalEntropy[col] = { entropy, tailShareOutsideTop10 };
  });
  return categoricalEntropy;
}

function computeOutliers(
  columns: string[],
  columnStats: ProfileSummary['columnStats'],
  colValues: Record<string, unknown[]>
) {
  const outliers: Record<string, { tukeyCount: number; zscoreCount: number }> = {};
  columns.forEach((col) => {
    const stat = columnStats[col].numericStats;
    if (!stat) return;
    const nums = colValues[col] as number[];
    const iqr = stat.quartiles[2] - stat.quartiles[0];
    const lowerFence = stat.quartiles[0] - 1.5 * iqr;
    const upperFence = stat.quartiles[2] + 1.5 * iqr;
    let tukeyCount = 0;
    let zscoreCount = 0;
    nums.forEach((x) => {
      if (x < lowerFence || x > upperFence) tukeyCount++;
      if (stat.stddev > 0 && Math.abs((x - stat.mean) / stat.stddev) > 3) zscoreCount++;
    });
    outliers[col] = { tukeyCount, zscoreCount };
  });
  return outliers;
}

export default function profile(data: Array<Record<string, unknown>>, options: ProfileOptions = {}): ProfileSummary {
  const rowCount = data.length;
  if (rowCount === 0) {
    return { rowCount: 0, columns: [], sampleRows: [], columnStats: {} };
  }
  const allKeys = new Set<string>();
  data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
  const columns = Array.from(allKeys).sort();
  const sampleSize = Math.min(5, rowCount);
  const sampleRows = data.slice(0, sampleSize).map((row) => {
    const newRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      newRow[col] = col in row && row[col] !== undefined ? row[col] : null;
    });
    return newRow;
  });
  const columnStats: ProfileSummary['columnStats'] = {};
  const colValues: Record<string, unknown[]> = {};
  columns.forEach((col) => {
    const values = data.map((row) => (col in row ? row[col] : undefined));
    const nonMissing = values.filter((v) => v !== undefined && v !== null);
    const present = nonMissing.length;
    const missing = rowCount - present;
    const types = Array.from(new Set(nonMissing.map((v) => typeof v)));
    colValues[col] = nonMissing;
    let numericStats;
    if (types.length === 1 && types[0] === 'number' && nonMissing.length > 0) {
      numericStats = computeNumericStats(nonMissing as number[]);
    }
    let categoricalStats;
    if (types.length === 1 && (types[0] === 'string' || types[0] === 'boolean') && nonMissing.length > 0) {
      const cats = nonMissing.map((v) => v.toString());
      categoricalStats = computeCategoricalStats(cats);
    }
    columnStats[col] = { present, missing, types };
    if (numericStats) columnStats[col].numericStats = numericStats;
    if (categoricalStats) columnStats[col].categoricalStats = categoricalStats;
  });
  const result: ProfileSummary = { rowCount, columns, columnStats, sampleRows };
  if (options.associationMatrix) {
    result.associationMatrix = computeAssociationMatrix(columns, columnStats, data);
  }
  if (options.keysDependencies) {
    result.keysAndDependencies = computeKeysAndDeps(columns, data, rowCount);
  }
  if (options.missingnessPatterns) {
    result.missingnessPatterns = computeMissingPatterns(columns, data, rowCount);
  }
  if (options.outliers) {
    result.outliers = computeOutliers(columns, columnStats, colValues);
  }
  if (options.categoricalEntropy) {
    result.categoricalEntropy = computeCatEntropy(columns, columnStats, data);
  }
  return result;
}
