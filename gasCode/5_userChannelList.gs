// Compiled using ts2gas 3.6.4 (TypeScript 4.1.5)
function createUserList(token) {
    var members = usersListAPI(token);
    var userList = {};
    for (var i = 0; i < members.length; i++) {
        var member = members[i];
        var id = member["id"];
        var profile = member["profile"];
        var name = (profile["display_name"] == "") ? profile["real_name"] : profile["display_name"];
        userList[id] = name;
    }
    return userList;
}
function createChannelList(token) {
    var channels = conversationsListAPI(token);
    var channelList = {};
    for (var i = 0; i < channels.length; i++) {
        var channel = channels[i];
        var id = channel["id"];
        var name = channel["name"];
        channelList[id] = name;
    }
    return channelList;
}
function saveChannelList(token, reset) {
    // reset===falseの時は、channelList.json にデータが残っていれば更新しない
    var filePath = "jsonLog/0_channelList.json";
    var oldChList;
    if (filePathToID(filePath) === "") { // ファイルが存在しない
        oldChList = {};
    }
    else {
        oldChList = loadJsonFileContent(filePath);
    }
    if (reset || Object.keys(oldChList).length === 0) { // reset===true か ファイルが空 だったらchannnelList更新
        var channelList = createChannelList(token);
        saveJson(filePath, channelList);
        Logger.log("Log:\tsaved 0_channelList.json.");
        // saveLogのTrigger設定(10分間隔)
        ScriptApp.newTrigger("updateLog").timeBased().everyMinutes(10).create();
        Logger.log("Log:\tset trigger for updateLog().");
    }
}
