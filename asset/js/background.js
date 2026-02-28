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
        console.log("Setting badge color:", color, "->", r, g, b);
        chrome.action.setBadgeBackgroundColor({ color: [r, g, b, 255] });
    } else {
        chrome.action.setBadgeBackgroundColor({ color: [128, 128, 128, 255] });
    }
}

function doSetProxy(configProxy) {
    console.log("doSetProxy called with:", JSON.stringify(configProxy));
    
    // 测试最简单的API调用
    console.log("chrome.proxy:", chrome.proxy);
    console.log("chrome.proxy.settings:", chrome.proxy.settings);
    
    // 直接调用
    var result = chrome.proxy.settings.set({value: configProxy, scope: 'regular'});
    console.log("set result:", result);
}

function changeProxy(index, config, callback) {
    if (!config || index < 0 || index >= config.proxy_list.length) {
        index = 0;
    }
    
    var proxy = config.proxy_list[index];
    console.log("=== changeProxy === index:", index, "proxy:", JSON.stringify(proxy));
    
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
            scheme: proxy.fixed_servers_schema,
            host: proxy.fixed_servers_name,
            port: parseInt(proxy.fixed_servers_port)
        };
        
        if (proxy.fixed_servers_username && proxy.fixed_servers_password) {
            singleProxy.username = proxy.fixed_servers_username;
            singleProxy.password = proxy.fixed_servers_password;
        }
        
        configProxy = {
            mode: "fixed_servers",
            rules: {
                singleProxy: singleProxy,
                bypassList: ["127.0.0.1", "localhost"]
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
    
    console.log("Setting proxy config:", JSON.stringify(configProxy));
    
    // 测试调用
    try {
        doSetProxy(configProxy);
    } catch(e) {
        console.log("Exception in doSetProxy:", e);
    }
    
    chrome.action.setTitle({ title: title });
    
    if (callback) callback();
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
    
    console.log("next_index:", next_index);
    
    if (next_index === -1) {
        chrome.tabs.create({ url: chrome.runtime.getURL("asset/html/options.html?first=1") });
        return;
    }
    
    changeProxy(next_index, config, function() {
        config.current_proxy_index = next_index;
        console.log("Saving new index:", next_index);
        chrome.storage.local.set({ 'switch_config': JSON.stringify(config) });
    });
}

function loadConfig(callback) {
    chrome.storage.local.get('switch_config', function(items) {
        console.log("Storage items:", items);
        
        var config;
        if (items.switch_config) {
            try {
                config = JSON.parse(items.switch_config);
            } catch (e) {
                console.log("Parse error, using default");
                config = defaultConfig;
            }
        } else {
            console.log("No stored config, using default");
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
        
        console.log("Final config:", JSON.stringify(config));
        if (callback) callback(config);
    });
}

// 点击图标时切换代理
chrome.action.onClicked.addListener(function(tab) {
    console.log("=== ICON CLICKED ===");
    loadConfig(function(config) {
        cycleProxy(config);
    });
});

// 启动时加载配置
loadConfig(function(config) {
    console.log("=== STARTUP ===");
    changeProxy(config.current_proxy_index, config);
});
