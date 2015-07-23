[![NPM version](https://badge.fury.io/js/modified.png)](http://badge.fury.io/js/modified)
[![Build Status](https://travis-ci.org/kaelzhang/node-modified.png?branch=master)](https://travis-ci.org/kaelzhang/node-modified)
[![Dependency Status](https://gemnasium.com/kaelzhang/node-modified.png)](https://gemnasium.com/kaelzhang/node-modified)

# modified

Modified is a simple request client to deal with http local cache. 

Modified implemented `last-modified`, `if-modified-since`, `etag`, `if-none-match` of HTTP specifications.
	
## Synopsis

Modified is built upon [request](https://npmjs.org/package/request) and flavors it with cache support, so if you are familiar with request, you are almost ready to use modified.

```js
var modified = require('modified');
var request = modified(options); // Then use it almost the same as request

request('http://google.com/doodle.png').pipe(fs.createWriteStream('doodle.png'));
```

## Using `modified` with cache

If your server supports etag, or checks the `if-modified-since` header, `modified` will manage the local cache for you.

To enable caches, `options.cache` should be specified. `modified` only has one built-in cache handler `modified.lruCache(cache_options)`.

```js
var request = modified({
	cache: modified.lruCache(cache_options)
});
```

See [modified-lru-cache](https://github.com/kaelzhang/modified-lru-cache) for details.

### Available caches

- [modified-lru-cache](https://github.com/kaelzhang/modified-lru-cache)
- [modified-hardware-cache](https://github.com/kaelzhang/modified-hardware-cache)

### Implement your own caches

#### cache.read(req, callback)

- req `http.ClientRequest`
- callback `function(headers)`

#### cache.save(req, res, callback)

- res `http.ServerResponse`
- callback `function(headers)`

## Programmatical APIs

```js
var request = modified(options);
```

### request(options, callback)

`modified(options)` returns a function which acts nearly the same as [`request`](https://npmjs.org/package/request);

#### Returns

`request(options, callback)` returns an instance of `modified.Modified` which is a sub-class of [Readable Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable). 

A instance of `Modified` is an [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter) with the following extra event(s):


#### Event: 'complete'

- response [`http.ServerResponse`](http://nodejs.org/api/http.html#http_class_http_serverresponse) The response object
- body `String` The response body

Emitted when all the request process is complete, after the execution of user callback (the one of `request(options, callback)`).

## MIT License

Copyright (c) 2013 Kael Zhang <i@kael.me>, contributors
http://kael.me/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
