var assert = require('assert');
var pzpr = require('../dist/js/pzpr.js');

describe('pzplus BitStream', function() {

    it('single small write/read', function() {
        var bs = new pzpr.BitStream(10);
        bs.write(4, 0b1010);
        bs.reset();
        assert.equal(bs.read(4), 0b1010);
    });

    it('single large write/read', function() {
        var bs = new pzpr.BitStream(10);
        bs.write(22, 0b1011101010100010100101);
        bs.reset();
        assert.equal(bs.read(22), 0b1011101010100010100101);
    });

    it('small byte-aligned write/read', function() {
        var bs = new pzpr.BitStream(10);
        bs.write(8, 0b10101101);
        bs.reset();
        assert.equal(bs.read(8), 0b10101101);
    });

    it('large byte-aligned write/read', function() {
        var bs = new pzpr.BitStream(10);
        bs.write(24, 0b101011010110101100011101);
        bs.reset();
        assert.equal(bs.read(24), 0b101011010110101100011101);
    });

    it('sequential writes', function() {
        var bs = new pzpr.BitStream(10);
        bs.write(3,  0b101);
        bs.write(8,  0b00110101);
        bs.write(24, 0b110101010101001010010101);
        bs.write(5,  0b01011);
        bs.write(12, 0b101001010010);
        bs.write(12, 0b001010100100);
        bs.write(1,  0b1);
        bs.reset();
        assert.equal(bs.read(32), 0b10100110101110101010101001010010);
        assert.equal(bs.read(32), 0b10101011101001010010001010100100);
        assert.equal(bs.read(1),  0b1);
    });

    it('sequential reads', function() {
        var bs = new pzpr.BitStream(10);
        bs.write(32, 0b10100110101110101010101001010010);
        bs.write(32, 0b10101011101001010010001010100100);
        bs.write(1,  0b1);
        bs.reset();
        assert.equal(bs.read(3),  0b101);
        assert.equal(bs.read(8),  0b00110101);
        assert.equal(bs.read(24), 0b110101010101001010010101);
        assert.equal(bs.read(5),  0b01011);
        assert.equal(bs.read(12), 0b101001010010);
        assert.equal(bs.read(12), 0b001010100100);
        assert.equal(bs.read(1),  0b1);
    });

    it('resizes', function() {
        var bs = new pzpr.BitStream(1);
        assert.equal(bs.arr.length, 1);
        bs.write(32, 0xbbe297c9);
        bs.reset();
        assert.equal(bs.read(32), 0xbbe297c9);
    });

    it('resizes many times', function() {
        var bs = new pzpr.BitStream(1);
        assert.equal(bs.arr.length, 1);
        for (var i = 0; i < 256; ++i) {
            bs.write(32, (0xbbe297c9*i)>>>0);
        }
        bs.reset();
        for (var i = 0; i < 256; ++i) {
            assert.equal(bs.read(32), (0xbbe297c9*i)>>>0);
        }
    });

    it('reads existing Uint8Array', function() {
        var arr = new Uint8Array(2);
        arr[0] = 0x8b;
        arr[1] = 0x29;
        var bs = new pzpr.BitStream(arr);
        assert.equal(bs.read(16), 0x8b29);
    });

});
