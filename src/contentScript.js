let currentSettings = {
  isEnabled: false,
  rules: [],
};

// 初始化函数
async function initialize() {
  try {
    const data = await chrome.storage.local.get(['settings']);
    if (data.settings) {
      currentSettings = data.settings;
      console.log('Settings initialized:', currentSettings);
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// 监听设置更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    currentSettings = message.settings;
    console.log('Settings updated:', currentSettings);
    sendResponse({ status: 'ok' });
  }
});

// 创建一个注入脚本
const script = document.createElement('script');
script.textContent = `
(function() {
    // 保存原始的XHR和fetch
    const originalXHR = window.XMLHttpRequest;
    const originalFetch = window.fetch;

    // 创建一个通道来与content script通信
    const channel = new BroadcastChannel('url-interceptor');

    // 代理 XMLHttpRequest
    window.XMLHttpRequest = new Proxy(originalXHR, {
        construct(target, args) {
            const xhr = new target(...args);
            
            // 代理 open 方法
            const originalOpen = xhr.open;
            xhr.open = function(...openArgs) {
                const [method, url] = openArgs;
                this._interceptUrl = url;
                return originalOpen.apply(this, openArgs);
            };

            // 代理 send 方法
            const originalSend = xhr.send;
            xhr.send = function(...sendArgs) {
                // 检查是否需要拦截
                channel.postMessage({
                    type: 'CHECK_INTERCEPT',
                    url: this._interceptUrl
                });

                // 监听响应
                channel.onmessage = (event) => {
                    if (event.data.type === 'INTERCEPT_RESPONSE' && 
                        event.data.url === this._interceptUrl) {
                        
                        // 模拟响应
                        Object.defineProperty(this, 'response', { 
                            get: () => event.data.response 
                        });
                        Object.defineProperty(this, 'responseText', { 
                            get: () => event.data.response 
                        });
                        Object.defineProperty(this, 'status', { 
                            get: () => 200 
                        });
                        Object.defineProperty(this, 'readyState', { 
                            get: () => 4 
                        });

                        // 触发回调
                        setTimeout(() => {
                            this.onreadystatechange && this.onreadystatechange();
                            this.onload && this.onload();
                        }, 0);
                        
                        return;
                    }
                    
                    // 如果不需要拦截，使用原始方法
                    return originalSend.apply(this, sendArgs);
                };
            };

            return xhr;
        }
    });

    // 代理 fetch
    window.fetch = new Proxy(originalFetch, {
        apply: async function(target, thisArg, args) {
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            
            // 检查是否需要拦截
            channel.postMessage({
                type: 'CHECK_INTERCEPT',
                url: url
            });

            return new Promise((resolve) => {
                channel.onmessage = async (event) => {
                    if (event.data.type === 'INTERCEPT_RESPONSE' && 
                        event.data.url === url) {
                        
                        resolve(new Response(event.data.response, {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*'
                            }
                        }));
                        return;
                    }
                    
                    // 如果不需要拦截，使用原始fetch
                    resolve(target.apply(thisArg, args));
                };
            });
        }
    });
})();
`;

// 注入脚本到页面
(document.head || document.documentElement).appendChild(script);
script.remove();

// 创建通信通道
const channel = new BroadcastChannel('url-interceptor');

// 处理拦截检查
channel.onmessage = (event) => {
  if (event.data.type === 'CHECK_INTERCEPT') {
    const url = event.data.url;

    if (currentSettings.isEnabled) {
      const matchedRule = currentSettings.rules.find((rule) =>
        url.includes(rule.urlPattern)
      );

      if (matchedRule) {
        console.log('Intercepting:', url);
        console.log('Using response:', matchedRule.response);

        channel.postMessage({
          type: 'INTERCEPT_RESPONSE',
          url: url,
          response: matchedRule.response,
        });
        return;
      }
    }
  }
};

// 初始化
initialize();

// 清理函数
window.addEventListener('unload', () => {
  channel.close();
});
