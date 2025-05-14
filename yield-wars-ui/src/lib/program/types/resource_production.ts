/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/resource_production.json`.
 */
export type ResourceProduction = {
  "address": "3Erv5Y7amyL9MNGy83HAVaQaAohQZF9qC6faHrcE58Ez",
  "metadata": {
    "name": "resourceProduction",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "docs": [
    "ResourceProduction system handles resource generation and collection",
    "",
    "This system allows entities to:",
    "- Initialize production settings",
    "- Collect generated resources based on time elapsed",
    "- Activate or deactivate production",
    "- Update production rates"
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
        "Main execution function for the ResourceProduction system"
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
          "name": "production"
        },
        {
          "name": "wallet"
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
      "name": "production",
      "discriminator": [
        141,
        81,
        95,
        126,
        26,
        136,
        101,
        92
      ]
    },
    {
      "name": "wallet",
      "discriminator": [
        24,
        89,
        59,
        139,
        81,
        154,
        232,
        95
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "productionInactive",
      "msg": "Production is currently inactive"
    },
    {
      "code": 6001,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in calculation"
    },
    {
      "code": 6002,
      "name": "invalidOperation",
      "msg": "Invalid operation type specified"
    },
    {
      "code": 6003,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp provided"
    },
    {
      "code": 6004,
      "name": "insufficientFundsForOperating",
      "msg": "Insufficient funds to cover operating costs"
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
      "name": "production",
      "docs": [
        "Production component that tracks resource generation rates",
        "",
        "This component is used to define the production capabilities of entities in the YieldWars game,",
        "such as GPUs that produce USDC and AiFi tokens. It includes:",
        "- Production rates per hour for USDC and AiFi",
        "- Last collection timestamp to calculate uncollected resources",
        "- Efficiency multiplier that can be affected by upgrades, data centers, or energy contracts"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usdcPerHour",
            "docs": [
              "USDC tokens produced per hour"
            ],
            "type": "u64"
          },
          {
            "name": "aifiPerHour",
            "docs": [
              "AiFi tokens produced per hour"
            ],
            "type": "u64"
          },
          {
            "name": "lastCollectionTime",
            "docs": [
              "Timestamp of the last resource collection (Unix timestamp)"
            ],
            "type": "i64"
          },
          {
            "name": "efficiencyMultiplier",
            "docs": [
              "Efficiency multiplier applied to production rates (10000 = 100%)",
              "This can be increased by:",
              "- Placing GPUs in data centers",
              "- Purchasing energy contracts",
              "- Applying upgrades"
            ],
            "type": "u32"
          },
          {
            "name": "producerType",
            "docs": [
              "Type of production entity (uses same enum as Ownership component)"
            ],
            "type": "u8"
          },
          {
            "name": "level",
            "docs": [
              "Current level of the production entity (affects base rates)"
            ],
            "type": "u8"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether production is currently active"
            ],
            "type": "bool"
          },
          {
            "name": "operatingCost",
            "docs": [
              "Operating cost per hour in USDC"
            ],
            "type": "u64"
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
      "name": "wallet",
      "docs": [
        "Wallet component that tracks currency balances for the player",
        "",
        "This component stores the balances of different cryptocurrencies",
        "that a player can own in the YieldWars game. It tracks:",
        "- USDC: Base currency used for most transactions",
        "- BTC: Bitcoin, a tradable cryptocurrency with fluctuating value",
        "- ETH: Ethereum, a tradable cryptocurrency with fluctuating value",
        "- SOL: Solana, a tradable cryptocurrency with fluctuating value",
        "- AiFi: Special token produced by GPUs, used for advanced upgrades"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "usdcBalance",
            "docs": [
              "Balance of USDC (stablecoin), the base currency"
            ],
            "type": "u64"
          },
          {
            "name": "btcBalance",
            "docs": [
              "Balance of Bitcoin (BTC)"
            ],
            "type": "u64"
          },
          {
            "name": "ethBalance",
            "docs": [
              "Balance of Ethereum (ETH)"
            ],
            "type": "u64"
          },
          {
            "name": "solBalance",
            "docs": [
              "Balance of Solana (SOL)"
            ],
            "type": "u64"
          },
          {
            "name": "aifiBalance",
            "docs": [
              "Balance of AiFi tokens"
            ],
            "type": "u64"
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
