/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/upgradeable.json`.
 */
export type Upgradeable = {
  "address": "dXEvE23Lv9XX5f6ssDbzbGNQmeomC1Mi4U16EoHA3pY",
  "metadata": {
    "name": "upgradeable",
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
      "name": "insufficientFunds",
      "msg": "Insufficient funds for upgrade"
    },
    {
      "code": 6002,
      "name": "upgradeCooldown",
      "msg": "Upgrade cooldown period has not elapsed"
    },
    {
      "code": 6003,
      "name": "cannotUpgrade",
      "msg": "This entity cannot be upgraded"
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
    }
  ]
};
