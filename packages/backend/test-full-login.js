const { ethers } = require('ethers');
const fetch = require('node-fetch');

async function testFullLogin() {
  console.log('=== Full Login Flow Test ===');
  
  // Create a test wallet
  const testWallet = ethers.Wallet.createRandom();
  console.log('Test Wallet Address:', testWallet.address);
  
  try {
    // Step 1: Get nonce
    console.log('\\n--- Step 1: Getting Nonce ---');
    const nonceResponse = await fetch('http://localhost:3001/api/auth/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: testWallet.address })
    });
    
    if (!nonceResponse.ok) {
      throw new Error(`Nonce request failed: ${nonceResponse.status}`);
    }
    
    const { nonce, message } = await nonceResponse.json();
    console.log('✅ Nonce received:', nonce);
    console.log('✅ Message received (length):', message.length);
    
    // Step 2: Sign message
    console.log('\\n--- Step 2: Signing Message ---');
    const signature = await testWallet.signMessage(message);
    console.log('✅ Message signed:', signature);
    
    // Step 3: Submit login
    console.log('\\n--- Step 3: Submitting Login ---');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: testWallet.address,
        signature,
        message
      })
    });
    
    console.log('Login Response Status:', loginResponse.status);
    const loginResult = await loginResponse.json();
    console.log('Login Response:', loginResult);
    
    if (loginResult.success) {
      console.log('\\n🎉 LOGIN SUCCESSFUL!');
      console.log('- Token received:', !!loginResult.token);
      console.log('- User created:', !!loginResult.user);
    } else {
      console.log('\\n❌ LOGIN FAILED:', loginResult.error);
    }
    
  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
  }
}

// Add node-fetch if not available
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
  console.log('Please run the script again.');
  process.exit(0);
}

testFullLogin().catch(console.error);