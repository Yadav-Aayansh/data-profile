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
## Real Dataset Example

Here's an example using the Titanic dataset:

```typescript
const basicProfile = profile(titanicSample);
console.log(JSON.stringify(basicProfile, null, 2));
```

```json
{
    "rowCount": 891,
    "columns": [
        "Age",
        "Cabin",
        "Embarked",
        "Fare",
        "Name",
        "Parch",
        "PassengerId",
        "Pclass",
        "Sex",
        "SibSp",
        "Survived",
        "Ticket"
    ],
    "columnStats": {
        "Age": {
            "present": 714,
            "missing": 177,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 0.42,
                "max": 80,
                "mean": 29.69911764705882,
                "median": 28,
                "quartiles": [
                    20.125,
                    28,
                    38
                ],
                "stddev": 14.526497332334044,
                "percentiles": {
                    "10": 14,
                    "90": 50
                }
            }
        },
        "Cabin": {
            "present": 204,
            "missing": 687,
            "types": [
                "string"
            ],
            "categoricalStats": {
                "unique": 147,
                "top10": [
                    {
                        "value": "G6",
                        "count": 4
                    },
                    {
                        "value": "C23 C25 C27",
                        "count": 4
                    },
                    {
                        "value": "B96 B98",
                        "count": 4
                    },
                    {
                        "value": "F33",
                        "count": 3
                    },
                    {
                        "value": "E101",
                        "count": 3
                    },
                    {
                        "value": "F2",
                        "count": 3
                    },
                    {
                        "value": "D",
                        "count": 3
                    },
                    {
                        "value": "C22 C26",
                        "count": 3
                    },
                    {
                        "value": "C123",
                        "count": 2
                    },
                    {
                        "value": "D33",
                        "count": 2
                    }
                ],
                "hhi": 83.14109957708554
            }
        },
        "Embarked": {
            "present": 889,
            "missing": 2,
            "types": [
                "string"
            ],
            "categoricalStats": {
                "unique": 3,
                "top10": [
                    {
                        "value": "S",
                        "count": 644
                    },
                    {
                        "value": "C",
                        "count": 168
                    },
                    {
                        "value": "Q",
                        "count": 77
                    }
                ],
                "hhi": 5679.8313596627195
            }
        },
        "Fare": {
            "present": 891,
            "missing": 0,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 0,
                "max": 512.3292,
                "mean": 32.2042079685746,
                "median": 14.4542,
                "quartiles": [
                    7.9104,
                    14.4542,
                    31
                ],
                "stddev": 49.693428597180905,
                "percentiles": {
                    "10": 7.55,
                    "90": 77.9583
                }
            }
        },
        "Name": {
            "present": 891,
            "missing": 0,
            "types": [
                "string"
            ],
            "categoricalStats": {
                "unique": 891,
                "top10": [
                    {
                        "value": "Braund, Mr. Owen Harris",
                        "count": 1
                    },
                    {
                        "value": "Cumings, Mrs. John Bradley (Florence Briggs Thayer)",
                        "count": 1
                    },
                    {
                        "value": "Heikkinen, Miss. Laina",
                        "count": 1
                    },
                    {
                        "value": "Futrelle, Mrs. Jacques Heath (Lily May Peel)",
                        "count": 1
                    },
                    {
                        "value": "Allen, Mr. William Henry",
                        "count": 1
                    },
                    {
                        "value": "Moran, Mr. James",
                        "count": 1
                    },
                    {
                        "value": "McCarthy, Mr. Timothy J",
                        "count": 1
                    },
                    {
                        "value": "Palsson, Master. Gosta Leonard",
                        "count": 1
                    },
                    {
                        "value": "Johnson, Mrs. Oscar W (Elisabeth Vilhelmina Berg)",
                        "count": 1
                    },
                    {
                        "value": "Nasser, Mrs. Nicholas (Adele Achem)",
                        "count": 1
                    }
                ],
                "hhi": 11.223344556677977
            }
        },
        "Parch": {
            "present": 891,
            "missing": 0,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 0,
                "max": 6,
                "mean": 0.38159371492704824,
                "median": 0,
                "quartiles": [
                    0,
                    0,
                    0
                ],
                "stddev": 0.8060572211299559,
                "percentiles": {
                    "10": 0,
                    "90": 2
                }
            }
        },
        "PassengerId": {
            "present": 891,
            "missing": 0,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 1,
                "max": 891,
                "mean": 446,
                "median": 446,
                "quartiles": [
                    223.5,
                    446,
                    668.5
                ],
                "stddev": 257.3538420152301,
                "percentiles": {
                    "10": 90,
                    "90": 802
                }
            }
        },
        "Pclass": {
            "present": 891,
            "missing": 0,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 1,
                "max": 3,
                "mean": 2.308641975308642,
                "median": 3,
                "quartiles": [
                    2,
                    3,
                    3
                ],
                "stddev": 0.8360712409770513,
                "percentiles": {
                    "10": 1,
                    "90": 3
                }
            }
        },
        "Sex": {
            "present": 891,
            "missing": 0,
            "types": [
                "string"
            ],
            "categoricalStats": {
                "unique": 2,
                "top10": [
                    {
                        "value": "male",
                        "count": 577
                    },
                    {
                        "value": "female",
                        "count": 314
                    }
                ],
                "hhi": 5435.638338743466
            }
        },
        "SibSp": {
            "present": 891,
            "missing": 0,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 0,
                "max": 8,
                "mean": 0.5230078563411896,
                "median": 0,
                "quartiles": [
                    0,
                    0,
                    1
                ],
                "stddev": 1.1027434322934275,
                "percentiles": {
                    "10": 0,
                    "90": 1
                }
            }
        },
        "Survived": {
            "present": 891,
            "missing": 0,
            "types": [
                "number"
            ],
            "numericStats": {
                "min": 0,
                "max": 1,
                "mean": 0.3838383838383838,
                "median": 0,
                "quartiles": [
                    0,
                    0,
                    1
                ],
                "stddev": 0.4865924542648585,
                "percentiles": {
                    "10": 0,
                    "90": 1
                }
            }
        },
        "Ticket": {
            "present": 891,
            "missing": 0,
            "types": [
                "string",
                "number"
            ]
        }
    },
    "sampleRows": [
        {
            "Age": 22,
            "Cabin": null,
            "Embarked": "S",
            "Fare": 7.25,
            "Name": "Braund, Mr. Owen Harris",
            "Parch": 0,
            "PassengerId": 1,
            "Pclass": 3,
            "Sex": "male",
            "SibSp": 1,
            "Survived": 0,
            "Ticket": "A/5 21171"
        }

        ....
    ],
}
```

**Advanced Features Output:**
```typescript
const advancedProfile = profile(titanicSample, {
  associationMatrix: true,
  keysDependencies: true,
  missingnessPatterns: true,
  outliers: true,
  categoricalEntropy: true
});
```

```json
{
    "associationMatrix": {
        "Age": {
            "Cabin": 0.84487746358188,
            "Embarked": 0.0017926615874587443,
            "Fare": 0.09606669176903883,
            "Name": 1,
            "Parch": -0.18911926263203518,
            "PassengerId": 0.03684719786132784,
            "Pclass": -0.36922601531551574,
            "Sex": 0.008696229596377726,
            "SibSp": -0.3082467589236574,
            "Survived": -0.07722109457217737
        },
        "Cabin": {
            "Age": 0.84487746358188,
            "Embarked": 0.9492663573697424,
            "Fare": 0.8853684889490768,
            "Name": 0.9999999999998898,
            "Parch": 0.9406806543707776,
            "PassengerId": 0.8050749169584301,
            "Pclass": 1.0000000000000016,
            "Sex": 0.85902989670101,
            "SibSp": 0.9294261294261293,
            "Survived": 0.7904411764705864
        },
        "Embarked": {
            "Age": 0.0017926615874587443,
            "Cabin": 0.9492663573697424,
            "Fare": 0.07927065096791176,
            "Name": 0.9999999999999969,
            "Parch": 0.00723127712686622,
            "PassengerId": 0.0011747820348445024,
            "Pclass": 0.09501742839465667,
            "Sex": 0.12256919037251322,
            "SibSp": 0.004906413368023388,
            "Survived": 0.029796568998017418
        },
        "Fare": {
            "Age": 0.09606669176903883,
            "Cabin": 0.8853684889490768,
            "Embarked": 0.07927065096791176,
            "Name": 1,
            "Parch": 0.21622494477076254,
            "PassengerId": 0.012658219287491229,
            "Pclass": -0.5494996199439062,
            "Sex": 0.033245262282584974,
            "SibSp": 0.15965104324216106,
            "Survived": 0.2573065223849618
        },
        "Name": {
            "Age": 1,
            "Cabin": 0.9999999999998898,
            "Embarked": 0.9999999999999969,
            "Fare": 1,
            "Parch": 1,
            "PassengerId": 1,
            "Pclass": 1,
            "Sex": 0.9999999999999973,
            "SibSp": 1,
            "Survived": 1
        },
        "Parch": {
            "Age": -0.18911926263203518,
            "Cabin": 0.9406806543707776,
            "Embarked": 0.00723127712686622,
            "Fare": 0.21622494477076254,
            "Name": 1,
            "PassengerId": -0.0016520124027188283,
            "Pclass": 0.01844267131074835,
            "Sex": 0.06026482952641173,
            "SibSp": 0.41483769862015263,
            "Survived": 0.08162940708348221
        },
        "PassengerId": {
            "Age": 0.03684719786132784,
            "Cabin": 0.8050749169584301,
            "Embarked": 0.0011747820348445024,
            "Fare": 0.012658219287491229,
            "Name": 1,
            "Parch": -0.0016520124027188283,
            "Pclass": -0.03514399403037966,
            "Sex": 0.0018437474224206054,
            "SibSp": -0.057526833784441705,
            "Survived": -0.005006660767066476
        },
        "Pclass": {
            "Age": -0.36922601531551574,
            "Cabin": 1.0000000000000016,
            "Embarked": 0.09501742839465667,
            "Fare": -0.5494996199439062,
            "Name": 1,
            "Parch": 0.01844267131074835,
            "PassengerId": -0.03514399403037966,
            "Sex": 0.017397739421770773,
            "SibSp": 0.08308136284568661,
            "Survived": -0.3384810359610158
        },
        "Sex": {
            "Age": 0.008696229596377726,
            "Cabin": 0.85902989670101,
            "Embarked": 0.12256919037251322,
            "Fare": 0.033245262282584974,
            "Name": 0.9999999999999973,
            "Parch": 0.06026482952641173,
            "PassengerId": 0.0018437474224206054,
            "Pclass": 0.017397739421770773,
            "SibSp": 0.013140222690535797,
            "Survived": 0.29523072286268753
        },
        "SibSp": {
            "Age": -0.3082467589236574,
            "Cabin": 0.9294261294261293,
            "Embarked": 0.004906413368023388,
            "Fare": 0.15965104324216106,
            "Name": 1,
            "Parch": 0.41483769862015263,
            "PassengerId": -0.057526833784441705,
            "Pclass": 0.08308136284568661,
            "Sex": 0.013140222690535797,
            "Survived": -0.03532249888573588
        },
        "Survived": {
            "Age": -0.07722109457217737,
            "Cabin": 0.7904411764705864,
            "Embarked": 0.029796568998017418,
            "Fare": 0.2573065223849618,
            "Name": 1,
            "Parch": 0.08162940708348221,
            "PassengerId": -0.005006660767066476,
            "Pclass": -0.3384810359610158,
            "Sex": 0.29523072286268753,
            "SibSp": -0.03532249888573588
        },
        "Ticket": {}
    },
    "keysAndDependencies": {
        "candidatePrimaryKeys": [
            [
                "Name"
            ],
            [
                "PassengerId"
            ]
        ],
        "functionalDependencies": [
            {
                "from": [
                    "Cabin"
                ],
                "to": "Pclass"
            },
            {
                "from": [
                    "Ticket"
                ],
                "to": "Pclass"
            }
        ]
    },
    "missingnessPatterns": {
        "perColumnRates": {
            "Age": 0.19865319865319866,
            "Cabin": 0.7710437710437711,
            "Embarked": 0.002244668911335578,
            "Fare": 0,
            "Name": 0,
            "Parch": 0,
            "PassengerId": 0,
            "Pclass": 0,
            "Sex": 0,
            "SibSp": 0,
            "Survived": 0,
            "Ticket": 0
        },
        "topCoMissingPairs": [
            {
                "pair": [
                    "Age",
                    "Cabin"
                ],
                "count": 158
            }
        ]
    },
    "outliers": {
        "Age": {
            "tukeyCount": 11,
            "zscoreCount": 2
        },
        "Fare": {
            "tukeyCount": 116,
            "zscoreCount": 20
        },
        "Parch": {
            "tukeyCount": 213,
            "zscoreCount": 15
        },
        "PassengerId": {
            "tukeyCount": 0,
            "zscoreCount": 0
        },
        "Pclass": {
            "tukeyCount": 0,
            "zscoreCount": 0
        },
        "SibSp": {
            "tukeyCount": 46,
            "zscoreCount": 30
        },
        "Survived": {
            "tukeyCount": 0,
            "zscoreCount": 0
        }
    },
    "categoricalEntropy": {
        "Cabin": {
            "entropy": 7.065687903192981,
            "tailShareOutsideTop10": 0.8480392156862745
        },
        "Embarked": {
            "entropy": 1.0968693499252113,
            "tailShareOutsideTop10": 0
        },
        "Name": {
            "entropy": 9.79928162152199,
            "tailShareOutsideTop10": 0.9887766554433222
        },
        "Sex": {
            "entropy": 0.9362046432498521,
            "tailShareOutsideTop10": 0
        }
    }
}
```

## Performance

- Association matrix: Capped at 50 columns
- Key detection: Capped at 20 columns  
- Missing patterns: Optimized for large datasets

## License

MIT
