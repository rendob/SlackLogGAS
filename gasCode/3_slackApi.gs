// Compiled using ts2gas 3.6.4 (TypeScript 4.1.5)
// Slack APIを叩く関数群。エラー処理後の値(jsonオブジェクト)を返す
function emojiListAPI(token) {
    var url = "https://slack.com/api/emoji.list";
    var payload = {
        "token": token
    };
    var params = {
        "method": "get",
        "payload": payload
    };
    var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    if (!response["ok"]) {
        throw new Error("Slack API Error: emoji.list\n\t" + response["error"]);
    }
    return response["emoji"];
}
function usersListAPI(token) {
    var url = "https://slack.com/api/users.list";
    var payload = {
        "token": token
    };
    var params = {
        "method": "get",
        "payload": payload
    };
    var members = [];
    while (true) {
        var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: users.list\n\t" + response["error"]);
        }
        members = members.concat(response["members"]);
        if (response["response_metadata"]["next_cursor"]) { // next_cursorが存在していればループ
            payload["cursor"] = response["response_metadata"]["next_cursor"];
        }
        else {
            break;
        }
    }
    return members;
}
function conversationsListAPI(token) {
    var url = "https://slack.com/api/conversations.list";
    var payload = {
        "token": token,
        "types": "public_channel, private_channel"
    };
    var params = {
        "method": "get",
        "payload": payload
    };
    var channels = [];
    while (true) {
        var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: conversations.list\n\t" + response["error"]);
        }
        channels = channels.concat(response["channels"]);
        if (response["response_metadata"]["next_cursor"]) {
            payload["cursor"] = response["response_metadata"]["next_cursor"];
        }
        else {
            break;
        }
    }
    return channels;
}
function chatDeleteAPI(token, channelID, ts) {
    var url = "https://slack.com/api/chat.delete";
    var payload = {
        "token": token,
        "channel": channelID,
        "ts": ts
    };
    var params = {
        "method": "post",
        "payload": payload
    };
    var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    if (!response["ok"]) {
        throw new Error("Slack API Error: chat.delete\n\t" + response["error"]);
    }
}
function filesDeleteAPI(token, fileID) {
    var url = "https://slack.com/api/files.delete";
    var payload = {
        "token": token,
        "file": fileID
    };
    var params = {
        "method": "post",
        "payload": payload
    };
    var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
    if (!response["ok"]) {
        throw new Error("Slack API Error: files.delete\n\t" + response["error"]);
    }
}
function conversationsRepliesAPI(token, channelID, threadTs) {
    var url = "https://slack.com/api/conversations.replies";
    var payload = {
        "token": token,
        "channel": channelID,
        "ts": threadTs,
        "limit": 100 // 200以下推奨
    };
    var params = {
        "method": "get",
        "payload": payload
    };
    var replies = [];
    while (true) {
        var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: conversations.replies\n\t" + response["error"]);
        }
        replies = replies.concat(response["messages"]);
        if (response["has_more"]) {
            payload["cursor"] = response["response_metadata"]["next_cursor"];
        }
        else {
            break;
        }
    }
    return replies; // 親から始まる古い順
}
function conversationsHistoryAPI(token, channelID) {
    var url = "https://slack.com/api/conversations.history";
    var payload = {
        "token": token,
        "channel": channelID,
        "limit": 200 // 200以下推奨
    };
    var params = {
        "method": "get",
        "payload": payload
    };
    var msgs = [];
    while (true) {
        var response = JSON.parse(UrlFetchApp.fetch(url, params).getContentText());
        if (!response["ok"]) {
            throw new Error("Slack API Error: conversations.history\n\t" + response["error"]);
        }
        msgs = msgs.concat(response["messages"]);
        if (response["has_more"]) {
            payload["cursor"] = response["response_metadata"]["next_cursor"];
            Logger.log("loop!");
        }
        else {
            break;
        }
    }
    return msgs.reverse(); // 新しい順なので逆にして古い順で返す
}
