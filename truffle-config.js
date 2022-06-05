const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const path = require('path');
const testnetMnemonic = () => fs.readFileSync(path.join(__dirname, './.secret/testnet.secret')).toString().trim();
const localMnemonic = () => fs.readFileSync(path.join(__dirname, './.secret/local.secret')).toString().trim();

// 'https://bsc.getblock.io/testnet/?api_key=b4bc2b22-f208-4279-85ad-7164fbe7caf1';
// 'wss://bsc.getblock.io/testnet/?api_key=b4bc2b22-f208-4279-85ad-7164fbe7caf1'
// 'https://speedy-nodes-nyc.moralis.io/0580d6d62062ae83acf4c27e/bsc/testnet'
module.exports = {
  contracts_directory: path.join(__dirname, 'contracts'),
  dashboard: {
    port: 24012,
  },
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 7545,            // Standard BSC port (default: none)
      network_id: "*",       // Any network (default: none)
    },
    testnet: {
      provider: () => new HDWalletProvider(testnetMnemonic(), 'https://data-seed-prebsc-1-s1.binance.org:8545/'),// `https://speedy-nodes-nyc.moralis.io/0580d6d62062ae83acf4c27e/bsc/testnet`),
      network_id: 97,
      confirmations: false,
      deploymentPollingInterval: 500000000,
      skipDryRun: true,
      networkCheckTimeout : 10000000, 
      timeoutBlocks : 5000,
    },
    local: {
      provider: () => new HDWalletProvider(localMnemonic(), `http://127.0.0.1:7545`),
      network_id: 5777,
      confirmations: 0,
      deploymentPollingInterval: 1000,
      skipDryRun: true,
      timeoutBlocks: 4000 , 
      networkCheckTimeout : 100,
    },
    bsc: {
      provider: () => new HDWalletProvider(mnemonic, `https://bsc-dataseed1.binance.org`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    dashboard: {
      networkCheckTimeout: 120000,
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    useColors: true,
    timeout: 100000
  },

  plugins: [
    'truffle-plugin-verify',
  ],

  api_keys: {
    bscscan: 'ND667ASFNSJF7TPCFQJMZ9D43CHYIPTB1K'
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.12", // A version or constraint - Ex. "^0.5.0"
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000,   // Optimize for how many times you intend to run the code
        },
        evmVersion: 'istanbul'
      },
    }
  }
}