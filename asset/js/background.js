// TunnelSwitch Background Service Worker
console.log("TunnelSwitch service worker started");

var defaultConfig = {
    'click_action': 'cycle',
    'use_default_proxy': 0,
    'current_proxy_index': 0,
    'proxy_list': [
        { mode: 'direct', enable: 1, color: "00FF00" },
        { mode: 'pac_script', enable: 1, color: "009933", pac_script_url: 'https://raw.githubusercontent.com/oylbin/tunnel-switch/master/asset/example.pac' },
        { mode: 'fixed_servers', enable: 1, color: "CC0000", fixed_servers_schema: 'socks5', fixed_servers_name: '127.0.0.1', fixed_servers_port: '8527' }
    ]
};

function setBadgeColor(color) {
    if (color && color.length === 6) {
        var r = parseInt(color.substr(0, 2), 16);
        var g = parseInt(color.substr(2, 2), 16);
        var b = parseInt(color.substr(4, 2), 16);
        chrome.action.setBadgeBackgroundColor({ color: [r, g, b, 255] });
    } else {
        chrome.action.setBadgeBackgroundColor({ color: [128, 128, 128, 255] });
    }
}

function doSetProxy(configProxy, callback) {
    console.log("doSetProxy called with:", JSON.stringify(configProxy));
    
    try {
        chrome.proxy.settings.set(
            { value: configProxy, scope: 'regular' },
            function() {
                if (chrome.runtime.lastError) {
                    console.error("Proxy set error:", chrome.runtime.lastError);
                } else {
                    console.log("Proxy set successfully");
                }
                if (callback) callback();
            }
        );
    } catch(e) {
        console.error("Exception setting proxy:", e);
        if (callback) callback();
    }
}

function changeProxy(index, config, callback) {
    if (!config || index < 0 || index >= config.proxy_list.length) {
        index = 0;
    }
    
    var proxy = config.proxy_list[index];
    console.log("=== changeProxy === index:", index, "proxy mode:", proxy.mode);
    
    var configProxy, title;
    
    if (proxy.mode === 'pac_script') {
        configProxy = {
            mode: "pac_script",
            pacScript: {
                url: proxy.pac_script_url + "?" + new Date().getTime(),
                mandatory: true
            }
        };
        chrome.action.setIcon({ path: "../image/pac.png" });
        title = "PAC: " + proxy.pac_script_url;
        chrome.action.setBadgeText({ text: " " });
        setBadgeColor(proxy.color);
    } else if (proxy.mode === 'fixed_servers') {
        var singleProxy = {
            scheme: proxy.fixed_servers_schema || 'http',
            host: proxy.fixed_servers_name,
            port: parseInt(proxy.fixed_servers_port)
        };
        
        configProxy = {
            mode: "fixed_servers",
            rules: {
                singleProxy: singleProxy,
                bypassList: ["127.0.0.1", "localhost", "::1"]
            }
        };
        chrome.action.setIcon({ path: "../image/pac.png" });
        title = proxy.fixed_servers_schema + ", " + proxy.fixed_servers_name + ":" + proxy.fixed_servers_port;
        chrome.action.setBadgeText({ text: " " });
        setBadgeColor(proxy.color);
    } else {
        configProxy = { mode: "direct" };
        title = "direct, no proxy";
        chrome.action.setIcon({ path: "../image/direct.png" });
        
        if (proxy.color) {
            chrome.action.setBadgeText({ text: " " });
            setBadgeColor(proxy.color);
        } else {
            chrome.action.setBadgeText({ text: "" });
            setBadgeColor("808080");
        }
    }
    
    console.log("Setting proxy config");
    
    doSetProxy(configProxy, function() {
        console.log("Proxy configuration applied");
        if (callback) callback();
    });
    
    chrome.action.setTitle({ title: title });
}

function cycleProxy(config) {
    var currentIdx = config.current_proxy_index;
    var list = config.proxy_list;
    var len = list.length;
    
    console.log("=== cycleProxy === currentIdx:", currentIdx);
    
    var next_index = -1;
    
    for (var i = 1; i < len; i++) {
        var j = (currentIdx + i) % len;
        if (list[j].enable) {
            next_index = j;
            break;
        }
    }
    
    if (next_index === -1) {
        if (list[currentIdx] && list[currentIdx].enable) {
            next_index = currentIdx;
        } else {
            for (var i = 0; i < len; i++) {
                if (list[i].enable) {
                    next_index = i;
                    break;
                }
            }
        }
    }
    
    if (next_index === -1) {
        chrome.tabs.create({ url: chrome.runtime.getURL("asset/html/options.html?first=1") });
        return;
    }
    
    changeProxy(next_index, config, function() {
        config.current_proxy_index = next_index;
        chrome.storage.local.set({ 'switch_config': JSON.stringify(config) });
    });
}

function loadConfig(callback) {
    chrome.storage.local.get('switch_config', function(items) {
        var config;
        if (items.switch_config) {
            try {
                config = JSON.parse(items.switch_config);
            } catch (e) {
                config = defaultConfig;
            }
        } else {
            config = defaultConfig;
        }
        
        var keys = ['click_action', 'use_default_proxy', 'current_proxy_index'];
        for (var i = 0; i < keys.length; i++) {
            if (config[keys[i]] === undefined) {
                config[keys[i]] = defaultConfig[keys[i]];
            }
        }
        
        if (!config.proxy_list) {
            config.proxy_list = defaultConfig.proxy_list;
        }
        
        if (callback) callback(config);
    });
}

// 点击图标时切换代理
chrome.action.onClicked.addListener(function(tab) {
    loadConfig(function(config) {
        cycleProxy(config);
    });
});

// 启动时加载配置
loadConfig(function(config) {
    changeProxy(config.current_proxy_index, config);
});

// 代理认证监听器 (需要企业安装才能生效)
function setupAuthListener() {
    try {
        if (typeof chrome !== 'undefined' && chrome.webRequest && chrome.webRequest.onAuthRequired) {
            chrome.webRequest.onAuthRequired.addListener(
                function(details) {
                    console.log("Auth required:", details.url, "isProxy:", details.isProxy);
                    
                    if (!details.isProxy) {
                        return {};
                    }
                    
                    return new Promise(function(resolve) {
                        chrome.storage.local.get('switch_config', function(items) {
                            var config = defaultConfig;
                            try {
                                if (items.switch_config) {
                                    config = JSON.parse(items.switch_config);
                                }
                            } catch(e) {}
                            
                            var currentProxy = config.proxy_list[config.current_proxy_index];
                            
                            if (currentProxy && 
                                currentProxy.mode === 'fixed_servers' && 
                                currentProxy.fixed_servers_username && 
                                currentProxy.fixed_servers_password) {
                                
                                console.log("Providing proxy auth credentials");
                                resolve({
                                    authCredentials: {
                                        username: currentProxy.fixed_servers_username,
                                        password: currentProxy.fixed_servers_password
                                    }
                                });
                            } else {
                                resolve({});
                            }
                        });
                    });
                },
                {urls: ["<all_urls>"]},
                ['asyncBlocking']
            );
            console.log("Auth listener registered");
        }
    } catch(e) {
        console.log("Auth listener note:", e.message);
    }
}

setupAuthListener();
