/**
 * Tab Clean - Todo 重启保留测试
 *
 * 测试场景：
 *   1. 第一次打开扩展 → 添加 3 个 Todo → 保存到 storage
 *   2. 模拟关闭浏览器（销毁实例，保留 storage 数据）
 *   3. 第二次打开扩展（模拟重启）→ 验证 Todo 数据保留
 */

// ============================================================
// 模拟浏览器环境
// ============================================================

// 模拟持久化的 storage（跨实例保留）
const persistentStorage = {};

// 模拟 DOM 元素
function createMockElement() {
  return {
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    appendChild: () => {},
    insertBefore: () => {},
    parentNode: null,
    textContent: '',
    innerHTML: '',
    dataset: {},
    addEventListener: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    closest: () => null,
    getAttribute: () => null,
    setAttribute: () => {}
  };
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
// 模拟 chrome.storage.local（使用持久化的内存对象）
// ============================================================
global.chrome = {
  storage: {
    local: {
      get: function(keys, callback) {
        try {
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach(key => {
              if (persistentStorage[key] !== undefined) {
                result[key] = persistentStorage[key];
              }
            });
          }
          // 模拟异步回调（和真实 Chrome API 一样的行为）
          setTimeout(() => {
            callback && callback(result);
          }, 0);
        } catch (err) {
          setTimeout(() => callback && callback({}), 0);
        }
      },
      set: function(items, callback) {
        try {
          for (const key in items) {
            persistentStorage[key] = items[key];
          }
          setTimeout(() => {
            callback && callback();
          }, 0);
        } catch (err) {
          setTimeout(() => callback && callback(), 0);
        }
      }
    }
  },
  windows: {
    getAll: function(options) {
      return Promise.resolve([{
        id: 1,
        tabs: [
          { id: 1, title: 'GitHub', url: 'https://github.com', favIconUrl: '', lastAccessed: Date.now() - 60000, windowId: 1 },
          { id: 2, title: 'Google', url: 'https://google.com', favIconUrl: '', lastAccessed: Date.now() - 120000, windowId: 1 },
          { id: 3, title: 'Bilibili', url: 'https://bilibili.com', favIconUrl: '', lastAccessed: Date.now() - 180000, windowId: 1 }
        ]
      }]);
    }
  },
  tabs: {
    remove: () => Promise.resolve(),
    update: () => Promise.resolve()
  },
  runtime: { lastError: null }
};

// ============================================================
// 读取并执行 sidepanel.js
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sidepanelCode = fs.readFileSync(
  path.join(__dirname, 'sidepanel.js'),
  'utf-8'
);
vm.runInThisContext(sidepanelCode);

// ============================================================
// 测试工具函数
// ============================================================
let pass = 0, fail = 0;
function assert(condition, name, expected, actual) {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
    console.log(`     期望: ${JSON.stringify(expected)}`);
    console.log(`     实际: ${JSON.stringify(actual)}`);
  }
}

// 因为 TabClean 的 init 是异步的（setTimeout 2.5秒），
// 我们直接调用核心方法来测试，不经过 init
function createInstance() {
  const tc = new TabClean();
  // 重置实例内部状态（构造函数会调用 init，我们绕过它）
  tc.tabsData = [];
  tc.todoList = [];
  tc.categorizedTabs = { duplicate: [], keep: [], close: [] };
  return tc;
}

// ============================================================
// 测试开始
// ============================================================
async function runTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Todo 重启保留测试');
  console.log('='.repeat(60));

  // --- 阶段 1: 第一次打开浏览器 ---
  console.log('\n📌 阶段 1: 第一次打开扩展');
  const tc1 = createInstance();

  // 从空 storage 加载（模拟首次打开）
  await tc1.loadTodoFromStorage();
  console.log(`  加载后 Todo 数量: ${tc1.todoList.length}`);
  assert(tc1.todoList.length === 0, '首次打开: Todo 列表为空', 0, tc1.todoList.length);

  // 添加 3 个 Todo
  tc1.addTodoItem({ url: 'https://github.com', title: 'GitHub 项目主页', favIconUrl: 'gh.png' });
  tc1.addTodoItem({ url: 'https://google.com/docs', title: 'Google Docs', favIconUrl: 'g.png' });
  tc1.addTodoItem({ url: 'https://bilibili.com/video', title: 'Bilibili - 开发者大会', favIconUrl: 'b.png' });
  console.log(`  添加后 Todo 数量: ${tc1.todoList.length}`);
  assert(tc1.todoList.length === 3, '添加后: Todo 列表有 3 项', 3, tc1.todoList.length);

  // 等待 storage 异步保存完成
  await new Promise(resolve => setTimeout(resolve, 50));
  console.log(`  已保存到 storage`);

  // 检查 storage 中确实有数据
  const saved = persistentStorage.todoList;
  console.log(`  storage 中 Todo 数量: ${saved ? saved.length : '无数据'}`);
  assert(saved && saved.length === 3, 'storage 中保存了 3 项', 3, saved ? saved.length : 0);

  // --- 阶段 2: 模拟关闭浏览器 ---
  console.log('\n📌 阶段 2: 关闭浏览器（销毁实例，storage 保留）');
  console.log(`  销毁实例 tc1`);
  // 不清理 persistentStorage，模拟浏览器关闭但不卸载扩展
  const storageSnapshot = JSON.parse(JSON.stringify(persistentStorage));
  console.log(`  storage 快照: ${storageSnapshot.todoList.length} 项已持久化`);

  // --- 阶段 3: 模拟重启浏览器 ---
  console.log('\n📌 阶段 3: 重启浏览器，第二次打开扩展');
  const tc2 = createInstance();

  // 从 storage 加载（和真实场景一样的异步加载）
  console.log(`  调用 loadTodoFromStorage() 从 storage 恢复...`);
  await tc2.loadTodoFromStorage();
  console.log(`  加载完成后 Todo 数量: ${tc2.todoList.length}`);

  // 关键断言：重启后 Todo 数据应保留
  assert(tc2.todoList.length === 3, '重启后: Todo 列表仍有 3 项', 3, tc2.todoList.length);

  // 检查内容是否一致
  const urls1 = saved.map(i => i.url).sort();
  const urls2 = tc2.todoList.map(i => i.url).sort();
  const urlsMatch = JSON.stringify(urls1) === JSON.stringify(urls2);
  assert(urlsMatch, '重启后: URL 完全一致', urls1, urls2);

  // 检查标题是否保留
  const titlesMatch = saved[0].title === tc2.todoList.find(i => i.url === saved[0].url).title;
  assert(titlesMatch, '重启后: 标题内容一致', saved[0].title, tc2.todoList.find(i => i.url === saved[0].url)?.title);

  // 检查 favIconUrl 是否保留
  const iconsMatch = saved[0].favIconUrl === tc2.todoList.find(i => i.url === saved[0].url).favIconUrl;
  assert(iconsMatch, '重启后: favIconUrl 一致', saved[0].favIconUrl, tc2.todoList.find(i => i.url === saved[0].url)?.favIconUrl);

  // --- 阶段 4: 测试 Todo 标记正确应用到 tabs ---
  console.log('\n📌 阶段 4: Todo 标记正确应用到当前 tabs');
  // 模拟 processTabs 的流程：建立 tabsData → 加载 Todo → 应用标记
  tc2.tabs = [
    { id: 1, title: 'GitHub', url: 'https://github.com', favIconUrl: '', lastAccessed: Date.now(), windowId: 1 }
  ];
  tc2.tabs.forEach(tab => {
    tc2.tabsData.push({
      id: tab.id, title: tab.title, url: tab.url,
      favIconUrl: tab.favIconUrl, lastAccessed: tab.lastAccessed,
      displayName: tc2.extractDisplayName(tab.url), category: null,
      inTodo: false, todoAddedAt: null, windowId: tab.windowId
    });
  });
  tc2.applyTodoToTabs();
  const githubTab = tc2.tabsData.find(t => t.url === 'https://github.com');
  assert(githubTab && githubTab.inTodo === true, '已加入 Todo 的 tab: inTodo = true', true, githubTab ? githubTab.inTodo : null);

  // --- 阶段 5: 测试新增/删除后重启仍然保留 ---
  console.log('\n📌 阶段 5: 测试删除部分 Todo 后重启');
  // 从 tc2 删除 1 项
  tc2.removeTodoItem('https://google.com/docs');
  await new Promise(resolve => setTimeout(resolve, 50));
  assert(tc2.todoList.length === 2, '删除1项后: 剩余 2 项', 2, tc2.todoList.length);

  // 模拟再次重启
  const tc3 = createInstance();
  await tc3.loadTodoFromStorage();
  assert(tc3.todoList.length === 2, '再次重启后: 剩余 2 项', 2, tc3.todoList.length);
  const removedUrl = tc3.todoList.some(i => i.url === 'https://google.com/docs');
  assert(removedUrl === false, '被删除的 URL 确实不在列表中', false, removedUrl);
  const keptUrl = tc3.todoList.some(i => i.url === 'https://github.com');
  assert(keptUrl === true, '未删除的 URL 仍然保留', true, keptUrl);

  // ============================================================
  // 总结
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log(`📊 测试结果: ${pass} 通过 / ${fail} 失败`);
  console.log('='.repeat(60));

  if (fail === 0) {
    console.log('\n✅ 所有测试通过！Todo 数据在浏览器重启后正确保留。\n');
    process.exit(0);
  } else {
    console.log('\n❌ 有测试失败，请检查上述失败用例。\n');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('\n❌ 测试执行出错:', err.message);
  console.error(err.stack);
  process.exit(1);
});
