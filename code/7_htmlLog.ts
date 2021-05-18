const enum MsgClass {  // htmlのクラス名(メッセージ)
    normal = "msg-normal",  // 普通のメッセージ
    parent = "msg-parent",  // スレッドの親
    child = "msg-child",  // スレッドの子
    broadcastInChannel = "broadcast-in-channel",  // broadcastのチャンネル側
    broadcastInThread = "broadcast-in-thread",  // broadcastのスレッド側
    join = "msg-join",  // チャンネルに参加しました
    topic = "msg-topic"  // トピックを設定しました
};

const enum TextClass {  // htmlのクラス名(テキスト)
    blocks = "blocks",
    section = "section",
    name = "name",  // 名前
    date = "date",  // 日にち
    plain = "text-plain",  // 普通のテキスト
    bold = "text-bold",  // 太字
    italic = "text-italic",  // 斜体
    strikethrough = "text-strikethrough",  // 取り消し線
    code = "text-code",  // インラインコード
    codeBlock = "text-code-block",  // コードブロック
    orderedList = "text-ordered-list",  // 番号付き箇条書き
    bulletedList = "text-bulleted-list",  // 番号なし箇条書き
    quote = "text-quote",  // 引用
    mention = "text-mention",  // メンション
    broadcast = "text-broadcast",  // @channel, @here, etc.
    channel = "text-channel",  // チャンネル
    reactions = "reactions",  // リアクションまとめて(div)
    reaction = "reaction",  // 個々のリアクション(span)
    files = "files"  // ファイルまとめて(div)
};  // link

const indentUnit: string = "\t";
const ulStyleTypes: string[] = ["disc", "circle", "square"];  // 番号なしリストの開始記号
const olStyleTypes: string[] = ["decimal", "lower-alpha", "lower-roman"]  // 番号つきリストの開始記号


function judgeMsgClass(msg: object): MsgClass {
    if (isParent(msg)) {
        return MsgClass.parent;
    } else if (isChild(msg)) {
        return MsgClass.child;
    } else if (isBroadcastInChannel(msg)) {
        return MsgClass.broadcastInChannel;
    } else if (isBroadcastInThread(msg)) {
        return MsgClass.broadcastInThread;
    } else if (msg["subtype"] === "channel_join") {
        return MsgClass.join;
    } else if (msg["subtype"] === "channel_topic") {
        return MsgClass.topic;
    } else {
        return MsgClass.normal;
    }
}

function msgUserId(msg: object): string {  // メッセージを送信したユーザのIDを返す
    if ("user" in msg) {
        return msg["user"];
    } else if ("username" in msg) {
        return msg["username"];
    } else if ("bot_id" in msg) {
        return msg["bot_id"];
    } else {
        Logger.log("Warning:\tcould't find user ID.");
        Logger.log(msg);
        return "(unknown user)";
    }
}

function msgUserName(msg: object, userList: userList): string {  // メッセージを送信したユーザ名を返す
    let userId: string = msgUserId(msg);
    let name: string = (userId in userList) ? userList[userId] : userId;
    return name;
}

function tsToDate(ts: number): string {  // timestampを日付に変換
    let dateObj: Date = new Date(ts * 1000);
    let year: number = dateObj.getFullYear();
    let month: number = dateObj.getMonth() + 1;
    let date: number = dateObj.getDate();
    let hour: number = dateObj.getHours();
    let minute: number = dateObj.getMinutes();
    
    return `${year}/${month}/${date} ${hour}:${minute}`;  // ゼロパディングはしていない
}


function parseBlocks(blocks: object[], indentNum: number, userList: userList, channelList: channelList, emojiList: emojiList): string {
    let indent: string = indentUnit.repeat(indentNum);
    let htmlText: string = "";
    
    // 再帰的にblockをparse
    for (let i = 0; i < blocks.length; i++) {
        let block: object = blocks[i];
        switch (block["type"]) {
            case "rich_text":  // text全体
                htmlText += `${indent}<p class="${TextClass.blocks}">\n`;
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += `${indent}</p>\n`;
                break;
            case "rich_text_section":  // (リスト化などしてない)普通のtext
                htmlText += `${indent}<div class="${TextClass.section}">\n`;
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += `${indent}</div>\n`;
                break;
            case "rich_text_list":
                let nestLevel: number = ("indent" in block) ? Number(block["indent"]) : 0;  // 入れ子のリストのレベル
                let listIndent: number = nestLevel * 20;  // 適当
                let tag: string;
                let cls: TextClass;
                let listStyleType: string;  // 開始記号
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
                
                htmlText += `${indent}<${tag} class="${cls}" style="padding-left: ${25 + listIndent}px; list-style-type: ${listStyleType};">\n`;
                for (let j = 0; j < block["elements"].length; j++) {
                    let element: object = block["elements"][j];
                    htmlText += `${indent + indentUnit}<li>\n`;
                    htmlText += parseBlocks([element], indentNum + 2, userList, channelList, emojiList);
                    htmlText += `${indent + indentUnit}</li>\n`;
                }
                htmlText += `${indent}</${tag}>\n`;
                break;
            case "rich_text_quote":
                htmlText += `${indent}<div class="${TextClass.quote}">\n`;
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += `${indent}</div>\n`;
                break;
            case "rich_text_preformatted":
                htmlText += `${indent}<div class="${TextClass.codeBlock}">\n`;
                htmlText += parseBlocks(block["elements"], indentNum + 1, userList, channelList, emojiList);
                htmlText += `${indent}</div>\n`;
                break;
            // leaf
            case "text":  // 普通のtext. 太字, 斜体, 取り消し, インラインコード含む
                let innerText: string = block["text"].replace(/\r?\n/g, "<br>");
                if ("style" in block) {
                    let style: object = block["style"];
                    let prefix: string = "";
                    let suffix: string = "";
                    if (style["bold"] === true) {
                        prefix += `<span class="${TextClass.bold}">`;
                        suffix = "</span>" + suffix;
                    }
                    if (style["italic"] === true) {
                        prefix += `<span class="${TextClass.italic}">`;
                        suffix = "</span>" + suffix;
                    }
                    if (style["strike"] === true) {
                        prefix += `<span class="${TextClass.strikethrough}">`;
                        suffix = "</span>" + suffix;
                    }
                    if (style["code"] === true) {
                        prefix += `<span class="${TextClass.code}">`;
                        suffix = "</span>" + suffix;
                    }
                    htmlText += indent + prefix + innerText + suffix + "\n";
                } else {
                    htmlText += indent + innerText + "\n";
                }
                break;
            case "emoji":  // 絵文字
                let emojiName: string = block["name"];
                let {code, isCustom} = searchEmoji(emojiName, emojiList);
                if (isCustom) {  // カスタム絵文字
                    let imgSize: number = 16;
                    htmlText += `${indent}<img src="${code}" title="${emojiName}" width="${imgSize}" height="${imgSize}">\n`;
                } else {  // 組み込み絵文字
                    htmlText += indent + code + "\n";
                }
                break;
            case "link":  // リンク(mailも大丈夫っぽい)
                htmlText += `${indent}<a href="${block["url"]}">\n`;
                // styleのparse
                block["type"] = "text";
                if ( !("text" in block) ) {  // urlを直接貼るとtextプロパティが空になってるのでtextにコピーしておく
                    block["text"] = block["url"];
                }
                htmlText += parseBlocks([block], indentNum + 1, userList, channelList, emojiList);
                htmlText += `${indent}</a>\n`;
                break;
            case "user":  // メンション
                let userId: string = block["user_id"];
                let userName: string = (userId in userList) ? userList[userId] : userId;
                htmlText += `${indent}<span class="${TextClass.mention}">@`;
                htmlText += userName + "</span>\n";
                break;
            case "broadcast":  // @channel, @here, etc.
                htmlText += `${indent}<span class="${TextClass.broadcast}">@`;
                htmlText += block["range"] + "</span>\n";
                break;
            case "channel":
                htmlText += `${indent}<span class="${TextClass.channel}">#`;
                let chID: string = block["channel_id"];
                let channelName: string = (chID in channelList) ? channelList[chID] : chID;
                htmlText += channelName + "</span>\n";
                break;
        }
    }

    return htmlText;
}

function parseUser(rawText: string, userList: userList): string {  // join, topic用, <@(userId)>をユーザ名に変換
    let parsedText: string = rawText
    while (true) {
        let tmp_i: number = parsedText.indexOf("<@");
        if (tmp_i === -1) {
            break;
        } else {  // メッセージ中に書いた "<" は "&lt;" に変換されるので、"<@" があれば確実にメンション
            let tmp_j: number = parsedText.slice(tmp_i).indexOf(">");
            let userId: string = parsedText.slice(tmp_i + 2, tmp_i + tmp_j);
            let userName: string = (userId in userList) ? userList[userId] : userId;
            if (tmp_i + tmp_j + 1 === parsedText.length) {
                parsedText = `${parsedText.slice(0, tmp_i)}<span class="${TextClass.mention}">@${userName}</span>`;
            } else {
                parsedText = `${parsedText.slice(0, tmp_i)}<span class="${TextClass.mention}">@${userName}</span> ${parsedText.slice(tmp_i + tmp_j + 1)}`;
            }
        }
    }
    return parsedText;
}

function filesToHtml(token: string, msg: object): string {  // filesをドライブに保存してhtml化
    let htmlText: string = "";
    if ("files" in msg) {
        htmlText += `${indentUnit}<div class="${TextClass.files}">\n`;
        let indent: string = indentUnit.repeat(2);
        let slackFiles: object[] = msg["files"];
        for (let i = 0; i < slackFiles.length; i++) {
            let slackFile: object = slackFiles[i];
            let {driveFileId, isImg} = saveFile(token, slackFile);  // ドライブ上でのid
            if (isImg) {  // 画像はそのまま表示
                htmlText += `${indent}<img border="1" src="https://drive.google.com/uc?export=view&id=${driveFileId}" width="25%">\n`;
            } else {  // それ以外はリンク
                let driveFile: GoogleFile = DriveApp.getFileById(driveFileId);
                let driveUrl: string = driveFile.getUrl();
                htmlText += `${indent}<a href="${driveUrl}">${slackFile["name"]}</a>\n`;
            }
        }
        htmlText += `${indentUnit}</div>\n`;
    }
    return htmlText;
}

function reactionsToHtml(msg: object, emojiList: emojiList): string {  // reactionsをhtml化
    let htmlText: string = "";
    if ("reactions" in msg) {
        htmlText += indentUnit;
        let reactions: object[] = msg["reactions"];
        let reactionSize: number = 14;
        for (let i = 0; i < reactions.length; i++) {
            let reaction: object = reactions[i];
            let name: string = reaction["name"];
            let count: number = reaction["count"];
            let {code, isCustom} = searchEmoji(name, emojiList);
            htmlText += `<span class="${TextClass.reaction}">`;
            if (isCustom) {  // カスタム絵文字
                htmlText += `<img src="${code}" title="${name}" width="${reactionSize}" height="${reactionSize}">`;
            } else {
                htmlText += code;
            }
            htmlText += `${count}</span>`;
        }
        htmlText += "\n";
    }
    return htmlText;
}

function msgToHtml(msg: object, showName: boolean, token: string, channelList: channelList, userList: userList, emojiList: emojiList): string {  // メッセージをhtml文字列に変換
    let htmlText: string = `<div class="${judgeMsgClass(msg)}">\n`;

    if (showName) {
        // name
        htmlText += `${indentUnit}<div class="${TextClass.name}">${msgUserName(msg, userList)}</div>\n`;
        // date
        htmlText += `${indentUnit}<div class="${TextClass.date}">${tsToDate( Number(msg["ts"]) )}</div>\n`;
    }
    
    // text
    if ("blocks" in msg) {
        htmlText += parseBlocks(msg["blocks"], 1, userList, channelList, emojiList);
    } else {  // 古いmsgとかファイルだけのmsgとか. join, topicもこっち
        htmlText += `${indentUnit}<p class="${TextClass.section}">\n`;
        let rawText: string = msg["text"].replace(/\r?\n/g, "<br>");
        htmlText += indentUnit.repeat(2) + parseUser(rawText, userList) + "\n";
        htmlText += `${indentUnit}</p>\n`;
    }

    // file
    htmlText += filesToHtml(token, msg);

    // reaction
    htmlText += reactionsToHtml(msg, emojiList);
    
    htmlText += "</div>\n";
    return htmlText;
}

function isIndependent(curMsg: object, prevMsg: object): boolean {  // curMsgをprevMsgと独立して表示する(名前を表示)か
    if (msgUserId(curMsg) !== msgUserId(prevMsg)) {  // ユーザが違う
        return true;
    }

    // ts
    let timeInterval: number = Number(curMsg["ts"]) - Number(prevMsg["ts"]);
    if (timeInterval >= 300) {  // 5分以上間隔が空いてる
        return true;
    }

    let curIsNormal: boolean = (judgeMsgClass(curMsg) === MsgClass.normal);
    let prevIsNormal: boolean = ( (judgeMsgClass(prevMsg) === MsgClass.normal) || isBroadcastInChannel(prevMsg) );
    return !(curIsNormal && prevIsNormal);
}

function createHtml(msgJsons: object[], channelID: string, token: string, userList: userList, channelList: channelList, emojiList: emojiList): void {  // jsonDataからhtmlの文字列を出力
    let htmlText: string = `<h1>${channelList[channelID]}</h1>\n`;

    for (let i = 0; i < msgJsons.length; i++) {
        let msg: object = msgJsons[i];

        // 前のメッセージと分離するか結合するか
        let showName: boolean;
        if (i === 0) {
            showName = true;
        } else {
            let prevMsg: object = msgJsons[i - 1];
            showName = isIndependent(msg, prevMsg);
        }
        // msgをhtmlに変換してhtmlTextに追加
        htmlText += msgToHtml(msg, showName, token, channelList, userList, emojiList);
    }

    // 保存
    let filePath: string = `htmlLog/${channelID}.html`;
    saveTxt(filePath, htmlText);
}