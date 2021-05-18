type userList = {[id: string]: string};
function createUserList(token: string): userList {  // ユーザのリストを取得
    let members: object[] = usersListAPI(token);

    let userList: userList = {};
    for (var i = 0; i < members.length; i++) {
        let member: object = members[i];
        let id: string = member["id"];
        let profile: object = member["profile"];
        let name: string = (profile["display_name"] == "") ? profile["real_name"] : profile["display_name"];
        userList[id] = name;
    }

    return userList;
}


type channelList = {[id: string]: string};  // python とは違うので注意
function createChannelList(token: string): channelList {  // public, privateチャンネルのリストを取得。DMは見ていない
    let channels: object[] = conversationsListAPI(token);

    let channelList: channelList = {};
    for (var i = 0; i < channels.length; i++) {
        let channel: object = channels[i];
        let id: string = channel["id"];
        let name: string = channel["name"];
        channelList[id] = name;
    }

    return channelList;
}

function saveChannelList(token: string, reset: boolean): void {  // ログを取りたいチャンネルのリストを"jsonLog/channelList.json"に書き出す
    // reset===falseの時は、channelList.json にデータが残っていれば更新しない
    let filePath: string = "jsonLog/0_channelList.json";
    let oldChList: channelList;
    if (filePathToID(filePath) === "") {  // ファイルが存在しない
        oldChList = {};
    } else {
        oldChList= loadJsonFileContent(filePath);
    }
    
    if (reset || Object.keys(oldChList).length === 0) {  // reset===true か ファイルが空 だったらchannnelList更新
        let channelList: channelList = createChannelList(token);
        saveJson(filePath, channelList);
        Logger.log("Log:\tsaved 0_channelList.json.");

        // saveLogのTrigger設定(10分間隔)
        ScriptApp.newTrigger("updateLog").timeBased().everyMinutes(10).create();
        Logger.log("Log:\tset trigger for updateLog().");
    }
}