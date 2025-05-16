/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/stakeable.json`.
 */
export type Stakeable = {
  "address": "6ewq3Rkx3c2kLu9qq46fCNS9ZhBshzskCEAgX7WspkVQ",
  "metadata": {
    "name": "stakeable",
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
    },
    {
      "name": "stakeable",
      "discriminator": [
        245,
        80,
        221,
        128,
        208,
        239,
        116,
        162
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadyStaked",
      "msg": "Entity is already staked"
    },
    {
      "code": 6001,
      "name": "notStaked",
      "msg": "Entity is not staked"
    },
    {
      "code": 6002,
      "name": "minimumStakingPeriodNotElapsed",
      "msg": "Minimum staking period has not elapsed"
    },
    {
      "code": 6003,
      "name": "noRewardsAvailable",
      "msg": "No rewards available to claim"
    },
    {
      "code": 6004,
      "name": "cannotClaimRewards",
      "msg": "Cannot claim rewards at this time"
    },
    {
      "code": 6005,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in reward calculation"
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
    },
    {
      "name": "stakeable",
      "docs": [
        "Stakeable component that enables staking functionality for entities",
        "",
        "This component is attached to entities that can be staked, such as GPUs.",
        "Staking locks an entity for a period of time, during which it generates bonus rewards.",
        "Early unstaking may incur a penalty based on the configured rates."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isStaked",
            "docs": [
              "Whether the entity is currently staked"
            ],
            "type": "bool"
          },
          {
            "name": "stakingStartTime",
            "docs": [
              "Unix timestamp when the entity was staked"
            ],
            "type": "i64"
          },
          {
            "name": "minStakingPeriod",
            "docs": [
              "Minimum staking period in seconds before rewards can be claimed without penalty"
            ],
            "type": "u32"
          },
          {
            "name": "rewardRate",
            "docs": [
              "Reward rate (100 = 1%, 500 = 5%, etc.)"
            ],
            "type": "u32"
          },
          {
            "name": "unstakingPenalty",
            "docs": [
              "Penalty rate for early unstaking (100 = 1%, 500 = 5%, etc.)"
            ],
            "type": "u32"
          },
          {
            "name": "accumulatedUsdcRewards",
            "docs": [
              "Accumulated USDC rewards (calculated at claim time)"
            ],
            "type": "u64"
          },
          {
            "name": "accumulatedAifiRewards",
            "docs": [
              "Accumulated AiFi rewards (calculated at claim time)"
            ],
            "type": "u64"
          },
          {
            "name": "lastClaimTime",
            "docs": [
              "Last time rewards were claimed (Unix timestamp)"
            ],
            "type": "i64"
          },
          {
            "name": "stakeableType",
            "docs": [
              "Type of the stakeable entity (uses same enum as Ownership component)"
            ],
            "type": "u8"
          },
          {
            "name": "canClaimRewards",
            "docs": [
              "Whether rewards can be claimed (might be locked during certain periods)"
            ],
            "type": "bool"
          },
          {
            "name": "baseUsdcPerHour",
            "docs": [
              "Base USDC per hour used for reward calculations"
            ],
            "type": "u64"
          },
          {
            "name": "baseAifiPerHour",
            "docs": [
              "Base AiFi per hour used for reward calculations"
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
