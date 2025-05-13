/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/production.json`.
 */
export type Production = {
  "address": "ET9h3CitgureNw7GRGTCG4hDKGTxtE1kYmPwDB6Xb1ar",
  "metadata": {
    "name": "production",
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
      "name": "productionInactive",
      "msg": "Production is currently inactive"
    },
    {
      "code": 6001,
      "name": "collectionCooldown",
      "msg": "Collection cooldown period has not elapsed"
    },
    {
      "code": 6002,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow in production calculation"
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
