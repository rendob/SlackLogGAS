// Compiled using ts2gas 3.6.4 (TypeScript 4.1.5)
// 下2行の赤文字のところを自分用に変えてください！
var rootFolderID = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Googleドライブの「SlackLog」フォルダのID
var token = "xoxp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Slackアプリのトークン
// ここから下は書き換えないでください！
function initalSetting() {
    var folders = ["jsonLog", "htmlLog", "fileLog"];
    for (var i = 0; i < folders.length; i++) {
        var folderPath = folders[i];
        createFolder(folderPath);
    }
    // fileLogの共有設定
    var fileLogId = folderPathToID("fileLog");
    var fileLogFolder = DriveApp.getFolderById(fileLogId);
    fileLogFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    // updateChannelListのトリガー設定(30日おきにam2-3時の間に実行)
    ScriptApp.newTrigger("updateChannelList").timeBased().atHour(2).everyDays(30).create();
    Logger.log("Log:\tset trigger for updateChannelList().");
    // テスト用にupdateChannelListを1回実行しておいた方がいいかも
    updateChannelList();
}
function updateChannelList() {
    saveChannelList(token, false);
}
function updateLog() {
    saveLog(token, false);
}
function test() {
  saveLog(token, true);
}
function saveLog(token, all) {
    if (all) { // 全部一気にログを取る
        var channelList = createChannelList(token);
        var userList = createUserList(token);
        var emojiList = createEmojiList(token);
        for (var chID in channelList) {
            // jsonファイル作成
            var msgJsons = msgsToJson(token, chID);
            Logger.log("Log:\tsaved " + chID + ".json.");
            // htmlファイル作成
            createHtml(msgJsons, chID, token, userList, channelList, emojiList);
            Logger.log("Log:\tsaved " + chID + ".html.");
        }
    }
    else { // 1つのチャンネルだけログを取る
        var filePath = "jsonLog/0_channelList.json";
        var channelList = loadJsonFileContent(filePath);
        var chIDs = Object.keys(channelList);
        if (chIDs.length > 0) { // ログを取る
            var chID = chIDs.pop();
            // jsonファイル作成
            var msgJsons = msgsToJson(token, chID);
            Logger.log("Log:\tsaved " + chID + ".json.");
            // htmlファイル作成
            var userList = createUserList(token);
            var emojiList = createEmojiList(token);
            createHtml(msgJsons, chID, token, userList, channelList, emojiList);
            Logger.log("Log:\tsaved " + chID + ".html.");
            // ログを取ったチャンネルをファイルから削除
            delete channelList[chID];
            saveJson(filePath, channelList);
            Logger.log("Log:\tremoved " + chID + " from 0_channelList.json.");
        }
        else { // ログを取るチャンネルがない→updateLogのTriggerの削除
            var triggers = ScriptApp.getProjectTriggers();
            for (var i = 0; i < triggers.length; i++) {
                var trigger = triggers[i];
                if (trigger.getHandlerFunction() === "updateLog") {
                    ScriptApp.deleteTrigger(trigger);
                }
            }
            Logger.log("Log:\tfinished logging.");
        }
    }
}
function saveLogOneCh(token, chID) {
    var channelList = loadJsonFileContent(filePath);
    // jsonファイル作成
    var msgJsons = msgsToJson(token, chID);
    Logger.log("Log:\tsaved " + chID + ".json.");
    // htmlファイル作成
    var userList = createUserList(token);
    var emojiList = createEmojiList(token);
    createHtml(msgJsons, chID, token, userList, channelList, emojiList);
    Logger.log("Log:\tsaved " + chID + ".html.");
}
// html表示用
var body = "";
function doGet(e) {
    var template = "9_index";
    var html = HtmlService.createTemplateFromFile(template);
    return html.evaluate();
}
