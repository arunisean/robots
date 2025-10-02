import {
  generateRandomString,
  generateNonce,
  createSignMessage,
  verifyEthereumSignature,
  formatEthereumAddress,
  generateHash,
  generateContentHash,
  isValidPrivateKey,
  getAddressFromPrivateKey,
  generateWallet,
  isValidTransactionHash,
  formatWeiToEther,
  formatEtherToWei,
  getNetworkInfo
} from '../../utils/crypto';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    verifyMessage: jest.fn(),
    keccak256: jest.fn(),
    toUtf8Bytes: jest.fn(),
    formatEther: jest.fn(),
    parseEther: jest.fn(),
    Wallet: {
      createRandom: jest.fn(),
      fromPhrase: jest.fn()
    }
  }
}));

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRandomString', () => {
    it('should generate string of correct length', () => {
      const result = generateRandomString(10);
      expect(result).toHaveLength(10);
      expect(typeof result).toBe('string');
    });

    it('should generate different strings', () => {
      const result1 = generateRandomString(20);
      const result2 = generateRandomString(20);
      expect(result1).not.toBe(result2);
    });

    it('should only contain valid characters', () => {
      const result = generateRandomString(100);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('generateNonce', () => {
    it('should generate nonce of correct length', () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(32);
      expect(typeof nonce).toBe('string');
    });

    it('should generate different nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('createSignMessage', () => {
    it('should create correct sign message format', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce';
      
      const message = createSignMessage(address, nonce);
      
      expect(message).toContain('Welcome to Multi-Agent Platform!');
      expect(message).toContain(address);
      expect(message).toContain(nonce);
      expect(message).toContain('Terms of Service');
    });
  });

  describe('verifyEthereumSignature', () => {
    it('should verify valid signature', () => {
      const { ethers } = require('ethers');
      const address = '0x1234567890123456789012345678901234567890';
      ethers.verifyMessage.mockReturnValue(address);

      const result = verifyEthereumSignature('message', 'signature', address);
      
      expect(result).toBe(true);
      expect(ethers.verifyMessage).toHaveBeenCalledWith('message', 'signature');
    });

    it('should reject invalid signature', () => {
      const { ethers } = require('ethers');
      ethers.verifyMessage.mockReturnValue('0xdifferentaddress');

      const result = verifyEthereumSignature(
        'message', 
        'signature', 
        '0x1234567890123456789012345678901234567890'
      );
      
      expect(result).toBe(false);
    });

    it('should handle verification errors', () => {
      const { ethers } = require('ethers');
      ethers.verifyMessage.mockImplementation(() => {
        throw new Error('Verification failed');
      });

      const result = verifyEthereumSignature(
        'message', 
        'signature', 
        '0x1234567890123456789012345678901234567890'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('formatEthereumAddress', () => {
    it('should format valid address correctly', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const result = formatEthereumAddress(address);
      expect(result).toBe('0x1234...7890');
    });

    it('should return empty string for invalid address', () => {
      expect(formatEthereumAddress('')).toBe('');
      expect(formatEthereumAddress('invalid')).toBe('');
      expect(formatEthereumAddress('0x123')).toBe('');
    });
  });

  describe('generateHash', () => {
    it('should generate hash for data', () => {
      const { ethers } = require('ethers');
      ethers.keccak256.mockReturnValue('0xhash');
      ethers.toUtf8Bytes.mockReturnValue('bytes');

      const result = generateHash('test data');
      
      expect(result).toBe('0xhash');
      expect(ethers.toUtf8Bytes).toHaveBeenCalledWith('test data');
      expect(ethers.keccak256).toHaveBeenCalledWith('bytes');
    });
  });

  describe('generateContentHash', () => {
    it('should normalize content before hashing', () => {
      const { ethers } = require('ethers');
      ethers.keccak256.mockReturnValue('0xhash');
      ethers.toUtf8Bytes.mockReturnValue('bytes');

      const result = generateContentHash('  Test   Content  \n\t ');
      
      expect(ethers.toUtf8Bytes).toHaveBeenCalledWith('test content');
    });
  });

  describe('isValidPrivateKey', () => {
    it('should validate correct private key', () => {
      const { ethers } = require('ethers');
      const mockWallet = jest.fn().mockImplementation(() => ({}));
      ethers.Wallet = mockWallet;

      const result = isValidPrivateKey('0x1234567890123456789012345678901234567890123456789012345678901234');
      
      expect(result).toBe(true);
    });

    it('should reject invalid private key', () => {
      const { ethers } = require('ethers');
      const mockWallet = jest.fn().mockImplementation(() => {
        throw new Error('Invalid private key');
      });
      ethers.Wallet = mockWallet;

      const result = isValidPrivateKey('invalid-key');
      
      expect(result).toBe(false);
    });
  });

  describe('getAddressFromPrivateKey', () => {
    it('should get address from valid private key', () => {
      const { ethers } = require('ethers');
      const mockWallet = { address: '0x1234567890123456789012345678901234567890' };
      const mockWalletConstructor = jest.fn().mockImplementation(() => mockWallet);
      ethers.Wallet = mockWalletConstructor;

      const result = getAddressFromPrivateKey('valid-private-key');
      
      expect(result).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should throw error for invalid private key', () => {
      const { ethers } = require('ethers');
      const mockWalletConstructor = jest.fn().mockImplementation(() => {
        throw new Error('Invalid private key');
      });
      ethers.Wallet = mockWalletConstructor;

      expect(() => getAddressFromPrivateKey('invalid-key')).toThrow('Invalid private key');
    });
  });

  describe('generateWallet', () => {
    it('should generate wallet with address, private key, and mnemonic', () => {
      const { ethers } = require('ethers');
      const mockWallet = {
        address: '0x1234567890123456789012345678901234567890',
        privateKey: '0xprivatekey',
        mnemonic: { phrase: 'test mnemonic phrase' }
      };
      ethers.Wallet.createRandom = jest.fn().mockReturnValue(mockWallet);

      const result = generateWallet();
      
      expect(result).toEqual({
        address: '0x1234567890123456789012345678901234567890',
        privateKey: '0xprivatekey',
        mnemonic: 'test mnemonic phrase'
      });
    });

    it('should handle wallet without mnemonic', () => {
      const { ethers } = require('ethers');
      const mockWallet = {
        address: '0x1234567890123456789012345678901234567890',
        privateKey: '0xprivatekey',
        mnemonic: null
      };
      ethers.Wallet.createRandom = jest.fn().mockReturnValue(mockWallet);

      const result = generateWallet();
      
      expect(result.mnemonic).toBe('');
    });
  });

  describe('isValidTransactionHash', () => {
    it('should validate correct transaction hash', () => {
      const validHash = '0x1234567890123456789012345678901234567890123456789012345678901234';
      expect(isValidTransactionHash(validHash)).toBe(true);
    });

    it('should reject invalid transaction hash', () => {
      expect(isValidTransactionHash('invalid')).toBe(false);
      expect(isValidTransactionHash('0x123')).toBe(false);
      expect(isValidTransactionHash('1234567890123456789012345678901234567890123456789012345678901234')).toBe(false);
    });
  });

  describe('formatWeiToEther', () => {
    it('should format wei to ether', () => {
      const { ethers } = require('ethers');
      ethers.formatEther.mockReturnValue('1.0');

      const result = formatWeiToEther('1000000000000000000');
      
      expect(result).toBe('1.0');
      expect(ethers.formatEther).toHaveBeenCalledWith('1000000000000000000');
    });
  });

  describe('formatEtherToWei', () => {
    it('should format ether to wei', () => {
      const { ethers } = require('ethers');
      ethers.parseEther.mockReturnValue(BigInt('1000000000000000000'));

      const result = formatEtherToWei('1.0');
      
      expect(result).toBe(BigInt('1000000000000000000'));
      expect(ethers.parseEther).toHaveBeenCalledWith('1.0');
    });
  });

  describe('getNetworkInfo', () => {
    it('should return correct network info for known networks', () => {
      expect(getNetworkInfo(1)).toEqual({
        name: 'Ethereum Mainnet',
        currency: 'ETH',
        explorer: 'https://etherscan.io'
      });

      expect(getNetworkInfo(137)).toEqual({
        name: 'Polygon Mainnet',
        currency: 'MATIC',
        explorer: 'https://polygonscan.com'
      });
    });

    it('should return unknown network info for unknown chain ID', () => {
      expect(getNetworkInfo(999999)).toEqual({
        name: 'Unknown Network',
        currency: 'ETH',
        explorer: ''
      });
    });
  });
});