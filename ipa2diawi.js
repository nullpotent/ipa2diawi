var fs = require("fs"),
    path = require("path"),
    request = require("request"),
    randomstring = require("randomstring"),
    querystring = require("querystring"),
    util = require("util"),
    EventEmitter = require("events").EventEmitter
    ;

var UPLOAD_URL = "https://www.diawi.com/upload.php",
    RESULT_URL = "https://www.diawi.com/result.php",
    SUPPORTED_EXTENSIONS = [".ipa", ".zip", ".app"],
    CHUNK_SIZE = 1024 * 1024 // 1Mb
    ;

var Uploader = function(opts) {
    if (!opts) {
        opts = {};
    }

    this.constructor.super_();
    this.chunkSize = opts.chunkSize | CHUNK_SIZE;
    this.path = opts.path.trim();
    this.extension = path.extname(this.path);

    if (SUPPORTED_EXTENSIONS.indexOf(this.extension) === -1) {
        this.emit("error", new Error("Unsupported file extension " + this.extension));
    }

    this.chunk = 0;
    this.fileName = path.basename(this.path);
    this.tempName = this.generateTempName();
    fs.readFile(this.path, this.onFileLoaded.bind(this));
};

Uploader.prototype.onFileLoaded = function(err, file) {
    if (err) {
        this.emit("error", new Error(err));
        return;
    }
    this.chunks = Math.ceil(file.length / this.chunkSize);
    this.file = file;
    this.uploadChunk ();
};

Uploader.prototype.generateTempName = function() {
    var n = new Date().getTime().toString(32), o;
    for (o = 0; o < 5; o++) {
        n += Math.floor(Math.random() * 65535).toString(32);
    }
    return "p" + n + "0" + this.extension;
};

Uploader.prototype.uploadChunk = function() {
    var chunk = this.getFormData(this.file);

    if (chunk !== null) {
        request.post({url: UPLOAD_URL, formData: chunk}, (function(err, res, body) {
            if (err) {
                this.emit("error", err);
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
            this.emit("error", err);
        } else {
            try {
                var json = JSON.parse(body);
                if (!json.url) {
                    this.emit("error", new Error("Couldn't parse the json result."));
                } else {
                    this.emit("done", json.url);
                }
            } catch (err) {
                this.emit("error", err);
            }
        }
    }).bind(this));
};

Uploader.prototype.getBlob = function(offset, size) {
    try {
        this.file.slice();
        return this.file.slice(offset, size);
    } catch (e) {
        return this.file.slice(offset, size - offset);
    }
};

Uploader.prototype.getFormData = function() {
    if (this.chunk >= this.chunks) {
        return null;
    }

    var chunkOffset = (this.chunk * this.chunkSize);
    var nextChunkSize = Math.min(this.chunkSize, this.file.length - chunkOffset);
    var blob = this.getBlob(chunkOffset, chunkOffset + nextChunkSize);

    return {
        chunk: this.chunk += 1,
        chunks: this.chunks,
        file: {
            value: blob,
            options: {
                filename: "blob",
                contentType: "application/octet-stream"
            }
        },
        name: this.tempName
    };
};

util.inherits(Uploader, EventEmitter);
module.exports = Uploader;