const { createSignMessage } = require('@multi-agent-platform/shared');

// 测试消息格式一致性
function testMessageFormatConsistency() {
  console.log('=== Message Format Consistency Test ===');
  
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testNonce = 'test-nonce-123456789012345678901234';
  
  console.log('Test Parameters:');
  console.log('- Wallet Address:', testWalletAddress);
  console.log('- Nonce:', testNonce);
  
  const message = createSignMessage(testWalletAddress, testNonce);
  
  console.log('\nGenerated Message:');
  console.log('- Content:', JSON.stringify(message));
  console.log('- Length:', message.length);
  console.log('- Line Count:', message.split('\\n').length);
  console.log('- Contains Address:', message.includes(testWalletAddress));
  console.log('- Contains Nonce:', message.includes(testNonce));
  
  console.log('\nMessage Structure Analysis:');
  const lines = message.split('\\n');
  lines.forEach((line, index) => {
    console.log(`Line ${index + 1}: "${line}"`);
  });
  
  console.log('\nMessage Encoding Analysis:');
  console.log('- UTF-8 Bytes:', Buffer.from(message, 'utf8').length);
  console.log('- First 10 bytes (hex):', Buffer.from(message.substring(0, 10), 'utf8').toString('hex'));
  console.log('- Last 10 bytes (hex):', Buffer.from(message.substring(message.length - 10), 'utf8').toString('hex'));
  
  // Test with different addresses and nonces
  console.log('\\n=== Testing with Different Parameters ===');
  
  const testCases = [
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      nonce: 'short-nonce'
    },
    {
      address: '0x0000000000000000000000000000000000000000',
      nonce: 'very-long-nonce-with-special-characters-!@#$%^&*()'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\\nTest Case ${index + 1}:`);
    console.log('- Address:', testCase.address);
    console.log('- Nonce:', testCase.nonce);
    
    const testMessage = createSignMessage(testCase.address, testCase.nonce);
    console.log('- Message Length:', testMessage.length);
    console.log('- Contains Address:', testMessage.includes(testCase.address));
    console.log('- Contains Nonce:', testMessage.includes(testCase.nonce));
  });
}

testMessageFormatConsistency();