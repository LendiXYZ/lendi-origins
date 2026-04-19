export const CONTRACTS = {
  lendiProof:     (import.meta.env.VITE_LENDI_PROOF_ADDRESS      ?? '0x0f9c2e1fb84DB0afb9e830C93D847C8F817C41ac') as `0x${string}`,
  lendiProofGate: (import.meta.env.VITE_LENDI_PROOF_GATE_ADDRESS ?? '0x06b0523e63FF904d622aa6d125FdEe11201Bf791') as `0x${string}`,
  lendiPolicy:    (import.meta.env.VITE_LENDI_POLICY_ADDRESS      ?? '0x68AE6d292553C0fBa8e797c0056Efe56038227A1') as `0x${string}`,
  usdc:           '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
  chainId:        421614,
  rpc:            'https://sepolia-rollup.arbitrum.io/rpc',
  explorer:       'https://sepolia.arbiscan.io',
} as const
