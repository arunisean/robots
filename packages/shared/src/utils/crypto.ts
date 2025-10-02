import { ethers } from 'ethers';

// 加密和Web3相关工具函数

// 生成随机字符串
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 生成nonce
export const generateNonce = (): string => {
  return generateRandomString(32);
};

// 创建签名消息
export const createSignMessage = (address: string, nonce: string): string => {
  return `Welcome to Multi-Agent Platform!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${address}\n\nNonce:\n${nonce}`;
};

// 验证以太坊签名
export const verifyEthereumSignature = (
  message: string,
  signature: string,
  expectedAddress: string
): boolean => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

// 格式化以太坊地址
export const formatEthereumAddress = (address: string): string => {
  if (!address || address.length !== 42) {
    return '';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// 检查地址是否为合约地址
export const isContractAddress = async (
  address: string,
  provider: ethers.Provider
): Promise<boolean> => {
  try {
    const code = await provider.getCode(address);
    return code !== '0x';
  } catch (error) {
    console.error('Error checking contract address:', error);
    return false;
  }
};

// 获取ENS名称
export const getENSName = async (
  address: string,
  provider: ethers.Provider
): Promise<string | null> => {
  try {
    return await provider.lookupAddress(address);
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return null;
  }
};

// 解析ENS地址
export const resolveENSAddress = async (
  ensName: string,
  provider: ethers.Provider
): Promise<string | null> => {
  try {
    return await provider.resolveName(ensName);
  } catch (error) {
    console.error('Error resolving ENS address:', error);
    return null;
  }
};

// 生成哈希
export const generateHash = (data: string): string => {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
};

// 生成内容哈希（用于去重）
export const generateContentHash = (content: string): string => {
  // 标准化内容（移除空白字符、转换为小写）
  const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
  return generateHash(normalized);
};

// 验证私钥格式
export const isValidPrivateKey = (privateKey: string): boolean => {
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
};

// 从私钥获取地址
export const getAddressFromPrivateKey = (privateKey: string): string => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch (error) {
    throw new Error('Invalid private key');
  }
};

// 生成钱包
export const generateWallet = (): { address: string; privateKey: string; mnemonic: string } => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || ''
  };
};

// 从助记词恢复钱包
export const recoverWalletFromMnemonic = (mnemonic: string, index: number = 0): ethers.HDNodeWallet => {
  return ethers.HDNodeWallet.fromPhrase(mnemonic, `m/44'/60'/0'/0/${index}`);
};

// 加密数据
export const encryptData = (data: string, password: string): string => {
  // 这里应该使用更安全的加密方法，比如AES
  // 这只是一个简单的示例
  const encrypted = Buffer.from(data).toString('base64');
  return encrypted;
};

// 解密数据
export const decryptData = (encryptedData: string, password: string): string => {
  // 这里应该使用对应的解密方法
  // 这只是一个简单的示例
  const decrypted = Buffer.from(encryptedData, 'base64').toString();
  return decrypted;
};

// 验证交易哈希
export const isValidTransactionHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

// 格式化Wei到Ether
export const formatWeiToEther = (wei: string | bigint): string => {
  return ethers.formatEther(wei);
};

// 格式化Ether到Wei
export const formatEtherToWei = (ether: string): bigint => {
  return ethers.parseEther(ether);
};

// 获取网络信息
export const getNetworkInfo = (chainId: number): { name: string; currency: string; explorer: string } => {
  const networks: Record<number, { name: string; currency: string; explorer: string }> = {
    1: { name: 'Ethereum Mainnet', currency: 'ETH', explorer: 'https://etherscan.io' },
    5: { name: 'Goerli Testnet', currency: 'GoerliETH', explorer: 'https://goerli.etherscan.io' },
    11155111: { name: 'Sepolia Testnet', currency: 'SepoliaETH', explorer: 'https://sepolia.etherscan.io' },
    137: { name: 'Polygon Mainnet', currency: 'MATIC', explorer: 'https://polygonscan.com' },
    80001: { name: 'Polygon Mumbai', currency: 'MATIC', explorer: 'https://mumbai.polygonscan.com' }
  };

  return networks[chainId] || { name: 'Unknown Network', currency: 'ETH', explorer: '' };
};

// 等待交易确认
export const waitForTransaction = async (
  txHash: string,
  provider: ethers.Provider,
  confirmations: number = 1
): Promise<ethers.TransactionReceipt | null> => {
  try {
    return await provider.waitForTransaction(txHash, confirmations);
  } catch (error) {
    console.error('Error waiting for transaction:', error);
    return null;
  }
};