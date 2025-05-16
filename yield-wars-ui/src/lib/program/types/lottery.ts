/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lottery.json`.
 */
export type Lottery = {
  "address": "A3Cr4W7xT1QFH23CxGqMe5uYZKzSLEwT8JsjdswSRMrx",
  "metadata": {
    "name": "lottery",
    "version": "0.2.3",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
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
          "name": "lotteryPrize"
        },
        {
          "name": "playerWallet"
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
      "name": "lotteryPrize",
      "discriminator": [
        204,
        231,
        5,
        35,
        196,
        194,
        127,
        117
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
      "name": "betAmountTooLow",
      "msg": "Bet amount too low"
    },
    {
      "code": 6001,
      "name": "insufficientFunds",
      "msg": "Insufficient funds to place bet"
    },
    {
      "code": 6002,
      "name": "invalidOperation",
      "msg": "Invalid operation"
    },
    {
      "code": 6003,
      "name": "lotteryNotActive",
      "msg": "Lottery is not active"
    },
    {
      "code": 6004,
      "name": "noPrizeToClaim",
      "msg": "No prize to claim"
    },
    {
      "code": 6005,
      "name": "invalidWinProbability",
      "msg": "Invalid win probability (must be between 1 and 10000)"
    },
    {
      "code": 6006,
      "name": "invalidMaxWinMultiplier",
      "msg": "Invalid max win multiplier (must be greater than 0)"
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
      "name": "lotteryPrize",
      "docs": [
        "LotteryPrize component that tracks lottery properties and prize information",
        "",
        "This component stores information about a lottery including:",
        "- Current prize pool amount",
        "- Minimum bet amount",
        "- Win probability",
        "- Recent winners and prizes"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minBetAmount",
            "docs": [
              "Minimum bet amount in AiFi tokens"
            ],
            "type": "u64"
          },
          {
            "name": "winProbability",
            "docs": [
              "Win probability as a percentage (10000 = 100%, 100 = 1%)"
            ],
            "type": "u32"
          },
          {
            "name": "maxWinMultiplier",
            "docs": [
              "Maximum win multiplier (10000 = 10x, 5000 = 5x)"
            ],
            "type": "u32"
          },
          {
            "name": "lastUpdateTime",
            "docs": [
              "Timestamp of last lottery update"
            ],
            "type": "i64"
          },
          {
            "name": "totalBets",
            "docs": [
              "Total number of bets placed"
            ],
            "type": "u64"
          },
          {
            "name": "totalWins",
            "docs": [
              "Total number of wins"
            ],
            "type": "u64"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the lottery is currently active"
            ],
            "type": "bool"
          },
          {
            "name": "recentWinners",
            "docs": [
              "Recent winners identified by their public key"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "recentPrizes",
            "docs": [
              "Prize amounts in AiFi tokens corresponding to recent winners"
            ],
            "type": {
              "vec": "u64"
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
