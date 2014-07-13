'use strict';

var Stream = require('../index.js'),
    path = require('path'),
    rimraf = require('rimraf'),
    i = 0;

var stream = new Stream({
  directory: path.join(__dirname, 'tmp'),
  cap: 50 * 1024 * 1024,
  chunk: 50 * 1024
});

exports.create = function(test) {

  var writeable = stream.writeStream('abcdef12345');
  writeable.writeHeaders('test1,test2\n');

  // write a bunch of stuff
  for(i; i < 10000; i++) {
    writeable.write(i + ',aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n');
  }

  // close writable stream
  writeable.end(i + ',aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n');

  writeable.on('finish', function() {
    test.done();
  });

};

exports.read = function(test) {

  var readable = stream.objectReadStream('abcdef12345');
  test.expect(i + 1);

  readable.on('data', function(row) {
    test.equals(i, row.test1, 'should match');
    i--;
  });

  readable.on('end', function() {
    test.done();
  });

};

exports.cleanup = function(test) {

  rimraf.sync(path.join(__dirname, 'tmp'));

  test.done();

};
