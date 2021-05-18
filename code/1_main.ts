// 下2行の赤文字のところを自分用に変えてください！
const rootFolderID: string = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";  // Googleドライブの「SlackLog」フォルダのID
const token: string = "xoxp-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";  // Slackアプリのトークン


// ここから下は書き換えないでください！


function initalSetting(): void {
    let folders: string[] = ["jsonLog", "htmlLog", "fileLog"];
    for (var i = 0; i < folders.length; i++) {
        let folderPath: string = folders[i];
        createFolder(folderPath);
    }

    // fileLogの共有設定
    let fileLogId: string = folderPathToID("fileLog");
    let fileLogFolder: GoogleFolder = DriveApp.getFolderById(fileLogId);
    fileLogFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // updateChannelListのトリガー設定(30日おきにam2-3時の間に実行)
    ScriptApp.newTrigger("updateChannelList").timeBased().atHour(2).everyDays(30).create();
    Logger.log("Log:\tset trigger for updateChannelList().");

    // テスト用にupdateChannelListを1回実行しておいた方がいいかも
    updateChannelList();
}


function updateChannelList(): void {
    saveChannelList(token, false);
}


function updateLog(): void {
    saveLog(token, false);
}

function saveLog(token: string, all: boolean): void {  // channelList中のチャンネルのログをjsonLogに保存. all=trueなら複数のchannelのログを一気に取る
    if (all) {  // 全部一気にログを取る
        let channelList: channelList = createChannelList(token);
        let userList: userList = createUserList(token);
        let emojiList: emojiList = createEmojiList(token);
        for (let chID in channelList) {
            // jsonファイル作成
            let msgJsons: object[] = msgsToJson(token, chID);
            Logger.log(`Log:\tsaved ${chID}.json.`);

            // htmlファイル作成
            createHtml(msgJsons, chID, token, userList, channelList, emojiList);
            Logger.log(`Log:\tsaved ${chID}.html.`);
        }
    } else {  // 1つのチャンネルだけログを取る
        let filePath: string = "jsonLog/0_channelList.json"
        let channelList: channelList = loadJsonFileContent(filePath);

        let chIDs: string[] = Object.keys(channelList);

        if (chIDs.length > 0) {  // ログを取る
            let chID: string = chIDs.pop();
    
            // jsonファイル作成
            let msgJsons: object[] = msgsToJson(token, chID);
            Logger.log(`Log:\tsaved ${chID}.json.`);
    
            // htmlファイル作成
            let userList: userList = createUserList(token);
            let emojiList: emojiList = createEmojiList(token);
            createHtml(msgJsons, chID, token, userList, channelList, emojiList);
            Logger.log(`Log:\tsaved ${chID}.html.`);
    
            // ログを取ったチャンネルをファイルから削除
            delete channelList[chID];
            saveJson(filePath, channelList);
            Logger.log(`Log:\tremoved ${chID} from 0_channelList.json.`);
        } else {  // ログを取るチャンネルがない→updateLogのTriggerの削除
            let triggers: GoogleAppsScript.Script.Trigger[] = ScriptApp.getProjectTriggers();
            for (let i = 0; i < triggers.length; i++) {
                let trigger: GoogleAppsScript.Script.Trigger = triggers[i];
                if (trigger.getHandlerFunction() === "updateLog") {
                    ScriptApp.deleteTrigger(trigger);
                }
            }
            Logger.log("Log:\tfinished logging.")
        }
    }
}

function saveLogOneCh(token: string, chID: string): void {  // chIDのチャンネルのログを取る
    let channelList: channelList = loadJsonFileContent(filePath);

    // jsonファイル作成
    let msgJsons: object[] = msgsToJson(token, chID);
    Logger.log(`Log:\tsaved ${chID}.json.`);

    // htmlファイル作成
    let userList: userList = createUserList(token);
    let emojiList: emojiList = createEmojiList(token);
    createHtml(msgJsons, chID, token, userList, channelList, emojiList);
    Logger.log(`Log:\tsaved ${chID}.html.`);
}


// html表示用
let body: string = "";
function doGet(e): GoogleAppsScript.HTML.HtmlOutput {
    let template: string = "9_index";
    let html: GoogleAppsScript.HTML.HtmlTemplate =  HtmlService.createTemplateFromFile(template);

    return html.evaluate();
}