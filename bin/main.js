#!/usr/bin/env node

var DiawiUploader = require("../ipa2diawi.js");

function printUsage() {
    console.log("Usage: node", path.basename(process.argv[1]), "path/to/app.ipa");
}

function exitWithError(err) {
    console.error(err);
    process.exit(1);
}

function printDownloadURL(url) {
    console.log(url);
    process.exit(0);
}

if (process.argv.length < 3) {
    printUsage();
} else {
    var ipaPath = process.argv[2].trim();
    new DiawiUploader({
        path: ipaPath
    })
    .on("error", exitWithError)
    .on("done", printDownloadURL);
}
