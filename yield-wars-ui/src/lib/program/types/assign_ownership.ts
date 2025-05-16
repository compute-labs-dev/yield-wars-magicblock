/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/assign_ownership.json`.
 */
export type AssignOwnership = {
  "address": "AFiHj9n9khQjMG1U4dSoVVD7KLnVtgrcgvtfZcZHR2L3",
  "metadata": {
    "name": "assignOwnership",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "docs": [
    "AssignOwnership system for managing entity ownership relationships",
    "",
    "This system allows:",
    "- Initializing ownership settings",
    "- Assigning resources to wallets",
    "- Removing resource ownership",
    "- Transferring resource ownership between wallets",
    "- Batch updating ownership records"
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
        "Main execution function for the AssignOwnership system"
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
          "name": "ownerOwnership"
        },
        {
          "name": "destinationOwnership"
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
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "entityNotFound",
      "msg": "Entity not found in ownership records"
    },
    {
      "code": 6001,
      "name": "alreadyOwned",
      "msg": "Entity is already owned by the destination"
    },
    {
      "code": 6002,
      "name": "invalidOperation",
      "msg": "Invalid operation type specified"
    },
    {
      "code": 6003,
      "name": "tooManyEntities",
      "msg": "Ownership array would exceed maximum length"
    },
    {
      "code": 6004,
      "name": "invalidEntityType",
      "msg": "Invalid entity type for this operation"
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
    }
  ]
};
