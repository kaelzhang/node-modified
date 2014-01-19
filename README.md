# modified [![NPM version](https://badge.fury.io/js/modified.png)](http://badge.fury.io/js/modified) [![Build Status](https://travis-ci.org/kaelzhang/node-modified.png?branch=master)](https://travis-ci.org/kaelzhang/node-modified) [![Dependency Status](https://gemnasium.com/kaelzhang/node-modified.png)](https://gemnasium.com/kaelzhang/node-modified)

Modified is a simple request client to deal with http local cache based on JSON. 

Modified implemented `last-modified`, `if-modified-since`, `etag`, `if-none-match` of HTTP specifications.
	
## Synopsis

Modified is built upon [request](https://npmjs.org/package/request) and flavors it with cache support, so if you are familiar with request, you are almost ready to use modified.

```js
var request = modified(options); // Then use almost the same as request

request('http://google.com/doodle.png').pipe(fs.createWriteStream('doodle.png'));
```

## Usage

If your server supports etag, or checks the `if-modified-since` header, `modified` will manage the local cache for you.

### Specify the cache routing

`options.cacheMapper` must be specified, or there will be no cache applied.

```js
modified({
	cacheMapper: function(options, callback){
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
	cacheMapper: function(options, callback){
		var path = url.parse(options.url).pathname;
		
		if (path) {
			// 'http://xxx.com/abc/' -> '/abc'
			path = path.replace(/\/$/, '');
			
			callback(
				null, 
				// Where the cache should be saved.
				path.join(__dirname, 'cache', path)
			);
		
		} else {
			callback(null, null);
		}
	}
}
```

With `options.cacheMapper`, you could specify the paths where the cache will be saved.


## Programmatical APIs

### Class: modified.Modified

This class is a sub-class of [Readable Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable). 

A instance of `Modified` is an [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) with the following extra events:


#### Event: 'complete'

- response [`http.ServerResponse`](http://nodejs.org/api/http.html#http_class_http_serverresponse) The response object
- body `String` The response body

Emitted when all the request process is complete, after the execution of user callback.

#### .request(options, callback)

Send a request.

- options `Object` The same as [`request`](https://npmjs.org/package/request)
- callback `Function` The same as [`request`](https://npmjs.org/package/request)


## Release History

* 1.1.0 - Modified instances are streams now. You can use modified to fetch binary files.

* 1.0.0 - Initial release





