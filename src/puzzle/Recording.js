pzpr.classmgr.makeCommon({

    Recording: {

        initialize: function(puzzle) {
            this.puzzle = puzzle;
            this.lastOp = puzzle.getTime();
            this.recording = '';
            this.finalized = false;
        },

        add: function(chainflag, obj) {
            if (this.finalized) {
                return;
            }

            if (this.chainflag) {
                this.recording += 0 + ';' + obj + '.';
                window['console'].log('++', obj);
            } else {
                var now = this.puzzle.getTime(), delta = now - this.lastOp;
                this.recording += delta + ';' + obj + '.';
                this.lastOp = now;
                window['console'].log(obj);
            }
        },

        finalize: function() {
            this.finalized = true;
            return this.recording;
        },

        load: function(data) {
            var oplist = this.puzzle.opemgr.operationlist,
                cumul = 0;

            this.ops = data.slice(0,data.length-1).split('.').map(function(enc) {
                var parts = enc.split(';'),
                    strs = parts[1].split(/,/);
                for (var k = 0; k < oplist.length; k++) {
                    var ope = new oplist[k]();
                    if (ope.decode(strs)) {
                        return {
                            t: cumul += parseInt(parts[0]),
                            ope: ope
                        };
                    }
                }
            });
            this.opidx = 0;

            ui.menuconfig.set("autocheck_once", false);
            ui.callbackCalled = true;
            ui.puzzle.resetTime();

            requestAnimationFrame(this.playback.bind(this));
        },

        playback: function(t) {
            if (this.start === undefined) {
                this.start = t;
            }

            while (this.ops[this.opidx].t <= t - this.start) {
                this.puzzle.opemgr.newOperation();
                this.ops[this.opidx].ope.redo();

                if (++this.opidx === this.ops.length) {
                    ui.timer.stop();
                    return;
                }
            }

            requestAnimationFrame(this.playback.bind(this));
        }

    }

});
