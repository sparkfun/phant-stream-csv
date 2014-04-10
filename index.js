/**
 * phant-stream-csv
 * https://github.com/sparkfun/phant-stream-csv
 *
 * Copyright (c) 2014 SparkFun Electronics
 * Licensed under the GPL v3 license.
 */

'use strict';

/**** Module dependencies ****/
var util = require('util'),
    events = require('events'),
    async = require('async'),
    toCsv = require('csv-stringify'),
    fromCsv = require('csv-streamify'),
    helpers = require('./lib/helpers'),
    Readable = require('./lib/readable'),
    Writable = require('./lib/writable');

/**** Make PhantStream an event emitter ****/
util.inherits(PhantStream, events.EventEmitter);

/**** app prototype ****/
var app = PhantStream.prototype;

/**** Expose PhantStream ****/
exports = module.exports = PhantStream;

function PhantStream(options) {

  if (! (this instanceof PhantStream)) {
    return new PhantStream(options);
  }

  options = options || {};

  events.EventEmitter.call(this, options);

  // apply the options
  util._extend(this, options);

  // point the file helpers at passed root folder
  this.helpers = helpers({root: this.directory});

}

app.name = 'phant csv stream';
app.cap = 50 * 1024 * 1024; // 50mb
app.chunk = 500 * 1024; // 500k
app.directory = 'tmp';

app.readStream = function(id, page) {

  var all = false;

  if(! page) {
    all = true;
    page = 1;
  }

  return new Readable(id, {
    page: page,
    all: all,
    root: this.directory
  });

};

app.objectReadStream = function(id, page) {

  var read = this.readStream(id, page),
      transformed = read.pipe(fromCsv({objectMode:true, columns: true}));

  transformed.all = read.all;

  read.on('error', function(err) {
    transformed.emit('error', err);
  });

  read.on('open', function() {
    transformed.emit('open');
  });

  return transformed;

};

app.sortKeys = function(data) {

  var keys = [],
      sorted = [];

  for(var k in data) {

    if(data.hasOwnProperty(k)) {
      keys.push(k);
    }

  }

  return keys.sort();

};

app.write = function(id, data) {

  var stream = this.writeStream(id),
      keys = this.sortKeys(data),
      sorted = [],
      k;

  for(var i=0; i < keys.length; i++) {
    k = keys[i];
    sorted.push(data[k]);
  }

  toCsv(keys, function(err, output){
    stream.writeHeaders(output);
  });

  toCsv(sorted, function(err, output){
    stream.end(output + '\n');
  });

};

app.writeStream = function(id) {

  return new Writable(id, {
    cap: this.cap,
    chunk: this.chunk,
    root: this.directory
  });

};

app.stats = function(id, cb) {

  var self = this;

  var stats = {
    pageCount: 0,
    remaining: 0,
    used: 0,
    cap: this.cap
  };

  async.parallel([
    function(callback) {
      self.helpers.usedStorage(id, function(err, used) {

        if(err) {
          callback(err);
        }

        stats.used = used;

        callback();

      });
    },
    function(callback) {
      self.helpers.pageCount(id, function(err, count) {

        if(err) {
          callback(err);
        }

        stats.pageCount = count;

        callback();

      });
    }
  ], function(err) {

      if(err) {
        cb(err);
      }

      stats.remaining = stats.cap - stats.used;

      if(stats.remaining < 0)
        stats.remaining = 0;

      cb(null, stats);

  });

};
