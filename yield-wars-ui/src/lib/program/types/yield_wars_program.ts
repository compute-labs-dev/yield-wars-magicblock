/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/yield_wars_program.json`.
 */
export type YieldWarsProgram = {
  "address": "3gnT2CxCTT6QBZHyqtETVnhxfHBK3wccAYqfxq4Xn8PT",
  "metadata": {
    "name": "yieldWarsProgram",
    "version": "0.2.2",
    "spec": "0.1.0",
    "description": "Created with Bolt"
  },
  "instructions": [
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
      "accounts": [],
      "args": []
    }
  ]
};
