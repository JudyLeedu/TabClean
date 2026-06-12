/**
 * Tab Clean - 模拟 Chrome API（用于本地预览调试）
 * 模块 1 测试数据：测试域名萃取、时间显示、临时页判断、7天未访问
 */

(function() {
  // 当前时间
  const now = Date.now();
  
  // 模拟标签页数据
  // 数据设计原则：
  // 1. 同 URL ≥ 2 个 tab → 归为重复项
  // 2. 单 URL tab → 根据是否为临时页/7天未访问 → 可关闭
  // 3. 其他 → 先保留
  const mockTabs = [
    // ======== 重复项测试（同 URL 多次打开） ========
    {
      id: 1,
      title: 'GitHub - Tab Clean 仓库',
      url: 'https://github.com/tab-clean',
      favIconUrl: '',
      lastAccessed: now - 5 * 60 * 1000, // 5 分钟前
      windowId: 1
    },
    {
      id: 2,
      title: 'GitHub - Tab Clean 仓库',
      url: 'https://github.com/tab-clean',
      favIconUrl: '',
      lastAccessed: now - 2 * 60 * 1000, // 2 分钟前（最近访问）
      windowId: 1
    },
    {
      id: 3,
      title: 'GitHub - Tab Clean 仓库',
      url: 'https://github.com/tab-clean',
      favIconUrl: '',
      lastAccessed: now - 1 * 60 * 60 * 1000, // 1 小时前
      windowId: 1
    },
    
    // Google 搜索 - 同 URL 重复
    {
      id: 4,
      title: 'Google 搜索 - Chrome 扩展开发',
      url: 'https://www.google.com/search?q=chrome+extension',
      favIconUrl: '',
      lastAccessed: now - 10 * 60 * 1000, // 10 分钟前
      windowId: 1
    },
    {
      id: 5,
      title: 'Google 搜索 - Chrome 扩展开发',
      url: 'https://www.google.com/search?q=chrome+extension',
      favIconUrl: '',
      lastAccessed: now - 1 * 60 * 1000, // 1 分钟前（最近访问）
      windowId: 1
    },
    
    // ======== 临时页测试（login-success 等） ========
    {
      id: 6,
      title: '登录成功 - 回调页',
      url: 'https://auth.example.com/login-success?code=12345',
      favIconUrl: '',
      lastAccessed: now - 30 * 60 * 1000, // 30 分钟前
      windowId: 1
    },
    {
      id: 7,
      title: 'OAuth 授权完成',
      url: 'https://api.service.com/oauth2/callback',
      favIconUrl: '',
      lastAccessed: now - 45 * 60 * 1000, // 45 分钟前
      windowId: 1
    },
    {
      id: 8,
      title: '重定向完成',
      url: 'https://app.example.com/redirect-done',
      favIconUrl: '',
      lastAccessed: now - 60 * 60 * 1000, // 1 小时前
      windowId: 1
    },
    
    // ======== 7 天以上未访问测试 ========
    {
      id: 9,
      title: '旧的博客文章',
      url: 'https://blog.example.com/old-article',
      favIconUrl: '',
      lastAccessed: now - 10 * 24 * 60 * 60 * 1000, // 10 天前
      windowId: 1
    },
    {
      id: 10,
      title: '归档的项目文档',
      url: 'https://docs.example.com/archived-project',
      favIconUrl: '',
      lastAccessed: now - 8 * 24 * 60 * 60 * 1000, // 8 天前
      windowId: 1
    },
    
    // ======== 先保留测试（正常 tab） ========
    {
      id: 11,
      title: '哔哩哔哩 - 开发者大会',
      url: 'https://www.bilibili.com/video/developer-day',
      favIconUrl: '',
      lastAccessed: now - 2 * 60 * 1000, // 2 分钟前
      windowId: 1
    },
    {
      id: 12,
      title: 'YouTube - Web Development Tutorial',
      url: 'https://www.youtube.com/watch?v=webdev-tutorial',
      favIconUrl: '',
      lastAccessed: now - 15 * 60 * 1000, // 15 分钟前
      windowId: 1
    },
    {
      id: 13,
      title: 'MDN Web Docs - Chrome Extensions',
      url: 'https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions',
      favIconUrl: '',
      lastAccessed: now - 2 * 60 * 60 * 1000, // 2 小时前
      windowId: 1
    },
    {
      id: 14,
      title: '知乎 - 前端开发最佳实践',
      url: 'https://www.zhihu.com/question/frontend-best-practices',
      favIconUrl: '',
      lastAccessed: now - 3 * 60 * 60 * 1000, // 3 小时前
      windowId: 1
    },
    
    // ======== 二级域名测试（mail.qq.com → Mail） ========
    {
      id: 15,
      title: 'QQ 邮箱 - 收件箱',
      url: 'https://mail.qq.com/inbox',
      favIconUrl: '',
      lastAccessed: now - 4 * 60 * 60 * 1000, // 4 小时前
      windowId: 1
    },
    {
      id: 16,
      title: 'QQ 邮箱 - 发件箱',
      url: 'https://mail.qq.com/outbox',
      favIconUrl: '',
      lastAccessed: now - 5 * 60 * 60 * 1000, // 5 小时前
      windowId: 1
    },
    
    // ======== Message 分组测试（message.example.com → Message） ========
    {
      id: 23,
      title: '微信消息 - 通知',
      url: 'https://message.weixin.qq.com/notifications',
      favIconUrl: '',
      lastAccessed: now - 2 * 60 * 60 * 1000, // 2 小时前
      windowId: 1
    },
    {
      id: 24,
      title: '钉钉消息 - 工作群',
      url: 'https://message.dingtalk.com/workgroup',
      favIconUrl: '',
      lastAccessed: now - 3 * 60 * 60 * 1000, // 3 小时前
      windowId: 1
    },
    {
      id: 25,
      title: 'Slack - 项目频道',
      url: 'https://message.slack.com/project-channel',
      favIconUrl: '',
      lastAccessed: now - 1 * 60 * 60 * 1000, // 1 小时前
      windowId: 1
    },
    
    // ======== www 前缀测试 ========
    {
      id: 17,
      title: 'Google 首页',
      url: 'https://www.google.com/',
      favIconUrl: '',
      lastAccessed: now - 6 * 60 * 60 * 1000, // 6 小时前
      windowId: 1
    },
    
    // ======== 特殊协议测试（chrome:// 等 → Other） ========
    {
      id: 18,
      title: '新标签页',
      url: 'chrome://newtab/',
      favIconUrl: '',
      lastAccessed: now - 10 * 60 * 1000, // 10 分钟前
      windowId: 1
    },
    {
      id: 19,
      title: '空白页',
      url: 'about:blank',
      favIconUrl: '',
      lastAccessed: now - 20 * 60 * 1000, // 20 分钟前
      windowId: 1
    },
    
    // ======== 一些不同域名的单个 tab（用于 Other 分组测试） ========
    {
      id: 20,
      title: 'Stack Overflow - JavaScript',
      url: 'https://stackoverflow.com/questions/tagged/javascript',
      favIconUrl: '',
      lastAccessed: now - 30 * 60 * 1000, // 30 分钟前
      windowId: 1
    },
    {
      id: 21,
      title: 'Medium - 技术文章',
      url: 'https://medium.com/@user/tech-article',
      favIconUrl: '',
      lastAccessed: now - 1 * 60 * 60 * 1000, // 1 小时前
      windowId: 1
    },
    
    // ======== 空白页（URL 含 blank 关键词） ========
    {
      id: 22,
      title: '空白页',
      url: 'https://example.com/blank-page',
      favIconUrl: '',
      lastAccessed: now - 2 * 60 * 60 * 1000, // 2 小时前
      windowId: 1
    }
  ];

  // 暴露给全局使用
  window.getMockTabs = function() {
    return [...mockTabs];
  };
  
  // 模拟 chrome 对象（为了与现有代码兼容）
  if (typeof window.chrome === 'undefined') {
    window.chrome = {
      tabs: {
        query: function() {
          return Promise.resolve([...mockTabs]);
        },
        remove: function(tabIds) {
          return Promise.resolve();
        },
        update: function(tabId, updateInfo, callback) {
          // 模拟激活 tab - 在真实浏览器中会切换标签页
          console.log('[Mock] chrome.tabs.update:', tabId, updateInfo);
          const tab = mockTabs.find(t => t.id === tabId);
          if (callback) callback(tab || null);
          return Promise.resolve(tab || null);
        }
      },
      windows: {
        getAll: function(options) {
          // 模拟返回一个窗口包含所有 tab
          return Promise.resolve([{
            id: 1,
            tabs: [...mockTabs]
          }]);
        },
        update: function(windowId, updateInfo, callback) {
          // 模拟聚焦窗口 - 在真实浏览器中会激活该窗口
          console.log('[Mock] chrome.windows.update:', windowId, updateInfo);
          if (callback) callback();
          return Promise.resolve();
        }
      },
      runtime: {
        lastError: null
      },
      storage: {
        local: {
          get: function(keys, callback) {
            try {
              const result = {};
              if (Array.isArray(keys)) {
                keys.forEach(key => {
                  const saved = localStorage.getItem('tabclean_' + key);
                  if (saved) {
                    result[key] = JSON.parse(saved);
                  }
                });
              }
              callback && callback(result);
            } catch (err) {
              callback && callback({});
            }
          },
          set: function(items, callback) {
            try {
              for (const key in items) {
                localStorage.setItem('tabclean_' + key, JSON.stringify(items[key]));
              }
              callback && callback();
            } catch (err) {
              callback && callback();
            }
          }
        }
      }
    };
  }
  
  // 调试工具：在控制台输出测试数据
  console.log('%c[Tab Clean] 模块 1 测试数据已就绪', 'color: #4CAF50; font-weight: bold;');
  console.log('共', mockTabs.length, '个模拟 Tab');
  
  // 测试域名萃取
  console.group('域名萃取测试');
  const testUrls = [
    'https://github.com/tab-clean',
    'https://mail.qq.com/inbox',
    'https://www.google.com/',
    'https://auth.example.com/login-success',
    'chrome://newtab/',
    'about:blank',
    'https://stackoverflow.com/questions/tagged/javascript',
    'https://medium.com/@user/tech-article'
  ];
  testUrls.forEach(url => {
    // 用简单的萃取逻辑展示预期结果
    let hostname = url;
    try {
      hostname = new URL(url).hostname;
    } catch (e) {}
    
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    
    const tlds = ['.com', '.net', '.io', '.cn', '.co', '.dev', '.app'];
    tlds.forEach(tld => {
      if (hostname.endsWith(tld)) {
        hostname = hostname.slice(0, -tld.length);
      }
    });
    
    const parts = hostname.split('.');
    const displayName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : hostname;
    
    console.log(url, '→', displayName);
  });
  console.groupEnd();
  
  console.group('分类预期');
  console.log('重复项:', 'github.com/tab-clean (3个), google.com/search?q=chrome+extension (2个)');
  console.log('可关闭:', 'login-success, oauth2/callback, redirect-done, 10天前的博客, 8天前的文档, blank-page');
  console.log('先保留:', 'bilibili, youtube, mdn, zhihu, mail.qq.com (2个), stackoverflow, medium, chrome://newtab, about:blank');
  console.groupEnd();
  
})();
