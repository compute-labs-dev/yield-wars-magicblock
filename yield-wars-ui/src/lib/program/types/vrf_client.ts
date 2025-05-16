/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vrf_client.json`.
 */
export type VrfClient = {
  "address": "2LwC4FAQgQfbJvNo5xAVVLbXap1SpnixhyeMejud58Pq",
  "metadata": {
    "name": "vrfClient",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "consumeRandomness",
      "discriminator": [
        190,
        217,
        49,
        162,
        99,
        26,
        73,
        234
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Signer PDA of the VRF program"
          ],
          "signer": true,
          "address": "9irBy75QS2BN81FUgXuHcjqceJJRuc9oDkAe8TKVvvAw"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "userRandomnessAccount",
          "docs": [
            "PDA where randomness will be stored for this user"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "getRandomness",
      "discriminator": [
        73,
        239,
        90,
        93,
        139,
        63,
        19,
        7
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "userRandomnessAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "getRandomnessForBet",
      "discriminator": [
        68,
        224,
        168,
        143,
        123,
        139,
        105,
        224
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "userRandomnessAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        }
      ],
      "args": [],
      "returns": {
        "array": [
          "u8",
          32
        ]
      }
    },
    {
      "name": "markRandomnessUsed",
      "discriminator": [
        238,
        159,
        82,
        45,
        160,
        158,
        137,
        194
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "userRandomnessAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "requestRandomness",
      "discriminator": [
        213,
        5,
        173,
        166,
        37,
        236,
        31,
        18
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "GKE6d7iv8kCBrsxr78W3xVdjGLLLJnxsGiuzrsZCGEvb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        }
      ],
      "args": [
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "simplerRequestRandomness",
      "discriminator": [
        191,
        234,
        209,
        68,
        56,
        199,
        221,
        4
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "GKE6d7iv8kCBrsxr78W3xVdjGLLLJnxsGiuzrsZCGEvb"
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userRandomness",
      "discriminator": [
        61,
        180,
        221,
        26,
        148,
        37,
        75,
        198
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidUser",
      "msg": "Invalid user for randomness account"
    },
    {
      "code": 6001,
      "name": "randomnessAlreadyUsed",
      "msg": "Randomness has already been used"
    }
  ],
  "types": [
    {
      "name": "userRandomness",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "isUsed",
            "type": "bool"
          }
        ]
      }
    }
  ]
};
