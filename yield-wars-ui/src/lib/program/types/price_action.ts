/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/price_action.json`.
 */
export type PriceAction = {
  "address": "4qjf6jiDRxFwTkKKy6hPS5NP5rKK9KEFCEGQAGFfLgs8",
  "metadata": {
    "name": "priceAction",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "docs": [
    "PriceActionSystem handles price component initialization and updates",
    "",
    "This system allows entities to:",
    "- Initialize price components with proper values",
    "- Enable price updates for components",
    "- Update prices based on market dynamics",
    "",
    "All currency values use 6 decimal places, where 1,000,000 = $1.",
    "For example, BTC at $60,000 would be stored as 60,000,000,000."
  ],
  "instructions": [
    {
      "name": "boltExecute",
      "discriminator": [
        75,
        206,
        62,
        210,
        52,
        215,
        104,
        109
      ],
      "accounts": [
        {
          "name": "authority"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": "bytes"
        }
      ],
      "returns": {
        "vec": "bytes"
      }
    },
    {
      "name": "execute",
      "docs": [
        "Main execution function for the PriceActionSystem"
      ],
      "discriminator": [
        130,
        221,
        242,
        154,
        13,
        193,
        189,
        29
      ],
      "accounts": [
        {
          "name": "price"
        },
        {
          "name": "authority"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": "bytes"
        }
      ],
      "returns": {
        "vec": "bytes"
      }
    }
  ],
  "accounts": [
    {
      "name": "price",
      "discriminator": [
        50,
        107,
        127,
        61,
        83,
        36,
        39,
        75
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidOperationType",
      "msg": "Invalid operation type"
    },
    {
      "code": 6001,
      "name": "initializationFailed",
      "msg": "Price initialization failed"
    },
    {
      "code": 6002,
      "name": "enablingFailed",
      "msg": "Price enabling failed"
    },
    {
      "code": 6003,
      "name": "updateFailed",
      "msg": "Price update failed"
    },
    {
      "code": 6004,
      "name": "invalidCurrencyType",
      "msg": "Invalid currency type"
    },
    {
      "code": 6005,
      "name": "priceComponentError",
      "msg": "Price component error"
    },
    {
      "code": 6006,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in calculation"
    },
    {
      "code": 6007,
      "name": "priceUpdatesDisabled",
      "msg": "Price updates are currently disabled"
    }
  ],
  "types": [
    {
      "name": "boltMetadata",
      "docs": [
        "Metadata for the component."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "price",
      "docs": [
        "Price component that tracks market values and price history",
        "",
        "This component is attached to entities that have market value, such as currencies and assets.",
        "It tracks current price, historical prices, and price change parameters.",
        "Price changes can be influenced by market activity and time-based fluctuations."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currentPrice",
            "docs": [
              "Current price in USDC (base currency)"
            ],
            "type": "u64"
          },
          {
            "name": "previousPrice",
            "docs": [
              "Previous price for calculating price change"
            ],
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "docs": [
              "Timestamp of last price update"
            ],
            "type": "i64"
          },
          {
            "name": "minPrice",
            "docs": [
              "Minimum price allowed"
            ],
            "type": "u64"
          },
          {
            "name": "maxPrice",
            "docs": [
              "Maximum price allowed"
            ],
            "type": "u64"
          },
          {
            "name": "volatility",
            "docs": [
              "Volatility factor (100 = 1%, 1000 = 10%, etc.)"
            ],
            "type": "u32"
          },
          {
            "name": "updateFrequency",
            "docs": [
              "Price update frequency in seconds"
            ],
            "type": "u32"
          },
          {
            "name": "priceType",
            "docs": [
              "Type of the priced entity (uses same enum as Ownership component)"
            ],
            "type": "u8"
          },
          {
            "name": "priceUpdatesEnabled",
            "docs": [
              "Whether price updates are currently enabled"
            ],
            "type": "bool"
          },
          {
            "name": "priceTrend",
            "docs": [
              "Price trend direction (-100 to +100, where 0 is neutral)"
            ],
            "type": "i8"
          },
          {
            "name": "priceHistory",
            "docs": [
              "Array of historical prices (most recent first, max 24 entries)"
            ],
            "type": {
              "array": [
                "u64",
                24
              ]
            }
          },
          {
            "name": "historyIndex",
            "docs": [
              "Index for circular price history array"
            ],
            "type": "u8"
          },
          {
            "name": "supplyFactor",
            "docs": [
              "Supply factor affecting price (10000 = neutral)"
            ],
            "type": "u32"
          },
          {
            "name": "demandFactor",
            "docs": [
              "Demand factor affecting price (10000 = neutral)"
            ],
            "type": "u32"
          },
          {
            "name": "boltMetadata",
            "type": {
              "defined": {
                "name": "boltMetadata"
              }
            }
          }
        ]
      }
    }
  ]
};
