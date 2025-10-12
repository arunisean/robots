/**
 * 测试Agent Type到Implementation的映射
 */
import { agentTypeRegistry } from '../services/AgentTypeRegistry';
import { 
  AGENT_TYPE_TO_CLASS_MAP, 
  getImplementationInfo,
  hasImplementation,
  getImplementedTypeIds 
} from '../data/agent-type-mappings';

async function testImplementationMapping() {
  console.log('\n=== Testing Agent Type Implementation Mapping ===\n');

  // 1. 测试所有注册的类型
  console.log('1. Checking all registered types...');
  const allTypes = agentTypeRegistry.getAllTypes();
  console.log(`   Total types: ${allTypes.length}\n`);

  for (const type of allTypes) {
    console.log(`   Type: ${type.id} (${type.displayName.zh})`);
    
    // 检查implementation字段
    if (type.implementation) {
      console.log(`     ✅ Implementation: ${type.implementation.className}`);
      console.log(`        Module: ${type.implementation.modulePath}`);
      console.log(`        Available: ${type.implementation.isAvailable}`);
    } else {
      console.log(`     ❌ No implementation defined`);
    }
    
    // 检查映射表
    const hasImpl = hasImplementation(type.id);
    console.log(`     Mapping exists: ${hasImpl ? '✅' : '❌'}`);
    
    if (hasImpl) {
      const implInfo = getImplementationInfo(type.id);
      if (implInfo) {
        console.log(`     Mapped to: ${implInfo.className}`);
      }
    }
    console.log('');
  }

  // 2. 测试映射函数
  console.log('\n2. Testing mapping functions...');
  const implementedIds = getImplementedTypeIds();
  console.log(`   Implemented type IDs: ${implementedIds.length}`);
  implementedIds.forEach(id => {
    console.log(`     - ${id} → ${AGENT_TYPE_TO_CLASS_MAP[id]}`);
  });

  // 3. 检查不一致
  console.log('\n3. Checking for inconsistencies...');
  let inconsistencies = 0;
  
  for (const type of allTypes) {
    const hasImplField = !!type.implementation;
    const hasMapping = hasImplementation(type.id);
    
    if (hasImplField !== hasMapping) {
      console.log(`   ⚠️  Inconsistency found for ${type.id}:`);
      console.log(`      Has implementation field: ${hasImplField}`);
      console.log(`      Has mapping: ${hasMapping}`);
      inconsistencies++;
    }
  }
  
  if (inconsistencies === 0) {
    console.log('   ✅ No inconsistencies found!');
  } else {
    console.log(`   ⚠️  Found ${inconsistencies} inconsistencies`);
  }

  // 4. 测试特定类型
  console.log('\n4. Testing specific types...');
  const testTypes = [
    'work.web_scraper',
    'work.api_collector',
    'process.content_generator',
    'publish.twitter'
  ];

  for (const typeId of testTypes) {
    const type = agentTypeRegistry.getType(typeId);
    if (type) {
      console.log(`   ${typeId}:`);
      console.log(`     Display name: ${type.displayName.zh}`);
      console.log(`     Has implementation: ${!!type.implementation}`);
      if (type.implementation) {
        console.log(`     Class: ${type.implementation.className}`);
      }
    } else {
      console.log(`   ${typeId}: NOT FOUND`);
    }
  }

  console.log('\n=== Test completed! ===\n');
}

// 运行测试
testImplementationMapping().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
