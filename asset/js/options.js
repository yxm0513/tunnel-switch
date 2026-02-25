function add_proxy_row(index,proxy){
    index += 1;
    if (proxy.mode=='direct'){
        mode="DIRECT";
        detail = "no proxy";
    }else if(proxy.mode=='pac_script'){
        mode="PAC FILE";
        detail = "<a target='_blank' href='" + proxy.pac_script_url + "'>" + proxy.pac_script_url + "</a>";
    }else if(proxy.mode=='fixed_servers'){
        mode="FIXED SERVER";
        detail = proxy.fixed_servers_schema +', '+proxy.fixed_servers_name+', '+proxy.fixed_servers_port;
        if(proxy.fixed_servers_username){
            detail += ' (authenticated)';
        }
    }
    checked = proxy.enable?'checked':'';

    var rows = $("#table_proxy_list").find('tr:eq('+index+')');
    if(rows.length){
        var row= rows.get(0);
    }else{
        var html = "<tr>"+
        "<td><input name='enable' type='checkbox'></td>"+
        "<td class='hidden'><input name='is_default' type='radio'></td>"+
        "<td><span class='color-cell'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></td>"+
        "<td id='mode'></td>"+
        "<td id='detail'></td>"+
        "<td><input title='edit' name='edit' type='image' src='../image/edit-icon.png' width='24'>&nbsp;<input title='delete' name='delete' type='image' src='../image/delete-icon.png' width='24'></td>"+
        "</tr>";
        var row = $(html);
        $('#table_proxy_list').append(row);
        $(row).find("input[name='delete']").click(function(e){
            var table = $(this).closest('table');
            var row = $(this).closest('tr');
            var i= table.find('tr').index(row) -1;
            TS.config.proxy_list.splice(i, 1);
            TS.save_config();
            row.remove();
        });
        $(row).find("input[name='edit']").click(function(e){
            var table = $(this).closest('table');
            var row = $(this).closest('tr');
            var i= table.find('tr').index(row) -1;
            var proxy = TS.config.proxy_list[i];
            open_proxy_setting(proxy,i);
        });
        $(row).find('input[name=enable]').click(function(e){
            var table = $(this).closest('table');
            var row = $(this).closest('tr');
            var i= table.find('tr').index(row) -1;

            var enable = $(row).find('input[name=enable]').is(":checked");
            TS.config.proxy_list[i].enable = enable?1:0;
            TS.save_config();
        });
    }

    if(proxy.enable){
        $(row).find('input[name=enable]').prop('checked',true);
    }else{
        $(row).find('input[name=enable]').prop('checked',false);
    }
    if(proxy.color){
        $(row).find('.color-cell').css("background-color","#"+proxy.color);
    }else{
        $(row).find('.color-cell').css("background-color","#FFFFFF");
    }
    $(row).find("#mode").html(mode);
    $(row).find("#detail").html(detail);

}
function open_proxy_setting(proxy,index){

    var modeSelector = '#proxy_setting input[name="proxy_mode"][value="' + proxy.mode + '"]';
    $(modeSelector).prop('checked', true);
    $("#proxy_setting input:radio[name=proxy_mode]").trigger('change');

    $("#proxy_setting #pac_script_url").val("");
    $("#proxy_setting #fixed_servers_name").val("");
    $("#proxy_setting #fixed_servers_port").val("");
    $("#proxy_setting #fixed_servers_username").val("");
    $("#proxy_setting #fixed_servers_password").val("");
    $("#proxy_setting input:radio[name=fixed_servers_schema][value=socks5]").attr('selected',true);

    var color = $("#proxy_setting #color").get(0);
    color.color.fromString("FFFFFF");

    if(proxy.mode=='direct'){
        var color = $("#proxy_setting #color_direct").get(0);
        if(color && proxy.color){
            color.color.fromString(proxy.color);
        }else if(color){
            color.color.fromString("FFFFFF");
        }
    }else if(proxy.mode=='pac_script'){
        color.color.fromString(proxy.color);
        $("#proxy_setting #pac_script_url").val(proxy.pac_script_url);
    }else if(proxy.mode=='fixed_servers'){
        color.color.fromString(proxy.color);
        $("#proxy_setting #fixed_servers_name").val(proxy.fixed_servers_name);
        $("#proxy_setting #fixed_servers_port").val(proxy.fixed_servers_port);
        $("#proxy_setting #fixed_servers_username").val(proxy.fixed_servers_username || "");
        $("#proxy_setting #fixed_servers_password").val(proxy.fixed_servers_password || "");
        var schemaSelector = '#proxy_setting input[name="fixed_servers_schema"][value="' + proxy.fixed_servers_schema + '"]';
        $(schemaSelector).prop('checked', true);
    }

    ok_btn_text = (index==-1)?'Add':'Update';
    var ok_function = function(){
        if(index==-1){
            var newproxy = {enable:1}
        }else{
            var newproxy = {enable:proxy.enable}
        }
        newproxy['mode'] = $("#proxy_setting input:radio[name=proxy_mode]:checked").val();
        
        // 获取颜色值
        var colorValue = null;
        if(newproxy['mode'] == 'direct'){
            colorValue = $("#proxy_setting #color_direct").val();
        } else {
            colorValue = $("#proxy_setting #color").val();
        }
        
        if(newproxy['mode']=='direct'){
            if(colorValue){
                newproxy['color'] = colorValue;
            }
        }else if(newproxy['mode']=='pac_script'){
            newproxy['pac_script_url'] = $("#proxy_setting #pac_script_url").val();
            if(newproxy['pac_script_url'].length==0 || newproxy['pac_script_url'].search(/[<>]/)!=-1){
                alert('invalid PAC SCRIPT url');
                return;
            }
            newproxy['color'] = colorValue || "009933";
        }else if(newproxy['mode']=='fixed_servers'){
            newproxy['fixed_servers_schema'] = $("#proxy_setting input[name=fixed_servers_schema]:checked ").val();
            newproxy['fixed_servers_name'] = $("#proxy_setting #fixed_servers_name").val();
            newproxy['fixed_servers_port'] = $("#proxy_setting #fixed_servers_port").val();
            
            var username = $("#proxy_setting #fixed_servers_username").val();
            var password = $("#proxy_setting #fixed_servers_password").val();
            if(username){
                newproxy['fixed_servers_username'] = username;
            }
            if(password){
                newproxy['fixed_servers_password'] = password;
            }

            if(newproxy['fixed_servers_name'].length==0 || newproxy['fixed_servers_name'].search(/[<>]/)!=-1){
                alert('invalid proxy server');
                return;
            }
            if(newproxy['fixed_servers_port'].search(/^\d+$/) == -1){
                alert("port number[" + newproxy['fixed_servers_port'] + "] should be an integer");
                return;
            }
            newproxy['color'] = colorValue || "CC0000";
        }

        console.log("Saving new proxy:", JSON.stringify(newproxy));
        
        if(index==-1){
            TS.config.proxy_list.push(newproxy);
            TS.save_config();
            add_proxy_row(TS.config.proxy_list.length-1,newproxy);
        }else{
            TS.config.proxy_list[index] = newproxy;
            TS.save_config();
            add_proxy_row(index,newproxy);
        }
        dialog.dialog("close");
    }
    if(index==-1){
        var buttons =  {
            "Add": ok_function
            ,"Cancel":function(){
                dialog.dialog("close");
            }
        }
    }else{
        var buttons =  {
            "Update": ok_function
            ,"Cancel":function(){
                dialog.dialog("close");
            }
        }
    }
    var dialog = $('#proxy_setting').dialog({
        autoOpen: false
        ,title: 'Edit Proxy'
        ,width:600
        ,modal:true
        ,buttons:buttons
    });
    dialog.dialog('open');
}
function getParameter(paramName) {
  var searchString = window.location.search.substring(1),
      i, val, params = searchString.split("&");

  for (i=0;i<params.length;i++) {
    val = params[i].split("=");
    if (val[0] == paramName) {
      return unescape(val[1]);
    }
  }
  return null;
}
$(document).ready(function(){
    TS.load_config(function(config) {
        TS.config = config;
        $.each(TS.config.proxy_list,add_proxy_row);
    });

    var details = chrome.runtime.getManifest();
    $('#version').html('Version: '+ details.version);

    if(getParameter('first')){
        $('#warning_msg').addClass('red');
    }else{
        $('#warning_msg').addClass('hidden');
    }

    $("#btn_cycle").click(function(e){
        TS.cycle_proxy();
    });

    $("#btn_clear").click(function(e){
        // 先完全清除存储
        chrome.storage.local.clear(function() {
            console.log("Storage cleared");
            // 然后重置为默认配置
            TS.config = JSON.parse(JSON.stringify(TS.default_config));
            TS.save_config();
            $("#table_proxy_list").find('tr:gt(0)').remove();
            $.each(TS.config.proxy_list, function(i, p) {
                add_proxy_row(i, p);
            });
            alert("Settings reset to default. Please reload the extension.");
        });
    });

    $("#btn_add_proxy").click(function(e){
        open_proxy_setting({mode:'direct'},-1);
    });
    $("#proxy_setting input:radio[name=proxy_mode]").change(function(e){
        var mode = $("#proxy_setting input:radio[name=proxy_mode]:checked").val();

        $("#proxy_setting #pac_script_url").attr('disabled',true);
        $("#proxy_setting #fixed_servers_name").attr('disabled',true);
        $("#proxy_setting #fixed_servers_port").attr('disabled',true);
        $("#proxy_setting #fixed_servers_username").attr('disabled',true);
        $("#proxy_setting #fixed_servers_password").attr('disabled',true);
        $("#proxy_setting input:radio[name=fixed_servers_schema]").attr('disabled',true);
        $("#proxy_setting #color").attr('disabled',true);
        $("#proxy_setting #color_direct").attr('disabled',true);

        if(mode=='direct'){
            $("#proxy_setting #color_direct").attr('disabled',false);
        }else if(mode=='pac_script'){
            $("#proxy_setting #pac_script_url").attr('disabled',false);
            $("#proxy_setting #color").attr('disabled',false);
        }else if(mode=='fixed_servers'){
            $("#proxy_setting #fixed_servers_name").attr('disabled',false);
            $("#proxy_setting #fixed_servers_port").attr('disabled',false);
            $("#proxy_setting #fixed_servers_username").attr('disabled',false);
            $("#proxy_setting #fixed_servers_password").attr('disabled',false);
            $("#proxy_setting input:radio[name=fixed_servers_schema]").attr('disabled',false);
            $("#proxy_setting #color").attr('disabled',false);
        }
    });
});
