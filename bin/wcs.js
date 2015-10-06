#!/usr/bin/env node
/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// jshint node:true
'use strict';
var WebComponentShards = require('../wcs');
var cliArgs = require("command-line-args");
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

var cli = cliArgs([
  {
    name: "help",
    type: Boolean,
    alias: "h",
    description: "Print usage."
  },
  {
    name: "bowerdir",
    type: String,
    alias: "b",
    description: "Bower components directory. Defaults to 'bower_components'",
    defaultValue: "bower_components"
  },
  {
    name: "root",
    type: String,
    defaultValue: process.cwd(),
    alias: "r",
    description: (
      "Root directory against which URLs of endpoints and HTML imports are " +
      "resolved. If not specified, then the current working directory is used."
    )
  },
  {
    name: "endpoints",
    type: String,
    alias: "e",
    defaultOption: true,
    multiple: true,
    description: "Application endpoints to vulcanize."
  },
  {
    name: "shared_import",
    type: String,
    alias: "i",
    defaultValue: "shared.html",
    description: "Name of the programatically created common dependency file. " +
    "Defaults to 'shared.html'"
  },
  {
    name: "sharing_threshold",
    type: Number,
    alias: "s",
    defaultValue: 2,
    description: (
      "Number of endpoints an import must be found in to be added to " +
      "'shared_import'. For example, 2 will include all imports found " +
      "in at least 2 endpoints, and 1 will include all dependencies of any " +
      "endpoint. Defaults to 2."
    )
  },
  {
    name: "dest_dir",
    type: String,
    alias: "d",
    defaultValue: "dist/",
    description: "Destination for vulcanized application. Defaults to 'dist/'"
  },
  {
    name: "workdir",
    type: String,
    alias: "d",
    defaultValue: "tmp/",
    description: "Temporary directory for holding in-process files. DANGER: " +
    " this directory will be deleted upon tool success. Defaults to 'tmp/'"
  }
]);

var usage = cli.getUsage({
  header: "web-component-shards compiles a multi-page app with shared deps",
  title: "wcs"
});

var options = cli.parse();

if (options.help) {
  console.log(usage);
  process.exit(0);
}

// Make sure resolution has a path segment to drop.
// According to URL rules,
// resolving index.html relative to /foo/ produces /foo/index.html, but
// resolving index.html relative to /foo produces /index.html
// is different from resolving index.html relative to /foo/
// This removes any ambiguity between URL resolution rules and file path
// resolution which might lead to confusion.
if (options.root !== '' && !/[\/\\]$/.test(options.root)) {
  options.root += '/';
}
var workPath = path.resolve(options.root, options.workdir);
try {
  var workdir = fs.statSync(workPath);
  if (workdir) {
    console.log(workdir);
    console.log("Working directory already exists! Please clean up.");
    process.exit(1);
  }
} catch (err) {
  // This is good. The workdir shouldn't exist.
}
mkdirp.sync(workPath);

var endpoints = options.endpoints;

if (!endpoints || !endpoints.length) {
  console.error('Missing input polymer path');
  console.log(usage);
  process.exit(-1);
}

var shards = new WebComponentShards(options);
shards.build().then(function(){
  console.log("Build success!");
  rimraf.sync(workPath, {});
}).catch(function(err){
  console.error(err.stack);
});