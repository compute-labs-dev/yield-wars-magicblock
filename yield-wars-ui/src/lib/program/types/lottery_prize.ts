/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lottery_prize.json`.
 */
export type LotteryPrize = {
  "address": "4xUdb6YrCjMeXNFJXXEpHxKVsYoHcRKYFn7Ehz5s8xN9",
  "metadata": {
    "name": "lotteryPrize",
    "version": "0.2.3",
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
      "name": "betAmountTooLow",
      "msg": "Bet amount is below the minimum required"
    },
    {
      "code": 6001,
      "name": "lotteryInactive",
      "msg": "Lottery is currently inactive"
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
