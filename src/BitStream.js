pzpr.BitStream = function(arg) {
    this.arr = arg && arg.constructor === Uint8Array ? arg : new Uint8Array(arg || 1024);
    this.bytepos = 0;
    this.bitsleft = 8;
}

pzpr.BitStream.prototype.read = function(len) {
    var val = 0;

    // read chunks of bits that advance the byte pointer
    while (len >= this.bitsleft) {
        val |= (this.arr[this.bytepos++] & ((1 << this.bitsleft) - 1)) << (len -= this.bitsleft);
        this.bitsleft = 8;
    }

    // read the last chunk
    val |= (this.arr[this.bytepos] >>> (this.bitsleft -= len)) & ((1 << len) - 1);
    return val >>> 0;
};

pzpr.BitStream.prototype.write = function(len, data) {
    // reallocate if out of space
    var needs = this.bytepos + Math.ceil(len/8);
    if (needs >= this.arr.length) {
        var newArr = new Uint8Array(needs*2);
        newArr.set(this.arr);
        this.arr = newArr;
    }

    // write chunks of bits that advance the byte pointer
    while (len >= this.bitsleft) {
        // safe to bitmask with 0xff here, since if bitsleft != 8 we're at the start of data
        this.arr[this.bytepos++] |= (data >>> (len -= this.bitsleft)) & 0xff;
        this.bitsleft = 8;
    }

    // write the last chunk
    this.arr[this.bytepos] |= (data & ((1 << len) - 1)) << (this.bitsleft -= len);
};

pzpr.BitStream.prototype.readVLQ = function(chunklen) {
    var val = 0, pos = 0;
    while (this.read(1)) {
        val |= this.read(chunklen) << pos;
        pos += chunklen;
    }
    val |= this.read(chunklen) << pos;
    return val >>> 0;
};

pzpr.BitStream.prototype.writeVLQ = function(chunklen, n) {
    if (!n) {
        this.write(chunklen+1, 0);
    }
    while (n) {
        var chunk = n & ((1 << chunklen) - 1);
        n >>>= chunklen;
        this.write(1, (n !== 0)+0);
        this.write(chunklen, chunk);
    }
};

pzpr.BitStream.prototype.readSignedVLQ = function(chunklen) {
    var sign = this.read(1) ? -1 : 1;
    return sign * this.readVLQ(chunklen);
};

pzpr.BitStream.prototype.writeSignedVLQ = function(chunklen, n) {
    this.write(1, n < 0 ? 1 : 0);
    this.writeVLQ(chunklen, Math.abs(n));
};

pzpr.BitStream.prototype.writeString = function(str) {
    var encoded = new TextEncoder().encode(str);
    this.writeVLQ(3, encoded.length);
    var stream = this;
    encoded.forEach(function(b) {
        stream.write(8, b);
    });
};

pzpr.BitStream.prototype.readString = function() {
    var len = this.readVLQ(3),
        encoded = new Uint8Array(len);
    for (var i = 0; i < len; ++i) {
        encoded[i] = this.read(8);
    }
    return new TextDecoder().decode(encoded);
}

// WARNING: does not resize the buffer if seeking past the end
// (should not matter, because buffer will autoresize on write)
pzpr.BitStream.prototype.seek = function(bytepos, bitsleft) {
    this.bytepos = bytepos || 0;
    this.bitsleft = bitsleft || 8;
};

pzpr.BitStream.prototype.cut = function() {
    return this.arr.subarray(0, this.bytepos+1);
};

pzpr.BitStream.prototype.inbounds = function() {
    return this.bytepos < this.arr.length;
};
