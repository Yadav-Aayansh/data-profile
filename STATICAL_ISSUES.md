# Statistical Code Review Issues

## Critical Statistical Issues

### 1. **Eta-squared Calculation Bias**
- **Issue**: Uses biased estimator (doesn't adjust for degrees of freedom)
- **Impact**: Overestimates effect size, especially with small samples
- **Location**: `etaSquaredFromData()` - should use adjusted eta-squared
- **Severity**: High for small samples
- **Fix**: Use `ssBetween / (ssTotal + (k-1))` where k is number of groups

### 2. **Cramér's V Chi-square Validity**
- **Issue**: No check for minimum expected cell counts (typically ≥5)
- **Impact**: Chi-square test invalid with sparse contingency tables
- **Location**: `cramersVFromData()` - no validation of expected frequencies
- **Severity**: High for sparse data
- **Fix**: Check expected frequencies and return NaN or use alternative measure

### 3. **HHI Scaling Documentation**
- **Issue**: Scales HHI by 100² but doesn't document this choice
- **Impact**: Non-standard scaling may confuse users familiar with 0-1 or 0-10000 scales
- **Location**: `computeCategoricalStats()` - `hhi += (share * 100) ** 2`
- **Severity**: Medium - documentation issue
- **Fix**: Document the scaling choice or use standard 0-10000 scale

### 4. **Percentile Method Specification**
- **Issue**: Uses linear interpolation but doesn't specify which percentile definition
- **Impact**: Results may not match other statistical tools exactly
- **Location**: `percentile()` function
- **Severity**: Medium - affects reproducibility
- **Fix**: Document which method is used (R-6, Excel method, etc.)

## Statistical Validity Issues

### 5. **Association Matrix Mixed Metrics**
- **Issue**: Mixes different association measures without clear documentation
- **Impact**: Users may misinterpret mixed correlation/association values
- **Location**: `computeAssociationMatrix()` - returns Pearson, Cramér's V, and eta-squared in same matrix
- **Severity**: Medium
- **Fix**: Clearly document what each cell represents or separate by metric type

### 6. **Functional Dependency Detection Limitations**
- **Issue**: Only detects exact dependencies, doesn't handle approximate relationships
- **Impact**: May miss real-world functional relationships due to minor data quality issues
- **Location**: `computeKeysAndDeps()` - exact matching only
- **Severity**: Medium
- **Fix**: Add tolerance parameter or probabilistic dependency detection

### 7. **Primary Key Detection Scope**
- **Issue**: Only checks single-column keys, doesn't consider composite keys
- **Impact**: May miss valid composite primary keys
- **Location**: `computeKeysAndDeps()` - only single-column uniqueness
- **Severity**: Medium
- **Fix**: Add composite key detection (performance permitting)

### 8. **Outlier Detection Method Justification**
- **Issue**: Uses arbitrary 3-sigma rule and 1.5×IQR without justification
- **Impact**: May not be appropriate for all distributions
- **Location**: `computeOutliers()` - hardcoded thresholds
- **Severity**: Medium
- **Fix**: Document why these thresholds were chosen or make configurable

## Performance and Scalability Issues

### 9. **Inefficient Contingency Table Construction**
- **Issue**: Uses nested Map structure for contingency tables
- **Impact**: Poor performance and memory usage for large categorical data
- **Location**: `cramersVFromData()` contingency table building
- **Severity**: Medium for large categorical datasets
- **Fix**: Use more efficient data structure or pre-allocate arrays

### 10. **Redundant Data Passes**
- **Issue**: Multiple passes through data for different statistics
- **Impact**: Unnecessary computational overhead
- **Location**: Various functions process same data multiple times
- **Severity**: Low-Medium
- **Fix**: Combine calculations in single pass where possible

### 11. **Memory Usage with Large Datasets**
- **Issue**: Creates multiple copies of data arrays
- **Impact**: High memory usage for large datasets
- **Location**: Various array operations like `[...nums].sort()`
- **Severity**: Medium for large datasets
- **Fix**: Use in-place operations or streaming approaches

## Data Handling Issues

### 12. **Missing Data Strategy**
- **Issue**: Uses listwise deletion without considering missing data mechanisms
- **Impact**: May introduce bias if data is not missing completely at random
- **Location**: Throughout - filters out null/undefined values
- **Severity**: Medium
- **Fix**: Document missing data assumptions or provide alternative strategies

### 13. **Type Coercion Inconsistencies**
- **Issue**: Inconsistent handling of type coercion (toString() vs JSON.stringify)
- **Impact**: May produce unexpected results for complex objects
- **Location**: Various places handling mixed data types
- **Severity**: Medium
- **Fix**: Standardize object serialization approach

### 14. **Standard Deviation Method**
- **Issue**: Uses sample standard deviation (n-1) but doesn't document this choice
- **Impact**: May not match user expectations if they expect population stddev
- **Location**: `computeNumericStats()` - `variance = ... / (nums.length - 1)`
- **Severity**: Low - but should be documented
- **Fix**: Document the choice or make it configurable
