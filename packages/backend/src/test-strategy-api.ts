/**
 * Test Strategy Template API
 * Quick test to verify the API endpoints are working
 */

async function testStrategyAPI() {
  const baseUrl = 'http://localhost:3001';

  console.log('🧪 Testing Strategy Template API\n');

  try {
    // Test 1: List templates
    console.log('1️⃣  Testing GET /api/strategy-templates');
    const listResponse = await fetch(`${baseUrl}/api/strategy-templates`);
    const listData: any = await listResponse.json();
    
    if (listResponse.ok) {
      console.log(`✅ Found ${listData.data.length} templates`);
      listData.data.forEach((t: any) => {
        console.log(`   - ${t.name} (${t.category}, ${t.difficulty})`);
      });
    } else {
      console.log(`❌ Failed: ${listData.message}`);
    }
    console.log();

    // Test 2: Get specific template
    if (listData.data && listData.data.length > 0) {
      const templateId = listData.data[0].id;
      console.log(`2️⃣  Testing GET /api/strategy-templates/${templateId}`);
      
      const getResponse = await fetch(`${baseUrl}/api/strategy-templates/${templateId}`);
      const getData: any = await getResponse.json();
      
      if (getResponse.ok) {
        console.log(`✅ Retrieved template: ${getData.data.name}`);
        console.log(`   Parameters: ${getData.data.parameters.length}`);
        console.log(`   Risk Level: ${getData.data.riskProfile.level}`);
      } else {
        console.log(`❌ Failed: ${getData.message}`);
      }
      console.log();

      // Test 3: Instantiate template
      console.log(`3️⃣  Testing POST /api/strategy-templates/${templateId}/instantiate`);
      
      const instantiateResponse = await fetch(
        `${baseUrl}/api/strategy-templates/${templateId}/instantiate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Test Grid Trading Strategy',
            parameters: {
              tradingPair: 'BTC/USDT',
              lowerBound: 28000,
              upperBound: 32000,
              gridCount: 10,
              investmentPerGrid: 500,
              checkInterval: 60
            },
            paperTrading: true
          })
        }
      );
      
      const instantiateData: any = await instantiateResponse.json();
      
      if (instantiateResponse.ok) {
        console.log(`✅ Strategy instance created: ${instantiateData.data.id}`);
        console.log(`   Name: ${instantiateData.data.name}`);
        console.log(`   Status: ${instantiateData.data.status}`);
        console.log(`   Paper Trading: ${instantiateData.data.paperTrading}`);
      } else {
        console.log(`❌ Failed: ${instantiateData.message}`);
        if (instantiateData.details) {
          console.log(`   Errors:`, instantiateData.details);
        }
      }
      console.log();
    }

    console.log('✅ All API tests completed!\n');
    console.log('🌐 You can now access the frontend at: http://localhost:3000/strategies');
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
    console.log('\n⚠️  Make sure the backend server is running:');
    console.log('   cd packages/backend && npm run dev');
  }
}

// Run tests
testStrategyAPI();
