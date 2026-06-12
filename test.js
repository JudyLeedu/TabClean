/**
 * Tab Clean - 单元测试
 * 覆盖所有核心业务逻辑
 */

// 测试框架 - 轻量级断言库
const TestFramework = {
  testCount: 0,
  passedCount: 0,
  failedCount: 0,
  results: [],

  assert(condition, testName, expected, actual) {
    this.testCount++;
    if (condition) {
      this.passedCount++;
      this.results.push({
        status: 'PASS',
        name: testName
      });
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
    const condition = (actual === expected);
    this.assert(condition, testName, expected, actual);
  },

  assertContains(str, substring, testName) {
    const condition = (typeof str === 'string' && str.includes(substring));
    this.assert(condition, testName, '包含 "' + substring + '"', str);
  },

  assertTrue(value, testName) {
    this.assert(value === true, testName, true, value);
  },

  assertFalse(value, testName) {
    this.assert(value === false, testName, false, value);
  },

  assertArrayLength(arr, length, testName) {
    const condition = Array.isArray(arr) && arr.length === length;
    this.assert(condition, testName, '数组长度=' + length, '数组长度=' + arr.length);
  },

  assertObjectProperty(obj, prop, testName) {
    const condition = (obj !== null && typeof obj === 'object' && obj.hasOwnProperty(prop));
    this.assert(condition, testName, '有属性: ' + prop, '没有属性: ' + prop);
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

// 时间工具函数 - 用于生成固定时间戳
const TimeUtils = {
  now: Date.now(),
  secondsAgo: function(n) {
    return this.now - n * 1000;
  },
  minutesAgo: function(n) {
    return this.now - n * 60 * 1000;
  },
  hoursAgo: function(n) {
    return this.now - n * 3600 * 1000;
  },
  daysAgo: function(n) {
    return this.now - n * 24 * 3600 * 1000;
  }
};

/**
 * 模块 1: extractDisplayName - 域名萃取函数测试
 */
function runExtractDisplayNameTests() {
  const tc = new TabClean();

  console.group('%c模块 1: extractDisplayName (域名萃取)', 'color: #4a6fff; font-weight: bold;');

  // 基础域名测试
  TestFramework.assertEqual(
    tc.extractDisplayName('https://github.com'),
    'Github',
    '提取 github.com'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName('https://mail.google.com'),
    'Mail',
    '提取 mail.google.com -> Mail'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName('https://www.youtube.com'),
    'Youtube',
    '提取 www.youtube.com 并移除 www 前缀'
  );

  // 特殊协议测试
  TestFramework.assertEqual(
    tc.extractDisplayName('chrome://newtab/'),
    'Other',
    'chrome:// 协议 -> Other'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName('about:blank'),
    'Other',
    'about:blank -> Other'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName('file:///path/to/file.html'),
    'Other',
    'file:// 协议 -> Other'
  );

  // 空值和异常测试
  TestFramework.assertEqual(
    tc.extractDisplayName(''),
    'Other',
    '空字符串 -> Other'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName(null),
    'Other',
    'null -> Other'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName(undefined),
    'Other',
    'undefined -> Other'
  );

  // 复杂 URL 测试
  TestFramework.assertEqual(
    tc.extractDisplayName('https://mail.qq.com/inbox'),
    'Mail',
    '提取 mail.qq.com/inbox -> Mail'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName('https://www.google.com/search?q=chrome+extension'),
    'Google',
    '提取带查询参数的 URL'
  );

  // 首字母大写测试
  TestFramework.assertEqual(
    tc.extractDisplayName('https://bilibili.com'),
    'Bilibili',
    '首字母大写 - bilibili -> Bilibili'
  );

  TestFramework.assertEqual(
    tc.extractDisplayName('https://DEVELOPER.mozilla.org'),
    'Developer',
    '全大写域名处理 - DEVELOPER'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 2: getTimeAgo - 时间显示函数测试
 */
function runGetTimeAgoTests() {
  const tc = new TabClean();

  console.group('%c模块 2: getTimeAgo (时间显示)', 'color: #4a6fff; font-weight: bold;');

  // 30秒内 - 刚刚
  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.secondsAgo(10)),
    '刚刚',
    '10秒前 -> 刚刚'
  );

  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.secondsAgo(30)),
    '刚刚',
    '30秒前 -> 刚刚（边界值）'
  );

  // 同一天内 - 今天
  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.hoursAgo(2)),
    '今天',
    '2小时前 -> 今天'
  );

  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.hoursAgo(12)),
    '今天',
    '12小时前 -> 今天'
  );

  // 1天前
  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.daysAgo(1)),
    '1天前',
    '1天前 -> 1天前'
  );

  // 多天前
  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.daysAgo(3)),
    '3天前',
    '3天前 -> 3天前'
  );

  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.daysAgo(10)),
    '10天前',
    '10天前 -> 10天前'
  );

  // 边界值测试
  TestFramework.assertEqual(
    tc.getTimeAgo(TimeUtils.secondsAgo(31)),
    '今天',
    '31秒前 -> 今天（超过30秒的边界）'
  );

  // 空值测试
  TestFramework.assertEqual(
    tc.getTimeAgo(null),
    '',
    'null -> 空字符串'
  );

  TestFramework.assertEqual(
    tc.getTimeAgo(undefined),
    '',
    'undefined -> 空字符串'
  );

  TestFramework.assertEqual(
    tc.getTimeAgo(0),
    '刚刚',
    '时间戳0 -> 刚刚'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 3: isTempPage - 临时页判断函数测试
 */
function runIsTempPageTests() {
  const tc = new TabClean();

  console.group('%c模块 3: isTempPage (临时页判断)', 'color: #4a6fff; font-weight: bold;');

  // login-success 关键词测试
  TestFramework.assertTrue(
    tc.isTempPage('https://auth.example.com/login-success?code=12345', '登录成功'),
    'login-success URL -> 临时页'
  );

  TestFramework.assertTrue(
    tc.isTempPage('https://example.com/loginsuccess', ''),
    'loginsuccess URL -> 临时页（变体）'
  );

  // redirect-done 关键词测试
  TestFramework.assertTrue(
    tc.isTempPage('https://app.example.com/redirect-done', '重定向完成'),
    'redirect-done URL -> 临时页'
  );

  // OAuth 相关测试
  TestFramework.assertTrue(
    tc.isTempPage('https://api.service.com/oauth2/callback', 'OAuth授权完成'),
    'oauth2/callback URL -> 临时页'
  );

  TestFramework.assertTrue(
    tc.isTempPage('https://auth.example.com/auth/callback', ''),
    'auth/callback URL -> 临时页'
  );

  // about:blank 测试
  TestFramework.assertTrue(
    tc.isTempPage('about:blank', ''),
    'about:blank -> 临时页'
  );

  // 空白页关键词测试
  TestFramework.assertTrue(
    tc.isTempPage('https://example.com/blank-page', ''),
    'blank URL 关键词 -> 临时页'
  );

  // 正常页面测试
  TestFramework.assertFalse(
    tc.isTempPage('https://github.com', 'GitHub - 代码托管'),
    '正常 GitHub 页面 -> 不是临时页'
  );

  TestFramework.assertFalse(
    tc.isTempPage('https://www.google.com/search', 'Google 搜索'),
    '正常搜索页面 -> 不是临时页'
  );

  TestFramework.assertFalse(
    tc.isTempPage('https://mail.qq.com/inbox', 'QQ 邮箱 - 收件箱'),
    '正常邮箱页面 -> 不是临时页'
  );

  // 空值测试
  TestFramework.assertFalse(
    tc.isTempPage('', ''),
    '空 URL 和 title -> 不是临时页'
  );

  TestFramework.assertFalse(
    tc.isTempPage(null, null),
    'null URL 和 title -> 不是临时页'
  );

  // title 包含关键词测试
  TestFramework.assertTrue(
    tc.isTempPage('https://example.com/page', '登录成功 - login-success'),
    'title 包含 login-success -> 临时页'
  );

  TestFramework.assertTrue(
    tc.isTempPage('https://example.com/page', 'OAuth 授权完成'),
    'title 包含 oauth -> 临时页'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 4: isOldTab - 7天未访问判断测试
 */
function runIsOldTabTests() {
  const tc = new TabClean();

  console.group('%c模块 4: isOldTab (7天未访问判断)', 'color: #4a6fff; font-weight: bold;');

  // 7天内 - 不是旧标签
  TestFramework.assertFalse(
    tc.isOldTab(TimeUtils.daysAgo(1)),
    '1天前 -> 不是旧标签'
  );

  TestFramework.assertFalse(
    tc.isOldTab(TimeUtils.daysAgo(3)),
    '3天前 -> 不是旧标签'
  );

  TestFramework.assertFalse(
    tc.isOldTab(TimeUtils.daysAgo(6)),
    '6天前 -> 不是旧标签（接近边界）'
  );

  // 7天以上 - 旧标签
  TestFramework.assertTrue(
    tc.isOldTab(TimeUtils.daysAgo(7) - 1),
    '7天+1秒前 -> 是旧标签（刚超过7天）'
  );

  TestFramework.assertTrue(
    tc.isOldTab(TimeUtils.daysAgo(8)),
    '8天前 -> 是旧标签'
  );

  TestFramework.assertTrue(
    tc.isOldTab(TimeUtils.daysAgo(30)),
    '30天前 -> 是旧标签'
  );

  // 自定义天数测试
  TestFramework.assertFalse(
    tc.isOldTab(TimeUtils.daysAgo(2), 3),
    '2天前（自定义阈值3天）-> 不是旧标签'
  );

  TestFramework.assertTrue(
    tc.isOldTab(TimeUtils.daysAgo(5), 3),
    '5天前（自定义阈值3天）-> 是旧标签'
  );

  // 空值测试
  TestFramework.assertFalse(
    tc.isOldTab(null),
    'null -> 不是旧标签'
  );

  TestFramework.assertFalse(
    tc.isOldTab(undefined),
    'undefined -> 不是旧标签'
  );

  // 当前时间测试
  TestFramework.assertFalse(
    tc.isOldTab(Date.now()),
    '当前时间 -> 不是旧标签'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 5: categorizeTabs - 分类逻辑测试
 */
function runCategorizeTabsTests() {
  console.group('%c模块 5: categorizeTabs (分类逻辑)', 'color: #4a6fff; font-weight: bold;');

  // 测试用例1: 重复项分类
  const tc1 = new TabClean();
  tc1.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.minutesAgo(10) },
    { id: 2, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.minutesAgo(5) },
    { id: 3, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.minutesAgo(15) }
  ];
  tc1.processTabs();

  TestFramework.assertEqual(
    tc1.categorizedTabs.duplicateGroups.length,
    1,
    '重复项分组数量 = 1（GitHub出现2次）'
  );

  TestFramework.assertEqual(
    tc1.categorizedTabs.duplicate.length,
    2,
    '重复项 tab 数量 = 2（两个GitHub）'
  );

  TestFramework.assertEqual(
    tc1.categorizedTabs.keep.length,
    1,
    '先保留 tab 数量 = 1（Google）'
  );

  TestFramework.assertEqual(
    tc1.categorizedTabs.close.length,
    0,
    '可关闭 tab 数量 = 0（都是新页面）'
  );

  // 测试用例2: 临时页分类
  const tc2 = new TabClean();
  tc2.tabs = [
    { id: 1, title: '登录成功', url: 'https://auth.example.com/login-success', lastAccessed: TimeUtils.minutesAgo(1) },
    { id: 2, title: '空白页', url: 'about:blank', lastAccessed: TimeUtils.minutesAgo(2) }
  ];
  tc2.processTabs();

  TestFramework.assertEqual(
    tc2.categorizedTabs.close.length,
    2,
    '可关闭 tab 数量 = 2（都是临时页）'
  );

  TestFramework.assertEqual(
    tc2.categorizedTabs.keep.length,
    0,
    '先保留 tab 数量 = 0'
  );

  // 测试用例3: 7天未访问分类
  const tc3 = new TabClean();
  tc3.tabs = [
    { id: 1, title: '旧博客', url: 'https://blog.example.com', lastAccessed: TimeUtils.daysAgo(10) },
    { id: 2, title: '新页面', url: 'https://newsite.com', lastAccessed: TimeUtils.hoursAgo(2) }
  ];
  tc3.processTabs();

  TestFramework.assertEqual(
    tc3.categorizedTabs.close.length,
    1,
    '可关闭 tab 数量 = 1（10天未访问）'
  );

  TestFramework.assertEqual(
    tc3.categorizedTabs.keep.length,
    1,
    '先保留 tab 数量 = 1（2小时前）'
  );

  // 测试用例4: 混合场景
  const tc4 = new TabClean();
  tc4.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.minutesAgo(5) },
    { id: 2, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.minutesAgo(10) },
    { id: 3, title: '登录成功', url: 'https://auth.example.com/login-success', lastAccessed: TimeUtils.minutesAgo(1) },
    { id: 4, title: '旧文章', url: 'https://blog.example.com/old', lastAccessed: TimeUtils.daysAgo(15) },
    { id: 5, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 6, title: 'Bilibili', url: 'https://bilibili.com', lastAccessed: TimeUtils.hoursAgo(3) }
  ];
  tc4.processTabs();

  TestFramework.assertEqual(
    tc4.categorizedTabs.duplicate.length,
    2,
    '混合场景: 重复项 = 2'
  );

  TestFramework.assertEqual(
    tc4.categorizedTabs.close.length,
    2,
    '混合场景: 可关闭 = 2（临时页+旧页）'
  );

  TestFramework.assertEqual(
    tc4.categorizedTabs.keep.length,
    2,
    '混合场景: 先保留 = 2（Google, Bilibili）'
  );

  TestFramework.assertEqual(
    tc4.tabsData.length,
    6,
    '混合场景: 总 tab 数 = 6'
  );

  // 测试用例5: 空数据
  const tc5 = new TabClean();
  tc5.tabs = [];
  tc5.processTabs();

  TestFramework.assertEqual(
    tc5.categorizedTabs.duplicate.length,
    0,
    '空数据: 重复项 = 0'
  );

  TestFramework.assertEqual(
    tc5.categorizedTabs.keep.length,
    0,
    '空数据: 先保留 = 0'
  );

  TestFramework.assertEqual(
    tc5.categorizedTabs.close.length,
    0,
    '空数据: 可关闭 = 0'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 6: simpleGroup - 分组逻辑测试
 */
function runSimpleGroupTests() {
  const tc = new TabClean();

  console.group('%c模块 6: simpleGroup (分组逻辑)', 'color: #4a6fff; font-weight: bold;');

  // 测试用例1: 单一域名多 tab - 独立分组
  const tabs1 = [
    { id: 1, url: 'https://mail.qq.com', title: 'QQ邮箱', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, url: 'https://mail.qq.com', title: 'QQ邮箱2', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, url: 'https://mail.qq.com', title: 'QQ邮箱3', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(3) }
  ];
  const groups1 = tc.simpleGroup(tabs1);

  TestFramework.assertEqual(
    groups1.length,
    1,
    '单一域名3个tab: 分组数量 = 1'
  );

  TestFramework.assertEqual(
    groups1[0].name,
    'Mail',
    '单一域名3个tab: 分组名称 = Mail'
  );

  TestFramework.assertFalse(
    groups1[0].isOther,
    '单一域名3个tab: isOther = false'
  );

  TestFramework.assertEqual(
    groups1[0].count,
    3,
    '单一域名3个tab: tab 数量 = 3'
  );

  // 测试用例2: 多域名，每个域名多个 tab
  const tabs2 = [
    { id: 1, url: 'https://mail.qq.com', title: 'QQ邮箱', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, url: 'https://mail.qq.com', title: 'QQ邮箱2', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, url: 'https://github.com', title: 'GitHub', displayName: 'Github', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 4, url: 'https://github.com', title: 'GitHub2', displayName: 'Github', lastAccessed: TimeUtils.hoursAgo(3) },
    { id: 5, url: 'https://github.com', title: 'GitHub3', displayName: 'Github', lastAccessed: TimeUtils.hoursAgo(5) }
  ];
  const groups2 = tc.simpleGroup(tabs2);

  TestFramework.assertEqual(
    groups2.length,
    2,
    '两个域名: 分组数量 = 2'
  );

  TestFramework.assertEqual(
    groups2[0].name,
    'Github',
    '按字母排序: 第一组为 Github'
  );

  TestFramework.assertEqual(
    groups2[1].name,
    'Mail',
    '按字母排序: 第二组为 Mail'
  );

  // 测试用例3: 每个域名只有1个 tab - 全部归到 Other
  const tabs3 = [
    { id: 1, url: 'https://a.com', title: 'Site A', displayName: 'A', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, url: 'https://b.com', title: 'Site B', displayName: 'B', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, url: 'https://c.com', title: 'Site C', displayName: 'C', lastAccessed: TimeUtils.hoursAgo(3) }
  ];
  const groups3 = tc.simpleGroup(tabs3);

  TestFramework.assertEqual(
    groups3.length,
    1,
    '每个域名1个tab: 分组数量 = 1（全部Other）'
  );

  TestFramework.assertTrue(
    groups3[0].isOther,
    '每个域名1个tab: isOther = true'
  );

  TestFramework.assertEqual(
    groups3[0].count,
    3,
    '每个域名1个tab: Other 分组包含3个tab'
  );

  // 测试用例4: 混合场景 - 一个域名多tab，其他域名单tab
  const tabs4 = [
    { id: 1, url: 'https://mail.qq.com', title: 'QQ邮箱1', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, url: 'https://mail.qq.com', title: 'QQ邮箱2', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, url: 'https://mail.qq.com', title: 'QQ邮箱3', displayName: 'Mail', lastAccessed: TimeUtils.hoursAgo(3) },
    { id: 4, url: 'https://b.com', title: 'Site B', displayName: 'B', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 5, url: 'https://c.com', title: 'Site C', displayName: 'C', lastAccessed: TimeUtils.hoursAgo(1) }
  ];
  const groups4 = tc.simpleGroup(tabs4);

  TestFramework.assertEqual(
    groups4.length,
    2,
    '混合场景: 分组数量 = 2（Mail独立分组 + Other）'
  );

  TestFramework.assertEqual(
    groups4[0].name,
    'Mail',
    '混合场景: 独立分组名称 = Mail'
  );

  TestFramework.assertEqual(
    groups4[0].count,
    3,
    '混合场景: Mail分组包含3个tab'
  );

  TestFramework.assertTrue(
    groups4[1].isOther,
    '混合场景: 第二个分组为 Other'
  );

  TestFramework.assertEqual(
    groups4[1].count,
    2,
    '混合场景: Other 分组包含2个tab'
  );

  // 测试用例5: 特殊协议（displayName 为 Other）有多个 tab
  // 注意：这些 Other 会被当作独立分组名，不会和其他单 tab 的 Other 合并
  const tabs5 = [
    { id: 1, url: 'chrome://newtab/', title: '新标签页', displayName: 'Other', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, url: 'about:blank', title: '空白页', displayName: 'Other', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, url: 'https://b.com', title: 'Site B', displayName: 'B', lastAccessed: TimeUtils.hoursAgo(1) }
  ];
  const groups5 = tc.simpleGroup(tabs5);

  // 这里的关键测试：displayName 为 "Other" 的两个 tab 因为数量 >= 2，会形成一个独立分组（isOther=false）
  // 而 displayName 为 "B" 的单个 tab 会进入真正的 Other 分组（isOther=true）
  // 这会导致两个分组都叫 "Other"，但一个 isOther=false 一个 isOther=true
  TestFramework.assertEqual(
    groups5.length,
    2,
    '特殊协议场景: 分组数量 = 2（注意：两个Other分组，一个独立，一个汇总）'
  );

  // 测试用例6: 空数组
  const groups6 = tc.simpleGroup([]);
  TestFramework.assertEqual(
    groups6.length,
    0,
    '空数组: 分组数量 = 0'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 7: Todo 功能测试
 */
function runTodoTests() {
  console.group('%c模块 7: Todo 功能', 'color: #4a6fff; font-weight: bold;');

  // 测试用例1: 添加 Todo
  const tc1 = new TabClean();
  tc1.addTodoItem({ url: 'https://github.com', title: 'GitHub', favIconUrl: 'icon.png' });

  TestFramework.assertEqual(
    tc1.todoList.length,
    1,
    '添加 Todo 后: 列表长度 = 1'
  );

  TestFramework.assertEqual(
    tc1.todoList[0].url,
    'https://github.com',
    '添加 Todo 后: URL 正确'
  );

  TestFramework.assertEqual(
    tc1.todoList[0].title,
    'GitHub',
    '添加 Todo 后: 标题正确'
  );

  TestFramework.assertEqual(
    tc1.todoList[0].favIconUrl,
    'icon.png',
    '添加 Todo 后: favIconUrl 正确'
  );

  TestFramework.assertObjectProperty(
    tc1.todoList[0],
    'addedAt',
    '添加 Todo 后: 包含 addedAt 时间戳'
  );

  // 测试用例2: 重复添加（去重）
  tc1.addTodoItem({ url: 'https://github.com', title: 'GitHub' });
  TestFramework.assertEqual(
    tc1.todoList.length,
    1,
    '重复添加: 列表长度仍为 1（已去重）'
  );

  // 测试用例3: 添加多个不同的 Todo
  tc1.addTodoItem({ url: 'https://google.com', title: 'Google' });
  tc1.addTodoItem({ url: 'https://bilibili.com', title: 'Bilibili' });

  TestFramework.assertEqual(
    tc1.todoList.length,
    3,
    '添加3个不同 Todo: 列表长度 = 3'
  );

  // 测试用例4: 移除 Todo
  tc1.removeTodoItem('https://google.com');
  TestFramework.assertEqual(
    tc1.todoList.length,
    2,
    '移除 Google 后: 列表长度 = 2'
  );

  const googleExists = tc1.todoList.some(item => item.url === 'https://google.com');
  TestFramework.assertFalse(
    googleExists,
    '移除 Google 后: Google 不再在列表中'
  );

  // 测试用例5: 移除不存在的 URL
  tc1.removeTodoItem('https://nonexistent.com');
  TestFramework.assertEqual(
    tc1.todoList.length,
    2,
    '移除不存在的 URL: 列表长度不变 = 2'
  );

  // 测试用例6: favIconUrl 为空值
  const tc2 = new TabClean();
  tc2.addTodoItem({ url: 'https://example.com', title: 'Example' });

  TestFramework.assertEqual(
    tc2.todoList[0].favIconUrl,
    '',
    '未提供 favIconUrl 时: 默认为空字符串'
  );

  // 测试用例7: applyTodoToTabs - 将 Todo 信息应用到 tab 数据
  const tc3 = new TabClean();
  tc3.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(2) }
  ];
  tc3.processTabs();

  // 添加一个 Todo
  tc3.addTodoItem({ url: 'https://github.com', title: 'GitHub' });
  tc3.applyTodoToTabs();

  const githubTab = tc3.tabsData.find(tab => tab.url === 'https://github.com');
  TestFramework.assertTrue(
    githubTab && githubTab.inTodo,
    'applyTodoToTabs: GitHub tab 的 inTodo = true'
  );

  const googleTab = tc3.tabsData.find(tab => tab.url === 'https://google.com');
  TestFramework.assertFalse(
    googleTab && googleTab.inTodo,
    'applyTodoToTabs: Google tab 的 inTodo = false'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 8: getClosingReason - 关闭原因测试
 */
function runGetClosingReasonTests() {
  const tc = new TabClean();

  console.group('%c模块 8: getClosingReason (关闭原因)', 'color: #4a6fff; font-weight: bold;');

  // 临时页
  const tab1 = { url: 'https://auth.example.com/login-success', title: '登录成功' };
  TestFramework.assertContains(
    tc.getClosingReason(tab1),
    '临时页面',
    '临时页: 原因包含"临时页面"'
  );

  // 空白页
  const tab2 = { url: 'about:blank', title: '空白页' };
  TestFramework.assertContains(
    tc.getClosingReason(tab2),
    '临时页面',
    'about:blank: 原因包含"临时页面"'
  );

  // 10天未访问
  const tab3 = { url: 'https://example.com', title: '旧页面', lastAccessed: TimeUtils.daysAgo(10) };
  TestFramework.assertContains(
    tc.getClosingReason(tab3),
    '10天未访问',
    '10天未访问: 原因包含"10天未访问"'
  );

  // 8天未访问
  const tab4 = { url: 'https://example.com', title: '旧页面', lastAccessed: TimeUtils.daysAgo(8) };
  TestFramework.assertContains(
    tc.getClosingReason(tab4),
    '8天未访问',
    '8天未访问: 原因包含"8天未访问"'
  );

  // 刚访问过
  const tab5 = { url: 'https://example.com', title: '新页面', lastAccessed: TimeUtils.hoursAgo(2) };
  TestFramework.assertContains(
    tc.getClosingReason(tab5),
    '建议关闭',
    '2小时前访问: 原因包含"建议关闭"（兜底）'
  );

  // 临时页 + 长时间未访问（临时页优先级更高）
  const tab6 = { url: 'https://auth.example.com/login-success', title: '登录成功', lastAccessed: TimeUtils.daysAgo(10) };
  TestFramework.assertContains(
    tc.getClosingReason(tab6),
    '临时页面',
    '临时页且旧标签: 临时页优先级更高'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 9: handleOneClickSlim - 一键瘦身功能测试
 */
function runOneClickSlimTests() {
  console.group('%c模块 9: handleOneClickSlim (一键瘦身)', 'color: #4a6fff; font-weight: bold;');

  // 测试用例1: 有重复项可以瘦身
  const tc1 = new TabClean();
  tc1.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.minutesAgo(30) },
    { id: 3, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.hoursAgo(3) },
    { id: 4, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(2) }
  ];
  tc1.processTabs();

  const beforeCount = tc1.categorizedTabs.duplicateGroups.length;
  TestFramework.assertEqual(
    beforeCount,
    1,
    '瘦身前: 有1个重复项分组'
  );

  TestFramework.assertEqual(
    tc1.categorizedTabs.duplicate.length,
    3,
    '瘦身前: 重复项 tab 数量 = 3'
  );

  tc1.handleOneClickSlim();

  // 在模拟环境中，一键瘦身会从 tabsData 移除重复项
  // 注意：mock 数据本身没有被修改，但 tabsData 会被修改
  const remainingDuplicates = tc1.tabsData.filter(tab => tab.url === 'https://github.com');
  TestFramework.assertTrue(
    remainingDuplicates.length === 1,
    '瘦身后: GitHub 重复项只保留1个'
  );

  // 测试用例2: 没有重复项
  const tc2 = new TabClean();
  tc2.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(2) }
  ];
  tc2.processTabs();

  TestFramework.assertEqual(
    tc2.categorizedTabs.duplicateGroups.length,
    0,
    '无重复项: duplicateGroups = 0'
  );

  // 调用 handleOneClickSlim 应该无操作
  tc2.handleOneClickSlim();

  TestFramework.assertEqual(
    tc2.tabsData.length,
    2,
    '无重复项: 瘦身不影响 tab 数量 = 2'
  );

  // 测试用例3: 多个重复项分组
  const tc3 = new TabClean();
  tc3.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, title: 'GitHub', url: 'https://github.com', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 4, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 5, title: 'Google', url: 'https://google.com', lastAccessed: TimeUtils.hoursAgo(3) }
  ];
  tc3.processTabs();

  TestFramework.assertEqual(
    tc3.categorizedTabs.duplicateGroups.length,
    2,
    '多个重复项: 分组数量 = 2（GitHub, Google）'
  );

  TestFramework.assertEqual(
    tc3.categorizedTabs.duplicate.length,
    5,
    '多个重复项: 重复项 tab 数量 = 5'
  );

  tc3.handleOneClickSlim();

  // 瘦身之后应该只保留2个（每个分组1个）
  const remainingTabs = tc3.tabsData.filter(tab =>
    tab.url === 'https://github.com' || tab.url === 'https://google.com'
  );
  TestFramework.assertTrue(
    remainingTabs.length === 2,
    '多个重复项瘦身: 每个分组只保留1个'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 10: 时间辅助函数测试
 */
function runTimeHelperTests() {
  const tc = new TabClean();

  console.group('%c模块 10: 时间辅助函数 (isSameDay, getCalendarDaysDiff)', 'color: #4a6fff; font-weight: bold;');

  const now = new Date();

  // isSameDay 测试
  TestFramework.assertTrue(
    tc.isSameDay(now, now),
    'isSameDay: 同一时刻 -> true'
  );

  TestFramework.assertTrue(
    tc.isSameDay(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)),
    'isSameDay: 同一天的0点和23:59 -> true'
  );

  TestFramework.assertFalse(
    tc.isSameDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                 new Date(now.getFullYear(), now.getMonth(), now.getDate())),
    'isSameDay: 昨天和今天 -> false'
  );

  // getCalendarDaysDiff 测试
  TestFramework.assertEqual(
    tc.getCalendarDaysDiff(now, now),
    0,
    'getCalendarDaysDiff: 同一时刻 -> 0天'
  );

  TestFramework.assertEqual(
    tc.getCalendarDaysDiff(now, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
    1,
    'getCalendarDaysDiff: 24小时前 -> 1天'
  );

  TestFramework.assertEqual(
    tc.getCalendarDaysDiff(now, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
    7,
    'getCalendarDaysDiff: 7天前 -> 7天'
  );

  // 跨月测试
  const monthEnd = new Date(2026, 5, 30, 10, 0, 0); // 6月30日
  const monthStart = new Date(2026, 6, 1, 10, 0, 0); // 7月1日
  TestFramework.assertEqual(
    tc.getCalendarDaysDiff(monthStart, monthEnd),
    1,
    'getCalendarDaysDiff: 跨月1天差 -> 1天'
  );

  // getTabTimestamp 测试
  const tabWithTime = { lastAccessed: TimeUtils.hoursAgo(5) };
  TestFramework.assertTrue(
    typeof tc.getTabTimestamp(tabWithTime) === 'number',
    'getTabTimestamp: 有 lastAccessed -> 返回数字'
  );

  const tabWithoutTime = {};
  TestFramework.assertTrue(
    typeof tc.getTabTimestamp(tabWithoutTime) === 'number',
    'getTabTimestamp: 无 lastAccessed -> 仍返回数字（使用当前时间-1小时）'
  );

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 模块 11: 综合场景测试
 */
function runIntegrationTests() {
  console.group('%c模块 11: 综合场景测试', 'color: #4a6fff; font-weight: bold;');

  // 模拟一个真实用户的 tab 场景
  const tc = new TabClean();
  tc.tabs = [
    // 重复项 - GitHub
    { id: 1, title: 'GitHub - Tab Clean', url: 'https://github.com/tab-clean', favIconUrl: 'gh.png', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 2, title: 'GitHub - Tab Clean', url: 'https://github.com/tab-clean', favIconUrl: 'gh.png', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 3, title: 'GitHub - Tab Clean', url: 'https://github.com/tab-clean', favIconUrl: 'gh.png', lastAccessed: TimeUtils.hoursAgo(3) },

    // 重复项 - Google
    { id: 4, title: 'Google 搜索', url: 'https://www.google.com/search?q=chrome', favIconUrl: 'google.png', lastAccessed: TimeUtils.minutesAgo(30) },
    { id: 5, title: 'Google 搜索', url: 'https://www.google.com/search?q=chrome', favIconUrl: 'google.png', lastAccessed: TimeUtils.minutesAgo(45) },

    // 临时页
    { id: 6, title: '登录成功', url: 'https://auth.example.com/login-success', favIconUrl: '', lastAccessed: TimeUtils.minutesAgo(5) },
    { id: 7, title: 'OAuth 授权完成', url: 'https://api.example.com/oauth2/callback', favIconUrl: '', lastAccessed: TimeUtils.minutesAgo(15) },
    { id: 8, title: '空白页', url: 'about:blank', favIconUrl: '', lastAccessed: TimeUtils.minutesAgo(10) },

    // 旧标签（7天以上未访问）
    { id: 9, title: '旧的博客文章', url: 'https://blog.example.com/old-article', favIconUrl: '', lastAccessed: TimeUtils.daysAgo(10) },
    { id: 10, title: '归档的项目文档', url: 'https://docs.example.com/archived-project', favIconUrl: '', lastAccessed: TimeUtils.daysAgo(8) },

    // 需要保留的正常页面
    { id: 11, title: '哔哩哔哩 - 开发者大会', url: 'https://www.bilibili.com/video/dev', favIconUrl: 'bilibili.png', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 12, title: 'YouTube - Web Dev', url: 'https://www.youtube.com/watch?v=webdev', favIconUrl: 'yt.png', lastAccessed: TimeUtils.hoursAgo(2) },
    { id: 13, title: 'MDN - Chrome Extensions', url: 'https://developer.mozilla.org/docs', favIconUrl: 'mdn.png', lastAccessed: TimeUtils.hoursAgo(3) },
    { id: 14, title: '知乎 - 前端开发', url: 'https://www.zhihu.com/question/frontend', favIconUrl: 'zhihu.png', lastAccessed: TimeUtils.hoursAgo(4) },

    // 邮箱分组（mail.qq.com）
    { id: 15, title: 'QQ邮箱 - 收件箱', url: 'https://mail.qq.com/inbox', favIconUrl: 'mail.png', lastAccessed: TimeUtils.hoursAgo(1) },
    { id: 16, title: 'QQ邮箱 - 发件箱', url: 'https://mail.qq.com/outbox', favIconUrl: 'mail.png', lastAccessed: TimeUtils.hoursAgo(2) },

    // 特殊协议页面
    { id: 17, title: '新标签页', url: 'chrome://newtab/', favIconUrl: '', lastAccessed: TimeUtils.minutesAgo(1) }
  ];
  tc.processTabs();

  // 统计验证
  TestFramework.assertEqual(
    tc.tabsData.length,
    17,
    '综合场景: 总 tab 数量 = 17'
  );

  TestFramework.assertEqual(
    tc.categorizedTabs.duplicateGroups.length,
    2,
    '综合场景: 重复项分组 = 2（GitHub, Google）'
  );

  TestFramework.assertEqual(
    tc.categorizedTabs.duplicate.length,
    5,
    '综合场景: 重复项 tab 数量 = 5（3个GitHub + 2个Google）'
  );

  TestFramework.assertEqual(
    tc.categorizedTabs.close.length,
    5,
    '综合场景: 可关闭 tab 数量 = 5（3个临时页 + 2个旧标签）'
  );

  // 先保留 = 总 - 重复项 - 可关闭 = 17 - 5 - 5 = 7（其中邮箱2个，其他5个）
  TestFramework.assertEqual(
    tc.categorizedTabs.keep.length,
    7,
    '综合场景: 先保留 tab 数量 = 7'
  );

  // 测试分组
  const keepGroups = tc.simpleGroup(tc.categorizedTabs.keep);

  // 先保留的7个 tab 中:
  // - Mail 域名有2个 tab（邮箱2个）-> 独立分组
  // - 其他5个 tab（B站, YouTube, MDN, 知乎, chrome://newtab/）都是不同域名 -> Other
  // 注意：chrome://newtab/ 的 displayName 为 "Other"
  TestFramework.assertTrue(
    keepGroups.length >= 1,
    '综合场景: 先保留分组数量 >= 1'
  );

  // 测试一键瘦身
  tc.handleOneClickSlim();

  // 瘦身后重复项应该减少（模拟环境从 tabsData 中移除）
  const githubTabsAfterSlim = tc.tabsData.filter(tab => tab.url === 'https://github.com/tab-clean');
  TestFramework.assertTrue(
    githubTabsAfterSlim.length === 1,
    '综合场景瘦身后: GitHub 重复项只剩1个'
  );

  const googleTabsAfterSlim = tc.tabsData.filter(tab => tab.url === 'https://www.google.com/search?q=chrome');
  TestFramework.assertTrue(
    googleTabsAfterSlim.length === 1,
    '综合场景瘦身后: Google 重复项只剩1个'
  );

  // 测试 Todo 添加
  tc.addTodoItem({ url: 'https://www.bilibili.com/video/dev', title: '哔哩哔哩 - 开发者大会', favIconUrl: 'bilibili.png' });

  TestFramework.assertEqual(
    tc.todoList.length,
    1,
    '综合场景: 添加 Todo 后列表长度 = 1'
  );

  tc.addTodoItem({ url: 'https://developer.mozilla.org/docs', title: 'MDN - Chrome Extensions', favIconUrl: 'mdn.png' });

  TestFramework.assertEqual(
    tc.todoList.length,
    2,
    '综合场景: 添加2个 Todo 后列表长度 = 2'
  );

  // 测试渲染函数不报错
  try {
    // 模拟 renderKeep 调用 simpleGroup 不会报错
    const groups = tc.simpleGroup(tc.categorizedTabs.keep);
    TestFramework.assertTrue(
      Array.isArray(groups) && groups.length > 0,
      '综合场景: 分组渲染不报错'
    );
  } catch (e) {
    TestFramework.assert(false, '综合场景: 分组渲染报错', '无错误', e.message);
  }

  console.log(`完成 ${TestFramework.testCount} 个测试`);
  console.groupEnd();
}

/**
 * 主测试入口
 */
function runAllTests() {
  console.clear();
  console.log('%c========================================', 'color: #4a6fff; font-weight: bold; font-size: 16px;');
  console.log('%c  Tab Clean - 单元测试报告', 'color: #4a6fff; font-weight: bold; font-size: 16px;');
  console.log('%c========================================', 'color: #4a6fff; font-weight: bold; font-size: 16px;');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');

  TestFramework.reset();

  // 运行各模块测试
  runExtractDisplayNameTests();
  runGetTimeAgoTests();
  runIsTempPageTests();
  runIsOldTabTests();
  runCategorizeTabsTests();
  runSimpleGroupTests();
  runTodoTests();
  runGetClosingReasonTests();
  runOneClickSlimTests();
  runTimeHelperTests();
  runIntegrationTests();

  // 生成报告
  const report = TestFramework.getReport();

  console.log('');
  console.log('%c========================================', 'color: #4a6fff; font-weight: bold; font-size: 16px;');
  console.log('%c  测试汇总', 'color: #4a6fff; font-weight: bold; font-size: 16px;');
  console.log('%c========================================', 'color: #4a6fff; font-weight: bold; font-size: 16px;');
  console.log(`总测试数: ${report.total}`);
  console.log(`%c通过: ${report.passed}`, 'color: #52c41a; font-weight: bold;');
  console.log(`%c失败: ${report.failed}`, 'color: #ff4d4f; font-weight: bold;');
  console.log(`%c通过率: ${report.passRate}%`, 'color: #4a6fff; font-weight: bold; font-size: 14px;');

  // 输出失败详情
  const failedTests = report.results.filter(r => r.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log('');
    console.log('%c  失败详情:', 'color: #ff4d4f; font-weight: bold;');
    console.log('%c----------------------------------------', 'color: #ff4d4f;');
    failedTests.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}`);
      console.log(`     期望: ${JSON.stringify(r.expected)}`);
      console.log(`     实际: ${JSON.stringify(r.actual)}`);
    });
  }

  console.log('');
  console.log('%c========================================', 'color: #4a6fff; font-weight: bold; font-size: 16px;');

  return report;
}

// 生成 HTML 报告
function generateHTMLReport(report) {
  let html = `
    <div style="max-width: 800px; margin: 20px auto; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(74, 111, 255, 0.15);">
      <h1 style="color: #1a2332; margin-bottom: 10px; border-bottom: 3px solid #4a6fff; padding-bottom: 10px;">
        🧪 Tab Clean 单元测试报告
      </h1>
      <div style="color: #6b7a90; margin-bottom: 20px;">测试时间: ${new Date().toLocaleString('zh-CN')}</div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: #e8f0ff; padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #4a6fff;">${report.total}</div>
          <div style="color: #6b7a90;">总测试数</div>
        </div>
        <div style="background: #e8f7e8; padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #52c41a;">${report.passed}</div>
          <div style="color: #6b7a90;">通过</div>
        </div>
        <div style="background: #ffe8e8; padding: 20px; border-radius: 12px; text-align: center;">
          <div style="font-size: 36px; font-weight: bold; color: #ff4d4f;">${report.failed}</div>
          <div style="color: #6b7a90;">失败</div>
        </div>
      </div>

      <div style="background: ${report.failedCount === 0 ? '#e8f7e8' : '#fff3e0'}; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; font-weight: bold; color: ${report.failed === 0 ? '#52c41a' : '#ff9800'};">
          ${report.passRate}%
        </div>
        <div style="color: #6b7a90; font-size: 16px;">通过率</div>
        <div style="margin-top: 10px; font-size: 18px; font-weight: bold; color: ${report.failed === 0 ? '#52c41a' : '#ff9800'};">
          ${report.failed === 0 ? '✅ 所有测试通过！' : '⚠️ 有测试失败，请查看详情'}
        </div>
      </div>

      <h2 style="color: #1a2332; margin-top: 30px; border-bottom: 2px solid #e0e8ff; padding-bottom: 10px;">测试详情</h2>
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="position: sticky; top: 0; background: #f5f9ff;">
            <tr>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e8ff; color: #1a2332;">状态</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e8ff; color: #1a2332;">测试名称</th>
            </tr>
          </thead>
          <tbody>
  `;

  report.results.forEach((r, i) => {
    const statusColor = r.status === 'PASS' ? '#52c41a' : '#ff4d4f';
    const statusIcon = r.status === 'PASS' ? '✅' : '❌';
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f5f9ff';

    html += `
      <tr style="background: ${bgColor};">
        <td style="padding: 10px 12px; color: ${statusColor}; font-weight: bold;">${statusIcon} ${r.status}</td>
        <td style="padding: 10px 12px; color: #1a2332;">${r.name}</td>
      </tr>
    `;

    if (r.status === 'FAIL') {
      html += `
        <tr style="background: #fff8f8;">
          <td style="padding: 0 12px 10px 12px;"></td>
          <td style="padding: 0 12px 10px 12px; font-size: 12px; color: #ff4d4f;">
            期望: ${JSON.stringify(r.expected)}<br/>
            实际: ${JSON.stringify(r.actual)}
          </td>
        </tr>
      `;
    }
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  return html;
}

// 暴露到全局
if (typeof window !== 'undefined') {
  window.TestFramework = TestFramework;
  window.runAllTests = runAllTests;
  window.generateHTMLReport = generateHTMLReport;
}
