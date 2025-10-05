const { generateNonce } = require('@multi-agent-platform/shared');

// 测试nonce生成的一致性
function testNonceGeneration() {
  console.log('=== Nonce Generation Test ===');
  
  // 生成多个nonce测试唯一性
  const nonces = [];
  for (let i = 0; i < 10; i++) {
    const nonce = generateNonce();
    nonces.push(nonce);
    console.log(`Nonce ${i + 1}: ${nonce} (length: ${nonce.length})`);
  }
  
  // 检查唯一性
  const uniqueNonces = new Set(nonces);
  console.log('\\nUniqueness Test:');
  console.log('- Generated:', nonces.length);
  console.log('- Unique:', uniqueNonces.size);
  console.log('- All Unique:', nonces.length === uniqueNonces.size);
  
  // 检查格式一致性
  console.log('\\nFormat Consistency:');
  const firstNonce = nonces[0];
  const allSameLength = nonces.every(nonce => nonce.length === firstNonce.length);
  const allAlphanumeric = nonces.every(nonce => /^[A-Za-z0-9]+$/.test(nonce));
  
  console.log('- All Same Length:', allSameLength);
  console.log('- All Alphanumeric:', allAlphanumeric);
  console.log('- Standard Length:', firstNonce.length);
  
  // 测试字符分布
  console.log('\\nCharacter Distribution Analysis:');
  const allChars = nonces.join('');
  const charCounts = {};
  for (const char of allChars) {
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  
  const sortedChars = Object.entries(charCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  console.log('Top 10 most frequent characters:');
  sortedChars.forEach(([char, count]) => {
    console.log(`  "${char}": ${count} times`);
  });
}

testNonceGeneration();