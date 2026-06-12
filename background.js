/**
 * Tab Clean - Background Script
 * 处理扩展图标点击，打开侧边栏
 */

// 安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Tab Clean] 扩展已安装/更新');
});

// 监听扩展图标点击事件 - 打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 获取当前窗口 ID 并打开侧边栏
    const windowId = tab.windowId || chrome.windows.WINDOW_ID_CURRENT;
    await chrome.sidePanel.open({ windowId: windowId });
    console.log('[Tab Clean] 侧边栏已打开');
  } catch (error) {
    console.error('[Tab Clean] 打开侧边栏失败:', error);
  }
});
