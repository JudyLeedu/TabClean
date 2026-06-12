/**
 * Tab Clean - 全流程功能测试
 * 覆盖：域名萃取、时间显示、临时页判断、旧标签判断、
 *       分类逻辑、分组逻辑、Todo功能、一键瘦身、边界场景
 */

// ============================================================
// 模拟浏览器环境
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 模拟持久化的 storage（跨实例保留）
const persistentStorage = {};

// 跟踪 tab 移除操作（用于验证"关闭标签页"功能）
const removedTabs = [];

// 模拟 DOM 元素
function createMockElement(id = '') {
  const el = {
    _id: id,
    style: {},
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, v) { if (v !== undefined) v ? this._classes.add(c) : this._classes.delete(c); else this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); },
      contains(c) { return this._classes.has(c); }
    },
    appendChild() {},
    insertBefore() {},
    parentNode: null,
    textContent: '',
    innerHTML: '',
    dataset: {},
    _listeners: {},
    addEventListener(evt, fn) { this._listeners[evt] = fn; },
    querySelector() { return createMockElement(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    getAttribute() { return null; },
    setAttribute() {}
  };
  return el;
}

global.document = {
  getElementById: () => createMockElement(),
  querySelector: () => createMockElement(),
  querySelectorAll: () => [],
  createElement: () => createMockElement(),
  addEventListener: () => {},
  body: { appendChild: () => {} }
};

global.window = {
  addEventListener: () => {},
  getComputedStyle: () => ({})
};

// ============================================================
// 模拟 chrome API（完整模拟）
// ============================================================
global.chrome = {
  storage: {
    local: {
      get: function(keys, callback) {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (persistentStorage[key] !== undefined) {
              result[key] = persistentStorage[key];
            }
          });
        }
        // 模拟异步回调
        setTimeout(() => callback && callback(result), 0);
      },
      set: function(items, callback) {
        for (const key in items) {
          persistentStorage[key] = items[key];
        }
        setTimeout(() => callback && callback(), 0);
      }
    }
  },
  windows: {
    getAll: function() {
      return Promise.resolve([{ id: 1, tabs: [] }]);
    },
    update: function() { return Promise.resolve(); }
  },
  tabs: {
    query: function() { return Promise.resolve([]); },
    remove: function(tabIds) {
      if (Array.isArray(tabIds)) {
        removedTabs.push(...tabIds);
      } else {
        removedTabs.push(tabIds);
      }
      return Promise.resolve();
    },
    update: function() { return Promise.resolve(); }
  },
  runtime: { lastError: null }
};

// 加载业务代码
const sidepanelCode = fs.readFileSync(
  path.join(__dirname, 'sidepanel.js'),
  'utf-8'
);
vm.runInThisContext(sidepanelCode);

// ============================================================
// 轻量级断言库
// ============================================================
const TestFramework = {
  testCount: 0, passedCount: 0, failedCount: 0,
  results: [], failedDetails: [],
  modules: {},

  startModule(name) {
    this.currentModule = name;
    this.modules[name] = { total: 0, passed: 0, failed: 0 };
  },

  assert(condition, testName, expected, actual) {
    this.testCount++;
    this.modules[this.currentModule].total++;

    if (condition) {
      this.passedCount++;
      this.modules[this.currentModule].passed++;
      this.results.push({ status: 'PASS', module: this.currentModule, name: testName });
    } else {
      this.failedCount++;
      this.modules[this.currentModule].failed++;
      this.results.push({ status: 'FAIL', module: this.currentModule, name: testName });
      this.failedDetails.push({ name: testName, expected, actual });
    }
  },

  assertEqual(actual, expected, testName) {
    this.assert(actual === expected, testName, expected, actual);
  },
  assertTrue(value, testName) { this.assert(value === true, testName, true, value); },
  assertFalse(value, testName) { this.assert(value === false, testName, false, value); },
  assertContains(str, sub, testName) {
    this.assert(typeof str === 'string' && str.includes(sub), testName, '包含: ' + sub, str);
  },
  assertArrayLength(arr, length, testName) {
    this.assert(Array.isArray(arr) && arr.length === length, testName, '长度=' + length, '长度=' + (arr ? arr.length : 'null'));
  },

  getReport() {
    return {
      total: this.testCount, passed: this.passedCount,
      failed: this.failedCount, results: this.results,
      passRate: ((this.passedCount / this.testCount) * 100).toFixed(2)
    };
  }
};

// ============================================================
// 工具函数 - 创建测试数据
// ============================================================
const now = Date.now();
const secondsAgo = (s) => now - s * 1000;
const minutesAgo = (m) => now - m * 60 * 1000;
const hoursAgo = (h) => now - h * 3600 * 1000;
const daysAgo = (d) => now - d * 24 * 3600 * 1000;

function createTab(id, url, title, lastAccessed, windowId = 1) {
  return { id, url, title, favIconUrl: '', lastAccessed, windowId };
}

function createInstance(rawTabs = []) {
  const tc = new TabClean();
  tc.tabs = rawTabs;
  tc.tabsData = [];
  tc.todoList = [];
  tc.categorizedTabs = { duplicate: [], duplicateGroups: [], keep: [], close: [] };
  return tc;
}

async function processAll(tc) {
  // 模拟 processTabs 的完整流程
  tc.tabs.forEach(tab => {
    tc.tabsData.push({
      id: tab.id, title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl || '',
      lastAccessed: tab.lastAccessed,
      displayName: tc.extractDisplayName(tab.url),
      category: null, inTodo: false, todoAddedAt: null, windowId: tab.windowId
    });
  });
  await tc.loadTodoFromStorage();
  tc.applyTodoToTabs();
  tc.categorizeTabs();
  tc.groupAndSort();
}

// ============================================================
// 模块 1: extractDisplayName - 域名萃取
// ============================================================
function runExtractDisplayNameTests() {
  TestFramework.startModule('extractDisplayName 域名萃取');
  const tc = new TabClean();

  // 常规域名
  TestFramework.assertEqual(tc.extractDisplayName('https://github.com/user'), 'Github', 'github.com -> Github');
  TestFramework.assertEqual(tc.extractDisplayName('https://mail.qq.com/inbox'), 'Mail', 'mail.qq.com -> Mail');
  TestFramework.assertEqual(tc.extractDisplayName('https://www.youtube.com/watch?v=xxx'), 'Youtube', 'www.youtube.com -> Youtube');
  TestFramework.assertEqual(tc.extractDisplayName('https://docs.example.com/page'), 'Docs', 'docs.example.com -> Docs');
  TestFramework.assertEqual(tc.extractDisplayName('https://message.slack.com/channel'), 'Message', 'message.slack.com -> Message');
  TestFramework.assertEqual(tc.extractDisplayName('https://code.visualstudio.com/docs'), 'Code', 'code.visualstudio.com -> Code');

  // 带 www 前缀
  TestFramework.assertEqual(tc.extractDisplayName('https://www.google.com'), 'Google', 'www.google.com -> Google');

  // 特殊协议
  TestFramework.assertEqual(tc.extractDisplayName('chrome://newtab/'), 'Other', 'chrome:// -> Other');
  TestFramework.assertEqual(tc.extractDisplayName('about:blank'), 'Other', 'about:blank -> Other');
  TestFramework.assertEqual(tc.extractDisplayName('chrome-extension://xxx/popup.html'), 'Other', 'chrome-extension -> Other');
  TestFramework.assertEqual(tc.extractDisplayName('file:///path/to/file.html'), 'Other', 'file:// -> Other');

  // 空值 / 异常输入
  TestFramework.assertEqual(tc.extractDisplayName(''), 'Other', '空字符串 -> Other');
  TestFramework.assertEqual(tc.extractDisplayName(null), 'Other', 'null -> Other');
  TestFramework.assertEqual(tc.extractDisplayName(undefined), 'Other', 'undefined -> Other');

  // 复杂 URL 带查询参数
  TestFramework.assertEqual(
    tc.extractDisplayName('https://www.google.com/search?q=chrome+extension&oq=chrome&aqs=chrome.0'),
    'Google', '带查询参数 URL 正确提取'
  );
}

// ============================================================
// 模块 2: getTimeAgo - 时间显示
// ============================================================
function runGetTimeAgoTests() {
  TestFramework.startModule('getTimeAgo 时间显示');
  const tc = new TabClean();

  // 刚刚（60秒内）
  TestFramework.assertEqual(tc.getTimeAgo(secondsAgo(30)), '刚刚', '30秒前 -> 刚刚');
  TestFramework.assertEqual(tc.getTimeAgo(secondsAgo(0)), '刚刚', '0秒前 -> 刚刚');

  // 今天内（60秒-当天）
  TestFramework.assertEqual(tc.getTimeAgo(minutesAgo(10)), '今天', '10分钟前 -> 今天');
  TestFramework.assertEqual(tc.getTimeAgo(hoursAgo(3)), '今天', '3小时前 -> 今天');

  // 昨天
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  TestFramework.assertEqual(tc.getTimeAgo(yesterday.getTime()), '昨天', '昨天 -> 昨天');

  // 多天前
  TestFramework.assertEqual(tc.getTimeAgo(daysAgo(3)), '3天前', '3天前 -> 3天前');
  TestFramework.assertEqual(tc.getTimeAgo(daysAgo(7)), '7天前', '7天前 -> 7天前');
  TestFramework.assertEqual(tc.getTimeAgo(daysAgo(30)), '30天前', '30天前 -> 30天前');

  // null / undefined
  TestFramework.assertEqual(tc.getTimeAgo(null), '', 'null -> 空字符串');
  TestFramework.assertEqual(tc.getTimeAgo(undefined), '', 'undefined -> 空字符串');

  // 未来时间（边界）
  TestFramework.assertEqual(tc.getTimeAgo(now + 3600000), '刚刚', '未来时间 -> 刚刚');
}

// ============================================================
// 模块 3: isTempPage - 临时页判断
// ============================================================
function runIsTempPageTests() {
  TestFramework.startModule('isTempPage 临时页判断');
  const tc = new TabClean();

  // 登录回调
  TestFramework.assertTrue(tc.isTempPage('https://auth.example.com/login-success?code=xxx', '登录成功'), 'login-success URL -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('https://service.com/oauth2/callback', ''), 'oauth2/callback URL -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('https://api.com/auth/callback', '授权完成'), 'auth/callback URL -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('', 'Login Success'), 'title 含 login-success -> 临时页');

  // 重定向完成
  TestFramework.assertTrue(tc.isTempPage('https://app.com/redirect-done', ''), 'redirect-done -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('', 'Redirect Complete'), 'title 含 redirect -> 临时页');

  // 空白页
  TestFramework.assertTrue(tc.isTempPage('about:blank', ''), 'about:blank -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('https://example.com/blank-page', ''), 'URL含 blank -> 临时页');
  TestFramework.assertTrue(tc.isTempPage('chrome://newtab/', 'New Tab'), 'newtab -> 临时页');

  // 非临时页
  TestFramework.assertFalse(tc.isTempPage('https://github.com', 'GitHub'), '正常页面: github');
  TestFramework.assertFalse(tc.isTempPage('https://www.google.com', 'Google Search'), '正常页面: google');
  TestFramework.assertFalse(tc.isTempPage('https://mail.google.com/mail/u/0/', 'Inbox'), '正常页面: gmail');
  TestFramework.assertFalse(tc.isTempPage('', ''), '空URL空title -> 非临时页');
}

// ============================================================
// 模块 4: isOldTab - 7天未访问判断
// ============================================================
function runIsOldTabTests() {
  TestFramework.startModule('isOldTab 7天未访问判断');
  const tc = new TabClean();

  TestFramework.assertTrue(tc.isOldTab(daysAgo(8)), '8天前 -> 旧标签');
  TestFramework.assertTrue(tc.isOldTab(daysAgo(30)), '30天前 -> 旧标签');
  TestFramework.assertTrue(tc.isOldTab(daysAgo(100)), '100天前 -> 旧标签');

  TestFramework.assertFalse(tc.isOldTab(daysAgo(6)), '6天前 -> 非旧标签');
  TestFramework.assertFalse(tc.isOldTab(hoursAgo(24)), '1天前 -> 非旧标签');
  TestFramework.assertFalse(tc.isOldTab(minutesAgo(30)), '30分钟前 -> 非旧标签');

  // 边界：正好 7 天
  TestFramework.assertFalse(tc.isOldTab(daysAgo(7), 7), '正好7天 -> 非旧标签（严格小于）');

  // null / undefined
  TestFramework.assertFalse(tc.isOldTab(null), 'null -> 非旧标签');
  TestFramework.assertFalse(tc.isOldTab(undefined), 'undefined -> 非旧标签');

  // 自定义天数
  TestFramework.assertTrue(tc.isOldTab(daysAgo(4), 3), '自定义3天阈值: 4天前 -> 旧标签');
  TestFramework.assertFalse(tc.isOldTab(daysAgo(2), 3), '自定义3天阈值: 2天前 -> 非旧标签');
}

// ============================================================
// 模块 5: categorizeTabs - 分类逻辑
// ============================================================
async function runCategorizeTabsTests() {
  TestFramework.startModule('categorizeTabs 分类逻辑');

  // --- 场景 1: 存在重复项 ---
  const tc1 = createInstance([
    createTab(1, 'https://github.com', 'GitHub - 仓库', minutesAgo(5)),
    createTab(2, 'https://github.com', 'GitHub - 仓库', minutesAgo(10)),
    createTab(3, 'https://github.com', 'GitHub - 仓库', hoursAgo(1)),
    createTab(4, 'https://google.com', 'Google', minutesAgo(2)),
    createTab(5, 'https://stackoverflow.com', 'Stack Overflow', hoursAgo(2))
  ]);
  await processAll(tc1);

  TestFramework.assertEqual(tc1.categorizedTabs.duplicateGroups.length, 1, '场景1: 1个重复项分组 (github)');
  TestFramework.assertEqual(tc1.categorizedTabs.duplicate.length, 3, '场景1: 3个重复 tab');
  TestFramework.assertEqual(tc1.categorizedTabs.keep.length, 2, '场景1: 2个保留 tab (google, stackoverflow)');
  TestFramework.assertEqual(tc1.categorizedTabs.close.length, 0, '场景1: 0个关闭 tab');

  // --- 场景 2: 临时页和旧标签 ---
  const tc2 = createInstance([
    createTab(10, 'https://auth.example.com/login-success', '登录成功', minutesAgo(10)),
    createTab(11, 'https://api.com/oauth2/callback', '授权完成', minutesAgo(30)),
    createTab(12, 'https://blog.example.com/old-article', '旧文章', daysAgo(10)),
    createTab(13, 'https://news.example.com', '新闻', hoursAgo(1))
  ]);
  await processAll(tc2);

  TestFramework.assertEqual(tc2.categorizedTabs.close.length, 3, '场景2: 3个可关闭 tab (2临时+1旧)');
  TestFramework.assertEqual(tc2.categorizedTabs.keep.length, 1, '场景2: 1个保留 tab');
  TestFramework.assertEqual(tc2.categorizedTabs.duplicateGroups.length, 0, '场景2: 0个重复项分组');

  // --- 场景 3: 混合场景 ---
  const tc3 = createInstance([
    // 重复项（同URL多个）
    createTab(20, 'https://github.com', 'GitHub', minutesAgo(5)),
    createTab(21, 'https://github.com', 'GitHub', minutesAgo(15)),
    // 临时页
    createTab(22, 'https://auth.com/login-success', '登录成功', minutesAgo(3)),
    // 旧标签
    createTab(23, 'https://old-site.com', '旧网站', daysAgo(15)),
    // 保留
    createTab(24, 'https://mail.google.com', 'Gmail', minutesAgo(1)),
    createTab(25, 'https://docs.google.com', 'Google Docs', hoursAgo(2))
  ]);
  await processAll(tc3);

  TestFramework.assertEqual(tc3.categorizedTabs.duplicateGroups.length, 1, '场景3: 1个重复项分组');
  TestFramework.assertEqual(tc3.categorizedTabs.duplicate.length, 2, '场景3: 2个重复 tab');
  TestFramework.assertEqual(tc3.categorizedTabs.keep.length, 2, '场景3: 2个保留 tab (mail, docs)');
  TestFramework.assertEqual(tc3.categorizedTabs.close.length, 2, '场景3: 2个关闭 tab (1临时+1旧)');

  // --- 场景 4: 空数据 ---
  const tc4 = createInstance([]);
  await processAll(tc4);
  TestFramework.assertEqual(tc4.categorizedTabs.duplicateGroups.length, 0, '场景4: 空数据 - 0重复');
  TestFramework.assertEqual(tc4.categorizedTabs.keep.length, 0, '场景4: 空数据 - 0保留');
  TestFramework.assertEqual(tc4.categorizedTabs.close.length, 0, '场景4: 空数据 - 0关闭');

  // --- 场景 5: 单 tab ---
  const tc5 = createInstance([
    createTab(30, 'https://example.com', 'Example', minutesAgo(5))
  ]);
  await processAll(tc5);
  TestFramework.assertEqual(tc5.categorizedTabs.duplicateGroups.length, 0, '场景5: 单tab - 0重复');
  TestFramework.assertEqual(tc5.categorizedTabs.keep.length, 1, '场景5: 单tab - 1保留');
  TestFramework.assertEqual(tc5.categorizedTabs.close.length, 0, '场景5: 单tab - 0关闭');

  // --- 场景 6: 全是重复项 ---
  const tc6 = createInstance([
    createTab(40, 'https://github.com', 'GH', minutesAgo(1)),
    createTab(41, 'https://github.com', 'GH', minutesAgo(2)),
    createTab(42, 'https://github.com', 'GH', minutesAgo(3)),
    createTab(43, 'https://google.com', 'Google', minutesAgo(5)),
    createTab(44, 'https://google.com', 'Google', minutesAgo(10))
  ]);
  await processAll(tc6);
  TestFramework.assertEqual(tc6.categorizedTabs.duplicateGroups.length, 2, '场景6: 2个重复项分组');
  TestFramework.assertEqual(tc6.categorizedTabs.duplicate.length, 5, '场景6: 5个重复 tab');
  TestFramework.assertEqual(tc6.categorizedTabs.keep.length, 0, '场景6: 0保留');

  // --- 场景 7: 全可关闭 ---
  const tc7 = createInstance([
    createTab(50, 'about:blank', '', minutesAgo(10)),
    createTab(51, 'https://auth.com/login-success', '登录成功', hoursAgo(1)),
    createTab(52, 'https://old-site.com', '旧网站', daysAgo(30))
  ]);
  await processAll(tc7);
  TestFramework.assertEqual(tc7.categorizedTabs.close.length, 3, '场景7: 3个可关闭');
  TestFramework.assertEqual(tc7.categorizedTabs.keep.length, 0, '场景7: 0保留');

  // --- 场景 8: 全保留 ---
  const tc8 = createInstance([
    createTab(60, 'https://mail.google.com', 'Gmail', minutesAgo(1)),
    createTab(61, 'https://github.com', 'GitHub', minutesAgo(5)),
    createTab(62, 'https://stackoverflow.com', 'SO', minutesAgo(10)),
    createTab(63, 'https://www.notion.so', 'Notion', hoursAgo(2))
  ]);
  await processAll(tc8);
  TestFramework.assertEqual(tc8.categorizedTabs.keep.length, 4, '场景8: 4个保留');
  TestFramework.assertEqual(tc8.categorizedTabs.close.length, 0, '场景8: 0关闭');
  TestFramework.assertEqual(tc8.categorizedTabs.duplicateGroups.length, 0, '场景8: 0重复');
}

// ============================================================
// 模块 6: simpleGroup - 分组逻辑
// ============================================================
function runSimpleGroupTests() {
  TestFramework.startModule('simpleGroup 分组逻辑');
  const tc = new TabClean();

  // --- 场景 1: 同域名 ≥ 2个 tab 形成独立分组，其余进入 Other ---
  const tabs1 = [
    { displayName: 'Mail', url: 'https://mail.qq.com/1', lastAccessed: minutesAgo(1) },
    { displayName: 'Mail', url: 'https://mail.qq.com/2', lastAccessed: minutesAgo(5) },
    { displayName: 'Github', url: 'https://github.com', lastAccessed: minutesAgo(3) },
    { displayName: 'Stackoverflow', url: 'https://stackoverflow.com', lastAccessed: minutesAgo(10) },
    { displayName: 'Youtube', url: 'https://youtube.com', lastAccessed: hoursAgo(1) }
  ];
  const groups1 = tc.simpleGroup(tabs1);
  // Mail 有 2 个 → 独立分组；Github/SO/Youtube 各1个 → 合并到 Other
  const nonOtherGroups1 = groups1.filter(g => !g.isOther);
  const otherGroup1 = groups1.find(g => g.isOther);
  TestFramework.assertEqual(nonOtherGroups1.length, 1, '场景1: 1个独立分组 (Mail)');
  TestFramework.assertTrue(otherGroup1 !== undefined, '场景1: 存在 Other 分组');
  TestFramework.assertEqual(otherGroup1.count, 3, '场景1: Other 有 3 个 tab');
  TestFramework.assertEqual(groups1.length, 2, '场景1: 共 2 个分组');

  // --- 场景 2: 全部都是同域名（无 Other） ---
  const tabs2 = [
    { displayName: 'Github', url: 'https://github.com/1', lastAccessed: minutesAgo(1) },
    { displayName: 'Github', url: 'https://github.com/2', lastAccessed: minutesAgo(2) },
    { displayName: 'Github', url: 'https://github.com/3', lastAccessed: minutesAgo(3) }
  ];
  const groups2 = tc.simpleGroup(tabs2);
  TestFramework.assertEqual(groups2.length, 1, '场景2: 1个分组');
  TestFramework.assertFalse(groups2[0].isOther, '场景2: 非 Other 分组');
  TestFramework.assertEqual(groups2[0].count, 3, '场景2: 3个 tab');

  // --- 场景 3: 都是单域名（全进 Other） ---
  const tabs3 = [
    { displayName: 'Mail', url: 'https://mail.qq.com', lastAccessed: minutesAgo(1) },
    { displayName: 'Github', url: 'https://github.com', lastAccessed: minutesAgo(2) },
    { displayName: 'Stackoverflow', url: 'https://stackoverflow.com', lastAccessed: minutesAgo(3) }
  ];
  const groups3 = tc.simpleGroup(tabs3);
  TestFramework.assertEqual(groups3.length, 1, '场景3: 1个分组 (Other)');
  TestFramework.assertTrue(groups3[0].isOther, '场景3: 是 Other 分组');
  TestFramework.assertEqual(groups3[0].count, 3, '场景3: Other 有 3 个 tab');

  // --- 场景 4: 空数据 ---
  const groups4 = tc.simpleGroup([]);
  TestFramework.assertArrayLength(groups4, 0, '场景4: 空数据 - 0分组');

  // --- 场景 5: 单 tab ---
  const groups5 = tc.simpleGroup([
    { displayName: 'Github', url: 'https://github.com', lastAccessed: minutesAgo(1) }
  ]);
  TestFramework.assertEqual(groups5.length, 1, '场景5: 1个分组 (Other)');
  TestFramework.assertTrue(groups5[0].isOther, '场景5: 是 Other 分组');

  // --- 场景 6: 排序验证（组内按 lastAccessed 倒序） ---
  const tabs6 = [
    { displayName: 'Mail', url: 'https://mail.qq.com/a', lastAccessed: hoursAgo(3) },
    { displayName: 'Mail', url: 'https://mail.qq.com/b', lastAccessed: minutesAgo(5) },
    { displayName: 'Mail', url: 'https://mail.qq.com/c', lastAccessed: secondsAgo(30) }
  ];
  const groups6 = tc.simpleGroup(tabs6);
  TestFramework.assertEqual(groups6[0].tabs[0].lastAccessed, secondsAgo(30), '场景6: 组内排序 - 最新（30秒前）排在最前');
  TestFramework.assertEqual(groups6[0].tabs[2].lastAccessed, hoursAgo(3), '场景6: 组内排序 - 最旧（3小时前）排在最后');

  // --- 场景 7: 分组间排序（按最新 tab 的 lastAccessed 倒序，Other 始终在最后） ---
  const tabs7 = [
    // 旧 Mail 组
    { displayName: 'Mail', url: 'https://mail.qq.com/a', lastAccessed: hoursAgo(5) },
    { displayName: 'Mail', url: 'https://mail.qq.com/b', lastAccessed: hoursAgo(4) },
    // 新 Docs 组
    { displayName: 'Docs', url: 'https://docs.google.com/a', lastAccessed: secondsAgo(30) },
    { displayName: 'Docs', url: 'https://docs.google.com/b', lastAccessed: minutesAgo(5) },
    // 零散单 tab
    { displayName: 'Github', url: 'https://github.com', lastAccessed: minutesAgo(1) }
  ];
  const groups7 = tc.simpleGroup(tabs7);
  TestFramework.assertEqual(groups7[0].name, 'Docs', '场景7: Docs 组（最新）排在最前');
  TestFramework.assertEqual(groups7[1].name, 'Mail', '场景7: Mail 组排在中间');
  TestFramework.assertTrue(groups7[2].isOther, '场景7: Other 排在最后');
}

// ============================================================
// 模块 7: Todo 功能
// ============================================================
async function runTodoTests() {
  TestFramework.startModule('Todo 功能');

  // --- 场景 1: 添加 Todo ---
  const tc1 = createInstance();
  tc1.addTodoItem({ url: 'https://github.com', title: 'GitHub', favIconUrl: 'icon1.png' });
  TestFramework.assertEqual(tc1.todoList.length, 1, '场景1: 添加后列表有 1 项');
  TestFramework.assertEqual(tc1.todoList[0].url, 'https://github.com', '场景1: URL 正确');
  TestFramework.assertTrue(tc1.todoList[0].addedAt > 0, '场景1: 有时间戳');

  // --- 场景 2: 去重 ---
  tc1.addTodoItem({ url: 'https://github.com', title: 'GitHub 2', favIconUrl: 'icon2.png' });
  TestFramework.assertEqual(tc1.todoList.length, 1, '场景2: 重复 URL 不重复添加（仍为 1 项）');

  // --- 场景 3: 删除 Todo ---
  tc1.addTodoItem({ url: 'https://google.com', title: 'Google' });
  TestFramework.assertEqual(tc1.todoList.length, 2, '场景3: 添加 Google 后有 2 项');
  tc1.removeTodoItem('https://github.com');
  TestFramework.assertEqual(tc1.todoList.length, 1, '场景3: 删除 GitHub 后剩 1 项');
  TestFramework.assertFalse(
    tc1.todoList.some(t => t.url === 'https://github.com'),
    '场景3: 删除的 URL 不在列表中'
  );

  // --- 场景 4: applyTodoToTabs - 标记当前 tab ---
  const tc2 = createInstance([
    createTab(1, 'https://github.com', 'GitHub', minutesAgo(1)),
    createTab(2, 'https://google.com', 'Google', minutesAgo(5))
  ]);
  tc2.addTodoItem({ url: 'https://github.com', title: 'GitHub', favIconUrl: '' });
  await processAll(tc2);
  const githubTab = tc2.tabsData.find(t => t.url === 'https://github.com');
  const googleTab = tc2.tabsData.find(t => t.url === 'https://google.com');
  TestFramework.assertTrue(githubTab && githubTab.inTodo, '场景4: GitHub tab 标记为 Todo');
  TestFramework.assertFalse(googleTab && googleTab.inTodo, '场景4: Google tab 不标记为 Todo');

  // --- 场景 5: 删除不存在的 URL（不报错） ---
  const tc3 = createInstance();
  tc3.addTodoItem({ url: 'https://example.com', title: 'Example' });
  tc3.removeTodoItem('https://non-existent.com');
  TestFramework.assertEqual(tc3.todoList.length, 1, '场景5: 删除不存在项不影响现有数据');
}

// ============================================================
// 模块 8: 重启保留测试 - 核心验证
// ============================================================
async function runTodoPersistenceTests() {
  TestFramework.startModule('Todo 重启保留');

  // 清空 storage
  for (const key in persistentStorage) delete persistentStorage[key];

  // --- 实例 1: 添加 Todo 并保存 ---
  const tc1 = createInstance();
  tc1.addTodoItem({ url: 'https://github.com', title: 'GitHub 仓库', favIconUrl: 'gh.png' });
  tc1.addTodoItem({ url: 'https://docs.google.com', title: 'Google Docs', favIconUrl: 'gd.png' });
  tc1.addTodoItem({ url: 'https://mail.qq.com', title: 'QQ 邮箱', favIconUrl: 'mail.png' });

  // 等待异步保存完成（chrome.storage.local.set 是异步回调）
  await new Promise(resolve => setTimeout(resolve, 20));

  TestFramework.assertEqual(tc1.todoList.length, 3, '实例1: 添加 3 个 Todo');

  // 验证 storage 中存在数据
  TestFramework.assertTrue(
    persistentStorage.todoList !== undefined && persistentStorage.todoList.length === 3,
    '实例1: storage 中持久化了 3 项'
  );

  // 验证每个字段都保存了
  const savedItem = persistentStorage.todoList.find(t => t.url === 'https://github.com');
  TestFramework.assertTrue(savedItem !== undefined, '实例1: GitHub URL 已保存');
  TestFramework.assertEqual(savedItem.title, 'GitHub 仓库', '实例1: title 已保存');
  TestFramework.assertEqual(savedItem.favIconUrl, 'gh.png', '实例1: favIconUrl 已保存');
  TestFramework.assertTrue(savedItem.addedAt > 0, '实例1: addedAt 时间戳已保存');

  // --- 模拟重启 - 实例2: 从 storage 加载 ---
  const tc2 = createInstance();
  await processAll(tc2);

  TestFramework.assertEqual(tc2.todoList.length, 3, '实例2: 重启后仍有 3 个 Todo');

  // 验证内容一致
  const urls = tc2.todoList.map(t => t.url).sort();
  TestFramework.assertEqual(urls[0], 'https://docs.google.com', '实例2: Google Docs URL 保留');
  TestFramework.assertEqual(urls[1], 'https://github.com', '实例2: GitHub URL 保留');
  TestFramework.assertEqual(urls[2], 'https://mail.qq.com', '实例2: QQ 邮箱 URL 保留');

  // 验证 title 也保留了
  const restoredGithub = tc2.todoList.find(t => t.url === 'https://github.com');
  TestFramework.assertEqual(restoredGithub.title, 'GitHub 仓库', '实例2: GitHub title 正确恢复');
  TestFramework.assertEqual(restoredGithub.favIconUrl, 'gh.png', '实例2: GitHub favIconUrl 正确恢复');

  // --- 场景 3: 删除部分后再重启 ---
  tc2.removeTodoItem('https://docs.google.com');
  await new Promise(resolve => setTimeout(resolve, 20));

  const tc3 = createInstance();
  await processAll(tc3);
  TestFramework.assertEqual(tc3.todoList.length, 2, '实例3: 删除 1 项后重启剩 2 项');
  TestFramework.assertFalse(
    tc3.todoList.some(t => t.url === 'https://docs.google.com'),
    '实例3: 删除的 URL 不在列表中'
  );
  TestFramework.assertTrue(
    tc3.todoList.some(t => t.url === 'https://github.com'),
    '实例3: 未删除的 URL 仍然保留'
  );

  // --- 场景 4: 在实例3中添加新 Todo 后重启 ---
  tc3.addTodoItem({ url: 'https://slack.com', title: 'Slack', favIconUrl: 'slack.png' });
  await new Promise(resolve => setTimeout(resolve, 20));
  const tc4 = createInstance();
  await processAll(tc4);
  TestFramework.assertEqual(tc4.todoList.length, 3, '实例4: 新增后重启有 3 项');
  TestFramework.assertTrue(
    tc4.todoList.some(t => t.url === 'https://slack.com'),
    '实例4: 新添加的 Slack URL 也保留'
  );
}

// ============================================================
// 模块 9: getClosingReason - 关闭原因
// ============================================================
function runGetClosingReasonTests() {
  TestFramework.startModule('getClosingReason 关闭原因');
  const tc = new TabClean();

  TestFramework.assertContains(
    tc.getClosingReason({ url: 'https://auth.com/login-success', title: '登录成功', lastAccessed: minutesAgo(1) }),
    '临时', '临时页: 含"临时"关键字'
  );
  TestFramework.assertContains(
    tc.getClosingReason({ url: 'https://auth.com/oauth2/callback', title: '授权完成', lastAccessed: minutesAgo(1) }),
    '临时', 'OAuth2 回调: 含"临时"关键字'
  );
  TestFramework.assertContains(
    tc.getClosingReason({ url: 'about:blank', title: '', lastAccessed: minutesAgo(1) }),
    '临时', '空白页: 含"临时"关键字'
  );

  const oldReason = tc.getClosingReason({ url: 'https://old-site.com', title: '旧网站', lastAccessed: daysAgo(15) });
  TestFramework.assertContains(oldReason, '天未访问', '旧标签: 含"天未访问"关键字');
}

// ============================================================
// 模块 10: 综合场景测试（真实模拟数据）
// ============================================================
async function runIntegrationTests() {
  TestFramework.startModule('综合场景测试');

  // 清空 Todo storage
  for (const key in persistentStorage) delete persistentStorage[key];

  // --- 场景 1: 25 个 tab 完整流程 ---
  const tabs = [
    // 重复项 - GitHub
    createTab(100, 'https://github.com', 'GitHub 主页', minutesAgo(2)),
    createTab(101, 'https://github.com', 'GitHub 主页', hoursAgo(1)),
    createTab(102, 'https://github.com', 'GitHub 主页', hoursAgo(2)),
    // 重复项 - Google 搜索
    createTab(103, 'https://google.com/search?q=test', 'Google 搜索', minutesAgo(5)),
    createTab(104, 'https://google.com/search?q=test', 'Google 搜索', minutesAgo(20)),
    // Mail 分组 - QQ邮箱（同域名多个，非重复URL）
    createTab(105, 'https://mail.qq.com/inbox', 'QQ 邮箱 - 收件箱', minutesAgo(1)),
    createTab(106, 'https://mail.qq.com/sent', 'QQ 邮箱 - 已发送', minutesAgo(30)),
    // 临时页
    createTab(107, 'https://auth.example.com/login-success', '登录成功', minutesAgo(10)),
    createTab(108, 'https://api.service.com/oauth2/callback', 'OAuth 授权完成', minutesAgo(15)),
    // 旧标签
    createTab(109, 'https://old-blog.com/article', '旧博客文章', daysAgo(15)),
    createTab(110, 'https://old-docs.com/guide', '旧文档指南', daysAgo(30)),
    createTab(111, 'about:blank', '', minutesAgo(25)),
    // 正常保留
    createTab(112, 'https://stackoverflow.com/questions/123', 'Stack Overflow - 问题', minutesAgo(3)),
    createTab(113, 'https://mail.google.com/mail', 'Gmail', minutesAgo(1)),
    createTab(114, 'https://www.youtube.com/watch?v=xxx', 'YouTube', minutesAgo(10)),
    createTab(115, 'https://docs.google.com/document/d/1', 'Google Docs', hoursAgo(1)),
    createTab(116, 'https://www.notion.so/Workspace', 'Notion', hoursAgo(2)),
    createTab(117, 'https://developer.mozilla.org/docs', 'MDN 文档', minutesAgo(20)),
    createTab(118, 'https://www.figma.com/file/xxx', 'Figma 设计稿', hoursAgo(3)),
    createTab(119, 'https://www.linkedin.com/feed', 'LinkedIn', hoursAgo(4)),
    // 一些零散单 tab（应进入 Other）
    createTab(120, 'https://news.ycombinator.com', 'HN', minutesAgo(15)),
    createTab(121, 'https://medium.com/article', 'Medium 文章', hoursAgo(5)),
    createTab(122, 'https://dev.to/article', 'DEV 文章', hoursAgo(6))
  ];

  const tc = createInstance(tabs);
  await processAll(tc);

  // 分类验证
  TestFramework.assertEqual(tc.categorizedTabs.duplicateGroups.length, 2, '场景1: 2个重复项分组 (GitHub, Google)');
  TestFramework.assertEqual(tc.categorizedTabs.duplicate.length, 5, '场景1: 5个重复 tab');
  TestFramework.assertEqual(tc.categorizedTabs.close.length, 5, '场景1: 5个可关闭 tab (2临时+2旧+blank)');
  const expectedKeep = tabs.length - 5 - 5; // total - duplicate - close
  TestFramework.assertEqual(tc.categorizedTabs.keep.length, expectedKeep, '场景1: ' + expectedKeep + '个保留 tab');

  // 保留分组验证（同域名 ≥2个 tab 形成独立分组）
  const keepGroups = tc.groupedTabs.keep;
  TestFramework.assertTrue(keepGroups.length > 0, '场景1: 保留有分组');

  // Mail 域名应该形成独立分组（2个）
  const mailGroup = keepGroups.find(g => g.name === 'Mail');
  TestFramework.assertTrue(mailGroup !== undefined && mailGroup.count >= 2, '场景1: Mail 独立分组有 ≥2 tab');

  // Google (Docs + Gmail + YouTube 等各域名不同，不会合并)
  // 验证分组排序：按最新 lastAccessed 倒序，Other 在最后
  const allKeepGroups = keepGroups;
  const lastGroup = allKeepGroups[allKeepGroups.length - 1];
  TestFramework.assertTrue(
    allKeepGroups.length < 2 || lastGroup.isOther || allKeepGroups.every(g => !g.isOther),
    '场景1: Other 在分组最底部（或没有 Other）'
  );

  // --- 场景 2: 加入 Todo 后的验证 ---
  tc.addTodoItem({ url: 'https://github.com', title: 'GitHub 主页', favIconUrl: '' });
  await new Promise(resolve => setTimeout(resolve, 20));
  await processAll(tc);

  const githubInData = tc.tabsData.find(t => t.url === 'https://github.com');
  TestFramework.assertTrue(githubInData && githubInData.inTodo, '场景2: GitHub tab 被正确标记为 Todo');

  // --- 场景 3: 0 重复项 - 一键瘦身之后（模拟） ---
  const tc3 = createInstance([
    createTab(130, 'https://github.com', 'GitHub', minutesAgo(1)),
    createTab(131, 'https://google.com', 'Google', minutesAgo(2))
  ]);
  await processAll(tc3);
  TestFramework.assertEqual(tc3.categorizedTabs.duplicateGroups.length, 0, '场景3: 无重复项时 duplicateGroups 为空');
  TestFramework.assertEqual(tc3.categorizedTabs.keep.length, 2, '场景3: 2个保留 tab');

  // --- 场景 4: 0 Todo（空 Todo 列表不应该显示模块） ---
  for (const key in persistentStorage) delete persistentStorage[key];
  const tc4 = createInstance([
    createTab(140, 'https://example.com', 'Example', minutesAgo(1))
  ]);
  await processAll(tc4);
  TestFramework.assertEqual(tc4.todoList.length, 0, '场景4: 空 Todo 列表');
}

// ============================================================
// 模块 11: 时间辅助函数
// ============================================================
function runTimeHelperTests() {
  TestFramework.startModule('时间辅助函数');
  const tc = new TabClean();

  // isSameDay
  const now2 = new Date();
  const sameDayMorning = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 8, 0, 0);
  const sameDayEvening = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 20, 0, 0);
  const yesterday = new Date(now2); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now2); tomorrow.setDate(tomorrow.getDate() + 1);

  TestFramework.assertTrue(tc.isSameDay(sameDayMorning.getTime(), sameDayEvening.getTime()), '同一天的不同时间 -> 同一天');
  TestFramework.assertFalse(tc.isSameDay(now2.getTime(), yesterday.getTime()), '今天 vs 昨天 -> 不同天');
  TestFramework.assertFalse(tc.isSameDay(now2.getTime(), tomorrow.getTime()), '今天 vs 明天 -> 不同天');

  // getCalendarDaysDiff
  TestFramework.assertEqual(tc.getCalendarDaysDiff(now2, yesterday), 1, '今天 vs 昨天: 差1天');
  TestFramework.assertEqual(tc.getCalendarDaysDiff(now2, new Date(now2.getTime() - 5 * 24 * 3600 * 1000)), 5, '今天 vs 5天前: 差5天');
  TestFramework.assertEqual(tc.getCalendarDaysDiff(now2, now2), 0, '同一天: 差0天');
}

// ============================================================
// 主入口
// ============================================================
async function runAllTests() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Tab Clean - 全流程功能测试报告                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('');

  runExtractDisplayNameTests();
  runGetTimeAgoTests();
  runIsTempPageTests();
  runIsOldTabTests();
  await runCategorizeTabsTests();
  runSimpleGroupTests();
  await runTodoTests();
  await runTodoPersistenceTests();
  runGetClosingReasonTests();
  await runIntegrationTests();
  runTimeHelperTests();

  // 生成各模块报告
  const report = TestFramework.getReport();

  console.log('');
  console.log('═══════════════════  各模块测试结果  ════════════════════');
  console.log('');

  let maxModuleLen = 0;
  for (const name in TestFramework.modules) {
    maxModuleLen = Math.max(maxModuleLen, name.length);
  }

  for (const name in TestFramework.modules) {
    const m = TestFramework.modules[name];
    const status = m.failed === 0 ? '✅' : '❌';
    const statusText = m.failed === 0 ? '全部通过' : m.failed + ' 个失败';
    const padding = ' '.repeat(maxModuleLen - name.length + 2);
    console.log(`  ${status} ${name}${padding} ${m.passed}/${m.total}  (${statusText})`);
  }

  console.log('');
  console.log('══════════════════════  汇总  ══════════════════════════');
  console.log('');
  console.log(`  总测试数: ${report.total}`);
  console.log(`  通过:     ${report.passed}  ✅`);
  console.log(`  失败:     ${report.failed}  ${report.failed > 0 ? '❌' : ''}`);
  console.log(`  通过率:   ${report.passRate}%`);

  if (report.failed > 0) {
    console.log('');
    console.log('═══════════════════  失败详情  ═══════════════════════');
    console.log('');
    TestFramework.failedDetails.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     期望: ${JSON.stringify(f.expected)}`);
      console.log(`     实际: ${JSON.stringify(f.actual)}`);
      console.log('');
    });
  }

  console.log('');
  console.log('═════════════════════════════════════════════════════════');
  console.log(report.failed === 0 ? '🎉 所有测试通过！代码可以放心发布。' : '⚠️ 存在失败用例，请检查上述问题后重新测试。');
  console.log('═════════════════════════════════════════════════════════');
  console.log('');

  return report;
}

runAllTests().catch(err => {
  console.error('\n❌ 测试执行出错:', err.message);
  console.error(err.stack);
  process.exit(1);
});
