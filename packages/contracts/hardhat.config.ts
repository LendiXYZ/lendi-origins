import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-ethers'
import '@cofhe/hardhat-plugin'
import * as dotenv from 'dotenv'
// import './tasks' // Commented out: tasks are specific to Counter contract, not needed for Lendi

dotenv.config()

const config: HardhatUserConfig = {
	solidity: {
		version: '0.8.25',
		settings: {
			evmVersion: 'cancun',
			optimizer: { enabled: true, runs: 200 }
		},
	},
	defaultNetwork: 'hardhat',
	// defaultNetwork: 'localcofhe',
	networks: {
		// The plugin already provides localcofhe configuration

		// Sepolia testnet configuration
		'eth-sepolia': {
			url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
			chainId: 11155111,
			gasMultiplier: 1.2,
			timeout: 60000,
			httpHeaders: {},
		},

		// Arbitrum Sepolia testnet configuration
		'arb-sepolia': {
			url: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
			chainId: 421614,
			gasMultiplier: 1.2,
			timeout: 60000,
			httpHeaders: {},
		},
	},

	// Etherscan verification config - Using V2 API (single API key)
	etherscan: {
		apiKey: process.env.ARBISCAN_API_KEY || '',
		customChains: [
			{
				network: 'arb-sepolia',
				chainId: 421614,
				urls: {
					apiURL: 'https://api.etherscan.io/v2/api',
					browserURL: 'https://sepolia.arbiscan.io',
				},
			},
		],
	},
	sourcify: {
		enabled: false,
	},
}

export default config
