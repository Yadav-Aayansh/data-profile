# data-profile

A minimal TypeScript package that profiles arrays of records (data-frame-like) for LLM context.

## Installation

```bash
npm install data-profile
```

## Usage

```typescript
import profile from 'data-profile';

const data = [
  { id: 1, name: 'Alice', age: 30, active: true },
  { id: 2, name: 'Bob', age: 25, active: false },
  { id: 3, name: 'Charlie', age: 35, active: true }
];

// Basic profiling
const summary = profile(data);

// With advanced features
const detailed = profile(data, {
  associationMatrix: true,
  keysDependencies: true,
  missingnessPatterns: true,
  outliers: true,
  categoricalEntropy: true
});
```

## Features

- **Basic Stats**: Row count, column types, missing values
- **Numeric Analysis**: Min/max, mean, median, quartiles, percentiles, standard deviation
- **Categorical Analysis**: Unique values, top 10 frequencies, HHI index
- **Associations**: Pearson correlation, Cramér's V, eta-squared
- **Data Quality**: Primary key candidates, functional dependencies, outlier detection
- **Missing Patterns**: Per-column rates, co-missing analysis
- **Entropy**: Information content for categorical variables

## Output Structure

```typescript
type ProfileSummary = {
  rowCount: number;
  columns: string[];
  columnStats: Record<string, {
    present: number;
    missing: number;
    types: string[];
    numericStats?: { min, max, mean, median, quartiles, stddev, percentiles };
    categoricalStats?: { unique, top10, hhi };
  }>;
  sampleRows: Array<Record<string, unknown>>;
  // Optional advanced features...
};
```

## Performance

- Association matrix: Capped at 50 columns
- Key detection: Capped at 20 columns  
- Missing patterns: Optimized for large datasets

## License

MIT
