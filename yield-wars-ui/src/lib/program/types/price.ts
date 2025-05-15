/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/price.json`.
 */
export type Price = {
  "address": "C4ir1WkySfTgeLA58u2q4zjbxnP5ir8tSAZb5tD5yYFa",
  "metadata": {
    "name": "price",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "instructions": [
    {
      "name": "destroy",
      "discriminator": [
        157,
        40,
        96,
        3,
        135,
        203,
        143,
        74
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "entity"
        },
        {
          "name": "component",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": []
              },
              {
                "kind": "account",
                "path": "entity"
              }
            ]
          }
        },
        {
          "name": "componentProgramData"
        },
        {
          "name": "instructionSysvarAccount",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "data",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": []
              },
              {
                "kind": "account",
                "path": "entity"
              }
            ]
          }
        },
        {
          "name": "entity"
        },
        {
          "name": "authority"
        },
        {
          "name": "instructionSysvarAccount",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "update",
      "discriminator": [
        219,
        200,
        88,
        176,
        158,
        63,
        253,
        127
      ],
      "accounts": [
        {
          "name": "boltComponent",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "instructionSysvarAccount",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateWithSession",
      "discriminator": [
        221,
        55,
        212,
        141,
        57,
        85,
        61,
        182
      ],
      "accounts": [
        {
          "name": "boltComponent",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "instructionSysvarAccount",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "sessionToken"
        }
      ],
      "args": [
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "entity",
      "discriminator": [
        46,
        157,
        161,
        161,
        254,
        46,
        79,
        24
      ]
    },
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
    },
    {
      "name": "sessionToken",
      "discriminator": [
        233,
        4,
        115,
        14,
        46,
        21,
        1,
        15
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "priceAboveMaximum",
      "msg": "Price would exceed maximum allowed value"
    },
    {
      "code": 6001,
      "name": "priceBelowMinimum",
      "msg": "Price would fall below minimum allowed value"
    },
    {
      "code": 6002,
      "name": "priceUpdatesDisabled",
      "msg": "Price updates are currently disabled"
    },
    {
      "code": 6003,
      "name": "updateFrequencyNotReached",
      "msg": "Update frequency limit not reached"
    },
    {
      "code": 6004,
      "name": "invalidPriceTrend",
      "msg": "Price trend must be between -100 and +100"
    },
    {
      "code": 6005,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in price calculation"
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
      "name": "entity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
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
    },
    {
      "name": "sessionToken",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
