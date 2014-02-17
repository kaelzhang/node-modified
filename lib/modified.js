'use strict';

module.exports = Modified;

var fs          = require('fs');
var request     = require('request');
var Stream      = require('stream').Stream;
var util        = require('util');
var node_path   = require('path');
var node_url    = require('url');

var async       = require('async');
var mkdirp      = require('mkdirp');

var USER_HOME   = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

// @param {Object} options
function Modified (options) {
    Stream.call(this);
    options = options || {};

    // legacy, which is not need by edge version of node
    this.readable = true;
    this.writable = true;

    var self = this;
    Modified.OPTIONS_LIST.forEach(function (key) {
        // So, `options[key]` could be null
        if ( key in options ) {
            this['_' + key] = options[key];
        }
    }, this);

    var callback = options.callback;
    delete options.callback;

    if ( !options.method ) {
        options.method = 'GET';
    }

    this._request(options, callback);
}

util.inherits(Modified, Stream);

Modified.OPTIONS_LIST = [
    'cacheMapper'
];


// Accoring to [RFC 2616](http://www.ietf.org/rfc/rfc2616.txt),
// field names are case-insensitive.
// response of `request` provides lowercase field names
var ETAG = 'etag';
var LAST_MODIFIED = 'last-modified';
var IF_NONE_MATCH = 'if-none-match';
var IF_MODIFIED_SINCE = 'if-modified-since';


function NOOP () {}

Modified.prototype._request = function(options, callback) {
    var self = this;

    function cb (err, res, body) {
        callback && callback(err, res, body);

        if ( !err ) { 
            self.emit('complete', res, body);
        } else {
            self.emit('error', err);
        }
    }

    this._readCacheInfo(options, function (err, info) {
        if ( err ) {
            return callback(err);
        }

        var headers = info.headers;
        options.headers = options.headers || {};

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

        var req = self.req = request(options, function (err, res, body) {
            if ( err ) {
                return cb(err, res, body);
            }

            if ( res.statusCode === 304 ) {
                return self._sendResponseBody(res, info.data_file, cb);
            }

            self._saveResponse(res, body, info, cb);
        });

        req.on('response', function (res) {
            self._response = res;

            var source = res.statusCode === 304
                // if 304, we read data chunk from the cache file
                ? fs.createReadStream(info.data_file)
                : req;

            source.on('data', function (chunk) {
                self.emit('data', chunk);
            });

            self.emit('response', res);
        });

        req.on('end', function () {
            self.emit('end');
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
    mkdirp(info.dir, function (err) {
        if ( err ) {
            return callback(err, res, body);
        }

        async.parallel([
            function (done) {
                if(typeof body === 'string')
                    fs.writeFile(info.data_file, body, done)
                else
                    fs.writeFile(info.data_file, JSON.stringify(body), done)
            },

            function (done) {
                fs.writeFile(info.header_file, JSON.stringify(res.headers), done)
            }

        ], function (err) {
            callback(err, res, body);
        });
    });
    
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
            return callback(null, {});
        }

        var header_file = self._getHeaderPath(file);
        var file_content;

        async.parallel([
            function (done) {
                fs.readFile(header_file, function (err, content) {
                    file_content = content;
                    done(err);
                });
            },

            function (done) {
                fs.exists(file, function (exists) {
                    done(!exists);
                });
            }

        ], function (err) {
            var headers = {};

            if ( !err && file_content ) {
                try {
                    headers = JSON.parse(file_content);

                } catch(e) {
                    // return callback({
                    //     code: 'EPARSEPKG',
                    //     message: 'error parsing JSON: ' + e.stack,
                    //     data: {
                    //         error: e
                    //     }
                    // });
                }
            }

            callback(null, {
                headers     : headers,
                data_file   : file,
                header_file : header_file,
                dir         : node_path.dirname(file)
            });
        });
    });
};


// Get the path of the cached binary file
Modified.prototype._getHeaderPath = function(filepath) {
    return filepath + '.modified-headers.json';
};


Modified.prototype.pipe = function(dest, options) {
    // Just pipe `this` to the dest that
    // event 'data' will be emitted exactly after the 'response' event of request
    Stream.prototype.pipe.call(this, dest, options);

    // Returns destination stream, so that we can set pipe chains
    return dest;
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


Modified.prototype._cacheMapper = function (options, callback) {
    // no cache by default
    var url = node_url.parse(options.url || options.uri);
    var filepath = [
        '.node_modified', 
        url.protocol && url.protocol.replace(/:$/, '') || 'unknown',
        // 'user:pass' -> 'user%3Apass'
        url.auth,
        url.hostname,
        url.port,
        url.pathname,
        url.query
    ]
    .filter(Boolean)
    .map(encodeURIComponent)
    .join(node_path.sep);

    callback(null, node_path.join(USER_HOME, filepath) );
};


Modified.prototype.write = function () {
    return this.req.write.apply(this.req, arguments);
};


Modified.prototype.end = function(chunk) {
    if ( chunk ) {
        this.write(chunk);
    }

    this.req.end();
};

