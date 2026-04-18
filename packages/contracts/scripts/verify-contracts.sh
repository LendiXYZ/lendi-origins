#!/bin/bash

# Wave 2 Contract Verification Script
# Run this after deployment to verify contracts on Arbiscan

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Wave 2 Contract Verification ===${NC}\n"

# Check if addresses are provided
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo -e "${RED}Usage: ./verify-contracts.sh <LENDI_PROOF_ADDRESS> <LENDI_PROOF_GATE_ADDRESS> <LENDI_POLICY_ADDRESS>${NC}"
    echo ""
    echo "Example:"
    echo "./verify-contracts.sh 0xABC... 0xDEF... 0x123..."
    exit 1
fi

LENDI_PROOF_ADDRESS=$1
LENDI_PROOF_GATE_ADDRESS=$2
LENDI_POLICY_ADDRESS=$3
USDC_ADDRESS="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

echo -e "${GREEN}Verifying contracts on Arbitrum Sepolia...${NC}\n"

# Verify LendiProof
echo -e "${YELLOW}1. Verifying LendiProof at ${LENDI_PROOF_ADDRESS}...${NC}"
npx hardhat verify --network arb-sepolia ${LENDI_PROOF_ADDRESS} ${USDC_ADDRESS}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ LendiProof verified successfully${NC}\n"
else
    echo -e "${RED}✗ LendiProof verification failed${NC}\n"
fi

# Wait 5 seconds between verifications
sleep 5

# Verify LendiProofGate
echo -e "${YELLOW}2. Verifying LendiProofGate at ${LENDI_PROOF_GATE_ADDRESS}...${NC}"
npx hardhat verify --network arb-sepolia ${LENDI_PROOF_GATE_ADDRESS} ${LENDI_PROOF_ADDRESS}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ LendiProofGate verified successfully${NC}\n"
else
    echo -e "${RED}✗ LendiProofGate verification failed${NC}\n"
fi

# Wait 5 seconds between verifications
sleep 5

# Verify LendiPolicy
echo -e "${YELLOW}3. Verifying LendiPolicy at ${LENDI_POLICY_ADDRESS}...${NC}"
npx hardhat verify --network arb-sepolia ${LENDI_POLICY_ADDRESS}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ LendiPolicy verified successfully${NC}\n"
else
    echo -e "${RED}✗ LendiPolicy verification failed${NC}\n"
fi

echo -e "${GREEN}=== Verification Complete ===${NC}\n"
echo "Check contracts on Arbiscan:"
echo "- LendiProof: https://sepolia.arbiscan.io/address/${LENDI_PROOF_ADDRESS}#code"
echo "- LendiProofGate: https://sepolia.arbiscan.io/address/${LENDI_PROOF_GATE_ADDRESS}#code"
echo "- LendiPolicy: https://sepolia.arbiscan.io/address/${LENDI_POLICY_ADDRESS}#code"
