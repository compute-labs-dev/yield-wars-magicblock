/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/market.json`.
 */
export type Market = {
  "address": "EE1nNQ7zsRFqnR5E6EUDjjpMMmsa1Y9NzX1ukQ2ks8WC",
  "metadata": {
    "name": "market",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "docs": [
    "Market system for asset trading and marketplace functionality",
    "",
    "This system allows players to:",
    "- List assets for sale",
    "- Purchase assets from other players",
    "- Manage asset listings",
    "- Transfer assets between entities"
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
        "Main execution function for the Market system"
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
          "name": "sellerWallet"
        },
        {
          "name": "buyerWallet"
        },
        {
          "name": "sellerOwnership"
        },
        {
          "name": "buyerOwnership"
        },
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
      "name": "ownership",
      "discriminator": [
        41,
        84,
        101,
        206,
        145,
        175,
        88,
        65
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
      "name": "notTheOwner",
      "msg": "Seller is not the owner of this asset"
    },
    {
      "code": 6001,
      "name": "invalidPrice",
      "msg": "Invalid price for listing"
    },
    {
      "code": 6002,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for purchase"
    },
    {
      "code": 6003,
      "name": "invalidPaymentMethod",
      "msg": "Invalid payment method specified"
    },
    {
      "code": 6004,
      "name": "invalidListing",
      "msg": "Listing not found or invalid"
    },
    {
      "code": 6005,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in calculation"
    },
    {
      "code": 6006,
      "name": "invalidOperation",
      "msg": "Invalid operation type specified"
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
      "name": "ownership",
      "docs": [
        "Ownership component that tracks which entities own other entities",
        "",
        "This component is used to establish ownership relationships between entities in the YieldWars game.",
        "For example, a player entity can own multiple GPU entities, Data Centers, Land Rights, etc.",
        "The component stores a list of the public keys of owned entities along with their types."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ownerType",
            "docs": [
              "The type of the entity this ownership component is attached to"
            ],
            "type": "u8"
          },
          {
            "name": "ownedEntities",
            "docs": [
              "Array of owned entity public keys"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "ownedEntityTypes",
            "docs": [
              "Array of entity types corresponding to owned entities"
            ],
            "type": "bytes"
          },
          {
            "name": "ownerEntity",
            "docs": [
              "The public key of the entity that owns this entity (if applicable)",
              "This enables bidirectional ownership tracking"
            ],
            "type": {
              "option": "pubkey"
            }
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
