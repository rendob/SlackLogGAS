// Compiled using ts2gas 3.6.4 (TypeScript 4.1.5)
function isLogged(msg) {
    // メッセージの最初に"--noLog--"ってついてたらそのメッセージはログに残さない
    var text = msg["text"];
    if (text.indexOf("--noLog--") == 0) {
        return false;
    }
    else {
        return true;
    }
}
function isParent(msg) {
    return (msg["subtype"] != "thread_broadcast") && ("reply_count" in msg);
}
function isChild(msg) {
    return (msg["subtype"] != "thread_broadcast") && ("parent_user_id" in msg);
}
function isBroadcast(msg) {
    return (msg["subtype"] == "thread_broadcast");
}
function isBroadcastInThread(msg) {
    return (msg["subtype"] == "thread_broadcast") && (msg["broadcast_type"] == "in_thread");
}
function isBroadcastInChannel(msg) {
    return (msg["subtype"] == "thread_broadcast") && (msg["broadcast_type"] == "in_channel");
}
function deleteMsg(token, channelID, msg) {
    var files;
    if ("files" in msg) {
        files = msg["files"];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            filesDeleteAPI(token, file["id"]);
        }
    }
    chatDeleteAPI(token, channelID, msg["ts"]);
}
function threadToJson(token, channelID, threadTs) {
    var replies = conversationsRepliesAPI(token, channelID, threadTs);
    replies.shift(); // 親メッセージを削除 (親がdeletedの場合でも問題なさそう)
    var msgs = [];
    for (var i = 0; i < replies.length; i++) {
        var reply = replies[i];
        if (isLogged(reply)) {
            if (isBroadcast(reply)) { // チャンネルにも送られていたらその情報を追加
                reply["broadcast_type"] = "in_thread";
            }
            msgs.push(reply);
        }
        else {
            deleteMsg(token, channelID, reply);
        }
    }
    return msgs;
}
function insertThreads(token, channelID, msgs) {
    var msgThreads = [];
    for (var i = 0; i < msgs.length; i++) {
        var msg = msgs[i];
        if (isLogged(msg)) { // msgを答えに追加
            if (isBroadcast(msg)) { // スレッドに返信されたメッセージ
                msg["broadcast_type"] = "in_channel";
            }
            msgThreads.push(msg);
        }
        else { // メッセージ削除
            deleteMsg(token, channelID, msg);
        }
        if (isParent(msg)) { // スレッドの親
            var threads = threadToJson(token, channelID, msg["thread_ts"]);
            Array.prototype.push.apply(msgThreads, threads); // msgThreadsに結合. concatよりこっちの方が速いらしい
        }
    }
    return msgThreads;
}
function sortFunc(msg1, msg2) {
    var threadTs1 = ("thread_ts" in msg1) ? Number(msg1["thread_ts"]) : Number(msg1["ts"]);
    var threadTs2 = ("thread_ts" in msg2) ? Number(msg2["thread_ts"]) : Number(msg2["ts"]);
    if (threadTs1 == threadTs2) { // 同一スレッド. tsで比較
        return (Number(msg1["ts"]) - Number(msg2["ts"]));
    }
    else {
        return (threadTs1 - threadTs2);
    }
}
function concatMsg(oldMsgs, newMsgs) {
    // 被りを消す
    var borderTs = Number((newMsgs[0])["ts"]); // 先頭のmsgが一番古いはず. old中のこれより古いmsgは残す
    var msgs = oldMsgs.filter(function (msg) { return (Number(msg["ts"]) < borderTs); });
    Array.prototype.push.apply(msgs, newMsgs);
    msgs.sort(sortFunc);
    return msgs;
}
function msgsToJson(token, channelID) {
    var msgs = conversationsHistoryAPI(token, channelID);
    var filePath = "jsonLog/" + channelID + ".json";
    var newMessages = insertThreads(token, channelID, msgs); // スレッドも含めた全メッセージ
    var fileID = filePathToID(filePath);
    if (fileID == "") { // ファイルが存在しなければ
        saveJson(filePath, newMessages);
    }
    else { // ファイルが存在していれば
        var oldMessages = loadJsonFileContent(filePath);
        newMessages = concatMsg(oldMessages, newMessages);
        saveJson(filePath, newMessages);
    }
    return newMessages;
}
