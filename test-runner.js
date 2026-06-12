/**
 * Tab Clean - Node.js 测试运行器
 * 在命令行中运行所有单元测试
 */

// 模拟浏览器环境 - 模拟必要的全局对象
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    appendChild: () => {},
    insertBefore: () => {},
    parentNode: null
  }),
  addEventListener: () => {},
  body: { appendChild: () => {} }
};

global.window = {
  addEventListener: () => {},
  getComputedStyle: () => ({})
};

// 读取并执行 sidepanel.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 读取源码并执行 - 使用 vm.runInThisContext 确保类在全局作用域可用
const sidepanelCode = fs.readFileSync(
  path.join(__dirname, 'sidepanel.js'),
  'utf-8'
);

// 在当前上下文执行，确保 TabClean 类可用
vm.runInThisContext(sidepanelCode);

// ============================================================
// 轻量级断言库
// ============================================================
const TestFramework = {
  testCount: 0,
  passedCount: 0,
  failedCount: 0,
  results: [],

  assert(condition, testName, expected, actual) {
    this.testCount++;
    if (condition) {
      this.passedCount++;
      this.results.push({ status: 'PASS', name: testName });
    } else {
      this.failedCount++;
      this.results.push({
        status: 'FAIL',
        name: testName,
        expected: expected,
        actual: actual
      });
    }
  },

  assertEqual(actual, expected, testName) {
    this.assert(actual === expected, testName, expected, actual);
  },

  assertTrue(value, testName) {
    this.assert(value === true, testName, true, value);
  },

  assertFalse(value, testName) {
    this.assert(value === false, testName, false, value);
  },

  assertContains(str, substring, testName) {
    const condition = typeof str === 'string' && str.includes(substring);
    this.assert(condition, testName, '包含 "' + substring + '"', str);
  },

  getReport() {
    return {
      total: this.testCount,
      passed: this.passedCount,
      failed: this.failedCount,
      results: this.results,
      passRate: ((this.passedCount / this.testCount) * 100).toFixed(2)
    };
  },

  reset() {
    this.testCount = 0;
    this.passedCount = 0;
    this.failedCount = 0;
    this.results = [];
  }
};

// ============================================================
// 测试用例
// ============================================================

// 辅助函数：获取时间戳
function hoursAgo(n) {
  return Date.now() - n * 3600 * 1000;
}

function daysAgo(n) {
  return Date.now() - n * 24 * 3600 * 1000;
}

function minutesAgo(n) {
  return Date.now() - n * 60 * 1000;
}

function secondsAgo(n) {
  return Date.now() - n * 1000;
}

// 模块 1: extractDisplayName - 域名萃取
function runExtractDisplayNameTests() {
  console.log('\n=== 模块 1: extractDisplayName (域名萃取) ===');
  const tc = new TabClean();

  // 基础测试
  TestFramework.assertEqual(tc.extractDisplayName('https://github.com'), 'Github', 'github.com -> Github');
  TestFramework.assertEqual(tc.extractDisplayName('https://mail.qq.com'), 'Mail', 'mail.qq.com -> Mail');
  TestFramework.assertEqual(tc.extractDisplayName('https://www.youtube.com'), 'Youtube', 'www.youtube.com -> Youtube');

  // 特殊协议
  TestFramework.assertEqual(tc.extractDisplayName('chrome://newtab/'), 'Other', 'chrome:// -> Other');
  TestFramework.assertEqual(tc.extractDisplayName('about:blank'), 'Other', 'about:blank -> Other');
  TestFramework.assertEqual(tc.extractDisplayName('file:///path/to/file.html'), 'Other', 'file:// -> Other');

  // 空值测试
  TestFramework.assertEqual(tc.extractDisplayName(''), 'Other', '空字符串 -> Other');
  TestFramework.assertEqual(tc.extractDisplayName(null), 'Other', 'null -> Other');
  TestFramework.assertEqual(tc.extractDisplayName(undefined), 'Other', 'undefined -> Other');

  // 复杂 URL
  TestFramework.assertEqual(
    tc.extractDisplayName('https://mail.qq.com/inbox'),
    'Mail',
    '带路径的 URL -> Mail'
  );
  TestFramework.assertEqual(
    tc.extractDisplayName('https://www.google.com/search?q=chrome'),
    'Google',
    '带查询参数的 URL -> Google'
  );

  const results = TestFramework.results.slice(-12);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 2: getTimeAgo - 时间显示
function runGetTimeAgoTests() {
  console.log('\n=== 模块 2: getTimeAgo (时间显示) ===');
  const tc = new TabClean();

  // 30秒内
  TestFramework.assertEqual(tc.getTimeAgo(secondsAgo(10)), '刚刚', '10秒前 -> 刚刚');
  TestFramework.assertEqual(tc.getTimeAgo(secondsAgo(30)), '刚刚', '30秒前 -> 刚刚');

  // 同一天
  TestFramework.assertEqual(tc.getTimeAgo(hoursAgo(2)), '今天', '2小时前 -> 今天');

  // 1天前
  TestFramework.assertEqual(tc.getTimeAgo(daysAgo(1)), '1天前', '1天前 -> 1天前');

  // 多天
  TestFramework.assertEqual(tc.getTimeAgo(daysAgo(3)), '3天前', '3天前 -> 3天前');
  TestFramework.assertEqual(tc.getTimeAgo(daysAgo(10)), '10天前', '10天前 -> 10天前');

  // 边界
  TestFramework.assertEqual(tc.getTimeAgo(secondsAgo(31)), '今天', '31秒前 -> 今天');

  // 空值
  TestFramework.assertEqual(tc.getTimeAgo(null), '', 'null -> 空字符串');
  TestFramework.assertEqual(tc.getTimeAgo(undefined), '', 'undefined -> 空字符串');

  const results = TestFramework.results.slice(-10);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 3: isTempPage - 临时页判断
function runIsTempPageTests() {
  console.log('\n=== 模块 3: isTempPage (临时页判断) ===');
  const tc = new TabClean();

  TestFramework.assertTrue(tc.isTempPage('https://auth.example.com/login-success', ''), 'login-success URL -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('https://example.com/loginsuccess', ''), 'loginsuccess URL -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('https://api.example.com/oauth2/callback', ''), 'oauth2/callback -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('about:blank', ''), 'about:blank -> 临时页');

  TestFramework.assertFalse(tc.isTempPage('https://github.com', 'GitHub'), '正常页面 -> 不是临时页');
  TestFramework.assertFalse(tc.isTempPage('https://www.google.com/search', 'Search'), '搜索页 -> 不是临时页');
  TestFramework.assertFalse(tc.isTempPage('', ''), '空值 -> 不是临时页');
  TestFramework.assertFalse(tc.isTempPage(null, null), 'null -> 不是临时页');

  // title 包含关键词
  TestFramework.assertTrue(tc.isTempPage('https://example.com/page', 'OAuth 授权完成'), 'title含OAuth -> 临时页');

  const results = TestFramework.results.slice(-9);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 4: isOldTab - 旧标签页判断
function runIsOldTabTests() {
  console.log('\n=== 模块 4: isOldTab (旧标签判断) ===');
  const tc = new TabClean();

  TestFramework.assertFalse(tc.isOldTab(hoursAgo(1)), '1小时前 -> 不是旧标签');
  TestFramework.assertFalse(tc.isOldTab(daysAgo(3)), '3天前 -> 不是旧标签');
  TestFramework.assertFalse(tc.isOldTab(daysAgo(6)), '6天前 -> 不是旧标签');

  TestFramework.assertTrue(tc.isOldTab(daysAgo(8)), '8天前 -> 是旧标签');
  TestFramework.assertTrue(tc.isOldTab(daysAgo(30)), '30天前 -> 是旧标签');

  // 自定义阈值
  TestFramework.assertFalse(tc.isOldTab(daysAgo(2), 3), '2天前(阈值3天) -> 不是旧标签');
  TestFramework.assertTrue(tc.isOldTab(daysAgo(5), 3), '5天前(阈值3天) -> 是旧标签');

  // 空值
  TestFramework.assertFalse(tc.isOldTab(null), 'null -> 不是旧标签');
  TestFramework.assertFalse(tc.isOldTab(undefined), 'undefined -> 不是旧标签');

  const results = TestFramework.results.slice(-8);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 5: simpleGroup - 分组逻辑
function runSimpleGroupTests() {
  console.log('\n=== 模块 5: simpleGroup (分组逻辑) ===');
  const tc = new TabClean();

  // 单一域名多 tab
  const tabs1 = [
    { displayName: 'Mail', lastAccessed: hoursAgo(1) },
    { displayName: 'Mail', lastAccessed: hoursAgo(2) },
    { displayName: 'Mail', lastAccessed: hoursAgo(3) }
  ];
  const groups1 = tc.simpleGroup(tabs1);
  TestFramework.assertEqual(groups1.length, 1, '单一域名 -> 1个分组');
  TestFramework.assertEqual(groups1[0].name, 'Mail', '分组名称为 Mail');
  TestFramework.assertFalse(groups1[0].isOther, 'isOther = false');
  TestFramework.assertEqual(groups1[0].count, 3, '分组包含 3 个 tab');

  // 每个域名1个 tab -> Other 分组
  const tabs2 = [
    { displayName: 'A', lastAccessed: hoursAgo(1) },
    { displayName: 'B', lastAccessed: hoursAgo(2) },
    { displayName: 'C', lastAccessed: hoursAgo(3) }
  ];
  const groups2 = tc.simpleGroup(tabs2);
  TestFramework.assertEqual(groups2.length, 1, '每个域名1个 -> 1个分组 (Other)');
  TestFramework.assertTrue(groups2[0].isOther, 'isOther = true');
  TestFramework.assertEqual(groups2[0].count, 3, 'Other 分组包含 3 个 tab');

  // 混合场景
  const tabs3 = [
    { displayName: 'Mail', lastAccessed: hoursAgo(1) },
    { displayName: 'Mail', lastAccessed: hoursAgo(2) },
    { displayName: 'A', lastAccessed: hoursAgo(1) },
    { displayName: 'B', lastAccessed: hoursAgo(2) }
  ];
  const groups3 = tc.simpleGroup(tabs3);
  TestFramework.assertEqual(groups3.length, 2, '混合场景 -> 2个分组 (Mail + Other)');
  TestFramework.assertEqual(groups3[0].name, 'Mail', '第一个分组: Mail');
  TestFramework.assertTrue(groups3[1].isOther, '第二个分组: Other');

  // 空数组
  const groups4 = tc.simpleGroup([]);
  TestFramework.assertEqual(groups4.length, 0, '空数组 -> 0个分组');

  const results = TestFramework.results.slice(-10);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 6: getClosingReason - 关闭原因
function runGetClosingReasonTests() {
  console.log('\n=== 模块 6: getClosingReason (关闭原因) ===');
  const tc = new TabClean();

  // 临时页
  const tab1 = { url: 'about:blank', title: '空白页' };
  TestFramework.assertContains(tc.getClosingReason(tab1), '临时页面', '临时页 -> 显示临时页面');

  // 旧标签
  const tab2 = { url: 'https://example.com/old', title: 'Old Page', lastAccessed: daysAgo(10) };
  TestFramework.assertContains(tc.getClosingReason(tab2), '10天未访问', '10天未访问 -> 显示天数');

  // 临时页优先级高于旧标签
  const tab3 = { url: 'https://auth.example.com/login-success', title: '登录成功', lastAccessed: daysAgo(10) };
  TestFramework.assertContains(tc.getClosingReason(tab3), '临时页面', '临时页优先级更高');

  // 兜底
  const tab4 = { url: 'https://example.com', title: 'Page', lastAccessed: hoursAgo(2) };
  TestFramework.assertContains(tc.getClosingReason(tab4), '建议关闭', '普通页 -> 建议关闭');

  const results = TestFramework.results.slice(-4);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 7: Todo 功能
function runTodoTests() {
  console.log('\n=== 模块 7: Todo 功能 ===');
  const tc = new TabClean();

  // 添加 Todo
  tc.addTodoItem({ url: 'https://github.com', title: 'GitHub', favIconUrl: '' });
  TestFramework.assertEqual(tc.todoList.length, 1, '添加后 Todo 数量 = 1');
  TestFramework.assertEqual(tc.todoList[0].url, 'https://github.com', 'URL 正确');

  // 去重
  tc.addTodoItem({ url: 'https://github.com', title: 'GitHub', favIconUrl: '' });
  TestFramework.assertEqual(tc.todoList.length, 1, '重复添加后 Todo 数量仍 = 1');

  // 添加多个
  tc.addTodoItem({ url: 'https://google.com', title: 'Google', favIconUrl: '' });
  tc.addTodoItem({ url: 'https://bilibili.com', title: 'Bilibili', favIconUrl: '' });
  TestFramework.assertEqual(tc.todoList.length, 3, '3个不同 Todo -> 数量 = 3');

  // 移除 Todo
  tc.removeTodoItem('https://google.com');
  TestFramework.assertEqual(tc.todoList.length, 2, '移除后 Todo 数量 = 2');

  const googleExists = tc.todoList.some(item => item.url === 'https://google.com');
  TestFramework.assertFalse(googleExists, 'Google 已被移除');

  const results = TestFramework.results.slice(-6);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// 模块 8: 综合场景 - 一键瘦身
function runIntegrationTests() {
  console.log('\n=== 模块 8: 综合场景 (分类 + 瘦身) ===');

  // 模拟多个 tab
  const tc = new TabClean();
  tc.tabs = [
    // 重复项
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: hoursAgo(1) },
    { id: 2, title: 'GitHub', url: 'https://github.com', lastAccessed: hoursAgo(2) },
    { id: 3, title: 'GitHub', url: 'https://github.com', lastAccessed: hoursAgo(3) },
    // 临时页
    { id: 4, title: '登录成功', url: 'https://auth.example.com/login-success', lastAccessed: minutesAgo(5) },
    // 旧标签
    { id: 5, title: '旧页面', url: 'https://example.com/old', lastAccessed: daysAgo(10) },
    // 保留
    { id: 6, title: 'Bilibili', url: 'https://www.bilibili.com', lastAccessed: hoursAgo(1) }
  ];
  tc.processTabs();

  TestFramework.assertEqual(tc.tabsData.length, 6, '总 tab 数量 = 6');
  TestFramework.assertTrue(tc.categorizedTabs.duplicateGroups.length > 0, '存在重复项分组');
  TestFramework.assertEqual(tc.categorizedTabs.duplicate.length, 3, '重复项 tab = 3');
  TestFramework.assertEqual(tc.categorizedTabs.close.length, 2, '可关闭 tab = 2 (临时页+旧页)');
  TestFramework.assertEqual(tc.categorizedTabs.keep.length, 1, '保留 tab = 1 (Bilibili)');

  const results = TestFramework.results.slice(-5);
  const passed = results.filter(r => r.status === 'PASS').length;
  console.log(`  结果: ${passed}/${results.length} 通过`);
}

// ============================================================
// 主运行函数
// ============================================================

function runAllTests() {
  console.log('========================================');
  console.log('  Tab Clean - 单元测试报告');
  console.log('========================================');
  console.log('测试时间: ' + new Date().toLocaleString('zh-CN'));

  TestFramework.reset();

  // 运行各模块
  runExtractDisplayNameTests();
  runGetTimeAgoTests();
  runIsTempPageTests();
  runIsOldTabTests();
  runSimpleGroupTests();
  runGetClosingReasonTests();
  runTodoTests();
  runIntegrationTests();

  // 汇总
  const report = TestFramework.getReport();

  console.log('\n========================================');
  console.log('  测试汇总');
  console.log('========================================');
  console.log('总测试数: ' + report.total);
  console.log('通过: ' + report.passed);
  console.log('失败: ' + report.failed);
  console.log('通过率: ' + report.passRate + '%');

  if (report.failed > 0) {
    console.log('\n  失败详情:');
    console.log('  ----------------------------------------');
    report.results
      .filter(r => r.status === 'FAIL')
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.name}`);
        console.log(`     期望: ${JSON.stringify(r.expected)}`);
        console.log(`     实际: ${JSON.stringify(r.actual)}`);
      });
  }

  console.log('\n========================================');
  console.log(report.failed === 0 ? '  ✅ 所有测试通过！' : '  ⚠️ 有测试失败，请检查代码');
  console.log('========================================\n');

  return report;
}

// 运行测试
runAllTests();
