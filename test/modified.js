'use strict';

var expect = require('chai').expect;
var modified = require('../');

var node_path = require('path');
var node_http = require('http');

var fs = require('fs-sync');

var cache_file_1 = node_path.join( __dirname, '1.cache' );
var cache_file_2 = node_path.join( __dirname, '2.cache' );

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
        
    } else {
        res.writeHead(200, {
            Etag: ETAG
        });

        res.write(JSON.stringify(RESPONSE));
    }

    res.end();
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
        fs.remove(cache_file_1);

        var request = modified({
            cacheMapper: function (options, callback) {
                callback(null, cache_file_1 );
            }
        });

        request.request({
            method: 'GET',
            url: 'http://localhost:' + server_port

        }, function (err, res, body) {
            // done();
            expect(res.statusCode).to.equal(200);

            var json = JSON.parse(body);
            expect(json.a).to.equal(1);

            request.request({
                method: 'GET',
                url: 'http://localhost:' + server_port

            }, function (err, res, body) {
                done();
                expect(res.statusCode).to.equal(304);

                var json = JSON.parse(body);
                expect(json.a).to.equal(1);
                
                fs.remove(cache_file_1);
            });
            
        });
    });

    it("will get statusCode 304 when already cached", function(done){
        var request = modified({
            cacheMapper: function (options, callback) {
                callback(null, cache_file_2 );
            }
        });

        fs.write(
            cache_file_2, 
            modified.stringify({
                etag: ETAG
            }, {
                a: 3,
                b: 4
            })
        );

        request.request({
            method: 'GET',
            url: 'http://localhost:' + server_port

        }, function (err, res, body) {
            done();

            expect(res.statusCode).to.equal(304);

            var json = JSON.parse(body);
            expect(json.a).to.equal(3);

            fs.remove(cache_file_2);
        });
    });
});


describe("static methods", function(){
    it("modified.parse", function(){
        var parsed = modified.parse(fs.read( node_path.join(__dirname, 'fixtures', 'document.data') ));

        expect(parsed.headers.server).to.equal('nginx');
        expect(JSON.parse(parsed.data).id).to.equal(123);
    });

    describe("modified.strinify", function(){
        it("will stringify objects", function(){
            var h = {a: 1};
            var d = {b: '2'}

            expect(modified.stringify(h, d)).to.equal('{"a":1}\n\n{"b":"2"}');
        });

        it("will remain primitive literals", function(){
            var h = {a: 1};
            var d = 2;

            expect(modified.stringify(h, d)).to.equal('{"a":1}\n\n2');
        });
    });
});

