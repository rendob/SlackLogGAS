type GoogleFile = GoogleAppsScript.Drive.File;
type GoogleFolder = GoogleAppsScript.Drive.Folder;


function folderNameToID(parentID: string, folderName: string): string {  // parentIDのフォルダ直下のfolderNameのフォルダのIDを返す。なければ空文字列
    let parentFolder: GoogleFolder = DriveApp.getFolderById(parentID);
    let folders: GoogleAppsScript.Drive.FolderIterator = parentFolder.getFoldersByName(folderName);
    if (!folders.hasNext()) {
        return "";
    } else {  // 名前被りは無いと仮定
        return folders.next().getId();
    }
}

function folderPathToID(folderPath: string): string {  // folderPath(rootDirからの相対path)のフォルダのIDを返す。存在しなければ空文字列.
    let nodes: string[] = folderPath.split("/");

    let folderID: string = rootFolderID;
    for (var i = 0; i < nodes.length; i++) {
        folderID = folderNameToID(folderID, nodes[i]);
        if (folderID == "") {
            break;
        }
    }
    
    return folderID;
}


function fileNameToID(parentID: string, fileName: string): string {  // parentIDのフォルダ直下のfileNameのファイルのIDを返す。なければ空文字列
    let parentFolder: GoogleFolder = DriveApp.getFolderById(parentID);
    let files: GoogleAppsScript.Drive.FileIterator = parentFolder.getFilesByName(fileName);
    if (!files.hasNext()) {
        return "";
    } else {  // 名前被りは無いと仮定
        return files.next().getId();
    }
}

function filePathToID(filePath: string): string {  // filePath(rootDirからの相対path)のファイルのIDを返す。存在しなければ空文字列。
    let nodes: string[] = filePath.split("/");
    let folderID: string = rootFolderID;
    
    let n: number = nodes.length;
    for (var i = 0; i < n - 1; i++) {
        folderID = folderNameToID(folderID, nodes[i]);
        if (folderID == "") {
            return "";
        }
    }

    return fileNameToID(folderID, nodes[n - 1]);
}


function createFolder(folderPath: string): void {  // folderPathのフォルダを作る. 存在チェックあり. 途中のフォルダは存在していると仮定
    if (folderPathToID(folderPath) !== "") {  // 存在していれば
        Logger.log("Log:\t" + folderPath + " already exists.");
    } else {
        let nodes: string[] = folderPath.split("/");
        let folderID: string = rootFolderID;
    
        let n: number = nodes.length;
        for (var i = 0; i < n - 1; i++) {
            folderID = folderNameToID(folderID, nodes[i]);
        }
    
        let parentFolder: GoogleFolder = DriveApp.getFolderById(folderID);
        parentFolder.createFolder(nodes[n - 1]);
        Logger.log("Log:\tcreated " + folderPath);
    }
}

function createFile(filePath: string, content: string): GoogleFile {  // filePathのファイルを作る. 存在チェックなし. 途中のフォルダは存在していると仮定
    let nodes: string[] = filePath.split("/");
    let folderID: string = rootFolderID;

    let n: number = nodes.length;
    for (var i = 0; i < n - 1; i++) {
        folderID = folderNameToID(folderID, nodes[i]);
    }

    let parentFolder: GoogleFolder = DriveApp.getFolderById(folderID);
    let newFile: GoogleFile = parentFolder.createFile(nodes[n - 1], content);
    return newFile;
}


function openFile(filePath: string): GoogleFile {  // filePathのファイルを返す
    let fileID: string = filePathToID(filePath);
    if (fileID == "") {
        throw new Error("openFile Error: " + filePath + " does not exist.");
    }

    let file: GoogleFile = DriveApp.getFileById(fileID);
    return file
}

function loadTxtFileContent(filePath: string): string {  // filePathのテキストファイルの中身を返す。
    let file: GoogleFile = openFile(filePath);
    let txtContent: string = file.getBlob().getDataAsString();
    
    return txtContent;
}

function loadJsonFileContent(filePath: string): any {
    let file: GoogleFile = openFile(filePath);
    let txtContent: string = file.getBlob().getDataAsString().replace(/\r?\n/g, "");  // 改行をなくす

    let jsonContent: any = JSON.parse(txtContent);
    return jsonContent;
}


function saveTxt(filePath: string, txt: string): void {  // filePathのテキストファイルにtxtを上書き保存。なければ作る
    let fileID: string = filePathToID(filePath);
    let file: GoogleFile;
    if (fileID != "") {  // 存在すれば
        file = DriveApp.getFileById(fileID);
        file.setContent(txt);
    } else {  // 存在しなければ作る
        createFile(filePath, txt);
    }
}

function saveJson(filePath: string, jsonData: any): void {  // filePathのJSONファイルにjsonDataを上書き保存、なければ作る
    let txt: string = JSON.stringify(jsonData, null, "  ");
    saveTxt(filePath, txt);
}

function saveFile(token: string, slackFile: object): {driveFileId: string, isImg: boolean} {  // slackのファイルオブジェクトをドライブの"fileLog/"に保存して、ドライブ上のIDを返す
    // 容量不足は考慮していない
    let slackFileId: string = slackFile["id"];  // slack上でのID = drive上での名前
    let folderPath: string = "fileLog";
    let fileTitle: string = slackFile["title"];  // 拡張子込みのはず
    let fileName: string = `${slackFileId}_${fileTitle}`;
    let filePath: string = `${folderPath}/${fileName}`;
    let driveFileId: string = filePathToID(filePath);
    let driveFile: GoogleFile;
    if (driveFileId !== "") {  // 存在すれば
        driveFile = DriveApp.getFileById(driveFileId);
    } else {  // 新たに保存
        // 容量が十分にあると仮定
        let slackUrl: string = slackFile["url_private"];

        // ファイル取得
        let headers = {
            "Authorization": "Bearer " + token
        };
        let params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            "method": "get",
            "headers": headers
        };
        let fileData: GoogleAppsScript.Base.Blob = UrlFetchApp.fetch(slackUrl, params).getBlob();
        fileData.setName(fileName);

        let folderID: string = folderPathToID(folderPath);
        let folder: GoogleFolder = DriveApp.getFolderById(folderID);
        driveFile = folder.createFile(fileData);
        driveFileId = driveFile.getId();
    }

    let mimeType: string = driveFile.getMimeType();
    let isImg: boolean = (mimeType.split("/")[0] === "image");
    return {driveFileId, isImg};
}
