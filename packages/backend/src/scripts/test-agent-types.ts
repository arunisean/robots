/**
 * 测试Agent Type Registry系统
 */
import { agentTypeRegistry } from '../services/AgentTypeRegistry';
import { AgentCategory } from '@multi-agent-platform/shared';
import { logger } from '../utils/logger';

async function testAgentTypeRegistry() {
  console.log('\n=== Testing Agent Type Registry ===\n');

  // 1. 获取所有Agent类型
  console.log('1. Getting all agent types...');
  const allTypes = agentTypeRegistry.getAllTypes();
  console.log(`   Found ${allTypes.length} agent types`);
  allTypes.forEach(type => {
    console.log(`   - ${type.id}: ${type.displayName.zh} (${type.category})`);
  });

  // 2. 按Category查询
  console.log('\n2. Getting WORK category types...');
  const workTypes = agentTypeRegistry.getTypesByCategory(AgentCategory.WORK);
  console.log(`   Found ${workTypes.length} WORK types`);
  workTypes.forEach(type => {
    console.log(`   - ${type.name}: ${type.description}`);
  });

  // 3. 搜索功能
  console.log('\n3. Searching for "抓取"...');
  const searchResults = agentTypeRegistry.searchTypes('抓取');
  console.log(`   Found ${searchResults.length} results`);
  searchResults.forEach(type => {
    console.log(`   - ${type.displayName.zh}: ${type.description}`);
  });

  // 4. 获取单个类型详情
  console.log('\n4. Getting details for work.web_scraper...');
  const webScraper = agentTypeRegistry.getType('work.web_scraper');
  if (webScraper) {
    console.log(`   Name: ${webScraper.displayName.zh}`);
    console.log(`   Version: ${webScraper.version}`);
    console.log(`   Complexity: ${webScraper.complexity}`);
    console.log(`   Rating: ${webScraper.rating}/5`);
    console.log(`   Features: ${webScraper.features.join(', ')}`);
    console.log(`   Required fields: ${webScraper.configSchema.required.join(', ')}`);
  }

  // 5. 配置验证
  console.log('\n5. Validating configuration...');
  const validConfig = {
    name: '测试抓取器',
    url: 'https://example.com',
    selectors: {
      title: 'h1',
      content: '.content'
    }
  };
  const validation = agentTypeRegistry.validateConfig('work.web_scraper', validConfig);
  console.log(`   Valid config: ${validation.isValid}`);
  if (!validation.isValid) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  }

  // 6. 测试无效配置
  console.log('\n6. Testing invalid configuration...');
  const invalidConfig = {
    name: '测试抓取器'
    // 缺少必需的url和selectors字段
  };
  const invalidValidation = agentTypeRegistry.validateConfig('work.web_scraper', invalidConfig);
  console.log(`   Valid config: ${invalidValidation.isValid}`);
  if (!invalidValidation.isValid) {
    console.log(`   Errors:`);
    invalidValidation.errors.forEach(err => console.log(`     - ${err}`));
  }

  // 7. 获取配置预设
  console.log('\n7. Getting configuration presets...');
  const presets = agentTypeRegistry.getPresets('work.web_scraper');
  console.log(`   Found ${presets.length} presets`);
  presets.forEach(preset => {
    console.log(`   - ${preset.name}: ${preset.description}`);
    console.log(`     Scenario: ${preset.scenario}`);
    console.log(`     Usage count: ${preset.usageCount}`);
  });

  // 8. 推荐功能
  console.log('\n8. Getting recommendations for scenario...');
  const recommendations = agentTypeRegistry.getRecommendedTypes('我想抓取网页内容并生成文章发布到Twitter');
  console.log(`   Found ${recommendations.length} recommendations`);
  recommendations.forEach(type => {
    console.log(`   - ${type.displayName.zh} (${type.category})`);
  });

  // 9. 统计信息
  console.log('\n9. Getting statistics...');
  const stats = agentTypeRegistry.getStatistics();
  console.log(`   Total types: ${stats.total}`);
  console.log(`   By category:`);
  console.log(`     - WORK: ${stats.byCategory.work}`);
  console.log(`     - PROCESS: ${stats.byCategory.process}`);
  console.log(`     - PUBLISH: ${stats.byCategory.publish}`);
  console.log(`     - VALIDATE: ${stats.byCategory.validate}`);
  console.log(`   By status:`);
  console.log(`     - Stable: ${stats.byStatus.stable}`);
  console.log(`     - Beta: ${stats.byStatus.beta}`);
  console.log(`     - Experimental: ${stats.byStatus.experimental}`);
  console.log(`   Available: ${stats.available}`);

  console.log('\n=== All tests completed successfully! ===\n');
}

// 运行测试
testAgentTypeRegistry().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
