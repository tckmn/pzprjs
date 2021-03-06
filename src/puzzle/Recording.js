pzpr.classmgr.makeCommon({

    Recording: {

        initialize: function(puzzle) {
            this.puzzle = puzzle;
            this.lastOp = puzzle.getTime();
            this.recording = [];
            this.sigcounts = {};
            this.finalized = false;
        },

        add: function(chainflag, obj) {
            if (this.finalized || !this.puzzle.playeronly) {
                return;
            }

            var t = 0;
            if (!chainflag) {
                var now = this.puzzle.getTime();
                t = 1 + now - this.lastOp;
                this.lastOp = now;
            }

            var sig = JSON.stringify(obj.getSignature());
            this.sigcounts[sig] = (this.sigcounts[sig] || 0) + 1;

            this.recording.push({ t: t, obj: obj, sig: sig });
        },

        finalize: function(json) {
            this.finalized = true;

            // build huffman tree
            this.sigcounts[JSON.stringify([pzpr.RecTools.key2sig.EOF])] = 1;
            var nodes = Object.entries(this.sigcounts).map(function(x) {
                return { sig: x[0], count: x[1] };
            }).sort(function(a, b) {
                return a.count - b.count;
            });
            while (nodes.length >= 2) {
                var a = nodes.shift(), b = nodes.shift(),
                    newNode = {
                        count: a.count + b.count,
                        ch0: a, ch1: b
                    }, added = false;
                for (var i = 0; i < nodes.length; ++i) {
                    if (a.count + b.count < nodes[i].count) {
                        nodes.splice(i, 0, newNode);
                        added = true;
                        break;
                    }
                }
                if (!added) {
                    nodes.push(newNode);
                }
            }

            // convert huffman tree to lookup table
            var hufftbl = {}, buildhufftbl = function(tree, bits, len) {
                if (tree.sig) {
                    hufftbl[tree.sig] = { bits: bits, len: len };
                } else {
                    buildhufftbl(tree.ch0, (bits << 1),   len+1);
                    buildhufftbl(tree.ch1, (bits << 1)+1, len+1);
                }
            };
            buildhufftbl(nodes[0], 0, 0);

            // start writing data
            var stream = new pzpr.BitStream(json);
            stream.seek(json.length+1);

            // version header
            stream.write(8, 0x00);

            // serialize huffman tree
            var writeTree = function(tree) {
                if (tree.sig) {
                    stream.write(1, 0);
                    var sig = JSON.parse(tree.sig);
                    stream.write(8, sig[0]);
                    pzpr.RecTools.sig2params[sig[0]].forEach(function(ptype, idx) {
                        switch (ptype) {
                        case 'number':
                            stream.writeSignedVLQ(5, sig[idx+1]);
                            break;
                        case 'string':
                            stream.writeString(sig[idx+1]);
                            break;
                        }
                    });
                } else {
                    stream.write(1, 1);
                    writeTree(tree.ch0);
                    writeTree(tree.ch1);
                }
            };
            writeTree(nodes[0]);

            // TODO
            var dims = 1;

            // serialize operations
            this.recording.forEach(function(x) {
                var huff = hufftbl[x.sig];
                stream.write(huff.len, huff.bits);
                stream.writeVLQ(5, x.t);
                x.obj.encodeBin(stream, dims);
            });

            // eof
            var huff = hufftbl[JSON.stringify([pzpr.RecTools.key2sig.EOF])];
            stream.write(huff.len, huff.bits);

            return stream.cut();
        },

        load: function(buf, instant) {
            // check version header
            var stream = new pzpr.BitStream(buf);
            if (stream.read(8) !== 0) {
                return false;
            }

            this.finalized = true;

            // read huffman tree
            var readTree = function() {
                if (stream.read(1)) {
                    var ch0 = readTree(), ch1 = readTree();
                    return { ch0: ch0, ch1: ch1 };
                } else {
                    var sig = stream.read(8),
                        args = pzpr.RecTools.sig2params[sig].map(function(ptype) {
                            switch (ptype) {
                            case 'number':
                                return stream.readSignedVLQ(5);
                            case 'string':
                                return stream.readString();
                            }
                        });
                    return { sig: sig, args: args };
                }
            };
            var tree = readTree();

            // TODO
            var dims = 1;

            // read operations
            this.ops = [];
            this.opidx = 0;
            this.instant = instant;
            var oplist = this.puzzle.opemgr.operationlist, cumul = 0;
            while (stream.inbounds()) {
                var huff = tree;
                while (huff.ch0) {
                    huff = stream.read(1) ? huff.ch1 : huff.ch0;
                }
                if (huff.sig === pzpr.RecTools.key2sig.EOF) {
                    break;
                }
                var t = stream.readVLQ(5), ope;
                if (huff.sig) {
                    for (var i = 0; i < oplist.length; ++i) {
                        ope = new oplist[i]();
                        if (ope.decodeBin(stream, huff.sig, huff.args, dims)) {
                            break;
                        }
                    }
                } else {
                    var strs = stream.readString().split(',');
                    for (var i = 0; i < oplist.length; ++i) {
                        ope = new oplist[i]();
                        if (ope.decode(strs)) {
                            break;
                        }
                    }
                }
                this.ops.push({ chainflag: t === 0, t: cumul += (t ? t-1 : t), ope: ope });
            }

            ui.menuconfig.set("autocheck_once", false);
            ui.callbackCalled = true;
            ui.puzzle.resetTime();

            requestAnimationFrame(this.playback.bind(this));
        },

        playback: function(t) {
            if (this.start === undefined) {
                this.start = t;
            }

            while (this.instant || (this.ops[this.opidx].t <= t - this.start)) {
                if (!this.ops[this.opidx].chainflag) {
                    this.puzzle.opemgr.newOperation();
                }

                var ope = this.ops[this.opidx].ope;
                if (ope.playback) {
                    ope.playback();
                } else {
                    ope.redo();
                }

                if (++this.opidx === this.ops.length) {
                    ui.timer.stop();
                    return;
                }
            }

            requestAnimationFrame(this.playback.bind(this));
        }

    }

});

pzpr.RecTools = {

    data: [
        {key: 'UNK', sig: 0},

        // ObjectOperation
        {key: 'OO_CA0',  sig: 1},
        {key: 'OO_CA1',  sig: 2},
        {key: 'OO_CA2',  sig: 3},
        {key: 'OO_CA3',  sig: 4},
        {key: 'OO_CA4',  sig: 5},
        {key: 'OO_CA5',  sig: 6},
        {key: 'OO_CA11', sig: 7},
        {key: 'OO_CA12', sig: 8},
        {key: 'OO_CA13', sig: 9},
        {key: 'OO_CA41', sig: 10},
        {key: 'OO_CA42', sig: 11},
        {key: 'OO_CA43', sig: 12},
        {key: 'OO_CA44', sig: 13},
        {key: 'OO_CA45', sig: 14},
        {key: 'OO_CA46', sig: 15},
        {key: 'OO_CA47', sig: 16},
        {key: 'OO_CA48', sig: 17},
        {key: 'OO_CA49', sig: 18},
        {key: 'OO_CA50', sig: 19},
        {key: 'OO_CS0',  sig: 20},
        {key: 'OO_CS1',  sig: 21},
        {key: 'OO_CS2',  sig: 22},
        {key: 'OO_BS0',  sig: 23},
        {key: 'OO_BS1',  sig: 24},
        {key: 'OO_BS2',  sig: 25},
        {key: 'OO_BS11', sig: 26},
        {key: 'OO_BS12', sig: 27},
        {key: 'OO_CK0',  sig: 28},
        {key: 'OO_CK1',  sig: 29},
        {key: 'OO_XS0',  sig: 30},
        {key: 'OO_XS1',  sig: 31},
        {key: 'OO_BA0',  sig: 32},
        {key: 'OO_BA1',  sig: 33},
        {key: 'OO_BL0',  sig: 34},
        {key: 'OO_BL1',  sig: 35},

        // ObjectOperation (with numeric parameter)
        {key: 'OO_CM_n',  sig: 36, params: ['number']},
        {key: 'OO_CB0_n', sig: 37, params: ['number']},
        {key: 'OO_CB1_n', sig: 38, params: ['number']},
        {key: 'OO_CB2_n', sig: 39, params: ['number']},
        {key: 'OO_CB3_n', sig: 40, params: ['number']},

        // ObjectOperation (unknown)
        {key: 'OO_GEN', sig: 41, params: ['string', 'number']},

        // misc operations
        {key: 'BCLR', sig: 42},
        {key: 'TENT', sig: 43},
        {key: 'TFIN', sig: 44},

        // custom operations
        {key: 'UNDO', sig: 45},
        {key: 'REDO', sig: 46},
        {key: 'TREJ', sig: 47},
        {key: 'ACLR', sig: 48},
        {key: 'CHEK', sig: 49},

        // puzzle-specific operations
        {key: 'SEGT0', sig: 50},
        {key: 'SEGT1', sig: 51},

        {key: 'EOF', sig: 255}
    ],
    key2sig: {},
    sig2key: {},
    sig2params: {},

    writeCoords: function(stream, dims, x, y) {
        stream.writeVLQ(5, x);
        stream.writeVLQ(5, y);
    },

    readCoords: function(stream, dims) {
        return [stream.readVLQ(5), stream.readVLQ(5)];
    }

};

pzpr.RecTools.data.forEach(function(x) {
    pzpr.RecTools.key2sig[x.key] = x.sig;
    pzpr.RecTools.sig2key[x.sig] = x.key;
    pzpr.RecTools.sig2params[x.sig] = x.params || [];
});
