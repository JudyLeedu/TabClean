/**
 * Tab Clean - simpleGroup 单元测试
 * 
 * 运行方式: node test-simpleGroup.js
 */

// ============== 从 sidepanel.js 复制 simpleGroup 函数 ==============
function simpleGroup(tabs) {
  const groupMap = new Map();

  tabs.forEach(tab => {
    const name = tab.displayName;
    if (!groupMap.has(name)) {
      groupMap.set(name, []);
    }
    groupMap.get(name).push(tab);
  });

  const groups = [];
  const otherTabs = [];

  groupMap.forEach((groupTabs, name) => {
    if (groupTabs.length >= 2) {
      groups.push({
        name: name,
        tabs: groupTabs,
        isOther: false,
        count: groupTabs.length
      });
    } else {
      otherTabs.push(...groupTabs);
    }
  });

  if (otherTabs.length > 0) {
    groups.push({
      name: 'Other',
      tabs: otherTabs,
      isOther: true,
      count: otherTabs.length
    });
  }

  // 1. 每个分组内的 tab：按 lastAccessed 倒序
  groups.forEach(group => {
    group.tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  });

  // 2. 分组之间：按分组内最新 tab 的 lastAccessed 倒序，Other 固定最后
  groups.sort((a, b) => {
    if (a.isOther && !b.isOther) return 1;
    if (!a.isOther && b.isOther) return -1;
    const maxA = Math.max(...a.tabs.map(t => t.lastAccessed || 0));
    const maxB = Math.max(...b.tabs.map(t => t.lastAccessed || 0));
    return maxB - maxA;
  });

  return groups;
}

// ============== 测试框架 ==============
let passed = 0;
let failed = 0;
let results = [];

function assert(condition, name, detail = '') {
  if (condition) {
    passed++;
    results.push({ name, status: '✓ PASS', detail });
  } else {
    failed++;
    results.push({ name, status: '✗ FAIL', detail });
  }
}

function timeString(label, hoursAgo) {
  const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return `${label}: ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function now() { return Date.now(); }
function hoursAgo(h) { return Date.now() - h * 60 * 60 * 1000; }
function daysAgo(d) { return Date.now() - d * 24 * 60 * 60 * 1000; }

function printBar() { console.log('─'.repeat(70)); }

// ============== 测试数据 ==============
const baseTab = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2, 8),
  displayName: 'Unknown',
  url: 'https://example.com',
  title: '示例页面',
  lastAccessed: Date.now(),
  windowId: 1,
  ...overrides
});

console.log('\n' + '═'.repeat(70));
console.log('🔬 Tab Clean - simpleGroup 排序逻辑 完整测试报告');
console.log('═'.repeat(70));

// ======================== 测试组 1：分组内排序（核心修复）========================
console.log('\n📦 测试组 1：分组内排序（修复的核心问题）');
printBar();

// 测试 1.1：同分组内 4 个 tab，时间交错排列
{
  const tabs = [
    baseTab({ displayName: 'Example.com', title: 'Tab A', lastAccessed: hoursAgo(1) }),  // 1小时前
    baseTab({ displayName: 'Example.com', title: 'Tab B', lastAccessed: hoursAgo(26) }), // 昨天
    baseTab({ displayName: 'Example.com', title: 'Tab C', lastAccessed: hoursAgo(0.1) }), // 6分钟前（最新）
    baseTab({ displayName: 'Example.com', title: 'Tab D', lastAccessed: hoursAgo(5) }),  // 5小时前
  ];

  const groups = simpleGroup(tabs);
  const group = groups.find(g => g.name === 'Example.com');

  const order = group.tabs.map(t => t.title);
  const times = group.tabs.map(t => t.lastAccessed);
  const correctOrder = times.every((t, i) => i === 0 || t <= times[i - 1]);

  assert(correctOrder, '测试 1.1：分组内按 lastAccessed 倒序',
    `期望顺序: Tab C(6分钟前) → Tab A(1h前) → Tab D(5h前) → Tab B(昨天)`);

  if (!correctOrder) {
    console.log('  实际顺序:', order.join(', '));
    console.log('  时间戳: ', times.map(t => `${Math.round((Date.now() - t) / 3600000 * 10) / 10}小时前`).join(', '));
  }
}

// 测试 1.2：同一天内的两个 tab（用户的核心问题）
{
  const tabs = [
    baseTab({ displayName: 'Example.com', title: 'Example Internal Tool', lastAccessed: hoursAgo(6) }),
    baseTab({ displayName: 'Example.com', title: 'Tab Clean V2', lastAccessed: hoursAgo(24) }),
    baseTab({ displayName: 'Example.com', title: 'Project X IDE', lastAccessed: hoursAgo(25) }),
    baseTab({ displayName: 'Example.com', title: 'Tab clean - 文档', lastAccessed: hoursAgo(2) }),
  ];

  const groups = simpleGroup(tabs);
  const group = groups.find(g => g.name === 'Example.com');

  // 验证排序：按 lastAccessed 严格递减
  const isDesc = group.tabs.every((tab, i) =>
    i === 0 || tab.lastAccessed <= group.tabs[i - 1].lastAccessed
  );

  assert(isDesc, '测试 1.2：同一天内的 tab 按实际访问时间倒序',
    `最新的"Tab clean - 文档"应排在最前，最老的"Project X IDE"应在最后`);

  // 额外验证：第一个应是最新访问的
  const firstIsLatest = group.tabs[0].title === 'Tab clean - 文档';
  assert(firstIsLatest, '测试 1.3：最新访问的 tab 在分组第一位',
    `期望第一位是"Tab clean - 文档"，实际是"${group.tabs[0].title}"`);
}

// 测试 1.3：部分 tab 缺少 lastAccessed
{
  const tabs = [
    baseTab({ displayName: 'Example.com', title: 'A-老', lastAccessed: daysAgo(30) }),
    baseTab({ displayName: 'Example.com', title: 'B-无时间', lastAccessed: undefined }),
    baseTab({ displayName: 'Example.com', title: 'C-新', lastAccessed: hoursAgo(0.5) }),
  ];

  const groups = simpleGroup(tabs);
  const group = groups.find(g => g.name === 'Example.com');

  // undefined lastAccessed 会被视为 0，应排到最后
  assert(group.tabs[0].title === 'C-新', '测试 1.4：缺少 lastAccessed 的 tab 排到最后',
    `C-新(30分钟前)应排最前，B-无时间(undefined)应排最后`);

  assert(group.tabs[group.tabs.length - 1].title === 'B-无时间', '测试 1.5：无时间戳的 tab 排在分组末尾',
    `期望最后一位是"B-无时间"，实际是"${group.tabs[group.tabs.length - 1].title}"`);
}

// ======================== 测试组 2：分组之间排序 ========================
console.log('\n📦 测试组 2：分组之间排序（新功能）');
printBar();

// 测试 2.1：两个域名分组，一个最近访问，一个较旧
{
  const tabs = [
    baseTab({ displayName: 'GitHub', title: 'GH-1', lastAccessed: hoursAgo(0.5) }),  // 最近
    baseTab({ displayName: 'GitHub', title: 'GH-2', lastAccessed: hoursAgo(2) }),
    baseTab({ displayName: 'Apple', title: 'AP-1', lastAccessed: daysAgo(3) }),       // 较旧
    baseTab({ displayName: 'Apple', title: 'AP-2', lastAccessed: daysAgo(4) }),
  ];

  const groups = simpleGroup(tabs);
  assert(groups.length === 2, '测试 2.1：正确产生 2 个独立分组',
    `实际 ${groups.length} 个分组: ${groups.map(g => g.name).join(', ')}`);

  assert(groups[0].name === 'GitHub', '测试 2.2：最近访问的域名分组排在最前',
    `GitHub(30分钟前)应排第一，实际第一是"${groups[0].name}"`);

  assert(groups[1].name === 'Apple', '测试 2.3：较旧的域名分组排在后面',
    `Apple(3天前)应排第二，实际第二是"${groups[1].name}"`);
}

// 测试 2.2：三个域名分组，时间交叉
{
  const tabs = [
    baseTab({ displayName: 'ZZZ-Site', title: 'Z-1', lastAccessed: hoursAgo(0.1) }), // 最新
    baseTab({ displayName: 'ZZZ-Site', title: 'Z-2', lastAccessed: hoursAgo(1) }),
    baseTab({ displayName: 'AAA-Site', title: 'A-1', lastAccessed: hoursAgo(2) }),    // 中间
    baseTab({ displayName: 'AAA-Site', title: 'A-2', lastAccessed: hoursAgo(3) }),
    baseTab({ displayName: 'MMM-Site', title: 'M-1', lastAccessed: hoursAgo(10) }),   // 最旧
    baseTab({ displayName: 'MMM-Site', title: 'M-2', lastAccessed: hoursAgo(15) }),
  ];

  const groups = simpleGroup(tabs);

  // 应该按时间倒序，而不是 A-Z
  assert(groups[0].name === 'ZZZ-Site', '测试 2.4：打破字母排序，按时间排序',
    `ZZZ-Site(最新)应排第一，字母序会排到最后，实际是"${groups[0].name}"`);

  assert(groups[1].name === 'AAA-Site', '测试 2.5：中间时间的域名排第二',
    `AAA-Site(2小时前)应排第二，实际第二是"${groups[1].name}"`);

  assert(groups[2].name === 'MMM-Site', '测试 2.6：最旧的域名排第三',
    `MMM-Site应排第三，实际第三是"${groups[2].name}"`);
}

// 测试 2.3：验证 Other 分组的位置（应固定最后）
{
  const tabs = [
    baseTab({ displayName: 'Other', title: 'O1', lastAccessed: hoursAgo(0.05) }), // 单个 tab
    baseTab({ displayName: 'Example.com', title: 'B1', lastAccessed: daysAgo(5) }),  // 较旧的分组
    baseTab({ displayName: 'Example.com', title: 'B2', lastAccessed: daysAgo(6) }),
  ];

  const groups = simpleGroup(tabs);
  const lastGroup = groups[groups.length - 1];

  assert(lastGroup.isOther, '测试 2.7：Other 分组固定在最后',
    `Other分组应在最后(即使它的tab是最新的)，实际最后是"${lastGroup.name}"`);
}

// ======================== 测试组 3：边界情况 ========================
console.log('\n📦 测试组 3：边界与极端情况');
printBar();

// 测试 3.1：单 tab 的域名 → 归入 Other
{
  const tabs = [
    baseTab({ displayName: 'Alone', title: '孤独的 tab', lastAccessed: hoursAgo(1) }),
  ];
  const groups = simpleGroup(tabs);
  assert(groups.length === 1 && groups[0].isOther, '测试 3.1：单 tab 域名归入 Other',
    `期望 1 个 Other 分组，实际 ${groups.length} 个: ${groups.map(g => g.name).join(', ')}`);
}

// 测试 3.2：空输入
{
  const groups = simpleGroup([]);
  assert(groups.length === 0, '测试 3.2：空输入返回空分组',
    `期望 0 个分组，实际 ${groups.length} 个`);
}

// 测试 3.3：全部都是单 tab 域名 → 只有 Other 分组
{
  const tabs = [
    baseTab({ displayName: 'A', title: 'A1', lastAccessed: hoursAgo(1) }),
    baseTab({ displayName: 'B', title: 'B1', lastAccessed: hoursAgo(2) }),
    baseTab({ displayName: 'C', title: 'C1', lastAccessed: hoursAgo(3) }),
  ];
  const groups = simpleGroup(tabs);
  assert(groups.length === 1 && groups[0].isOther, '测试 3.3：全单 tab 域名 → 仅 Other',
    `期望 1 个 Other，实际 ${groups.length} 个: ${groups.map(g => g.name).join(', ')}`);

  // Other 分组内也应该按时间倒序
  const isDesc = groups[0].tabs.every((tab, i) =>
    i === 0 || tab.lastAccessed <= groups[0].tabs[i - 1].lastAccessed
  );
  assert(isDesc, '测试 3.4：Other 分组内也按时间倒序',
    `Other 分组内的 tab 也应按时间排序`);
}

// 测试 3.5：大量 tab 压力测试
{
  const manyTabs = [];
  for (let i = 0; i < 100; i++) {
    manyTabs.push(baseTab({
      displayName: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i % 5],
      title: `Tab-${i}`,
      lastAccessed: Date.now() - (i * 30 * 60 * 1000)  // 每 30 分钟一个
    }));
  }
  const start = Date.now();
  const groups = simpleGroup(manyTabs);
  const elapsed = Date.now() - start;

  assert(groups.length === 5, '测试 3.5：100 个 tab 正确分组为 5',
    `实际 ${groups.length} 个分组`);

  // 验证每个分组内排序
  let allSorted = true;
  groups.forEach(group => {
    group.tabs.forEach((tab, i) => {
      if (i > 0 && tab.lastAccessed > group.tabs[i - 1].lastAccessed) {
        allSorted = false;
      }
    });
  });
  assert(allSorted, '测试 3.6：100 个 tab 所有分组内排序正确',
    `耗时 ${elapsed}ms`);

  assert(elapsed < 100, '测试 3.7：性能测试 - 100 个 tab 耗时 < 100ms',
    `实际耗时 ${elapsed}ms`);
}

// ======================== 测试组 4：与原有功能兼容性 ========================
console.log('\n📦 测试组 4：功能兼容性验证');
printBar();

// 测试 4.1：确保分组数量字段正确
{
  const tabs = [
    baseTab({ displayName: 'A', title: 'A1', lastAccessed: hoursAgo(1) }),
    baseTab({ displayName: 'A', title: 'A2', lastAccessed: hoursAgo(2) }),
    baseTab({ displayName: 'A', title: 'A3', lastAccessed: hoursAgo(3) }),
    baseTab({ displayName: 'B', title: 'B1', lastAccessed: hoursAgo(4) }),
    baseTab({ displayName: 'B', title: 'B2', lastAccessed: hoursAgo(5) }),
    baseTab({ displayName: 'C', title: 'C1', lastAccessed: hoursAgo(6) }),  // 单 tab → Other
  ];
  const groups = simpleGroup(tabs);
  const groupA = groups.find(g => g.name === 'A');
  const groupB = groups.find(g => g.name === 'B');
  const groupOther = groups.find(g => g.isOther);

  assert(groupA && groupA.count === 3 && groupA.tabs.length === 3, '测试 4.1：分组数量正确',
    `A 分组 count=${groupA?.count}, tabs.length=${groupA?.tabs?.length}`);

  assert(groupB && groupB.count === 2 && groupB.tabs.length === 2, '测试 4.2：B 分组数量正确',
    `B 分组 count=${groupB?.count}`);

  assert(groupOther && groupOther.count === 1, '测试 4.3：Other 分组数量正确',
    `Other 分组 count=${groupOther?.count}`);

  // 验证排序：A(1小时前最新) → B(4小时前) → Other
  assert(groups[0].name === 'A' && groups[1].name === 'B' && groups[2].isOther,
    '测试 4.4：分组顺序正确',
    `期望顺序: A → B → Other, 实际: ${groups.map(g => g.name).join(' → ')}`);
}

// 测试 4.2：isOther 标记正确
{
  const tabs = [
    baseTab({ displayName: 'Multi', title: 'M1', lastAccessed: hoursAgo(1) }),
    baseTab({ displayName: 'Multi', title: 'M2', lastAccessed: hoursAgo(2) }),
    baseTab({ displayName: 'Single', title: 'S1', lastAccessed: hoursAgo(3) }),
  ];
  const groups = simpleGroup(tabs);

  const multiGroup = groups.find(g => g.name === 'Multi');
  const otherGroup = groups.find(g => g.name === 'Other');

  assert(multiGroup && multiGroup.isOther === false, '测试 4.5：多 tab 域名 isOther = false',
    `Multi 分组 isOther=${multiGroup?.isOther}`);

  assert(otherGroup && otherGroup.isOther === true, '测试 4.6：Other 分组 isOther = true',
    `Other 分组 isOther=${otherGroup?.isOther}`);
}

// 测试 4.3：lastAccessed 为 0 的边界
{
  const tabs = [
    baseTab({ displayName: 'A', title: '正常 tab', lastAccessed: hoursAgo(1) }),
    baseTab({ displayName: 'A', title: '0 时间戳', lastAccessed: 0 }),
  ];
  const groups = simpleGroup(tabs);
  // lastAccessed=0 会被视为 0，排在最后
  assert(groups[0].tabs[0].title === '正常 tab', '测试 4.7：lastAccessed=0 排到分组最后',
    `正常 tab 应排第一，实际是"${groups[0].tabs[0].title}"`);

  assert(groups[0].tabs[groups[0].tabs.length - 1].title === '0 时间戳', '测试 4.8：lastAccessed=0 在末尾',
    `0 时间戳应在最后，实际最后是"${groups[0].tabs[groups[0].tabs.length - 1].title}"`);
}

// ======================== 总结报告 ========================
console.log('\n' + '═'.repeat(70));
console.log('📊 测试总结报告');
console.log('═'.repeat(70));

results.forEach(r => {
  const icon = r.status.includes('PASS') ? '✅' : '❌';
  console.log(`${icon} ${r.name}`);
  if (r.detail && r.status.includes('FAIL')) {
    console.log(`   └─ ${r.detail}`);
  }
});

console.log('\n' + '─'.repeat(70));
console.log(`📈 总计: ${passed + failed} 个测试 | ✅ 通过: ${passed} | ❌ 失败: ${failed}`);
console.log('─'.repeat(70));

if (failed === 0) {
  console.log('\n🎉 所有测试通过！simpleGroup 排序逻辑正确。\n');
  process.exit(0);
} else {
  console.log('\n⚠️  有测试失败，请检查代码逻辑。\n');
  process.exit(1);
}
