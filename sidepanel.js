/**
 * Tab Clean - 核心业务逻辑
 * 模块 1：基础框架 - 数据结构 + 工具函数
 */

class TabClean {
  constructor() {
    // 全局数据
    this.tabsData = [];           // 所有 tab 的完整数据
    this.todoList = [];           // Todo 列表
    this.categorizedTabs = {      // 分类后的 tab
      duplicate: [],              // 重复项
      keep: [],                   // 先保留
      close: []                   // 可关闭
    };
    
    // 初始化
    this.init();
  }

  async init() {
    // 每次打开插件时显示加载页（仅一次）
    this.showLoadingPage();
    
    // 加载动画结束后，显示结果页
    setTimeout(async () => {
      await this.loadTabs();
      await this.processTabs();
      this.renderResultPage();
      this.showResultPage();
      this.bindEvents();
    }, 2500);
  }

  /** 页面切换 */
  showLoadingPage() {
    document.getElementById('loading-page').classList.add('active');
    document.getElementById('result-page').classList.remove('active');
  }

  showResultPage() {
    document.getElementById('loading-page').classList.remove('active');
    document.getElementById('result-page').classList.add('active');
  }

  /** 加载 Tab 数据 */
  async loadTabs() {
    // 使用 Chrome API 或模拟数据
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // 真实环境 - 获取所有窗口（包括无痕）
      try {
        const windows = await chrome.windows.getAll({ populate: true });
        this.tabs = [];
        windows.forEach(win => {
          win.tabs.forEach(tab => {
            tab.windowId = win.id;
            this.tabs.push(tab);
          });
        });
      } catch (err) {
        console.error('加载 tabs 失败:', err);
        this.tabs = [];
      }
    } else {
      // 本地调试环境 - 使用模拟数据
      this.tabs = window.getMockTabs ? window.getMockTabs() : [];
    }
  }

  /** ============================================
   *  模块 1：核心工具函数
   *  ============================================ */

  /**
   * 域名萃取函数
   * 规则：
   * 1. 移除 www. 前缀
   * 2. 剥离所有通用顶级域名后缀
   * 3. 保留剥离后完整剩余部分
   * 4. 首字母大写作为显示名称
   * 
   * 特殊协议：chrome://、chrome-extension:// 等归为 Other
   */
  extractDisplayName(url) {
    if (!url) return 'Other';
    
    try {
      // 特殊协议处理
      if (url.startsWith('chrome://') || 
          url.startsWith('chrome-extension://') ||
          url.startsWith('about:') ||
          url.startsWith('file://') ||
          url.startsWith('data:')) {
        return 'Other';
      }
      
      // 解析 URL
      const urlObj = new URL(url);
      let hostname = urlObj.hostname;
      
      // 移除 www. 前缀
      if (hostname.startsWith('www.')) {
        hostname = hostname.slice(4);
      }
      
      // 如果没有 hostname（某些特殊情况）
      if (!hostname) return 'Other';
      
      // 通用顶级域名列表（后缀）
      const tlds = [
        '.com', '.net', '.io', '.cn', '.co', '.dev', '.app',
        '.org', '.info', '.biz', '.xyz', '.club', '.online',
        '.site', '.top', '.tech', '.store', '.shop', '.me',
        '.tv', '.cc', '.name', '.pro', '.edu', '.gov', '.mil',
        '.int', '.eu', '.de', '.uk', '.fr', '.jp', '.kr',
        '.ru', '.br', '.in', '.au', '.ca'
      ];
      
      // 剥离后缀
      let strippedName = hostname;
      tlds.forEach(tld => {
        if (strippedName.endsWith(tld)) {
          strippedName = strippedName.slice(0, -tld.length);
        }
      });
      
      // 如果剥离后为空（可能只包含域名后缀，如 google.com）
      if (!strippedName) {
        // 尝试只取第一段
        const parts = hostname.split('.');
        strippedName = parts[0] || 'Unknown';
      }
      
      // 取第一段作为显示名（根据您的建议）
      // mail.qq.com -> Mail
      const displayParts = strippedName.split('.');
      let displayName = displayParts[0] || strippedName;
      
      // 如果只有后缀或特殊情况
      if (!displayName || displayName === '') {
        displayName = 'Unknown';
      }
      
      // 首字母大写
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
      
      return displayName;
      
    } catch (err) {
      console.error('域名萃取失败:', err, url);
      return 'Other';
    }
  }

  /**
   * 时间显示函数
   * 规则（根据您提供的例子）：
   * 现在是 2026-06-12 15:00:00
   *   - 2026-06-12 14:59:00 加入 → 刚刚（30秒内）
   *   - 2026-06-12 00:00:00 加入 → 今天
   *   - 2026-06-11 23:59:00 加入 → 1天前
   *   - 2026-06-11 00:00:00 加入 → 1天前
   *   - 2026-06-10 15:00:00 加入 → 2天前
   *   - 2026-06-08 15:00:00 加入 → 4天前
   * 
   * 判断逻辑：
   * - 30 秒内：刚刚
   * - 同一天内：今天
   * - 其他：计算日历天数差 + "天前"
   */
  getTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const t = new Date(timestamp);
    const diffSeconds = Math.floor((now - t) / 1000);
    
    // 30 秒内
    if (diffSeconds <= 30) {
      return '刚刚';
    }
    
    // 判断是否在同一天
    const isSameDay = this.isSameDay(now, t);
    if (isSameDay) {
      return '今天';
    }
    
    // 计算日历天数差
    const daysDiff = this.getCalendarDaysDiff(now, t);
    if (daysDiff <= 0) {
      return '今天';
    }
    if (daysDiff === 1) {
      return '昨天';
    }
    
    return `${daysDiff}天前`;
  }

  /** 判断两个日期是否为同一天（支持 Date 对象或 timestamp） */
  isSameDay(d1, d2) {
    const date1 = d1 instanceof Date ? d1 : new Date(d1);
    const date2 = d2 instanceof Date ? d2 : new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /** 计算两个日期的日历天数差（支持 Date 对象或 timestamp） */
  getCalendarDaysDiff(d1, d2) {
    const date1 = d1 instanceof Date ? d1 : new Date(d1);
    const date2 = d2 instanceof Date ? d2 : new Date(d2);
    const normalized1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const normalized2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    const diffTime = Math.abs(normalized1 - normalized2);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * 临时页判断函数
   * 判断依据：URL 或 title 中包含以下关键词
   * 关键词：login-success、redirect-done、auth/callback、oauth2、signin-success、auth-success
   * 特殊处理：空白页
   */
  isTempPage(url, title) {
    if (!url && !title) return false;
    
    const tempKeywords = [
      'login-success', 'loginsuccess', 'login success',
      'redirect-done', 'redirectdone', 'redirect',
      'auth/callback', 'authcallback',
      'oauth2', 'oauth',
      'signin-success', 'signinsuccess', 'signin success',
      'auth-success', 'authsuccess',
      'callback'
    ];
    
    const urlLower = (url || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();
    
    // 检查关键词
    for (const keyword of tempKeywords) {
      const kLower = keyword.toLowerCase();
      if (urlLower.includes(kLower) || titleLower.includes(kLower)) {
        return true;
      }
    }
    
    // 空白页判断
    const blankKeywords = ['blank', '空白', 'newtab', 'new tab', 'new page'];
    for (const keyword of blankKeywords) {
      if (urlLower.includes(keyword) || titleLower.includes(keyword)) {
        return true;
      }
    }
    
    // about:blank
    if (urlLower === 'about:blank') {
      return true;
    }
    
    return false;
  }

  /**
   * 7天以上未访问判断
   * 使用日历天数差（与 getTimeAgo 逻辑一致）
   */
  isOldTab(lastAccessed, days = 7) {
    if (!lastAccessed) return false;
    
    const daysDiff = this.getCalendarDaysDiff(Date.now(), lastAccessed);
    return daysDiff > days;
  }

  /** 获取 tab 的时间戳（用于分组内排序） */
  getTabTimestamp(tab) {
    // 优先用 lastAccessed
    if (tab.lastAccessed) return tab.lastAccessed;
    
    // 如果没有（某些老的 tab），用当前时间 - 1小时作为估计值
    return Date.now() - 3600 * 1000;
  }

  /** ============================================
   *  模块 2：Tab 数据处理
   *  ============================================ */

  /** 处理 Tab 数据 - 建立完整数据结构（异步，确保 Todo 加载完成） */
  async processTabs() {
    this.tabsData = [];
    
    // 1. 建立基础数据结构
    this.tabs.forEach(tab => {
      const displayName = this.extractDisplayName(tab.url);
      const lastAccessed = tab.lastAccessed || tab.lastActivity || Date.now();
      
      this.tabsData.push({
        id: tab.id,
        title: tab.title || tab.url || '无标题页',
        url: tab.url,
        favIconUrl: tab.favIconUrl || '',
        lastAccessed: lastAccessed,
        displayName: displayName,
        category: null,           // 后续分类：duplicate/keep/close
        inTodo: false,            // 是否在 Todo
        todoAddedAt: null,        // 加入 Todo 时间
        windowId: tab.windowId || null
      });
    });
    
    // 2. 检查 Todo（从 storage 加载，await 确保加载完成）
    await this.loadTodoFromStorage();
    
    // 3. 应用 Todo 标记
    this.applyTodoToTabs();
    
    // 4. 分类（模块 2 的内容，先占位）
    this.categorizeTabs();
    
    // 5. 分组排序（模块 3 的内容，先占位）
    this.groupAndSort();
    
    console.log('[模块1] 处理后的 tab 数据:', this.tabsData.length, '个');
    console.log('[模块1] 分类结果:', this.categorizedTabs);
  }

  /** 从 Storage 加载 Todo（异步，返回 Promise，确保加载完成后再渲染） */
  async loadTodoFromStorage() {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['todoList'], (result) => {
            this.todoList = result.todoList || [];
            console.log('[模块1] 从 storage 加载 Todo:', this.todoList.length);
            resolve();
          });
        } else {
          // 本地调试用 localStorage
          const saved = localStorage.getItem('tabclean_todolist');
          this.todoList = saved ? JSON.parse(saved) : [];
          console.log('[模块1] 从 localStorage 加载 Todo:', this.todoList.length);
          resolve();
        }
      } catch (err) {
        console.error('[模块1] 加载 Todo 失败:', err);
        this.todoList = [];
        resolve();
      }
    });
  }

  /** 将 Todo 标记应用到 tabsData */
  applyTodoToTabs() {
    const todoUrls = new Set(this.todoList.map(item => item.url));
    const todoMap = new Map();
    this.todoList.forEach(item => {
      todoMap.set(item.url, item);
    });
    
    this.tabsData.forEach(tab => {
      if (todoUrls.has(tab.url)) {
        tab.inTodo = true;
        const todoItem = todoMap.get(tab.url);
        tab.todoAddedAt = todoItem ? todoItem.addedAt : Date.now();
      }
    });
  }

  /** ============================================
   *  模块 2、3 占位方法（后续模块实现）
   *  ============================================ */

  /** 分类 - 模块 2 实现 */
  categorizeTabs() {
    // 按 URL 完全匹配分组
    const urlMap = new Map();
    
    this.tabsData.forEach(tab => {
      const key = tab.url;
      if (!urlMap.has(key)) {
        urlMap.set(key, []);
      }
      urlMap.get(key).push(tab);
    });
    
    // 分类
    this.categorizedTabs = {
      duplicate: [],         // 单 tab 列表
      duplicateGroups: [],  // 聚合后的重复项分组
      keep: [],
      close: []
    };
    
    // 聚合重复项分组
    const duplicateGroupList = [];
    
    urlMap.forEach((tabs, url) => {
      if (tabs.length >= 2) {
        // 同 URL ≥ 2 个 → 重复项（同时聚合
        duplicateGroupList.push({
          url: url,
          title: tabs[0].title,
          displayName: tabs[0].displayName,
          count: tabs.length,
          tabs: tabs,
          lastAccessed: Math.max(...tabs.map(t => t.lastAccessed || 0))
        });
        
        // 同时保存单 tab 列表
        tabs.forEach(tab => {
          tab.category = 'duplicate';
          this.categorizedTabs.duplicate.push(tab);
        });
      } else {
        // 单 URL → 按规则判断
        const tab = tabs[0];
        if (this.isTempPage(tab.url, tab.title) || this.isOldTab(tab.lastAccessed)) {
          tab.category = 'close';
          this.categorizedTabs.close.push(tab);
        } else {
          tab.category = 'keep';
          this.categorizedTabs.keep.push(tab);
        }
      }
    });
    
    // 按重复次数降序排列
    duplicateGroupList.sort((a, b) => b.count - a.count);
    this.categorizedTabs.duplicateGroups = duplicateGroupList;
    
    console.log('[重复项分组数量:', duplicateGroupList.length, '个分组');
    console.log('[分类结果:', {
      duplicate: this.categorizedTabs.duplicate.length,
      keep: this.categorizedTabs.keep.length,
      close: this.categorizedTabs.close.length
    });
  }

  /** 分组排序 - 模块 3 实现 */
  groupAndSort() {
    // 简单版本 - 后续模块详细实现
    this.groupedTabs = {
      duplicate: this.simpleGroup(this.categorizedTabs.duplicate),
      keep: this.simpleGroup(this.categorizedTabs.keep),
      close: this.simpleGroup(this.categorizedTabs.close)
    };
    console.log('[模块1-预览] 分组结果:', this.groupedTabs);
  }

  /** 简单分组（模块 3 的简化版本） */
  simpleGroup(tabs) {
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
    
    // 1. 每个分组内的 tab：按 lastAccessed 倒序（最近访问的在最上面）
    groups.forEach(group => {
      group.tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    });
    
    // 2. 分组之间：按分组内最新 tab 的 lastAccessed 倒序
    //    Other 分组固定在最底部
    groups.sort((a, b) => {
      if (a.isOther && !b.isOther) return 1;
      if (!a.isOther && b.isOther) return -1;
      const maxA = Math.max(...a.tabs.map(t => t.lastAccessed || 0));
      const maxB = Math.max(...b.tabs.map(t => t.lastAccessed || 0));
      return maxB - maxA;
    });
    
    return groups;
  }

  /** ============================================
   *  渲染和事件（模块 4-7，后续模块实现）
   *  ============================================ */

  renderResultPage() {
    const totalCount = this.tabsData.length;
    // 用聚合分组数量判断（重复项按分组统计，更准确）
    const dupGroupCount = (this.categorizedTabs.duplicateGroups || []).length;
    const dupCount = dupGroupCount > 0 ? this.categorizedTabs.duplicate.length : 0;
    const keepCount = this.categorizedTabs.keep.length;
    const closeCount = this.categorizedTabs.close.length;
    
    console.log('[渲染] 统计:', {
      total: totalCount,
      duplicateGroups: dupGroupCount,
      duplicateTabs: this.categorizedTabs.duplicate.length,
      keep: keepCount,
      close: closeCount
    });
    
    // 1. 更新标题和统计数字
    const summaryEl = document.getElementById('result-summary');
    if (summaryEl) {
      summaryEl.textContent = `本次扫描出 ${totalCount} 个 tab`;
    }
    
    // 更新统计数字和显示状态
    this.updateStatButton('stat-btn-all', 'stat-total', totalCount);
    // 只有有重复项分组时才显示
    this.updateStatButton('stat-btn-duplicates', 'stat-duplicate', this.categorizedTabs.duplicate.length, dupGroupCount > 0);
    this.updateStatButton('stat-btn-keep', 'stat-keep', keepCount, keepCount > 0);
    this.updateStatButton('stat-btn-close', 'stat-close', closeCount, closeCount > 0);
    
    // 2. 渲染重复项（有分组时才显示）
    this.renderDuplicates();
    
    // 3. 渲染先保留
    this.renderKeep();
    
    // 4. 渲染可关闭
    this.renderClose();
    
    // 5. 渲染 Todo
    this.renderTodo();
  }
  
  /**
   * 辅助方法：更新统计按钮的数字和显示状态
   */
  updateStatButton(btnId, numId, count, show = true) {
    // 更新数字
    const numEl = document.getElementById(numId);
    if (numEl) {
      numEl.textContent = count;
    }
    
    // 控制按钮显示
    const btnEl = document.getElementById(btnId);
    if (btnEl) {
      if (show) {
        btnEl.style.display = ''; // 显示（使用默认样式）
      } else {
        btnEl.style.display = 'none'; // 隐藏
      }
    }
  }
  
  renderDuplicates() {
    const section = document.getElementById('duplicates-section');
    const container = document.getElementById('duplicates-container');
    if (!container || !section) return;
    
    const groups = this.categorizedTabs.duplicateGroups || [];
    
    if (groups.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = '';
    
    let html = '<div style="padding:8px 0;">';
    
    groups.forEach((group, idx) => {
      const firstChar = (group.displayName || group.title || '?').charAt(0).toUpperCase();
      const groupColors = [
        { bg: '#e8f0ff', text: '#4a6fff' },
        { bg: '#fff4e8', text: '#ff9944' },
        { bg: '#e8f7e8', text: '#44cc44' },
        { bg: '#ffe8e8', text: '#ff4444' },
        { bg: '#f0e8ff', text: '#8844ff' },
        { bg: '#e8ffff', text: '#44cccc' }
      ];
      const colorStyle = groupColors[idx % groupColors.length];
      
      html += `
        <div class="duplicate-group-card" 
             title="${group.url}"
             data-url="${group.url}"
             data-tab-id="${group.tabs[0].id}"
             data-window-id="${group.tabs[0].windowId || ''}">
          <div class="duplicate-group-icon" style="background:${colorStyle.bg};color:${colorStyle.text};">
            ${firstChar}
          </div>
          <div class="duplicate-group-content">
            <div class="duplicate-group-title">${group.title}</div>
            <div class="duplicate-group-reason">共 ${group.count} 个重复标签页，瘦身保留最近打开 1 个，并回流到原分类</div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  renderKeep() {
    const section = document.getElementById('keep-section');
    const container = document.getElementById('keep-container');
    if (!container || !section) return;
    
    if (this.categorizedTabs.keep.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = '';
    
    // 按域名分组
    const groups = this.simpleGroup(this.categorizedTabs.keep);
    
    let html = '<div style="padding:8px 0;">';
    
    // 判断是否只有 Other 分组（所有域名都只有1个tab）
    const onlyOther = groups.length === 1 && groups[0].isOther;
    
    groups.forEach((group, groupIdx) => {
      const groupId = `keep-group-${groupIdx}`;
      
      // 如果只有 Other 分组，不显示分组标题（平铺展示）
      if (!onlyOther) {
        html += `
          <div class="tab-group-header" data-group-id="${groupId}" data-collapsed="false">
            <div class="tab-group-icon" style="background:#e8f0ff;color:#4a6fff;">${group.name.charAt(0).toUpperCase()}</div>
            <div class="tab-group-info">
              <span class="tab-group-name">${group.name}</span>
              <span class="tab-group-count">${group.count} 个 tab</span>
            </div>
            <div class="tab-group-toggle" onclick="event.stopPropagation();this.closest('.tab-group-header').click();">▼</div>
          </div>
          <div class="tab-group-content" id="${groupId}-content">
        `;
      }
      
      group.tabs.forEach(tab => {
        const isInTodo = this.todoList.some(item => item.url === tab.url);
        const todoBtnText = isInTodo ? '已加入' : '加入 todo';
        const todoBtnClass = isInTodo ? 'add-todo-btn added' : 'add-todo-btn';
        
        // 计算时间显示（与 Todo 模块一致）
        const timeAgo = this.getTimeAgo(tab.lastAccessed);
        
        const firstChar = (tab.displayName || tab.title || '?').charAt(0).toUpperCase();
        const groupColors = [
          { bg: '#e8f0ff', text: '#4a6fff' },
          { bg: '#ffe8e8', text: '#ff6b6b' },
          { bg: '#e8ffe8', text: '#44cc44' },
          { bg: '#fff4e8', text: '#ff9944' },
          { bg: '#f0e8ff', text: '#8844ff' }
        ];
        const colorIdx = tab.displayName ? tab.displayName.charCodeAt(0) % groupColors.length : 0;
        const colorStyle = groupColors[colorIdx];
        
        // 优先使用真实 favicon，回退到首字母图标
        const iconHtml = tab.favIconUrl ? 
          `<img class="tab-favicon" src="${tab.favIconUrl}" alt="${firstChar}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />` : 
          '';
        
        html += `
          <div class="tab-card keep-card" data-tab-id="${tab.id}" data-url="${tab.url}" data-window-id="${tab.windowId || ''}">
            <div class="tab-checkbox-wrap">
              <input type="checkbox" 
                     class="tab-close-checkbox"
                     data-tab-id="${tab.id}"
                     data-url="${tab.url}"
                     title="点击即可关闭该 tab"/>
            </div>
            <div class="tab-icon-container">
              ${iconHtml}
              <div class="tab-icon" style="background:${colorStyle.bg};color:${colorStyle.text};">${firstChar}</div>
            </div>
            <div class="tab-content" title="${tab.url}">
              <div class="tab-title">${tab.title}</div>
              <div class="tab-time-ago">${timeAgo}</div>
            </div>
            <div class="tab-actions">
              <button class="${todoBtnClass}"
                      data-url="${tab.url}"
                      data-title="${tab.title}"
                      data-favicon-url="${tab.favIconUrl || ''}"
                      data-action="add-todo"
                      ${isInTodo ? 'disabled' : ''}>
                ${todoBtnText}
              </button>
            </div>
          </div>
        `;
      });
      
      if (!onlyOther) {
        html += '</div>';
      }
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    this.bindSingleTabCloseEvents('keep-container');
    this.bindAddTodoEvents('keep-container');
    this.bindGroupCollapseEvents('keep-container');
  }
  
  renderClose() {
    const section = document.getElementById('close-section');
    const container = document.getElementById('close-container');
    if (!container || !section) return;
    
    // 如果没有可关闭的 tab，隐藏整个模块
    if (this.categorizedTabs.close.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    // 有数据时，显示模块
    section.style.display = '';
    
    // 按 lastAccessed 倒序排序（最近打开的在前）
    const sortedTabs = [...this.categorizedTabs.close].sort((a, b) => 
      (b.lastAccessed || 0) - (a.lastAccessed || 0)
    );
    
    let html = '<div style="padding:8px 0;">';
    
    sortedTabs.forEach(tab => {
      const isInTodo = this.todoList.some(item => item.url === tab.url);
      const todoBtnText = isInTodo ? '已加入' : '加入 todo';
      const todoBtnClass = isInTodo ? 'add-todo-btn added' : 'add-todo-btn';
      
      // 获取首字母和颜色
      const firstChar = (tab.displayName || tab.title || '?').charAt(0).toUpperCase();
      const groupColors = [
        { bg: '#ffe8e8', text: '#ff6b6b' },
        { bg: '#ffe8e8', text: '#ff876b' },
        { bg: '#ffe8e8', text: '#ff9944' },
        { bg: '#ffe8e8', text: '#ffaa33' }
      ];
      const colorIdx = tab.displayName ? tab.displayName.charCodeAt(0) % groupColors.length : 0;
      const colorStyle = groupColors[colorIdx];
      
      // 获取时间显示（与 Todo 模块一致）
      const timeAgo = this.getTimeAgo(tab.lastAccessed);
      const closingReason = this.getClosingReason(tab);
      
      // 优先使用真实 favicon，回退到首字母图标
      const iconHtml = tab.favIconUrl ? 
        `<img class="tab-favicon" src="${tab.favIconUrl}" alt="${firstChar}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />` : 
        '';
      
      html += `
        <div class="tab-card close-card" data-tab-id="${tab.id}" data-url="${tab.url}" data-window-id="${tab.windowId || ''}">
          <div class="tab-checkbox-wrap">
            <input type="checkbox" 
                   class="tab-close-checkbox"
                   data-tab-id="${tab.id}"
                   data-url="${tab.url}"
                   title="点击即可关闭该 tab"/>
          </div>
          <div class="tab-icon-container">
            ${iconHtml}
            <div class="tab-icon" style="background:${colorStyle.bg};color:${colorStyle.text};">${firstChar}</div>
          </div>
          <div class="tab-content" title="${tab.url}">
            <div class="tab-title">${tab.title}</div>
            <div class="tab-close-reason">${timeAgo} · ${closingReason}</div>
          </div>
          <div class="tab-actions">
            <button class="${todoBtnClass}"
                    data-url="${tab.url}"
                    data-title="${tab.title}"
                    data-favicon-url="${tab.favIconUrl || ''}"
                    data-action="add-todo"
                    ${isInTodo ? 'disabled' : ''}>
              ${todoBtnText}
            </button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    this.bindSingleTabCloseEvents('close-container');
    this.bindAddTodoEvents('close-container');
  }
  
  getClosingReason(tab) {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    
    if (this.isTempPage(tab.url, tab.title)) {
      return '临时页面（登录回调、空白页等）';
    }
    if (tab.lastAccessed && (now - tab.lastAccessed) > SEVEN_DAYS) {
      const diffMs = now - tab.lastAccessed;
      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      return `${days}天未访问`;
    }
    return '建议关闭';
  }
  
  renderTodo() {
    // 检查是否有 todo section
    let section = document.getElementById('todo-section');
    let container = document.getElementById('todo-container');
    
    // 如果 section 不存在，动态创建
    if (!section) {
      const newSection = document.createElement('div');
      newSection.className = 'category-section';
      newSection.id = 'todo-section';
      newSection.innerHTML = `
        <div class="category-header">
          <h3>To do</h3>
        </div>
        <div id="todo-container"></div>
      `;
      // 插入到 action-bar 之前
      const actionBar = document.querySelector('.action-bar');
      if (actionBar && actionBar.parentNode) {
        actionBar.parentNode.insertBefore(newSection, actionBar);
      }
      section = document.getElementById('todo-section');
      container = document.getElementById('todo-container');
    }
    
    if (!section || !container) return;
    
    // 如果没有 Todo，隐藏模块
    if (this.todoList.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    // 有数据时，显示模块
    section.style.display = '';
    
    // 按加入时间倒序排列
    const sortedTodoList = [...this.todoList].sort((a, b) => 
      (b.addedAt || 0) - (a.addedAt || 0)
    );
    
    let html = '<div style="padding:8px 0;">';
    sortedTodoList.forEach(item => {
      const timeAgo = this.getTimeAgo(item.addedAt);
      
      // 获取首字母和颜色（紫色主题）
      const firstChar = (item.title || '?').charAt(0).toUpperCase();
      const groupColors = [
        { bg: '#f0e8ff', text: '#8844ff' },
        { bg: '#f0e8ff', text: '#aa66ff' },
        { bg: '#f0e8ff', text: '#bb77ff' },
        { bg: '#f0e8ff', text: '#cc88ff' }
      ];
      const colorIdx = item.title ? item.title.charCodeAt(0) % groupColors.length : 0;
      const colorStyle = groupColors[colorIdx];
      
      // 优先使用真实 favicon（Todo 中保存的），回退到首字母图标
      const iconHtml = item.favIconUrl ? 
        `<img class="tab-favicon" src="${item.favIconUrl}" alt="${firstChar}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />` : 
        '';
      
      html += `
        <div class="tab-card todo-card" data-url="${item.url}">
          <div class="tab-checkbox-wrap">
            <input type="checkbox" 
                   class="tab-close-checkbox todo-close"
                   data-url="${item.url}"
                   data-action="remove-todo"
                   title="点击即可关闭该 tab"/>
          </div>
          <div class="tab-icon-container">
            ${iconHtml}
            <div class="tab-icon" style="background:${colorStyle.bg};color:${colorStyle.text};">${firstChar}</div>
          </div>
          <div class="tab-content" title="${item.url}">
            <div class="tab-title">${item.title}</div>
            <div class="tab-time-ago">${timeAgo}加入</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    this.bindTodoCloseEvents('todo-container');
  }

  /**
   * 绑定单个 tab 关闭事件
   */
  bindSingleTabCloseEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const checkboxes = container.querySelectorAll('.tab-close-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        // 同步选中状态到卡片（只有点击复选框才会切换选中）
        const card = e.target.closest('.tab-card');
        if (card) card.classList.toggle('selected', e.target.checked);
        
        const tabId = e.target.getAttribute('data-tab-id');
        const url = e.target.getAttribute('data-url');
        
        console.log('[单个关闭] tabId:', tabId, 'url:', url);
        
        // 真实环境：关闭 tab
        if (typeof chrome !== 'undefined' && chrome.tabs && tabId) {
          chrome.tabs.remove(parseInt(tabId), () => {
            if (chrome.runtime.lastError) {
              console.log('[关闭失败]', chrome.runtime.lastError.message);
              e.target.checked = false;
            } else {
              // 关闭成功，重新扫描
              setTimeout(() => this.handleRescan(), 200);
            }
          });
        } else {
          // 模拟环境：直接从数据中移除
          this.tabsData = this.tabsData.filter(tab => 
            tab.id !== tabId && tab.url !== url
          );
          // 重新分类渲染
          this.categorizeTabs();
          this.groupAndSort();
          this.renderResultPage();
        }
      });
    });
  }

  /**
   * 绑定加入 todo 事件
   */
  bindAddTodoEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const todoButtons = container.querySelectorAll('[data-action="add-todo"]');
    todoButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.getAttribute('data-url');
        const title = e.target.getAttribute('data-title');
        const favIconUrl = e.target.getAttribute('data-favicon-url');
        
        console.log('[加入 Todo]', { title, url, favIconUrl });
        
        // 加入 Todo 列表
        this.addTodoItem({ url, title, favIconUrl });
        
        // 重新渲染（更新按钮状态为"已加入"）
        this.renderResultPage();
        
        this.showNotification(`已加入 To do：${title}`);
      });
    });
  }

  /**
   * 绑定分组展开/收起事件
   */
  bindGroupCollapseEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const headers = container.querySelectorAll('.tab-group-header');
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        const groupId = header.getAttribute('data-group-id');
        if (!groupId) return;
        
        const content = document.getElementById(`${groupId}-content`);
        if (!content) return;
        
        const isCollapsed = header.getAttribute('data-collapsed') === 'true';
        const newState = !isCollapsed;
        
        // 更新状态
        header.setAttribute('data-collapsed', newState.toString());
        
        // 切换内容容器显示
        content.style.display = newState ? 'none' : '';
        
        // 切换箭头旋转
        const toggle = header.querySelector('.tab-group-toggle');
        if (toggle) {
          toggle.textContent = newState ? '▶' : '▼';
          toggle.style.transform = newState ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
        
        console.log('[分组折叠] groupId:', groupId, '状态:', newState ? '已折叠' : '已展开');
      });
    });
  }

  /**
   * 绑定 tab 导航事件（点击 tab 卡片跳转）
   * 采用事件委托模式，统一处理所有模块的导航点击
   */
  bindNavigateEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.addEventListener('click', (e) => {
      // 1. 忽略复选框和按钮区域的点击（让它们由其他事件处理）
      if (e.target.closest('.tab-checkbox-wrap') || e.target.closest('.tab-actions')) {
        return;
      }

      // 2. 找到最近的卡片（支持 tab-card 和 duplicate-group-card）
      const card = e.target.closest('.tab-card, .duplicate-group-card');
      if (!card) return;

      // 3. 从卡片上读取数据
      const tabId = card.getAttribute('data-tab-id');
      const windowId = card.getAttribute('data-window-id');
      const url = card.getAttribute('data-url');

      // 4. 有 URL 才导航
      if (url) {
        this.navigateToTab(tabId, windowId, url);
      }
    });
  }

  /**
   * 定位到现有 tab（不新建，而是切换到已有标签页）
   * 优先使用 chrome.tabs.update / chrome.windows.update 切换
   * 如果没有 tabId（如 Todo 模块）或 Chrome API 不可用，则降级为新窗口打开
   */
  navigateToTab(tabId, windowId, url) {
    console.log('[定位到tab] tabId:', tabId, 'windowId:', windowId, 'url:', url);
    
    // 有 tabId 且是 Chrome 环境 → 切换到现有标签页
    if (tabId && typeof chrome !== 'undefined' && chrome.tabs && chrome.windows) {
      const parsedTabId = parseInt(tabId);
      const parsedWindowId = windowId ? parseInt(windowId) : null;
      
      if (!isNaN(parsedTabId)) {
        // 1. 先激活该 tab
        chrome.tabs.update(parsedTabId, { active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            // tab 可能已被关闭，降级为新窗口打开
            console.log('[定位失败] tab 不存在，降级为新窗口打开:', chrome.runtime.lastError.message);
            if (url) window.open(url, '_blank');
            return;
          }
          
          // 2. 再聚焦所在窗口
          const winId = parsedWindowId || (tab && tab.windowId);
          if (winId && !isNaN(winId)) {
            chrome.windows.update(winId, { focused: true }, () => {
              if (chrome.runtime.lastError) {
                console.log('[窗口聚焦失败]', chrome.runtime.lastError.message);
              } else {
                console.log('[定位成功] 已切换到 tab');
              }
            });
          }
        });
        return;
      }
    }
    
    // 降级方案：没有 tabId → 先用 URL 查询是否有相同 URL 的 tab，找不到再新开
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.windows && url) {
      // 通过 URL 查找已有的 tab（适用于 Todo 模块）
      chrome.tabs.query({ url: url }, (tabs) => {
        if (tabs && tabs.length > 0) {
          // 找到已有 tab → 切换过去（避免重复打开）
          chrome.tabs.update(tabs[0].id, { active: true }, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              window.open(url, '_blank');
            } else {
              chrome.windows.update(tab.windowId, { focused: true });
            }
          });
        } else {
          // 找不到 → 新开窗口
          window.open(url, '_blank');
        }
      });
    } else if (url) {
      // 非 Chrome 环境 → 直接新开
      window.open(url, '_blank');
    }
  }

  /**
   * 绑定 Todo 列表中的关闭事件
   */
  bindTodoCloseEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const checkboxes = container.querySelectorAll('.todo-close');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const url = e.target.getAttribute('data-url');
        
        console.log('[Todo 关闭]', url);
        
        // 从 Todo 列表移除
        this.removeTodoItem(url);
        
        // 真实环境：尝试关闭对应的 tab
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ url: url }, (tabs) => {
            if (tabs && tabs.length > 0) {
              tabs.forEach(tab => {
                chrome.tabs.remove(tab.id, () => {
                  if (!chrome.runtime.lastError) {
                    console.log('[Todo 关闭成功]', url);
                  }
                });
              });
            }
            // 重新渲染
            this.renderResultPage();
          });
        } else {
          // 模拟环境：从数据中移除
          this.tabsData = this.tabsData.filter(tab => tab.url !== url);
          this.categorizeTabs();
          this.groupAndSort();
          this.renderResultPage();
        }
      });
    });
  }

  /**
   * 添加一项到 Todo 列表
   */
  addTodoItem({ url, title, favIconUrl }) {
    // 检查是否已存在
    const exists = this.todoList.some(item => item.url === url);
    if (exists) {
      console.log('[Todo] 已存在，跳过');
      return;
    }
    
    // 添加到 Todo 列表
    this.todoList.push({
      url: url,
      title: title,
      addedAt: Date.now(),
      favIconUrl: favIconUrl || ''
    });
    
    // 持久化保存
    this.saveTodoList();
  }

  /**
   * 从 Todo 列表移除一项
   */
  removeTodoItem(url) {
    this.todoList = this.todoList.filter(item => item.url !== url);
    this.saveTodoList();
  }

  /**
   * 保存 Todo 列表到 storage
   */
  saveTodoList() {
    const data = { todoList: this.todoList };
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.log('[Todo 保存失败]', chrome.runtime.lastError.message);
        }
      });
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('tabclean_todoList', JSON.stringify(this.todoList));
      } catch (e) {
        console.log('[Todo 保存失败]', e.message);
      }
    }
  }

  bindEvents() {
    // 一键瘦身按钮事件
    const slimBtn = document.getElementById('one-click-slim') || 
                     document.querySelector('[data-action="slim"]');
    if (slimBtn) {
      slimBtn.addEventListener('click', () => this.handleOneClickSlim());
    }
    
    // 重新扫描按钮事件
    const rescanBtn = document.querySelector('.rescan-btn') || 
                      document.querySelector('[data-action="rescan"]');
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => this.handleRescan());
    }
    
    // 可关闭一键关闭按钮
    const closeAllBtn = document.querySelector('[data-action="close-all"]');
    if (closeAllBtn) {
      closeAllBtn.addEventListener('click', () => this.handleCloseAll());
    }
    
    // 统计按钮筛选事件
    this.bindStatFilterEvents();

    // Tab 卡片点击跳转事件（统一绑定一次，避免重复累积）
    this.bindNavigateEvents('duplicates-container');
    this.bindNavigateEvents('keep-container');
    this.bindNavigateEvents('close-container');
    this.bindNavigateEvents('todo-container');
    
    console.log('[事件绑定] 已完成一键瘦身、重新扫描、一键关闭、统计筛选、跳转事件绑定');
  }
  
  /**
   * 绑定统计按钮筛选事件：点击后只显示对应模块
   */
  bindStatFilterEvents() {
    const statButtons = document.querySelectorAll('.stat-btn');
    statButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterType = e.currentTarget.dataset.type;
        this.filterByCategory(filterType);
      });
    });
  }
  
  /**
   * 根据筛选类型显示/隐藏模块
   * @param {string} filterType - all, duplicates, keep, close
   */
  filterByCategory(filterType) {
    // 更新按钮激活状态
    const statButtons = document.querySelectorAll('.stat-btn');
    statButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === filterType);
    });
    
    // 定义所有模块
    const sections = {
      'duplicates': document.getElementById('duplicates-section'),
      'keep': document.getElementById('keep-section'),
      'close': document.getElementById('close-section'),
      'todo': document.getElementById('todo-section')
    };
    
    // 根据筛选类型决定显示哪些模块
    Object.keys(sections).forEach(key => {
      const section = sections[key];
      if (!section) return;
      
      if (filterType === 'all') {
        // 显示所有模块（但保持原有逻辑：数据为空时隐藏）
        const shouldShow = (key === 'duplicates' && this.categorizedTabs.duplicateGroups && this.categorizedTabs.duplicateGroups.length > 0) ||
                          (key === 'keep' && this.categorizedTabs.keep.length > 0) ||
                          (key === 'close' && this.categorizedTabs.close.length > 0) ||
                          (key === 'todo' && this.todoList.length > 0);
        section.style.display = shouldShow ? '' : 'none';
      } else {
        // 只显示选中的模块
        if (key === filterType) {
          // 检查是否有数据
          const hasData = (key === 'duplicates' && this.categorizedTabs.duplicateGroups && this.categorizedTabs.duplicateGroups.length > 0) ||
                         (key === 'keep' && this.categorizedTabs.keep.length > 0) ||
                         (key === 'close' && this.categorizedTabs.close.length > 0) ||
                         (key === 'todo' && this.todoList.length > 0);
          section.style.display = hasData ? '' : 'none';
        } else if (key === 'todo') {
          // Todo 模块始终在所有筛选下都显示（如果有数据）
          section.style.display = this.todoList.length > 0 ? '' : 'none';
        } else {
          section.style.display = 'none';
        }
      }
    });
    
    console.log('[筛选] 已切换到:', filterType);
  }
  
  /**
   * 一键瘦身功能：
   * 对每个重复项分组，保留最近访问的 1 个 tab，关闭其他的
   * 关闭后重新扫描刷新结果
   */
  handleOneClickSlim() {
    const groups = this.categorizedTabs.duplicateGroups || [];
    if (groups.length === 0) {
      console.log('[一键瘦身] 暂无重复项需要处理');
      return;
    }
    
    console.log('[一键瘦身] 开始处理，共', groups.length, '个重复项分组');
    
    let totalClosed = 0;
    const tabsToRemove = [];
    
    // 遍历每个分组，收集需要关闭的 tab
    groups.forEach((group, groupIdx) => {
      if (group.tabs.length <= 1) return; // 只有1个tab，不需要处理
      
      // 按 lastAccessed 降序排序，最近访问的在最前面
      const sortedTabs = [...group.tabs].sort((a, b) => {
        return (b.lastAccessed || 0) - (a.lastAccessed || 0);
      });
      
      // 保留第一个（最近访问的），其他加入待关闭列表
      sortedTabs.slice(1).forEach(tab => {
        tabsToRemove.push(tab);
      });
      
      console.log(`[分组 ${groupIdx + 1}] ${group.displayName} - 保留: 1个，关闭: ${sortedTabs.length - 1}个`);
    });
    
    totalClosed = tabsToRemove.length;
    
    if (totalClosed === 0) {
      console.log('[一键瘦身] 没有需要关闭的 tab');
      return;
    }
    
    // 执行关闭操作
    console.log('[一键瘦身] 准备关闭', totalClosed, '个 tab');
    
    // 真实环境：调用 chrome API
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const tabIds = tabsToRemove.map(tab => tab.id).filter(id => id);
      
      // 逐个关闭（也可以用 chrome.tabs.remove([ids])
      tabIds.forEach((id, idx) => {
        try {
          chrome.tabs.remove(id, () => {
            if (chrome.runtime.lastError) {
              console.log('[关闭失败] Tab ID:', id, chrome.runtime.lastError.message);
            } else {
              console.log(`[关闭成功] ${idx + 1}/${tabIds.length}: Tab ID ${id}`);
            }
          });
        } catch (e) {
          console.log('[关闭异常] Tab ID:', id, e.message);
        }
      });
      
      // 等待一小段时间让关闭完成，然后重新扫描
      setTimeout(() => {
        console.log('[一键瘦身] 完成关闭，重新扫描...');
        this.handleRescan();
      }, 500);
    } else {
      // 本地调试环境：模拟关闭
      console.log('[模拟环境] 将从 tabsData 中移除', totalClosed, '个 tab');
      
      const removeIds = new Set(tabsToRemove.map(t => t.id));
      this.tabsData = this.tabsData.filter(tab => !removeIds.has(tab.id));
      
      // 在 mock 数据中也移除
      if (window.getMockTabs) {
        console.log('[模拟环境] 无法真正修改原始 mock 数据，但会立即重新渲染');
      }
      
      // 立即重新分类和渲染
      this.categorizeTabs();
      this.groupAndSort();
      this.renderResultPage();
      
      console.log(`[一键瘦身] 完成！关闭了 ${totalClosed} 个 tab，保留 ${groups.length} 个`);
      
      // 显示成功提示（可选）
      this.showNotification(`瘦身完成！关闭了 ${totalClosed} 个重复标签页`);
    }
  }
  
  /**
   * 重新扫描功能
   */
  async handleRescan() {
    console.log('[重新扫描] 开始...');
    
    // 重新加载 tab 数据
    await this.loadTabs();
    
    // 重新分类和分组（await 确保 Todo 加载完成）
    await this.processTabs();
    
    // 重新渲染
    this.renderResultPage();
    
    console.log('[重新扫描] 完成！共', this.tabsData.length, '个 tab');
    
    this.showNotification(`扫描完成！发现 ${this.tabsData.length} 个标签页`);
  }
  
  /**
   * 一键关闭功能：关闭可关闭分组的所有 tab
   */
  handleCloseAll() {
    const tabsToClose = this.categorizedTabs.close || [];
    if (tabsToClose.length === 0) {
      console.log('[一键关闭] 暂无可关闭的 tab');
      return;
    }
    
    console.log('[一键关闭] 准备关闭', tabsToClose.length, '个 tab');
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const tabIds = tabsToClose.map(tab => tab.id).filter(id => id);
      tabIds.forEach(id => {
        try {
          chrome.tabs.remove(id);
        } catch (e) {
          console.log('[关闭失败]', e.message);
        }
      });
      
      setTimeout(() => this.handleRescan(), 500);
    } else {
      // 模拟环境
      const removeIds = new Set(tabsToClose.map(t => t.id));
      this.tabsData = this.tabsData.filter(tab => !removeIds.has(tab.id));
      
      this.categorizeTabs();
      this.groupAndSort();
      this.renderResultPage();
      
      this.showNotification(`已关闭 ${tabsToClose.length} 个标签页`);
    }
  }
  
  /**
   * 显示简单的通知提示（简易实现）
   */
  showNotification(message) {
    // 创建临时提示
    let notif = document.getElementById('tab-clean-notification');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'tab-clean-notification';
      notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #52c41a;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(-20px);
      `;
      document.body.appendChild(notif);
    }
    
    notif.textContent = message;
    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';
    
    // 3 秒后自动消失
    setTimeout(() => {
      if (notif) {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-20px)';
      }
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  window.tabClean = new TabClean();
});

// 暴露给全局（方便调试）
if (typeof window !== 'undefined') {
  window.TabClean = TabClean;
}
