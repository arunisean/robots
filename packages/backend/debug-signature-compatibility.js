const { ethers } = require('ethers');
const { createSignMessage, verifyEthereumSignature } = require('@multi-agent-platform/shared');

// 测试personal_sign与ethers.verifyMessage的兼容性
async function testSignatureCompatibility() {
  console.log('=== Signature Compatibility Test ===');
  
  // 创建测试钱包
  const testWallet = ethers.Wallet.createRandom();
  console.log('Test Wallet:');
  console.log('- Address:', testWallet.address);
  console.log('- Private Key:', testWallet.privateKey);
  
  // 生成测试消息
  const testNonce = 'test-nonce-for-compatibility-check';
  const message = createSignMessage(testWallet.address, testNonce);
  
  console.log('\\nTest Message:');
  console.log('- Content:', JSON.stringify(message));
  console.log('- Length:', message.length);
  
  try {
    // 使用ethers钱包签名（模拟personal_sign）
    console.log('\\n--- Signing with ethers.Wallet.signMessage ---');
    const signature = await testWallet.signMessage(message);
    console.log('Generated Signature:', signature);
    console.log('Signature Length:', signature.length);
    console.log('Signature Format Valid:', signature.startsWith('0x') && signature.length === 132);
    
    // 使用ethers.verifyMessage验证
    console.log('\\n--- Verifying with ethers.verifyMessage ---');
    const recoveredAddress = ethers.verifyMessage(message, signature);
    console.log('Recovered Address:', recoveredAddress);
    console.log('Expected Address:', testWallet.address);
    console.log('Addresses Match:', recoveredAddress.toLowerCase() === testWallet.address.toLowerCase());
    
    // 使用我们的verifyEthereumSignature函数
    console.log('\\n--- Verifying with verifyEthereumSignature ---');
    const isValid = verifyEthereumSignature(message, signature, testWallet.address);
    console.log('Verification Result:', isValid);
    
    // 测试地址大小写问题
    console.log('\\n--- Testing Address Case Sensitivity ---');
    const upperCaseAddress = testWallet.address.toUpperCase();
    const lowerCaseAddress = testWallet.address.toLowerCase();
    const mixedCaseAddress = testWallet.address;
    
    console.log('Original Address:', mixedCaseAddress);
    console.log('Upper Case:', upperCaseAddress);
    console.log('Lower Case:', lowerCaseAddress);
    
    const upperCaseValid = verifyEthereumSignature(message, signature, upperCaseAddress);
    const lowerCaseValid = verifyEthereumSignature(message, signature, lowerCaseAddress);
    const mixedCaseValid = verifyEthereumSignature(message, signature, mixedCaseAddress);
    
    console.log('Upper Case Valid:', upperCaseValid);
    console.log('Lower Case Valid:', lowerCaseValid);
    console.log('Mixed Case Valid:', mixedCaseValid);
    console.log('All Cases Valid:', upperCaseValid && lowerCaseValid && mixedCaseValid);
    
    // 测试不同消息格式
    console.log('\\n--- Testing Different Message Formats ---');
    const testMessages = [
      'Simple message',
      'Message with\\nnewlines\\nand\\nspecial chars: !@#$%^&*()',
      message, // Our standard message
      'Unicode message: 你好世界 🌍'
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const testMsg = testMessages[i];
      console.log(`\\nTest Message ${i + 1}:`);
      console.log('- Content:', JSON.stringify(testMsg));
      
      try {
        const testSig = await testWallet.signMessage(testMsg);
        const testRecovered = ethers.verifyMessage(testMsg, testSig);
        const testValid = testRecovered.toLowerCase() === testWallet.address.toLowerCase();
        
        console.log('- Signature Valid:', testValid);
        console.log('- Recovered Address Matches:', testValid);
      } catch (error) {
        console.log('- Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\\nCompatibility Test Failed:');
    console.error('- Error Type:', error.constructor.name);
    console.error('- Error Message:', error.message);
    console.error('- Error Stack:', error.stack);
  }
}

testSignatureCompatibility().catch(console.error);