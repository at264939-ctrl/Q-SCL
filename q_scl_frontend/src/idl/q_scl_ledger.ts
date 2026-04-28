export type QSclLedger = {
  "version": "0.1.0",
  "name": "q_scl_ledger",
  "instructions": [
    {
      "name": "initializeLedger",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "quantumProvider",
          "type": "publicKey"
        },
        {
          "name": "ikaMpcEndpoint",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "registerEncryptedAccount",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "confidentialAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "encryptedPubkey",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "initialEncryptedBalance",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        }
      ]
    },
    {
      "name": "updateQuantumSeed",
      "accounts": [
        {
          "name": "quantumProvider",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newSeed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "entropyProof",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "confidentialTransfer",
      "accounts": [
        {
          "name": "sender",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "senderAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "receiverAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ledgerState",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "encryptedTransferAmount",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "senderNewBalance",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "receiverNewBalance",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "zkBalanceProof",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "memoHash",
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
      "name": "triggerDwalletIntent",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "confidentialAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "intentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "targetChain",
          "type": "u8"
        },
        {
          "name": "encryptedCondition",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "ikaSessionId",
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
      "name": "freezeAccount",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "confidentialAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "freeze",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "confidentialAccount",
      "docs": [
        "Per-user confidential account PDA — stores encrypted balance."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "The Solana pubkey of the account owner"
            ],
            "type": "publicKey"
          },
          {
            "name": "encryptedPubkey",
            "docs": [
              "BFV public key commitment:",
              "H(pk[0] || pk[1]) where pk = keygen(user_secret ⊕ quantum_seed)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "encryptedBalance",
            "docs": [
              "BFV ciphertext of the user's balance:",
              "C = (c0, c1) = BFV.Enc(pk, balance)",
              "Stored as compact 128-byte on-chain representation."
            ],
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Anti-replay nonce for transfer instructions"
            ],
            "type": "u64"
          },
          {
            "name": "dwalletIntent",
            "docs": [
              "Current pending Ika dWallet cross-chain intent hash"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isFrozen",
            "docs": [
              "Whether this account is frozen by authority"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Account creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "lastUpdated",
            "docs": [
              "Last updated timestamp"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "ledgerState",
      "docs": [
        "Global ledger state PDA — stores quantum entropy and protocol config."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The administrator authority (can freeze accounts, update config)"
            ],
            "type": "publicKey"
          },
          {
            "name": "quantumProvider",
            "docs": [
              "The authorized quantum entropy provider (Python Qiskit service)"
            ],
            "type": "publicKey"
          },
          {
            "name": "ikaMpcEndpoint",
            "docs": [
              "Ika network MPC endpoint identifier (64-byte handle)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "quantumSeed",
            "docs": [
              "Current quantum random seed (256-bit, from IBM Quantum QRNG)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "seedTimestamp",
            "docs": [
              "Unix timestamp of last seed update (used for freshness checks)"
            ],
            "type": "i64"
          },
          {
            "name": "epoch",
            "docs": [
              "Monotonic counter of seed rotation epochs"
            ],
            "type": "u64"
          },
          {
            "name": "entryCount",
            "docs": [
              "Count of registered confidential accounts"
            ],
            "type": "u32"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future protocol upgrades"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "AccountRegistered",
      "fields": [
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "encryptedPubkey",
          "type": {
            "array": [
              "u8",
              64
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ConfidentialTransferEvent",
      "fields": [
        {
          "name": "sender",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "receiver",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "encryptedAmountHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "memoHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "DWalletIntentTriggered",
      "fields": [
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "intentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "targetChain",
          "type": "u8",
          "index": false
        },
        {
          "name": "ikaSessionId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "LedgerInitialized",
      "fields": [
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "quantumProvider",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "QuantumSeedUpdated",
      "fields": [
        {
          "name": "epoch",
          "type": "u64",
          "index": false
        },
        {
          "name": "oldSeedHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "newSeedHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized: signer is not the account owner or authority"
    },
    {
      "code": 6001,
      "name": "UnauthorizedProvider",
      "msg": "Unauthorized: signer is not the registered quantum provider"
    },
    {
      "code": 6002,
      "name": "StaleQuantumSeed",
      "msg": "Stale quantum seed: seed is older than 1 hour, please rotate"
    },
    {
      "code": 6003,
      "name": "InvalidEntropy",
      "msg": "Invalid entropy: new seed cannot be all zeros"
    },
    {
      "code": 6004,
      "name": "DuplicateSeed",
      "msg": "Duplicate seed: new seed is identical to current seed"
    },
    {
      "code": 6005,
      "name": "InvalidEntropyProof",
      "msg": "Invalid entropy proof: HMAC proof is missing or malformed"
    },
    {
      "code": 6006,
      "name": "InvalidZKProof",
      "msg": "Invalid ZK proof: balance range proof verification failed"
    },
    {
      "code": 6007,
      "name": "AccountFrozen",
      "msg": "Account frozen: this confidential account is frozen by authority"
    },
    {
      "code": 6008,
      "name": "LedgerFull",
      "msg": "Ledger full: maximum number of confidential accounts reached"
    }
  ]
};

export const IDL: QSclLedger = {
  "version": "0.1.0",
  "name": "q_scl_ledger",
  "instructions": [
    {
      "name": "initializeLedger",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "quantumProvider",
          "type": "publicKey"
        },
        {
          "name": "ikaMpcEndpoint",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "registerEncryptedAccount",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "confidentialAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "encryptedPubkey",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "initialEncryptedBalance",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        }
      ]
    },
    {
      "name": "updateQuantumSeed",
      "accounts": [
        {
          "name": "quantumProvider",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "newSeed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "entropyProof",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      "name": "confidentialTransfer",
      "accounts": [
        {
          "name": "sender",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "senderAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "receiver",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "receiverAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "ledgerState",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "encryptedTransferAmount",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "senderNewBalance",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "receiverNewBalance",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "zkBalanceProof",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "memoHash",
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
      "name": "triggerDwalletIntent",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "confidentialAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "intentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "targetChain",
          "type": "u8"
        },
        {
          "name": "encryptedCondition",
          "type": {
            "array": [
              "u8",
              128
            ]
          }
        },
        {
          "name": "ikaSessionId",
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
      "name": "freezeAccount",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "ledgerState",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "confidentialAccount",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "freeze",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "confidentialAccount",
      "docs": [
        "Per-user confidential account PDA — stores encrypted balance."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "The Solana pubkey of the account owner"
            ],
            "type": "publicKey"
          },
          {
            "name": "encryptedPubkey",
            "docs": [
              "BFV public key commitment:",
              "H(pk[0] || pk[1]) where pk = keygen(user_secret ⊕ quantum_seed)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "encryptedBalance",
            "docs": [
              "BFV ciphertext of the user's balance:",
              "C = (c0, c1) = BFV.Enc(pk, balance)",
              "Stored as compact 128-byte on-chain representation."
            ],
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Anti-replay nonce for transfer instructions"
            ],
            "type": "u64"
          },
          {
            "name": "dwalletIntent",
            "docs": [
              "Current pending Ika dWallet cross-chain intent hash"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isFrozen",
            "docs": [
              "Whether this account is frozen by authority"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Account creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "lastUpdated",
            "docs": [
              "Last updated timestamp"
            ],
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "ledgerState",
      "docs": [
        "Global ledger state PDA — stores quantum entropy and protocol config."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The administrator authority (can freeze accounts, update config)"
            ],
            "type": "publicKey"
          },
          {
            "name": "quantumProvider",
            "docs": [
              "The authorized quantum entropy provider (Python Qiskit service)"
            ],
            "type": "publicKey"
          },
          {
            "name": "ikaMpcEndpoint",
            "docs": [
              "Ika network MPC endpoint identifier (64-byte handle)"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "quantumSeed",
            "docs": [
              "Current quantum random seed (256-bit, from IBM Quantum QRNG)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "seedTimestamp",
            "docs": [
              "Unix timestamp of last seed update (used for freshness checks)"
            ],
            "type": "i64"
          },
          {
            "name": "epoch",
            "docs": [
              "Monotonic counter of seed rotation epochs"
            ],
            "type": "u64"
          },
          {
            "name": "entryCount",
            "docs": [
              "Count of registered confidential accounts"
            ],
            "type": "u32"
          },
          {
            "name": "reserved",
            "docs": [
              "Reserved space for future protocol upgrades"
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "AccountRegistered",
      "fields": [
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "encryptedPubkey",
          "type": {
            "array": [
              "u8",
              64
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "ConfidentialTransferEvent",
      "fields": [
        {
          "name": "sender",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "receiver",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "encryptedAmountHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "memoHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "DWalletIntentTriggered",
      "fields": [
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "intentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "targetChain",
          "type": "u8",
          "index": false
        },
        {
          "name": "ikaSessionId",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "LedgerInitialized",
      "fields": [
        {
          "name": "authority",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "quantumProvider",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "QuantumSeedUpdated",
      "fields": [
        {
          "name": "epoch",
          "type": "u64",
          "index": false
        },
        {
          "name": "oldSeedHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "newSeedHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "Unauthorized: signer is not the account owner or authority"
    },
    {
      "code": 6001,
      "name": "UnauthorizedProvider",
      "msg": "Unauthorized: signer is not the registered quantum provider"
    },
    {
      "code": 6002,
      "name": "StaleQuantumSeed",
      "msg": "Stale quantum seed: seed is older than 1 hour, please rotate"
    },
    {
      "code": 6003,
      "name": "InvalidEntropy",
      "msg": "Invalid entropy: new seed cannot be all zeros"
    },
    {
      "code": 6004,
      "name": "DuplicateSeed",
      "msg": "Duplicate seed: new seed is identical to current seed"
    },
    {
      "code": 6005,
      "name": "InvalidEntropyProof",
      "msg": "Invalid entropy proof: HMAC proof is missing or malformed"
    },
    {
      "code": 6006,
      "name": "InvalidZKProof",
      "msg": "Invalid ZK proof: balance range proof verification failed"
    },
    {
      "code": 6007,
      "name": "AccountFrozen",
      "msg": "Account frozen: this confidential account is frozen by authority"
    },
    {
      "code": 6008,
      "name": "LedgerFull",
      "msg": "Ledger full: maximum number of confidential accounts reached"
    }
  ]
};
