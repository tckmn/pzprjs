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
    val |= (this.arr[this.bytepos] >>> (this.bitsleft -= len)) & ((2 << len) - 1);
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
    this.arr[this.bytepos] |= (data & ((2 << len) - 1)) << (this.bitsleft -= len);
};

// WARNING: does not resize the buffer if seeking past the end
// (should not matter, because buffer will autoresize on write)
pzpr.BitStream.prototype.seek = function(bytepos, bitsleft) {
    this.bytepos = bytepos || 0;
    this.bitsleft = bitsleft || 8;
};
