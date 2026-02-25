TS = {
    default_config: {
        'click_action': 'cycle',
        'use_default_proxy': 0,
        'current_proxy_index': 0,
        'proxy_list': [
            { mode: 'direct', enable: 1, color: "FFFFF" },
            { mode: 'pac_script', enable: 1, color: "009933", pac_script_url: 'https://raw.githubusercontent.com/oylbin/tunnel-switch/master/asset/example.pac' },
            { mode: 'fixed_servers', enable: 1, color: "CC0000", fixed_servers_schema: 'socks5', fixed_servers_name: '127.0.0.1', fixed_servers_port: '8527' }
        ]
    },
    change_proxy: function(index, callback){
        if( index<0 || index >= TS.config.proxy_list.length){
            index = 0;
        }
        if(TS.config.proxy_list.length==0){
            var proxy = { mode:"direct" };
        }else{
            var proxy = TS.config.proxy_list[index];
        }
        console.log(index);
        if(proxy.mode=='pac_script'){
            var config = {
                mode: "pac_script",
                pacScript: {
                    url:proxy.pac_script_url+"?"+(new Date).getTime(),
                    mandatory:true
                }
            };
            chrome.action.setIcon({path:"../image/pac.png"});
            var title = "PAC: "+proxy.pac_script_url;
            chrome.action.setBadgeText({text:" "});
        }else if(proxy.mode=='fixed_servers'){
            var proxyConfig = {
                scheme: proxy.fixed_servers_schema,
                host: proxy.fixed_servers_name,
                port: parseInt(proxy.fixed_servers_port)
            };
            
            if(proxy.fixed_servers_username && proxy.fixed_servers_password){
                proxyConfig.username = proxy.fixed_servers_username;
                proxyConfig.password = proxy.fixed_servers_password;
            }
            
            var config = {
                mode: "fixed_servers",
                rules: {
                    singleProxy: proxyConfig,
                    bypassList: ["127.0.0.1","localhost"]
                }
            };
            chrome.action.setIcon({path:"../image/pac.png"});
            var title = proxy.fixed_servers_schema+", "+proxy.fixed_servers_name+":"+proxy.fixed_servers_port;
            chrome.action.setBadgeText({text:" "});
        }else{
            var config = {
                mode: "direct"
            };
            var title = "direct, no proxy";
            chrome.action.setIcon({path:"../image/direct.png"});
            chrome.action.setBadgeText({text:""});
        }
        chrome.proxy.settings.set({value: config, scope: 'regular'},function() {});
        if(proxy.color){
            var r = parseInt(proxy.color.substr(0,2),16);
            var g = parseInt(proxy.color.substr(2,2),16);
            var b = parseInt(proxy.color.substr(4,2),16);
            chrome.action.setBadgeBackgroundColor({color:[r,g,b,255]});
        }
        chrome.action.setTitle({title:title});
        
        if(callback) callback();
        return true;
    }
    ,cycle_proxy : function(e){
        TS.load_config(function() {
            var currentIdx = TS.config.current_proxy_index;
            var list = TS.config.proxy_list;
            var len = list.length;
            
            var next_index = -1;
            for(var i=1; i<len; i++){
                var j = (currentIdx + i) % len;
                if(list[j].enable){
                    next_index = j;
                    break;
                }
            }

            if( next_index == -1 ){
                if(list[currentIdx] && list[currentIdx].enable){
                    next_index = currentIdx;
                }else{
                    for(var i=0; i<len; i++){
                        if(list[i].enable){
                            next_index = i;
                            break;
                        }
                    }
                }
            }

            if( next_index == -1 ){
                chrome.tabs.create({url: chrome.runtime.getURL("asset/html/options.html?first=1")}, function(tab){});
                return;
            }

            TS.change_proxy(next_index, function(){
                TS.config.current_proxy_index = next_index;
                TS.save_config();
            });
        });
    }
    ,load_config : function(callback){
        var self = this;
        console.log("ts.js: load_config called");
        chrome.storage.local.get('switch_config', function(result) {
            console.log("ts.js: storage result:", JSON.stringify(result));
            var config;
            if (result && result.switch_config && result.switch_config.length > 0) {
                try {
                    config = JSON.parse(result.switch_config);
                    console.log("ts.js: parsed config successfully");
                } catch (err) {
                    console.log("ts.js: Parse error, using default:", err);
                    config = JSON.parse(JSON.stringify(self.default_config));
                }
            } else {
                console.log("ts.js: No stored config, using default");
                config = JSON.parse(JSON.stringify(self.default_config));
            }
            
            // 确保必要的字段存在
            var keys = ['click_action', 'use_default_proxy', 'current_proxy_index'];
            for (var i = 0; i < keys.length; i++) {
                if (config[keys[i]] === undefined) {
                    config[keys[i]] = self.default_config[keys[i]];
                }
            }
            
            // 确保 proxy_list 存在
            if (!config.proxy_list || !Array.isArray(config.proxy_list) || config.proxy_list.length === 0) {
                console.log("ts.js: proxy_list invalid, using default");
                config.proxy_list = JSON.parse(JSON.stringify(self.default_config.proxy_list));
            }
            
            self.config = config;
            console.log("ts.js: Final config:", JSON.stringify(config));
            if (callback) callback(config);
        });
    }
    ,save_config : function(){
        var self = this;
        if (!this.config) {
            console.log("ts.js: No config to save!");
            return;
        }
        var configStr = JSON.stringify(this.config);
        console.log("ts.js: Saving config:", configStr);
        chrome.storage.local.set({switch_config: configStr}, function() {
            if (chrome.runtime.lastError) {
                console.log("ts.js: Save error:", chrome.runtime.lastError);
            } else {
                console.log("ts.js: Config saved successfully");
            }
        });
    }
}
