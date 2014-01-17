'use strict';

module.exports = Modified;

var fs          = require('fs');
var request     = require('request');
var Stream      = require('stream').Stream;
var util        = require('util');
var node_path   = require('path');


// @param {Object} options
function Modified (options) {
    Stream.call(this);
    options = options || {};

    // you can also inherit and override 'read' and 'save' methods
    ['read', 'save', 'cacheMapper'].forEach(function (key) {
        if ( options[key] ) {
            this['_' + key] = options[key];
        }

    }, this);

    this.options = options;
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


Modified.prototype.request = function(options, callback) {
    var self = this;

    this._read(options, function (read_err, headers, data) {
        if ( !options.headers ) {
            options.headers = {};
        }

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

        if ( callback ) {
            request(options, function (err, res, body) {
                if ( err ) {
                    return callback(err, res, body);
                }

                if ( res.statusCode === 304 ) {
                    return callback(err, res, data || body);
                }

                self._save(options, res.headers, body, function (save_err) {
                    callback(err, res, body);
                });
            });
        
        } else {
            request(options);
        }
    });

    // So, modified.request is a stream
    return this;
};


// If-None-Match
// If-Modified-Since

// read local cache
Modified.prototype._read = function(options, callback) {
    var self = this;

    this._mapCache(options, function (err, file) {
        if ( err ) {
            return callback(err);
        }

        if ( !file ) {
            return callback(null);
        }

        var content;

        try {
            content = fs.read(file);
        } catch(e) {
            return callback(e);
        }

        var info = modified.parse(content.toString());
        callback(null, info.headers, info.data);
    });
};


// save data to local cache
// @param {Object} options
// - data: {Object} data to be saved
Modified.prototype._save = function(options, headers, data, callback) {
    var self = this;

    this._mapCache(options, function (err, file) {
        if ( err ) {
            return callback(err);
        }

        if ( !file ) {
            return callback(null);
        }

        var cache = modified.stringify(headers, data);

        try {
            fs.write(file, cache);
            callback(null);
        } catch(e) {
            callback(e);
        }
    });
};


// Get the path of the cached binary file
Modified.prototype._getFilePath = function(filepath, url) {
    var dir = node_path.dirname(filepath);
    var basename = node_path.basename(url);

    return node_path.join(dir, basename);
};


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


Modified.prototype._cacheMapper = function (options, callback) {
    // no cache by default
    callback(null);
};


// clear cache
// Modified.prototype.clear = function(first_argument) {
    
// };

