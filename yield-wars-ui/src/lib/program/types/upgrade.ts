/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/upgrade.json`.
 */
export type Upgrade = {
  "address": "C5rv7atbb2NxYS2yhfTci67yKwrWKJ3d1jKhAUMAtLur",
  "metadata": {
    "name": "upgrade",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "docs": [
    "Upgrade system for handling entity upgrades",
    "",
    "This system allows entities to:",
    "- Initialize upgrade properties",
    "- Perform upgrades",
    "- Apply upgrade benefits to production",
    "- Update upgrade costs for the next level"
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
        "Main execution function for the Upgrade system"
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
          "name": "upgradeable"
        },
        {
          "name": "wallet"
        },
        {
          "name": "production"
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
      "name": "upgradeable",
      "discriminator": [
        92,
        9,
        162,
        145,
        129,
        145,
        28,
        204
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
      "name": "alreadyMaxLevel",
      "msg": "Entity is already at maximum level"
    },
    {
      "code": 6001,
      "name": "insufficientUsdcFunds",
      "msg": "Insufficient USDC funds for upgrade"
    },
    {
      "code": 6002,
      "name": "insufficientAifiFunds",
      "msg": "Insufficient AiFi funds for upgrade"
    },
    {
      "code": 6003,
      "name": "upgradeCooldown",
      "msg": "Upgrade cooldown period has not elapsed"
    },
    {
      "code": 6004,
      "name": "cannotUpgrade",
      "msg": "This entity cannot be upgraded"
    },
    {
      "code": 6005,
      "name": "invalidOperation",
      "msg": "Invalid operation type specified"
    },
    {
      "code": 6006,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in calculation"
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
      "name": "upgradeable",
      "docs": [
        "Upgradeable component that defines upgrade capabilities for entities",
        "",
        "This component is attached to entities that can be upgraded, such as GPUs and Data Centers.",
        "It tracks the current level, maximum possible level, and stores required upgrade costs.",
        "The upgrade costs define the amount of resources needed for each level upgrade."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currentLevel",
            "docs": [
              "Current level of the entity (starts at 1)"
            ],
            "type": "u8"
          },
          {
            "name": "maxLevel",
            "docs": [
              "Maximum level this entity can reach"
            ],
            "type": "u8"
          },
          {
            "name": "lastUpgradeTime",
            "docs": [
              "Last time this entity was upgraded (Unix timestamp)"
            ],
            "type": "i64"
          },
          {
            "name": "canUpgrade",
            "docs": [
              "Whether entity can be upgraded further"
            ],
            "type": "bool"
          },
          {
            "name": "upgradeableType",
            "docs": [
              "Type of the upgradeable entity (uses same enum as Ownership component)"
            ],
            "type": "u8"
          },
          {
            "name": "nextUpgradeUsdcCost",
            "docs": [
              "USDC cost for the next upgrade"
            ],
            "type": "u64"
          },
          {
            "name": "nextUpgradeAifiCost",
            "docs": [
              "AiFi cost for the next upgrade"
            ],
            "type": "u64"
          },
          {
            "name": "upgradeCooldown",
            "docs": [
              "Cooldown between upgrades in seconds"
            ],
            "type": "u32"
          },
          {
            "name": "nextUsdcBoost",
            "docs": [
              "Production boost percentage for USDC after next upgrade (10000 = 100%)"
            ],
            "type": "u32"
          },
          {
            "name": "nextAifiBoost",
            "docs": [
              "Production boost percentage for AiFi after next upgrade (10000 = 100%)"
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
