// Compiled using ts2gas 3.6.4 (TypeScript 4.1.5)
function folderNameToID(parentID, folderName) {
    var parentFolder = DriveApp.getFolderById(parentID);
    var folders = parentFolder.getFoldersByName(folderName);
    if (!folders.hasNext()) {
        return "";
    }
    else { // 名前被りは無いと仮定
        return folders.next().getId();
    }
}
function folderPathToID(folderPath) {
    var nodes = folderPath.split("/");
    var folderID = rootFolderID;
    for (var i = 0; i < nodes.length; i++) {
        folderID = folderNameToID(folderID, nodes[i]);
        if (folderID == "") {
            break;
        }
    }
    return folderID;
}
function fileNameToID(parentID, fileName) {
    var parentFolder = DriveApp.getFolderById(parentID);
    var files = parentFolder.getFilesByName(fileName);
    if (!files.hasNext()) {
        return "";
    }
    else { // 名前被りは無いと仮定
        return files.next().getId();
    }
}
function filePathToID(filePath) {
    var nodes = filePath.split("/");
    var folderID = rootFolderID;
    var n = nodes.length;
    for (var i = 0; i < n - 1; i++) {
        folderID = folderNameToID(folderID, nodes[i]);
        if (folderID == "") {
            return "";
        }
    }
    return fileNameToID(folderID, nodes[n - 1]);
}
function createFolder(folderPath) {
    if (folderPathToID(folderPath) !== "") { // 存在していれば
        Logger.log("Log:\t" + folderPath + " already exists.");
    }
    else {
        var nodes = folderPath.split("/");
        var folderID = rootFolderID;
        var n = nodes.length;
        for (var i = 0; i < n - 1; i++) {
            folderID = folderNameToID(folderID, nodes[i]);
        }
        var parentFolder = DriveApp.getFolderById(folderID);
        parentFolder.createFolder(nodes[n - 1]);
        Logger.log("Log:\tcreated " + folderPath);
    }
}
function createFile(filePath, content) {
    var nodes = filePath.split("/");
    var folderID = rootFolderID;
    var n = nodes.length;
    for (var i = 0; i < n - 1; i++) {
        folderID = folderNameToID(folderID, nodes[i]);
    }
    var parentFolder = DriveApp.getFolderById(folderID);
    var newFile = parentFolder.createFile(nodes[n - 1], content);
    return newFile;
}
function openFile(filePath) {
    var fileID = filePathToID(filePath);
    if (fileID == "") {
        throw new Error("openFile Error: " + filePath + " does not exist.");
    }
    var file = DriveApp.getFileById(fileID);
    return file;
}
function loadTxtFileContent(filePath) {
    var file = openFile(filePath);
    var txtContent = file.getBlob().getDataAsString();
    return txtContent;
}
function loadJsonFileContent(filePath) {
    var file = openFile(filePath);
    var txtContent = file.getBlob().getDataAsString().replace(/\r?\n/g, ""); // 改行をなくす
    var jsonContent = JSON.parse(txtContent);
    return jsonContent;
}
function saveTxt(filePath, txt) {
    var fileID = filePathToID(filePath);
    var file;
    if (fileID != "") { // 存在すれば
        file = DriveApp.getFileById(fileID);
        file.setContent(txt);
    }
    else { // 存在しなければ作る
        createFile(filePath, txt);
    }
}
function saveJson(filePath, jsonData) {
    var txt = JSON.stringify(jsonData, null, "  ");
    saveTxt(filePath, txt);
}
function saveFile(token, slackFile) {
    // 容量不足は考慮していない
    var slackFileId = slackFile["id"]; // slack上でのID = drive上での名前
    var folderPath = "fileLog";
    var fileTitle = slackFile["title"]; // 拡張子込みのはず
    var fileName = slackFileId + "_" + fileTitle;
    var filePath = folderPath + "/" + fileName;
    var driveFileId = filePathToID(filePath);
    var driveFile;
    if (driveFileId !== "") { // 存在すれば
        driveFile = DriveApp.getFileById(driveFileId);
    }
    else { // 新たに保存
        // 容量が十分にあると仮定
        var slackUrl = slackFile["url_private"];
        // ファイル取得
        var headers = {
            "Authorization": "Bearer " + token
        };
        var params = {
            "method": "get",
            "headers": headers
        };
        var fileData = UrlFetchApp.fetch(slackUrl, params).getBlob();
        fileData.setName(fileName);
        var folderID = folderPathToID(folderPath);
        var folder = DriveApp.getFolderById(folderID);
        driveFile = folder.createFile(fileData);
        driveFileId = driveFile.getId();
    }
    var mimeType = driveFile.getMimeType();
    var isImg = (mimeType.split("/")[0] === "image");
    return { driveFileId: driveFileId, isImg: isImg };
}
