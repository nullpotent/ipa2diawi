## Description
Uploads iOS .ipa or .zip (.app) files to https://www.diawi.com for ad hoc distribution of iOS apps.

## Install
As a command line tool

	npm i ipa2diawi -g

As a node module

	npm i ipa2diawi

## Usage
From command line

	ipa2diawi fileUrl

From code

```
var Uploader = require("ipa2diawi");

new Uploader({
	path: "/Users/salemander/Development/RGBSellOut.ipa",
	chunkSize: 1024 * 1024 // 1Mb
})
.on("progress", function(progress) {
	console.log(progress);
}).on("done", function(downloadUrl) {
	console.log(downloadUrl);
}).on("error", function(err) {
	console.error(err);
});
```
