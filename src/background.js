let currentSettings = {
  isEnabled: false,
  rules: [],
};

// 规则计数器
let ruleIdCounter = 1;

// 初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed');
  const data = await chrome.storage.local.get(['settings']);
  currentSettings = data.settings || { isEnabled: false, rules: [] };
  await chrome.storage.local.set({ settings: currentSettings });
  await updateRules();
});

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.settings) {
    currentSettings = changes.settings.newValue;
    await updateRules();
  }
});

// 更新规则
async function updateRules() {
  try {
    // 获取现有规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    // 如果禁用了拦截，删除所有规则
    if (!currentSettings.isEnabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds,
      });
      console.log('All rules removed');
      return;
    }

    // 创建新规则
    const newRules = currentSettings.rules.map((rule, index) => {
      const ruleId = ruleIdCounter++;
      return {
        id: ruleId,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            url: `data:application/json,${encodeURIComponent(rule.response)}`,
          },
        },
        condition: {
          urlFilter: rule.urlPattern,
          resourceTypes: ['xmlhttprequest'], // 只使用 xmlhttprequest
        },
      };
    });

    // 更新规则
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds,
      addRules: newRules,
    });

    console.log('Rules updated:', newRules);
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

// 监听规则匹配
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  console.log('Rule matched:', info);
});

// 导出一个空对象以支持 ES modules
export {};
