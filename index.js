'use strict';

module.exports = modified;
modified.Modified = Modified;

var fs          = require('fs-sync');
var request     = require('request');

function modified (options) {
    return new Modified(options || {});
}


// @param {Object} options
function Modified (options) {
    // you can also inherit and override 'read' and 'save' methods
    ['read', 'save', 'route'].forEach(function (key) {
        if ( options[key] ) {
            this['_' + key] = options[key];
        }

    }, this);

    this.options = options;
}


function mix (receiver, supplier, override){
    var key;

    if(arguments.length === 2){
        override = true;
    }

    for(key in supplier){
        if(override || !(key in receiver)){
            receiver[key] = supplier[key];
        }
    }

    return receiver;
}


// Accoring to [RFC 2616](http://www.ietf.org/rfc/rfc2616.txt),
// field names are case-insensitive.
// response of `request` provides lowercase field names
var ETAG = 'etag';
var LAST_MODIFIED = 'last-modified';
var IF_NONE_MATCH = 'if-none-match';
var IF_MODIFIED_SINCE = 'if-modified-since';


Modified.prototype.request = function(options, callback) {
    var self = this;

    if ( !options.method || options.method.toLowerCase() !== 'get' ) {
        return request(options, callback);
    }

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
};


// If-None-Match
// If-Modified-Since

// read local cache
Modified.prototype._read = function(options, callback) {
    var self = this;

    this._route(options, function (err, file) {
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

    this._route(options, function (err, file) {
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


Modified.prototype._route = function (options, callback) {
    // no cache by default
    callback(null);
};


modified.parse = function(content) {
    if ( !content ) {
        return {
            headers: {}
        };
    }

    var splitted = content.split(/\n+/)
        .filter(Boolean)
        .map(function (item) {
            return item.trim();
        });

    return {
        headers: JSON.parse(splitted[0]),
        data: splitted[1]
    };
};


modified.stringify = function (headers, data) {
    return [headers, data].map(function (item) {
        return typeof item === 'string' ?
            item :
            JSON.stringify(item);

    }).join('\n\n');
};


// clear cache
// Modified.prototype.clear = function(first_argument) {
    
// };

