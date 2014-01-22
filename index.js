'use strict';

module.exports = modified;

var Modified = require('./lib/modified');
var request = require('request');

function modified(options) {
    function req(uri, options, callback) { 
        return req._request(uri, options, callback);
    };

    req._options = options || {};
    req.__proto__ = Ghost.prototype;

    return req;
}

modified.Modified = Modified;


// A ghost prototype to generate the real exports
function Ghost(options) {}

Ghost.prototype._defaults = function(options, defaults) {
    var key;
    for (key in defaults) {
        if (!(key in options)) {
            options[key] = defaults[key];
        }
    }

    return options;
};


Ghost.prototype._clone = function(object) {
    var key;
    var cloned = {};
    for (key in object) {
        cloned[key] = object[key];
    }

    return cloned;
};


Ghost.prototype.initParams = request.initParams;


// Merge the options of modified
Ghost.prototype._initParams = function(uri, options, callback) {
    var opts = this.initParams(uri, options, callback);
    var opts_options = opts.options;
    var self = this;
    var modified_options = self._options;

    Modified.OPTIONS_LIST.forEach(function(key) {
        if (!(key in opts_options) && (key in modified_options)) {
            opts_options[key] = modified_options[key];
        }
    });

    return opts;
};


Ghost.prototype._request = function(uri, options, callback) {
    if (typeof uri === 'undefined') {
        throw new Error('undefined is not a valid uri or options object.');
    }

    if (typeof options === 'function' && !callback) {
        callback = options;
    }

    if (options && typeof options === 'object') {
        options.uri = uri;

    } else if (typeof uri === 'string') {
        options = {
            uri: uri
        };

    } else {
        options = uri;
    }

    options = this._clone(options);

    if (callback) {
        options.callback = callback;
    }

    var m = new Modified(options);
    return m;
};


Ghost.make = function(method, mutator) {
    return function(uri, options, callback) {
        var params = this._initParams(uri, options, callback);
        params.options.method = method;

        if (mutator) {
            mutator(options);
        }

        return this._request(params.uri || null, params.options, params.callback);
    };
};


[
    'get',
    'post',
    'patch',
    'del',
    'put'

].forEach(function (method) {
    Ghost.prototype[method] = Ghost.make(method.toUpperCase());
});


Ghost.prototype.head = Ghost.make('HEAD', function(options) {
    if (
        params.options.body ||
        params.options.requestBodyStream ||
        params.options.json && typeof params.options.json !== 'boolean' ||
        params.options.multipart
    ) {
        throw new Error("HTTP HEAD requests MUST NOT include a request body.")
    }
});

