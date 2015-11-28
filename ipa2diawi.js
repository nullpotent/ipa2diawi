#!/usr/bin/env node

fs = require("fs")
path = require("path")
request = require("request")
randomstring = require("randomstring")
querystring = require("querystring")

UPLOAD_URL = "http://www.diawi.com/upload.php";
RESULT_URL = "http://www.diawi.com/result.php";
SUPPORTED_EXTENSIONS = [".ipa", ".zip", ".app"];
CHUNK_SIZE = 1024 * 1024; // 1mb

function Uploader(filePath) {
    this.filePath = filePath.trim();
    this.extension = path.extname(this.filePath);

    if (SUPPORTED_EXTENSIONS.indexOf(this.extension) === -1) {
        this.exitWithError("Unsupported file extension " + this.extension);
    }

    this.chunk = 0;
    this.fileName = path.basename(this.filePath);
    this.tempName = this.generateTempName();
    this.chunkSize = CHUNK_SIZE;
    fs.readFile(this.filePath, this.onFileLoaded.bind(this));
};

Uploader.prototype.onFileLoaded = function(err, file) {
    if (err) {
        this.exitWithError(err);
    }
    this.chunks = Math.ceil(file.length / this.chunkSize);
    this.file = file;
    this.uploadChunk ();
};

Uploader.prototype.generateTempName = function() {
    var n = new Date().getTime().toString(32), o;
    for (o = 0; o < 5; o++) {
        n += Math.floor(Math.random() * 65535).toString(32)
    }
    return "p" + n + "0" + this.extension;
};

Uploader.prototype.exitWithError = function(err) {
    console.error(err);
    process.exit(1);
};

Uploader.prototype.uploadChunk = function() {
    var chunk = this.getChunk(this.file);

    if (chunk != null) {
        request.post({url: UPLOAD_URL, formData: chunk}, (function(err, res, body) {
            if (err) {
                this.exitWithError(err);
            }
            this.uploadChunk();
        }).bind(this));
    } else {
        this.fetchDownloadLink();
    }
};

Uploader.prototype.fetchDownloadLink = function() {
    request.post({url: RESULT_URL, form: {
        "uploader_0_tmpname": this.tempName,
        "uploader_0_name": this.fileName,
        "uploader_0_status": "done",
        "uploader_count": 1,
        "udid": "on",
        "comment": "",
        "email": "",
        "password": ""
    }}, (function (err, res, body) {
        if (err) {
            this.exitWithError(err);
        } else {
            try {
                var json = JSON.parse(body);
                if (!json.url) {
                    this.exitWithError("Couldn't fetch the download url")
                }
                console.log(json.url);
                process.exit(0);
            } catch (e) {
                this.exitWithError("Couldn't fetch the download url");
            }
        }
    }).bind(this));
};

Uploader.prototype.getBlob = function(offset, size) {
    try {
        this.file.slice();
        return this.file.slice(offset, size)
    } catch (e) {
        return this.file.slice(offset, size - offset)
    }
};

Uploader.prototype.getChunk = function() {
    if (this.chunk >= this.chunks) {
        return null;
    }

    var chunkOffset = (this.chunk * this.chunkSize);
    var nextChunkSize = Math.min(this.chunkSize, this.file.length - chunkOffset);
    var blob = this.getBlob(chunkOffset, chunkOffset + nextChunkSize);

    return {
        chunk: this.chunk++,
        chunks: this.chunks,
        file: {
            value: blob,
            options: {
                filename: "blob",
                contentType: "application/octet-stream"
            }
        },
        name: this.tempName
    }
};

function printUsage() {
    console.log("Usage: node " + path.basename(process.argv[1]) + " [path/to/app")
}

if (process.argv.length < 3) {
    printUsage();
} else {
    var fileUrl = process.argv[2].trim();
    new Uploader(fileUrl);
}
