'use strict';

var expect = require('chai').expect;
var modified = require('../');

var node_path = require('path');
var node_http = require('http');
var node_url = require('url');
var node_fs = require('fs');
var async = require('async');

var fs = require('fs-sync');

var cache_file_1 = node_path.join( __dirname, '1.cache' );
var cache_file_2 = node_path.join( __dirname, '2.cache' );
var cache_file_3 = node_path.join( __dirname, '3.cache' );
var source_png = node_path.join( __dirname, 'fixtures', 'modified.png' );

// Fake etag
var ETAG = String( Math.random() * 1000000 );
var RESPONSE = {
    a: 1,
    b: 2
}

var s = node_http.createServer(function (req, res) {
    if ( req.headers['if-none-match'] === ETAG ) {
        res.writeHead(304, {
            'Etag': ETAG
        });
        
        res.end();

    } else {
        res.writeHead(200, {
            Etag: ETAG
        });

        var url = node_url.parse(req.url);

        if ( /\.png$/.test(url.pathname) ) {
            var stream = node_fs.createReadStream( source_png );
            stream.pipe(res);

            stream.on('end', function () {
                res.end(); 
            });

        } else {
            res.write(JSON.stringify(RESPONSE));
            res.end();
        }
    }
});

var server_port;


function try_listen (port) {
    console.log('try listen port:', port);

    try {
        s.listen(port);
        server_port = port;
    } catch(e) {
        console.log('>> already in use.');
        listen(port + 1);   
    }
};

try_listen(19238);


describe("complex", function(){
    it("will get statusCode 200 when there's no cache", function(done){
        var request = modified({
            cacheMapper: function (options, callback) {
                callback(null, cache_file_1 );
            }
        });

        request('http://localhost:' + server_port, function (err, res, body) {
            // done();
            expect(res.statusCode).to.equal(200);

            var json = JSON.parse(body);
            expect(json.a).to.equal(1);

            request('http://localhost:' + server_port, function (err, res, body) {
                // done();
                expect(res.statusCode).to.equal(304);

                var json = JSON.parse(body);
                expect(json.a).to.equal(1);
                
                fs.remove(cache_file_1);
                fs.remove(cache_file_1 + '.modified-headers.json');
                done();
            });
        });
    });

    it("will get statusCode 304 when already cached", function(done){
        var request = modified({
            cacheMapper: function (options, callback) {
                callback(null, cache_file_2 );
            }
        });

        var cached_header = cache_file_2 + '.modified-headers.json';

        fs.write(
            cached_header, 
            JSON.stringify({
                etag: ETAG
            })
        );

        fs.write(
            cache_file_2,
            JSON.stringify({
                a: 3
            })
        );

        request('http://localhost:' + server_port, function (err, res, body) {
            done();

            expect(res.statusCode).to.equal(304);

            var json = JSON.parse(body);
            expect(json.a).to.equal(3);

            fs.remove(cache_file_2);
            fs.remove(cached_header);
        });
    });
});


describe(".pipe()", function(){
    it("without cache", function(done){
        var request = modified({
            cacheMapper: function (options, callback) {
                callback(null, cache_file_3 );
            }
        });

        var req = request.get('http://localhost:' + server_port); 

        var pipe_to = node_path.join(__dirname, 'piped');

        req.pipe(node_fs.createWriteStream( pipe_to ));

        req.on('complete', function () {
            expect(fs.read(pipe_to)).to.equal('{"a":1,"b":2}');
            fs.remove(cache_file_3);
            fs.remove(cache_file_3 + '.modified-headers.json');
            fs.remove(pipe_to);
            done();
        })
    });

    it("binary file", function(done){
        var url = 'http://localhost:' + server_port + '/modified.png';
        var write_to = node_path.join(__dirname, 'modified.png');

        var request = modified();
        var req = request(url);

        req.pipe(node_fs.createWriteStream( write_to ));
        req.on('complete', function (res) {
            async.parallel([
                function (done) {
                    node_fs.stat(write_to, done);
                },

                function (done){
                    node_fs.stat(source_png, done);
                }

            ], function (err, data) {
                expect(err).to.equal(null);
                expect(data[0].size).to.equal(data[1].size);
                fs.remove(write_to);
                done();
            });
        });
    });

    it("fs.writeFile binary file", function(done){
        var url = 'http://localhost:' + server_port + '/modified_2.png';
        var write_to = node_path.join(__dirname, 'modified_2.png');

        var request = modified();
        var req = request({
            url: url,
            encoding: null

        }, function (err, res, body) {
            node_fs.writeFile(write_to, body, function () {
                async.parallel([
                    function (done) {
                        node_fs.stat(write_to, done);
                    },

                    function (done){
                        node_fs.stat(source_png, done);
                    }

                ], function (err, data) {
                    expect(err).to.equal(null);
                    expect(data[0].size).to.equal(data[1].size);
                    fs.remove(write_to);
                    done();
                });
            });
        });
    });
});

