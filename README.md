# modified [![NPM version](https://badge.fury.io/js/modified.png)](http://badge.fury.io/js/modified) [![Build Status](https://travis-ci.org/kaelzhang/node-modified.png?branch=master)](https://travis-ci.org/kaelzhang/node-modified) [![Dependency Status](https://gemnasium.com/kaelzhang/node-modified.png)](https://gemnasium.com/kaelzhang/node-modified)

Modified is a simple request client to deal with http local cache based on JSON. 

Modified implemented `last-modified`, `if-modified-since`, `etag`, `if-none-match` of HTTP specifications.

Modified only gives `'GET'` request a special treatment, and leaves other types of requests without cache.

## Installation

	npm install modified --save
	
## Synopsis

```js
modified(options).request(options, callback);
```

## Usage

If your server supports etag, or checks the `if-modified-since` header, `modified` will manage the local cache for you.

### Specify the cache routing

`options.route` must be specified, or there will be no cache applied.

```js
modified({
	route: function(options, callback){
		// your code...
		callback(err, cache_file);
	}
}).request({
	method: 'GET',
	url: 'http://registry.npmjs.org/modified'
	
}, function(err, res, body){
	// ...
})
```

#### cache_file

type `String` the file path of the local cache according to a specific request.

If you don't want modified to cache for a certain request, `cache_file` should be set to `null`

```js
{
	route: function(options, callback){
		var path = url.parse(options.url).pathname;
		
		if (path) {
			// 'http://xxx.com/abc/' -> '/abc'
			path = path.replace(/\/$/);
			
			callback(null, path.join(__dirname, 'cache', path));
		
		} else {
			callback(null, null);
		}
	}
}
```





