// Compiled using ts2gas 3.6.4 (TypeScript 4.1.5)
var MsgClass;
(function (MsgClass) {
    MsgClass["normal"] = "msg-normal";
    MsgClass["parent"] = "msg-parent";
    MsgClass["child"] = "msg-child";
    MsgClass["broadcastInChannel"] = "broadcast-in-channel";
    MsgClass["broadcastInThread"] = "broadcast-in-thread";
    MsgClass["join"] = "msg-join";
    MsgClass["topic"] = "msg-topic"; // トピックを設定しました
})(MsgClass || (MsgClass = {}));
;
var TextClass;
(function (TextClass) {
    TextClass["blocks"] = "blocks";
    TextClass["section"] = "section";
    TextClass["name"] = "name";
    TextClass["date"] = "date";
    TextClass["plain"] = "text-plain";
    TextClass["bold"] = "text-bold";
    TextClass["italic"] = "text-italic";
    TextClass["strikethrough"] = "text-strikethrough";
    TextClass["code"] = "text-code";
    TextClass["codeBlock"] = "text-code-block";
    TextClass["orderedList"] = "text-ordered-list";
    TextClass["bulletedList"] = "text-bulleted-list";
    TextClass["quote"] = "text-quote";
    TextClass["mention"] = "text-mention";
    TextClass["broadcast"] = "text-broadcast";
    TextClass["channel"] = "text-channel";
    TextClass["reactions"] = "reactions";
    TextClass["reaction"] = "reaction";
    TextClass["files"] = "files"; // ファイルまとめて(div)
})(TextClass || (TextClass = {}));
; // link
var indentUnit = "\t";
var ulStyleTypes = ["disc", "circle", "square"]; // 番号なしリストの開始記号
var olStyleTypes = ["decimal", "lower-alpha", "lower-roman"]; // 番号つきリストの開始記号
function judgeMsgClass(msg) {
    if (isParent(msg)) {
        return MsgClass.parent;
    }
    else if (isChild(msg)) {
        return MsgClass.child;
    }
    else if (isBroadcastInChannel(msg)) {
        return MsgClass.broadcastInChannel;
    }
    else if (isBroadcastInThread(msg)) {
        return MsgClass.broadcastInThread;
    }
    else if (msg["subtype"] === "channel_join") {
        return MsgClass.join;
    }
    else if (msg["subtype"] === "channel_topic") {
        return MsgClass.topic;
    }
    else {
        return MsgClass.normal;
    }
}
function msgUserId(msg) {
    if ("user" in msg) {
        return msg["user"];
    }
    else if ("username" in msg) {
        return msg["username"];
    }
    else if ("bot_id" in msg) {
        return msg["bot_id"];
    }
    else {
        Logger.log("Warning:\tcould't find user ID.");
        Logger.log(msg);
        return "(unknown user)";
    }
}
function msgUserName(msg, userList) {
    var userId = msgUserId(msg);
    var name = (userId in userList) ? userList[userId] : userId;
    return name;
}
function tsToDate(ts) {
    var dateObj = new Date(ts * 1000);
    var year = dateObj.getFullYear();
    var month = dateObj.getMonth() + 1;
    var date = dateObj.getDate();
    var hour = dateObj.getHours();
    var minute = dateObj.getMinutes();
    return year + "/" + month + "/" + date + " " + hour + ":" + minute; // ゼロパディングはしていない
}
function parseBlocks(blocks, indentNum, userList, channelList, emojiList) {
    var indent = indentUnit.repeat(indentNum);
    var htmlText = "";
    // 再帰的にblockをparse
    for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        switch (block["type"]) {
            case "rich_text": // text全体
                htmlText += indent + "<p class=\"" + TextClass.blocks + "\">\n";
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += indent + "</p>\n";
                break;
            case "rich_text_section": // (リスト化などしてない)普通のtext
                htmlText += indent + "<div class=\"" + TextClass.section + "\">\n";
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += indent + "</div>\n";
                break;
            case "rich_text_list":
                var nestLevel = ("indent" in block) ? Number(block["indent"]) : 0; // 入れ子のリストのレベル
                var listIndent = nestLevel * 20; // 適当
                var tag = void 0;
                var cls = void 0;
                var listStyleType = void 0; // 開始記号
                switch (block["style"]) {
                    case "ordered":
                        tag = "ol";
                        cls = TextClass.orderedList;
                        listStyleType = olStyleTypes[nestLevel % 3];
                        break;
                    case "bullet":
                        tag = "ul";
                        cls = TextClass.bulletedList;
                        listStyleType = ulStyleTypes[nestLevel % 3];
                        break;
                    default:
                        Logger.log("Warning:\tunknown list\n");
                        Logger.log(block);
                        tag = "ul";
                        cls = TextClass.bulletedList;
                        listStyleType = ulStyleTypes[nestLevel % 3];
                        break;
                }
                htmlText += indent + "<" + tag + " class=\"" + cls + "\" style=\"padding-left: " + (25 + listIndent) + "px; list-style-type: " + listStyleType + ";\">\n";
                for (var j = 0; j < block["elements"].length; j++) {
                    var element = block["elements"][j];
                    htmlText += indent + indentUnit + "<li>\n";
                    htmlText += parseBlocks([element], indentNum + 2, userList, channelList, emojiList);
                    htmlText += indent + indentUnit + "</li>\n";
                }
                htmlText += indent + "</" + tag + ">\n";
                break;
            case "rich_text_quote":
                htmlText += indent + "<div class=\"" + TextClass.quote + "\">\n";
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += indent + "</div>\n";
                break;
            case "rich_text_preformatted":
                htmlText += indent + "<div class=\"" + TextClass.codeBlock + "\">\n";
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += indent + "</div>\n";
                break;
            // leaf
            case "text": // 普通のtext. 太字, 斜体, 取り消し, インラインコード含む
                var innerText = block["text"].replace(/\r?\n/g, "<br>");
                if ("style" in block) {
                    var style = block["style"];
                    var prefix = "";
                    var suffix = "";
                    if (style["bold"] === true) {
                        prefix += "<span class=\"" + TextClass.bold + "\">";
                        suffix = "</span>" + suffix;
                    }
                    if (style["italic"] === true) {
                        prefix += "<span class=\"" + TextClass.italic + "\">";
                        suffix = "</span>" + suffix;
                    }
                    if (style["strike"] === true) {
                        prefix += "<span class=\"" + TextClass.strikethrough + "\">";
                        suffix = "</span>" + suffix;
                    }
                    if (style["code"] === true) {
                        prefix += "<span class=\"" + TextClass.code + "\">";
                        suffix = "</span>" + suffix;
                    }
                    htmlText += indent + prefix + innerText + suffix + "\n";
                }
                else {
                    htmlText += indent + innerText + "\n";
                }
                break;
            case "emoji": // 絵文字
                var emojiName = block["name"];
                var _a = searchEmoji(emojiName, emojiList), code = _a.code, isCustom = _a.isCustom;
                if (isCustom) { // カスタム絵文字
                    var imgSize = 16;
                    htmlText += indent + "<img src=\"" + code + "\" title=\"" + emojiName + "\" width=\"" + imgSize + "\" height=\"" + imgSize + "\">\n";
                }
                else { // 組み込み絵文字
                    htmlText += indent + code + "\n";
                }
                break;
            case "link": // リンク(mailも大丈夫っぽい)
                htmlText += indent + "<a href=\"" + block["url"] + "\">\n";
                // styleのparse
                block["type"] = "text";
                if (!("text" in block)) { // urlを直接貼るとtextプロパティが空になってるのでtextにコピーしておく
                    block["text"] = block["url"];
                }
                htmlText += parseBlocks([block], indentNum + 1, userList, channelList, emojiList);
                htmlText += indent + "</a>\n";
                break;
            case "user": // メンション
                var userId = block["user_id"];
                var userName = (userId in userList) ? userList[userId] : userId;
                htmlText += indent + "<span class=\"" + TextClass.mention + "\">@";
                htmlText += userName + "</span>\n";
                break;
            case "broadcast": // @channel, @here, etc.
                htmlText += indent + "<span class=\"" + TextClass.broadcast + "\">@";
                htmlText += block["range"] + "</span>\n";
                break;
            case "channel":
                htmlText += indent + "<span class=\"" + TextClass.channel + "\">#";
                var chID = block["channel_id"];
                var channelName = (chID in channelList) ? channelList[chID] : chID;
                htmlText += channelName + "</span>\n";
                break;
        }
    }
    return htmlText;
}
function parseUser(rawText, userList) {
    var parsedText = rawText;
    while (true) {
        var tmp_i = parsedText.indexOf("<@");
        if (tmp_i === -1) {
            break;
        }
        else { // メッセージ中に書いた "<" は "&lt;" に変換されるので、"<@" があれば確実にメンション
            var tmp_j = parsedText.slice(tmp_i).indexOf(">");
            var userId = parsedText.slice(tmp_i + 2, tmp_i + tmp_j);
            var userName = (userId in userList) ? userList[userId] : userId;
            if (tmp_i + tmp_j + 1 === parsedText.length) {
                parsedText = parsedText.slice(0, tmp_i) + "<span class=\"" + TextClass.mention + "\">@" + userName + "</span>";
            }
            else {
                parsedText = parsedText.slice(0, tmp_i) + "<span class=\"" + TextClass.mention + "\">@" + userName + "</span> " + parsedText.slice(tmp_i + tmp_j + 1);
            }
        }
    }
    return parsedText;
}
function filesToHtml(token, msg) {
    var htmlText = "";
    if ("files" in msg) {
        htmlText += indentUnit + "<div class=\"" + TextClass.files + "\">\n";
        var indent = indentUnit.repeat(2);
        var slackFiles = msg["files"];
        for (var i = 0; i < slackFiles.length; i++) {
            var slackFile = slackFiles[i];
            if (slackFile["mode"] === "tombstone") continue;
            var _a = saveFile(token, slackFile), driveFileId = _a.driveFileId, isImg = _a.isImg; // ドライブ上でのid
            if (isImg) { // 画像はそのまま表示
                htmlText += indent + "<img border=\"1\" src=\"https://drive.google.com/uc?export=view&id=" + driveFileId + "\" width=\"25%\">\n";
            }
            else { // それ以外はリンク
                var driveFile = DriveApp.getFileById(driveFileId);
                var driveUrl = driveFile.getUrl();
                htmlText += indent + "<a href=\"" + driveUrl + "\">" + slackFile["name"] + "</a>\n";
            }
        }
        htmlText += indentUnit + "</div>\n";
    }
    return htmlText;
}
function reactionsToHtml(msg, emojiList) {
    var htmlText = "";
    if ("reactions" in msg) {
        htmlText += indentUnit;
        var reactions = msg["reactions"];
        var reactionSize = 14;
        for (var i = 0; i < reactions.length; i++) {
            var reaction = reactions[i];
            var name = reaction["name"];
            var count = reaction["count"];
            var _a = searchEmoji(name, emojiList), code = _a.code, isCustom = _a.isCustom;
            htmlText += "<span class=\"" + TextClass.reaction + "\">";
            if (isCustom) { // カスタム絵文字
                htmlText += "<img src=\"" + code + "\" title=\"" + name + "\" width=\"" + reactionSize + "\" height=\"" + reactionSize + "\">";
            }
            else {
                htmlText += code;
            }
            htmlText += count + "</span>";
        }
        htmlText += "\n";
    }
    return htmlText;
}
function msgToHtml(msg, showName, token, channelList, userList, emojiList) {
    var htmlText = "<div class=\"" + judgeMsgClass(msg) + "\">\n";
    if (showName) {
        // name
        htmlText += indentUnit + "<div class=\"" + TextClass.name + "\">" + msgUserName(msg, userList) + "</div>\n";
        // date
        htmlText += indentUnit + "<div class=\"" + TextClass.date + "\">" + tsToDate(Number(msg["ts"])) + "</div>\n";
    }
    // text
    if ("blocks" in msg) {
        htmlText += parseBlocks(msg["blocks"], 1, userList, channelList, emojiList);
    }
    else { // 古いmsgとかファイルだけのmsgとか. join, topicもこっち
        htmlText += indentUnit + "<p class=\"" + TextClass.section + "\">\n";
        var rawText = msg["text"].replace(/\r?\n/g, "<br>");
        htmlText += indentUnit.repeat(2) + parseUser(rawText, userList) + "\n";
        htmlText += indentUnit + "</p>\n";
    }
    // file
    htmlText += filesToHtml(token, msg);
    // reaction
    htmlText += reactionsToHtml(msg, emojiList);
    htmlText += "</div>\n";
    return htmlText;
}
function isIndependent(curMsg, prevMsg) {
    if (msgUserId(curMsg) !== msgUserId(prevMsg)) { // ユーザが違う
        return true;
    }
    // ts
    var timeInterval = Number(curMsg["ts"]) - Number(prevMsg["ts"]);
    if (timeInterval >= 300) { // 5分以上間隔が空いてる
        return true;
    }
    var curIsNormal = (judgeMsgClass(curMsg) === MsgClass.normal);
    var prevIsNormal = ((judgeMsgClass(prevMsg) === MsgClass.normal) || isBroadcastInChannel(prevMsg));
    return !(curIsNormal && prevIsNormal);
}
function createHtml(msgJsons, channelID, token, userList, channelList, emojiList) {
    var htmlText = "<h1>" + channelList[channelID] + "</h1>\n";
    for (var i = 0; i < msgJsons.length; i++) {
        var msg = msgJsons[i];
        // 前のメッセージと分離するか結合するか
        var showName = void 0;
        if (i === 0) {
            showName = true;
        }
        else {
            var prevMsg = msgJsons[i - 1];
            showName = isIndependent(msg, prevMsg);
        }
        // msgをhtmlに変換してhtmlTextに追加
        htmlText += msgToHtml(msg, showName, token, channelList, userList, emojiList);
    }
    // 保存
    var filePath = "htmlLog/" + channelID + ".html";
    saveTxt(filePath, htmlText);
}
