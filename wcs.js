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
var hydrolysis = require('hydrolysis');
var mkdirp = require('mkdirp');
var url = require('url');
var Vulcan = require('vulcanize');
var fs = require('fs');
var Promise = require('es6-promise').Promise;
var path = require('path');

var WebComponentShards = function WebComponentShards(options){
  this.root = options.root;
  this.endpoints = options.endpoints;
  this.bowerdir = options.bowerdir;
  this.shared_import = options.shared_import;
  this.sharing_threshold = options.sharing_threshold;
  this.dest_dir = path.join(path.resolve(options.dest_dir), "/");
  this.workdir = options.workdir;
  this.built = false;
};


WebComponentShards.prototype = {
  _getOptions: function() {
    var options = {};
    options.attachAST = true;
    options.filter = function(){
      return false;
    };
    options.redirect = this.bowerdir;
    options.root = this.root;
    return options;
  },
  _getFSResolver: function() {
    return new hydrolysis.FSResolver(this._getOptions());
  },
  _getAnalyzer: function(endpoint) {
    return hydrolysis.Analyzer.analyze(endpoint, this._getOptions());
  },
  _getDeps: function _getDeps(endpoint) {
    return this._getAnalyzer(endpoint).then(function(analyzer){
      return analyzer._getDependencies(endpoint);
    }).catch(function(err){
      console.log(err);
      console.log("FAILED IN GETDEPS");
      throw err;
    });
  },
  _getCommonDeps: function _getCommonDeps() {
    var endpointDeps = [];
    for (var i = 0; i < this.endpoints.length; i++) {
      endpointDeps.push(this._getDeps(this.endpoints[i]));
    }
    return Promise.all(endpointDeps).then(function(allEndpointDeps){
      var common = {};
      allEndpointDeps.forEach(function(endpointDepList){
        endpointDepList.forEach(function(dep){
          if (!common[dep]) {
            common[dep] = 1;
          } else {
            common[dep] += 1;
          }
        });
      });
      var depsOverThreshold = [];
      for (var dep in common) {
        if (common[dep] >= this.sharing_threshold) {
          depsOverThreshold.push(dep);
        }
      }
      return depsOverThreshold;
    }.bind(this));
  },
  _synthesizeImport: function _synthesizeImport() {
    return this._getCommonDeps().then(function(commonDeps) {
      /** Generate the file of shared imports. */
      var output = '';
      var workdirPath = url.resolve(this.root, this.workdir);
      var outputPath = url.resolve(workdirPath, this.shared_import);
      /**
       * If the shared import is in a subdirectory, it needs to have a properly adjusted
       * base directory.
       */

      var baseUrl = path.relative(outputPath, workdirPath);
      for (var dep in commonDeps) {
        output += '<link rel="import" href="' + baseUrl + '/' + commonDeps[dep] + '">\n';
      }
      var outDir = path.dirname(outputPath);
      mkdirp.sync(outDir);
      var fd = fs.openSync(outputPath, 'w');
      fs.writeSync(fd, output);
      return commonDeps;
    }.bind(this));
  },
  _prepOutput: function _prepOutput() {
    mkdirp.sync(this.dest_dir);
  },
  build: function build() {
    if (this.built) {
      throw new Error("build may only be called once.");
    }
    this.built = true;
    this._prepOutput();
    return this._synthesizeImport().then(function (commonDeps) {
      var endpointsVulcanized = [];
      // Vulcanize each endpoint
      this.endpoints.forEach(function(endpoint){
        var outPath = url.resolve(this.dest_dir, endpoint);
        var outDir = path.dirname(outPath);
        var pathToShared = path.relative(outDir, url.resolve(this.dest_dir, this.shared_import));
        var oneEndpointDone = new Promise(function(resolve, reject) {
          var vulcan = new Vulcan({
            abspath: null,
            fsResolver: this._getFSResolver(),
            addedImports: [pathToShared],
            stripExcludes: commonDeps,
            inlineScripts: true,
            inlineCss: true,
            inputUrl: endpoint
          });
          try {
            vulcan.process(null, function(err, doc) {
              if (err) {
                reject(err);
              } else {
                mkdirp.sync(outDir);
                var fd = fs.openSync(outPath, 'w');
                fs.writeSync(fd, doc);
                resolve(outPath);
              }
            }.bind(this));
          } catch (err) {
            console.error("Error writing output file!");
            reject(err);
          }
        }.bind(this));
        endpointsVulcanized.push(oneEndpointDone);
      }.bind(this));
      var sharedEndpointDone = new Promise(function(resolve, reject) {
        var vulcan = new Vulcan({
          fsResolver: this._getFSResolver(),
          inlineScripts: true,
            inlineCss: true,
            inputUrl: url.resolve(this.workdir, this.shared_import)
        });
        try {
          vulcan.process(null, function(err, doc) {
            if (err) {
              reject(err);
            } else {
              var outPath = url.resolve(this.dest_dir, this.shared_import);
              var outDir = path.dirname(outPath);
              mkdirp.sync(outDir);
              var fd = fs.openSync(outPath, 'w');
              fs.writeSync(fd, doc);
              resolve(outPath);
            }
          }.bind(this));
        } catch (err) {
          reject(err);
        }
      }.bind(this));
      endpointsVulcanized.push(sharedEndpointDone);
      return Promise.all(endpointsVulcanized);
      // Vulcanize the shared dep.
    }.bind(this));
  }
};

module.exports = WebComponentShards;
