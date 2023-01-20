function isLogged(msg: object): boolean {  // msgのメッセージはログに残すかどうか
    // メッセージの最初に"--noLog--"ってついてたらそのメッセージはログに残さない
    let text: string = msg["text"];
    if (text.indexOf("--noLog--") == 0) {
        return false;
    } else {
        return true;
    }
}

function isParent(msg: object): boolean {  // スレッドの親
    return (msg["subtype"] != "thread_broadcast") && ("reply_count" in msg);
}
function isChild(msg: object): boolean {  // スレッドの子
    return (msg["subtype"] != "thread_broadcast") && ("parent_user_id" in msg);
}
function isBroadcast(msg: object): boolean {  // スレッドの子でチャンネルにも送られたもの
    return (msg["subtype"] == "thread_broadcast");
}
function isBroadcastInThread(msg: object): boolean {  // スレッドの子でチャンネルにも送られたもの(スレッド側)
    return (msg["subtype"] == "thread_broadcast") && (msg["broadcast_type"] == "in_thread");
}
function isBroadcastInChannel(msg: object): boolean {  // スレッドの子でチャンネルにも送られたもの(チャンネル側)
    return (msg["subtype"] == "thread_broadcast") && (msg["broadcast_type"] == "in_channel");
}

function deleteMsg(token: string, channelID: string, msg: object): void {  // msgとそれに伴うファイルを削除
    let files: object[];
    if ("files" in msg) {
        files = msg["files"];
        for (var i = 0; i < files.length; i++) {
            let file: object = files[i];
            filesDeleteAPI(token, file["id"]);
        }
    }
    chatDeleteAPI(token, channelID, msg["ts"]);
}

function threadToJson(token: string, channelID: string, threadTs: string): object[] {  // ファイルは保存してない
    let replies: object[] = conversationsRepliesAPI(token, channelID, threadTs);
    replies.shift();  // 親メッセージを削除 (親がdeletedの場合でも問題なさそう)
    let msgs: object[] = [];
    for (var i = 0; i < replies.length; i++) {
        let reply: object = replies[i];
        if (isLogged(reply)) {
            if (isBroadcast(reply)) {  // チャンネルにも送られていたらその情報を追加
                reply["broadcast_type"] = "in_thread";
            }
            msgs.push(reply);
        } else {
            deleteMsg(token, channelID, reply);
        }
    }
    
    return msgs;
}

function insertThreads(token: string, channelID: string, msgs: object[]): object[] {  // msgsにスレッドを挿入したものを返す
    let msgThreads: object[] = [];
    for (var i = 0; i < msgs.length; i++) {
        let msg: object = msgs[i];

        if (isLogged(msg)) {  // msgを答えに追加
            if (isBroadcast(msg)) {  // スレッドに返信されたメッセージ
                msg["broadcast_type"] = "in_channel";
            }
            msgThreads.push(msg);
        } else {  // メッセージ削除
            deleteMsg(token, channelID, msg);
        }

        if (isParent(msg)) {  // スレッドの親
            let threads: object[] = threadToJson(token, channelID, msg["thread_ts"]);
            Array.prototype.push.apply(msgThreads, threads);  // msgThreadsに結合. concatよりこっちの方が速いらしい
        }
    }
    return msgThreads;
}

function sortFunc(msg1: object, msg2: object): number {  // msg1 < msg2 なら負, msg1 > msg2 なら正
    let threadTs1: number = ("thread_ts" in msg1) ? Number(msg1["thread_ts"]) : Number(msg1["ts"]);
    let threadTs2: number = ("thread_ts" in msg2) ? Number(msg2["thread_ts"]) : Number(msg2["ts"]);

    if (threadTs1 == threadTs2) {  // 同一スレッド. tsで比較
        return ( Number(msg1["ts"]) - Number(msg2["ts"]) )
    } else {
        return (threadTs1 - threadTs2);
    }
}

function concatMsg(oldMsgs: object[], newMsgs: object[]): object[] {  // oldとnewを結合. 被りの更新 + thread_ts(なければts)順でsort
    // 被りを消す
    if (newMsgs.length === 0) return oldMsgs;
    let borderTs: number = Number((newMsgs[0])["ts"]);  // 先頭のmsgが一番古いはず. old中のこれより古いmsgは残す
    let msgs: object[] = oldMsgs.filter( (msg) => (Number(msg["ts"]) < borderTs) );
    
    Array.prototype.push.apply(msgs, newMsgs);

    msgs.sort(sortFunc);
    
    return msgs;
}

function msgsToJson(token: string, channelID: string): object[] {  // channelIDのチャンネルのメッセージをjsonで保存
    let msgs: object[] = conversationsHistoryAPI(token, channelID);
    let filePath: string = "jsonLog/" + channelID + ".json";
    
    let newMessages: object[] = insertThreads(token, channelID, msgs);  // スレッドも含めた全メッセージ

    let fileID: string = filePathToID(filePath);
    if (fileID == "") {  // ファイルが存在しなければ
        saveJson(filePath, newMessages);
    } else {  // ファイルが存在していれば
        let oldMessages: object[] = loadJsonFileContent(filePath);
        newMessages = concatMsg(oldMessages, newMessages);
        saveJson(filePath, newMessages);
    }

    return newMessages;
}
