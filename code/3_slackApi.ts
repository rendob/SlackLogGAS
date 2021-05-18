// Slack APIを叩く関数群。エラー処理後の値(jsonオブジェクト)を返す

function emojiListAPI(token: string): emojiList {  // カスタム絵文字のリストを取得
    let url: string = "https://slack.com/api/emoji.list";
    let payload = {
        "token": token
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "get",
        "payload": payload
    };

    let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    if (!response["ok"]) {
        throw new Error("Slack API Error: emoji.list\n\t" + response["error"]);
    }

    return response["emoji"];
}

function usersListAPI(token: string): object[] {  // userのリストを取得(cursor対応)
    let url: string = "https://slack.com/api/users.list";
    let payload = {
        "token": token
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "get",
        "payload": payload
    };

    let members: object[] = [];
    while (true) {
        let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: users.list\n\t" + response["error"]);
        }

        members = members.concat(response["members"]);

        if (response["response_metadata"]["next_cursor"]) {  // next_cursorが存在していればループ
            payload["cursor"] = response["response_metadata"]["next_cursor"];
        } else {
            break;
        }
    }
    
    return members;
}

function conversationsListAPI(token: string): object[] {  // channelのリストを取得(cursor対応)
    let url: string = "https://slack.com/api/conversations.list";
    let payload = {
        "token": token,
        "types": "public_channel, private_channel"
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "get",
        "payload": payload
    };
  
    let channels: object[] = [];
    while (true) {
        let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: conversations.list\n\t" + response["error"]);
        }

        channels = channels.concat(response["channels"]);

        if (response["response_metadata"]["next_cursor"]) {
            payload["cursor"] = response["response_metadata"]["next_cursor"];
        } else {
            break;
        }
    }
    
    return channels;
}

function chatDeleteAPI(token: string, channelID: string, ts: string): void {  // channelIDのチャンネルのtsのメッセージを削除
    let url: string = "https://slack.com/api/chat.delete";
    let payload = {
        "token": token,
        "channel": channelID,
        "ts": ts
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "post",
        "payload": payload
    }

    let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    if (!response["ok"]) {
        throw new Error("Slack API Error: chat.delete\n\t" + response["error"]);
    }
}

function filesDeleteAPI(token: string, fileID: string): void {
    let url: string = "https://slack.com/api/files.delete";
    let payload = {
        "token": token,
        "file": fileID
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "post",
        "payload": payload
    }

    let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    if (!response["ok"]) {
        throw new Error("Slack API Error: files.delete\n\t" + response["error"]);
    }
}

function conversationsRepliesAPI(token: string, channelID: string, threadTs: string): object[] {  // channelID中のthreadTsのスレッドのメッセージを取得(cursor対応)
    let url: string = "https://slack.com/api/conversations.replies";
    let payload = {
        "token": token,
        "channel": channelID,
        "ts": threadTs,
        "limit": 100  // 200以下推奨
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "get",
        "payload": payload
    };

    let replies: object[] = [];
    while (true) {
        let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: conversations.replies\n\t" + response["error"]);
        }

        replies = replies.concat(response["messages"]);

        if (response["has_more"]) {
            payload["cursor"] = response["response_metadata"]["next_cursor"];
        } else {
            break;
        }
    }
    
    return replies;  // 親から始まる古い順
}

function conversationsHistoryAPI(token: string, channelID: string): object[] {  // channelIDのメッセージ(スレッド以外)を取得(cursor対応)
    let url: string = "https://slack.com/api/conversations.history";
    let payload = {
        "token": token,
        "channel": channelID,
        "limit": 200  // 200以下推奨
    };
    let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        "method": "get",
        "payload": payload
    };

    let msgs: object[] = [];
    while (true) {
        let response: GoogleAppsScript.URL_Fetch.HTTPResponse = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: conversations.history\n\t" + response["error"]);
        }

        msgs = msgs.concat(response["messages"]);

        if (response["has_more"]) {
            payload["cursor"] = response["response_metadata"]["next_cursor"];
            Logger.log("loop!");
        } else {
            break;
        }
    }

    return msgs.reverse();  // 新しい順なので逆にして古い順で返す
}