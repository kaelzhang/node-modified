'use strict';

module.exports = Modified;

var fs          = require('fs');
var request     = require('request');
var Stream      = require('stream').Stream;
var util        = require('util');
var node_path   = require('path');

var async       = require('async');

var tool        = require('./lib/tool');


// @param {Object} options
function Modified (options) {
    Stream.call(this);
    options = options || {};

    // you can also inherit and override 'read' and 'save' methods
    [
        // 'read', 
        // 'save', 
        'cacheMapper'
    ].forEach(function (key) {
        if ( options[key] ) {
            this['_' + key] = options[key];
        }

    }, this);

    this.options = this._defaults(options, {
        // strict: false
    });

    this._pipeQueue = [];
}

util.inherits(Modified, Stream);


// Accoring to [RFC 2616](http://www.ietf.org/rfc/rfc2616.txt),
// field names are case-insensitive.
// response of `request` provides lowercase field names
var ETAG = 'etag';
var LAST_MODIFIED = 'last-modified';
var IF_NONE_MATCH = 'if-none-match';
var IF_MODIFIED_SINCE = 'if-modified-since';


Modified.prototype._defaults = function(options, defaults) {
    var key;
    for (key in defaults) {
        if ( !(key in options) ) {
            options[key] = defaults[key];
        }
    }

    return options;
};


Modified.prototype.request = function(options, callback) {
    var self = this;

    this._readCacheInfo(options, function (err, info) {
        if ( !err ) {
            var headers = info.headers;

            if ( headers ) {
                // deal with etag
                if ( ETAG in headers ) {
                    options.headers[IF_NONE_MATCH] = headers[ETAG];
                }

                if ( LAST_MODIFIED in headers ) {
                    options.headers[IF_MODIFIED_SINCE] = headers[LAST_MODIFIED];
                }

            } else {
                delete options.headers[IF_NONE_MATCH];
                delete options.headers[IF_MODIFIED_SINCE];
            }
        }

        var request = request(options, function (err, res, body) {
            if ( err ) {
                return callback(err, res, body);
            }

            if ( res.statusCode === 304 ) {
                return self._sendResponseBody(res, info.data_file, callback);
            }

            self._saveResponse(res, body, info);
        });

        request.on('response', function (response) {
            self._response = response;
            self.emit('response', response); 
        });

        request.on('data', function (data) {
            self.emit('data', data);
        });
    });

    // So, modified.request is a stream
    return this;
};


Modified.prototype._sendResponseBody = function(res, file, callback) {
    fs.readFile(file, function (err, content) {
        callback(null, res, content);
    });
};


// Save responses into cache files
Modified.prototype._saveResponse = function(res, body, info, callback) {
    async.parallel([
        function (done) {
            fs.writeFile(info.data_file, body, done)
        },

        function (done) {
            fs.writeFile(info.header_file, JSON.stringify(res.headers), done)
        }

    ], function (err) {
        callback(err, res, body);
    })
};


// If-None-Match
// If-Modified-Since

// Read local cache information
// TODO:
// 
Modified.prototype._readCacheInfo = function(options, callback) {
    var self = this;

    this._mapCache(options, function (err, file) {
        if ( err ) {
            return callback(err);
        }

        if ( !file ) {
            return callback(null);
        }

        var data_file = self._getDataPath(file);
        var file_content;

        async.parallel([
            function (done) {
                fs.readFile(file, function (err, content) {
                    file_content = content;
                    done(err);
                });
            },

            function (done) {
                fs.exists(data_file, function (exists) {
                    done(!exists);
                });
            }

        ], function (err) {
            if ( err ) {
                return callack(err);
            }

            var headers;

            try {
                headers = JSON.parse(file_content);

            } catch(e) {
                return callback({
                    code: 'EPARSEPKG',
                    message: 'error parsing JSON: ' + e.stack,
                    data: {
                        error: e
                    }
                });
            }

            callback(null, {
                headers: headers,
                data_file: data_file,
                header_file: file
            });
        });
    });
};


// Get the path of the cached binary file
Modified.prototype._getDataPath = function(filepath) {
    return filepath + '.modified-data';
};


// Modified.prototype._tempDataPath = function(filepath) {
//     return 
// };


Modified.prototype.pipe = function(dest, options) {
    if ( this._response ) {
        // method of parent class
        this._pipe(dest, options);

    } else {
        this._pipeQueue.push({
            dest: dest,
            options: options
        });
    }

    // Returns destination stream, so that we can set pipe chains
    return dest;
};


// The real pipe
Modified.prototype._pipe = function(dest, options) {
    Stream.prototype.pipe.call(this, dest, options);
};


Modified.prototype._applyQueue = function() {
    this._pipeQueue.forEach(function (data) {
        this._pipe(data.dest, data.options);
    }, this);
};


// Map the requested url -> the path where cache should be save
Modified.prototype._mapCache = function(options, callback) {
    if ( this._cacheMapper ) {
        this._cacheMapper(options, callback);

    } else {

        // Disable cache
        // ```
        // Modified({
        //     cacheMapper: null
        // });
        // ```
        callback(null);
    }
};


Modified.prototype._pipeBinary = function(file, dest, options) {
    fs.createReadStream(file).pipe(dest, options);
};


Modified.prototype._cacheMapper = function (options, callback) {
    // no cache by default
    callback(null);
};


// clear cache
// Modified.prototype.clear = function(first_argument) {
    
// };

