export const CONTRACTS = {
  lendiProof:     (import.meta.env.VITE_LENDI_PROOF_ADDRESS      ?? '0x809B8FC3C0e12f8F1b280E8A823294F98760fad4') as `0x${string}`,
  lendiProofGate: (import.meta.env.VITE_LENDI_PROOF_GATE_ADDRESS ?? '0x4C57b7c43Cb043eCa1aB00aD152545143d8286cc') as `0x${string}`,
  lendiPolicy:    (import.meta.env.VITE_LENDI_POLICY_ADDRESS      ?? '0x73438f4B2757bE51Cd47E2f2D5A8EE3f36Ae176E') as `0x${string}`,
  usdc:           '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as `0x${string}`,
  chainId:        421614,
  rpc:            'https://sepolia-rollup.arbitrum.io/rpc',
  explorer:       'https://sepolia.arbiscan.io',
} as const
