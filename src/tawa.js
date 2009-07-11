//
// パズル固有スクリプト部 たわむれんが版 tawa.js v3.2.0p2
//
Puzzles.tawa = function(){ };
Puzzles.tawa.prototype = {
	setting : function(){
		// グローバル変数の初期設定
		if(!k.qcols){ k.qcols = 6;}	// 盤面の横幅 本スクリプトでは一番上の段のマスの数を表すこととする.
		if(!k.qrows){ k.qrows = 7;}	// 盤面の縦幅
		k.irowake = 0;			// 0:色分け設定無し 1:色分けしない 2:色分けする

		k.iscross      = 0;		// 1:Crossが操作可能なパズル
		k.isborder     = 0;		// 1:Border/Lineが操作可能なパズル
		k.isextendcell = 0;		// 1:上・左側にセルを用意するパズル 2:四方にセルを用意するパズル

		k.isoutsidecross  = 0;	// 1:外枠上にCrossの配置があるパズル
		k.isoutsideborder = 0;	// 1:盤面の外枠上にborderのIDを用意する
		k.isborderCross   = 0;	// 1:線が交差するパズル
		k.isCenterLine    = 0;	// 1:マスの真ん中を通る線を回答として入力するパズル
		k.isborderAsLine  = 0;	// 1:境界線をlineとして扱う

		k.dispzero      = 1;	// 1:0を表示するかどうか
		k.isDispHatena  = 1;	// 1:qnumが-2のときに？を表示する
		k.isAnsNumber   = 0;	// 1:回答に数字を入力するパズル
		k.isArrowNumber = 0;	// 1:矢印つき数字を入力するパズル
		k.isOneNumber   = 0;	// 1:部屋の問題の数字が1つだけ入るパズル
		k.isDispNumUL   = 0;	// 1:数字をマス目の左上に表示するパズル(0はマスの中央)
		k.NumberWithMB  = 0;	// 1:回答の数字と○×が入るパズル

		k.BlackCell     = 1;	// 1:黒マスを入力するパズル
		k.NumberIsWhite = 1;	// 1:数字のあるマスが黒マスにならないパズル
		k.RBBlackCell   = 0;	// 1:連黒分断禁のパズル

		k.ispzprv3ONLY  = 1;	// 1:ぱずぷれv3にしかないパズル
		k.isKanpenExist = 0;	// 1:pencilbox/カンペンにあるパズル

		k.fstruct = ["others"];

		//k.def_csize = 36;
		//k.def_psize = 24;

		base.setTitle("たわむれんが","Tawamurenga");
		base.setExpression("　左クリックで黒マスが、右クリックで白マス確定マスが入力できます。",
						   " Left Click to input black cells, Right Click to input determined white cells.");
		base.setFloatbgcolor("rgb(64, 64, 64)");
		base.proto = 1;
	},
	menufix : function(){
		menu.addUseToFlags();
		menu.addLabels($("#pop1_1_cap1x"), "横幅 (黄色の数)", "Width (Yellows)");
		menu.addLabels($("#pop1_1_cap2x"), "高さ",            "Height");
	},

	protoChange : function(){
		this.protofunc = {
			cellpx  : Cell.prototype.px,
			bdinit2 : Board.prototype.initialize2
		};

		Cell.prototype.px = function(){ return mf(k.p0.x+this.cx*k.cwidth/2);};
		Board.prototype.initialize2 = function(){
			var total = 0;
			if     (this.lap==0){ total = mf(k.qrows*0.5)*(2*k.qcols-1)+((k.qrows%2==1)?k.qcols:0);}
			else if(this.lap==3 || this.lap==undefined){ total = mf(k.qrows*0.5)*(2*k.qcols+1)+((k.qrows%2==1)?k.qcols:0);}
			else{ total = k.qcols*k.qrows;}

			this.cell = new Array();
			this.cells = new Array();
			for(var i=0;i<total;i++){
				this.cell[i] = new Cell(i);
				this.cell[i].allclear(i);
				this.cells.push(i);
			}

			this.setposAll();
		};

		this.resize_original = base.resize_canvas_only.bind(base);
		base.resize_canvas_only = function(){
			puz.resize_original();

			// Canvasのサイズ変更
			this.cv_obj.attr("width",  k.p0.x*2 + k.qcols*k.cwidth + mf(bd.lap==0?0:(bd.lap==3?k.cwidth:k.cwidth/2)));
			this.cv_obj.attr("height", k.p0.y*2 + k.qrows*k.cheight);

			k.cv_oft.x = this.cv_obj.offset().left;
			k.cv_oft.y = this.cv_obj.offset().top;

			// jQuery対応:初めにCanvas内のサイズが0になり、描画されない不具合への対処
			if(g.vml){
				var fc = this.cv_obj.children(":first");
				fc.css("width",  ''+this.cv_obj.attr("clientWidth") + 'px');
				fc.css("height", ''+this.cv_obj.attr("clientHeight") + 'px');
			}
		};

		this.newboard_html_original = $(document.newboard).html();
	},
	protoOriginal : function(){
		Cell.prototype.px = this.protofunc.cellpx;
		Board.prototype.initialize2 = this.protofunc.bdinit2;
		base.resize_canvas_only = this.resize_original;
		$(document.newboard).html(this.newboard_html_original);

		$(document.flip.turnl).attr("disabled",false);
		$(document.flip.turnr).attr("disabled",false);
	},

	//---------------------------------------------------------
	//入力系関数オーバーライド
	input_init : function(){
		// マウス入力系
		mv.mousedown = function(x,y){
			if(k.mode==1){
				if(!kp.enabled()){ this.inputqnum(x,y,6);}
				else{ kp.display(x,y);}
			}
			else if(k.mode==3) this.inputcell(x,y);
		};
		mv.mouseup = function(x,y){ };
		mv.mousemove = function(x,y){
			if(k.mode==3) this.inputcell(x,y);
		};

		// キーボード入力系
		kc.keyinput = function(ca){
			if(k.mode==3){ return;}
			if(this.moveTCell(ca)){ return;}
			this.key_inputqnum(ca,6);
		};
		// xを2倍で渡したい為オーバーライド
		kc.moveTC = function(ca,mv){
			var tcx = tc.cursolx, tcy = tc.cursoly, flag = false;
			if     (ca == 'up'    && tcy-mv >= tc.miny){ tc.decTCY(mv); flag = true;}
			else if(ca == 'down'  && tcy+mv <= tc.maxy){ tc.incTCY(mv); flag = true;}
			else if(ca == 'left'  && tcx-mv >= tc.minx){ tc.decTCX(mv); flag = true;}
			else if(ca == 'right' && tcx+mv <= tc.maxx){ tc.incTCX(mv); flag = true;}

			if(flag){
				pc.paint(tcx-1, mf(tcy/2)-1, tcx, mf(tcy/2));
				pc.paint(tc.cursolx-1, mf(tc.cursoly/2)-1, tc.cursolx, mf(tc.cursoly/2));
				this.tcMoved = true;
			}
			return flag;
		};

		kp.kpgenerate = function(mode){
			this.inputcol('num','knum0','0','0');
			this.inputcol('num','knum1','1','1');
			this.inputcol('num','knum2','2','2');
			this.insertrow();
			this.inputcol('num','knum3','3','3');
			this.inputcol('num','knum4','4','4');
			this.inputcol('num','knum5','5','5');
			this.insertrow();
			this.inputcol('num','knum6','6','6');
			this.inputcol('num','knum.','-','?');
			this.inputcol('num','knum_',' ',' ');
			this.insertrow();
		};

		if(k.callmode=="pmake"){
			kp.generate(99, true, false, kp.kpgenerate.bind(kp));
			kp.kpinput = function(ca){
				kc.key_inputqnum(ca,Math.max(k.qcols,k.qrows));
			};
		}

		this.input_init2();

		tc.getTCC = function(){ return bd.cnum(this.cursolx, mf((this.cursoly-1)/2));}.bind(tc);
		tc.setTCC = function(id){
			if(id<0 || bd.cell.length<=id){ return;}
			this.cursolx = bd.cell[id].cx; this.cursoly = bd.cell[id].cy*2+1;
		};
		tc.incTCY = function(mv){
			this.cursoly+=mv;
			if(this.cursolx==this.minx || (this.cursolx<this.maxx && mf(this.cursoly/2)%2==1)){ this.cursolx++;}
			else{ this.cursolx--;}
		};
		tc.decTCY = function(mv){
			this.cursoly-=mv;
			if(this.cursolx==this.maxx || (this.cursolx>this.minx && mf(this.cursoly/2)%2==0)){ this.cursolx--;}
			else{ this.cursolx++;}
		};
		tc.setAlign = function(){
			this.minx = 0;
			this.miny = 0;
			this.maxx = (bd.lap==0?2*k.qcols-1:(bd.lap==3?2*k.qcols+1:2*k.qcols))-1;
			this.maxy = 2*k.qrows-1;

			if(bd.cnum(this.cursolx, mf(this.cursoly/2))==-1){ this.cursolx += (this.cursolx>0?-1:1);}
		};
		tc.setAlign();

		bd.setposCell = function(id){
			if(this.lap==0){
				this.cell[id].cy = mf((2*id)/(2*k.qcols-1));
				this.cell[id].cx = mf((2*id)%(2*k.qcols-1));
			}
			else if(this.lap==1){
				this.cell[id].cy = mf(id/k.qcols);
				this.cell[id].cx = mf(id%k.qcols)*2+(this.cell[id].cy%2==1?1:0);
			}
			else if(this.lap==2){
				this.cell[id].cy = mf(id/k.qcols);
				this.cell[id].cx = mf(id%k.qcols)*2+(this.cell[id].cy%2==0?1:0);
			}
			else if(this.lap==3){
				this.cell[id].cy = mf((2*id+1)/(2*k.qcols+1));
				this.cell[id].cx = mf((2*id+1)%(2*k.qcols+1));
			}
		};
		bd.cnum = function(bx,cy){
			return this.cnum2(bx,cy,k.qcols,k.qrows);
		};
		bd.cnum2 = function(bx,cy,qc,qr){
			if(cy<0||cy>qr-1||bx<0||bx>tc.maxx){ return -1;}
			else if(this.lap==0){
				if((bx+cy)%2==0 && (bx<=tc.maxx || cy%2==0)){ return mf((bx+cy*(2*qc-1))/2);}
			}
			else if(this.lap==1){
				if((bx+cy)%2==0 && (bx<=tc.maxx || cy%2==0)){ return mf(bx/2)+cy*qc;}
			}
			else if(this.lap==2){
				if((bx+cy)%2==1 && (bx<=tc.maxx || cy%2==1)){ return mf(bx/2)+cy*qc;}
			}
			else if(this.lap==3){
				if((bx+cy)%2==1 && (bx<=tc.maxx || cy%2==1)){ return mf((bx+cy*(2*qc+1))/2);}
			}
			return -1;
		};
		bd.initialize2();
		tc.setTCC(0);

		mv.cellid = function(p){
			var pos = this.cellpos(p);
			if((p.y-k.p0.y)%k.cheight==0){ return -1;} // 縦方向だけ、ぴったりは無効
			if(pos.x<0 || pos.x>tc.maxx+1 || pos.y<0 || pos.y>k.qrows-1){ return -1;}

			var cand = bd.cnum(pos.x, pos.y);
			cand = (cand!=-1?cand:bd.cnum(pos.x-1, pos.y));
			return cand;
		};
		mv.cellpos = function(p){
			return new Pos(mf((p.x-k.p0.x)/(k.cwidth/2)), mf((p.y-k.p0.y)/k.cheight));
		};

		menu.ex.newboard = function(e){
			if(menu.pop){
				var col = mf(parseInt(document.newboard.col.value));
				var row = mf(parseInt(document.newboard.row.value));
				var slap = {0:0,1:3,2:1,3:2}[this.clap];

				if(col==1 && (slap==0||slap==3)){ menu.popclose(); return;}
				if(slap==3){ col--;}
				if(col>0 && row>0){ bd.lap = slap; this.newboard2(col,row);}
				menu.popclose();
				base.resize_canvas();				// Canvasを更新する
			}
		};
		menu.ex.newboard2 = function(col,row){
			var total = 0;
			if     (bd.lap==0){ total = mf(row*0.5)*(2*col-1)+((row%2==1)?col:0);}
			else if(bd.lap==3){ total = mf(row*0.5)*(2*col+1)+((row%2==1)?col:0);}
			else{ total = col*row;}

			// 既存のサイズより小さいならdeleteする
			for(var n=bd.cell.length-1;n>=total;n--){
				if(bd.cell[n].numobj) { bd.cell[n].numobj.remove();}
				if(bd.cell[n].numobj2){ bd.cell[n].numobj2.remove();}
				delete bd.cell[n]; bd.cell.pop(); bd.cells.pop();
			}

			// 既存のサイズより大きいならnewを行う
			for(var i=bd.cell.length;i<total;i++){ bd.cell.push(new Cell()); bd.cells.push(i);}

			// サイズの変更
			//tc.maxy += (row-k.qrows)*2;
			k.qcols = col; k.qrows = row;
			tc.setAlign();

			// cellinit() = allclear()+setpos()を呼び出す
			for(var i=0;i<bd.cell.length;i++){ bd.cell[i].allclear(i);}

			um.allerase();
			bd.setposAll();
			tc.setTCC(0);

			ans.reset();
		};

		// 盤面の拡大
		menu.ex.expand = function(number, rc, key){
			var margin = 0;
			if(rc=='c'){
				if(key=='lt'){
					k.qcols += {0:0,1:0,2:1,3:1}[bd.lap];
					margin   = mf((k.qrows + {0:0,1:0,2:1,3:1}[bd.lap])/2);
					bd.lap   = {0:2,1:3,2:0,3:1}[bd.lap];
				}
				else if(key=='rt'){
					k.qcols += {0:0,1:1,2:0,3:1}[bd.lap];
					margin   = mf((k.qrows + {0:0,1:1,2:0,3:1}[bd.lap])/2);
					bd.lap   = {0:1,1:0,2:3,3:2}[bd.lap];
				}
				tc.maxx++;
			}
			else if(rc=='r'){
				k.qrows++;
				tc.maxy+=2;
				if(bd.lap==1||bd.lap==2){ margin = k.qcols;}
				else if(bd.lap==0){ margin = k.qcols-1;}
				else if(bd.lap==3){ margin = k.qcols+1;}

				if(key=='up'){
					k.qcols += {0:-1,1:0,2:0,3:1}[bd.lap];
					bd.lap   = {0:3,1:2,2:1,3:0}[bd.lap];
				}
			}

			var tf = ((key=='up'||key=='lt')?1:-1);
			var func = function(cx,cy){ var ty=(k.qrows-1)/2; return (ty+tf*(cy-ty)==0);};
			if     (key=='lt'){ func = function(cx,cy,f){ return (cx<=0);};}
			else if(key=='rt'){ func = function(cx,cy,f){ return (cx>=tc.maxx);};}

			var ncount = bd.cell.length;
			for(var i=0;i<margin;i++){ bd.cell.push(new Cell()); bd.cell[ncount+i].cellinit(ncount+i); bd.cells.push(ncount+i);} 
			for(var i=0;i<bd.cell.length;i++){ bd.setposCell(i);}
			for(var i=bd.cell.length-1;i>=0;i--){
				if(i-margin<0 || func(bd.cell[i].cx, bd.cell[i].cy)){
					bd.cell[i] = new Cell(); bd.cell[i].cellinit(i); margin--;
				}
				else if(margin>0){ bd.cell[i] = bd.cell[i-margin];}
				if(margin==0){ break;}
			}
			bd.setposAll();
			tc.setAlign();
		};
		// 盤面の縮小
		menu.ex.reduce = function(number, rc, key){
			if((k.qcols==1 && rc=='c' && bd.lap!=3)||(rc=='r'&&k.qrows==1)){ return false;}

			var tf = ((key=='up'||key=='lt')?1:-1);
			var func = function(cx,cy){ var ty=(k.qrows-1)/2; return (ty+tf*(cy-ty)==0);};
			if     (key=='lt'){ func = function(cx,cy,f){ return (cx<=0);};}
			else if(key=='rt'){ func = function(cx,cy,f){ return (cx>=tc.maxx);};}

			var margin = 0;
			for(var i=0;i<bd.cell.length;i++){
				if(func(bd.cell[i].cx, bd.cell[i].cy)){
					if(bd.cell[i].numobj) { bd.cell[i].numobj.hide();}
					if(bd.cell[i].numobj2){ bd.cell[i].numobj2.hide();}
					if(!bd.isNullCell(i)){ um.addOpe('cell', 'cell', i, bd.cell[i], 0);}
					margin++;
				}
				else if(margin>0){ bd.cell[i-margin] = bd.cell[i];}
			}
			for(var i=0;i<margin;i++){ bd.cell.pop(); bd.cells.pop();}

			if(rc=='c'){
				if(key=='lt'){
					k.qcols -= {0:1,1:1,2:0,3:0}[bd.lap];
					bd.lap   = {0:2,1:3,2:0,3:1}[bd.lap];
				}
				else if(key=='rt'){
					k.qcols -= {0:1,1:0,2:1,3:0}[bd.lap];
					bd.lap   = {0:1,1:0,2:3,3:2}[bd.lap];
				}
				tc.maxx--;
			}
			else if(rc=='r'){
				k.qrows--;
				tc.maxy-=2;
				if(key=='up'){
					k.qcols += {0:-1,1:0,2:0,3:1}[bd.lap];
					bd.lap   = {0:3,1:2,2:1,3:0}[bd.lap];
				}
			}

			bd.setposAll();
			tc.setAlign();
			return true;
		};
		// 回転・反転(上下反転)
		menu.ex.flipy = function(rx1,ry1,rx2,ry2){
			if(k.qrows%2==0){ bd.lap = {0:3,1:2,2:1,3:0}[bd.lap];}
			rx2 = tc.maxx;

			var cnt = bd.cell.length;
			var ch = new Array(); for(var i=0;i<cnt;i++){ ch[i]=1;}
			while(cnt>0){
				var tmp, source, prev, target, nex;
				for(source=0;source<bd.cell.length;source++){ if(ch[source]==1){ break;}}
				tmp = bd.cell[source]; target = source;
				while(true){
					nex = bd.cnum2(bd.cell[target].cx, (ry2+ry1)-bd.cell[target].cy, k.qcols, k.qrows);
					if(nex==source){ break;}
					bd.cell[target] = bd.cell[nex]; ch[target]=0; cnt--; target = nex;
				}
				bd.cell[target] = tmp; ch[target]=0; cnt--; 
			}
			bd.setposAll();
		};
		// 回転・反転(左右反転)
		menu.ex.flipx = function(rx1,ry1,rx2,ry2){
			bd.lap = {0:0,1:2,2:1,3:3}[bd.lap];
			rx2 = tc.maxx;

			var cnt = bd.cell.length;
			var ch = new Array(); for(var i=0;i<cnt;i++){ ch[i]=1;}
			while(cnt>0){
				var tmp, source, prev, target, nex;
				for(source=0;source<bd.cell.length;source++){ if(ch[source]==1){ break;}}
				tmp = bd.cell[source]; target = source;
				while(true){
					nex = bd.cnum2((rx2+rx1)-bd.cell[target].cx, bd.cell[target].cy, k.qcols, k.qrows);
					if(nex==source){ break;}
					bd.cell[target] = bd.cell[nex]; ch[target]=0; cnt--; target = nex;
				}
				bd.cell[target] = tmp; ch[target]=0; cnt--; 
			}
			bd.setposAll();
		};

		$(document.flip.turnl).attr("disabled",true);
		$(document.flip.turnr).attr("disabled",true);
	},
	input_init2 : function(){	// 処理が大きくなったので分割(input_init()から呼ばれる)
		menu.ex.clap = 3;
		bd.lap = menu.ex.clap;	// 2段目は => 0:左右引っ込み 1:右のみ出っ張り 2:左のみ出っ張り 3:左右出っ張り

		pp.funcs.newboard = function(){
			menu.pop = $("#pop1_1");
			pp.funcs.clickimg({0:0,1:2,2:3,3:1}[bd.lap]);
			document.newboard.col.value = (k.qcols+(bd.lap==3?1:0));
			document.newboard.row.value = k.qrows;
			k.enableKey = false;
		};
		pp.funcs.clickimg = function(num){
			$("img.clickimg").parent().css("background-color","");
			$("#nb"+num).parent().css("background-color","red");
			menu.ex.clap = num;
		};

		$(document.newboard).html(
			  "<span id=\"pop1_1_cap0\">盤面を新規作成します。</span><br>\n"
			+ "<input type=\"text\" name=\"col\" value=\"\" size=\"3\" maxlength=\"3\" /> <span id=\"pop1_1_cap1x\">横幅 (黄色の数)</span><br>\n"
			+ "<input type=\"text\" name=\"row\" value=\"\" size=\"3\" maxlength=\"3\" /> <span id=\"pop1_1_cap2x\">高さ</span><br>\n"
			+ "<table border=\"0\" cellpadding=\"0\" cellspacing=\"2\" style=\"margin-top:4pt;margin-bottom:4pt;\">"
			+ "<tr id=\"laps\" style=\"padding-bottom:2px;\">\n"
			+ "</tr></table>\n"
			+ "<input type=\"button\" name=\"newboard\" value=\"新規作成\" /><input type=\"button\" name=\"cancel\" value=\"キャンセル\" />\n"
		);
		var cw=32, bw=2;
		for(var i=0;i<=3;i++){
			newEL('td').append(
				newEL('div').append(
					newEL('img').attr("src",'./src/img/tawa_nb.gif').attr("class","clickimg").attr("id","nb"+i)
								.css("left","-"+(i*cw)+"px").css("clip", "rect(0px,"+((i+1)*cw)+"px,"+cw+"px,"+(i*cw)+"px)")
								.css("position","absolute").css("margin",""+bw+"px")
								.click(pp.funcs.clickimg.bind(pp,i)).unselectable()
				).css("position","relative").css("display","block").css("width",""+(cw+bw*2)+"px").css("height",""+(cw+bw*2)+"px")
			).appendTo($("#laps"));
		}
	},

	//---------------------------------------------------------
	//画像表示系関数オーバーライド
	graphic_init : function(){
		pc.MBcolor = "rgb(64, 255, 64)";
		pc.BDlinecolor = "black";

		pc.paint = function(x1,y1,x2,y2){
			x1--; x2++;
			this.flushCanvas_tawa(x1+1,y1,x2,y2);
		//	this.flushCanvasAll();

			this.drawWhiteCells(x1,y1,x2,y2);
			this.drawBlackCells(x1,y1,x2,y2);
			this.drawBDline_tawa(x1-1,y1,x2+1,y2);

			this.drawNumbers(x1,y1,x2,y2);

			if(k.mode==1){ this.drawTCell_tawa(x1,y1,x2+1,y2+1);}else{ this.hideTCell();}
		};
		pc.paintAll = function(){ if(this.already()){ this.paint(0,0,tc.maxx+1,k.qrows);} },

		pc.drawBDline_tawa = function(x1,y1,x2,y2){
			if(x1<0){ x1=0;} if(x2>tc.maxx+1){ x2=tc.maxx+1;}
			if(y1<0){ y1=0;} if(y2>k.qrows-1){ y2=k.qrows-1;}

			var lw = mf((k.cwidth/24)>=1?(k.cwidth/24):1);
			var lm = mf((lw-1)/2);

			g.fillStyle = this.BDlinecolor;
			var xa = Math.max(x1,0), xb = Math.min(x2+1,tc.maxx+2);
			var ya = Math.max(y1,0), yb = Math.min(y2+1,k.qrows  );
			for(var i=ya;i<=yb;i++){
				if(this.vnop("bdx"+i+"_",1)){
					var redx = 0, redw = 0;
					if     ((bd.lap==3 && (i==0||(i==k.qrows&&i%2==1))) || (bd.lap==0 && (i==k.qrows&&i%2==0))){ redx=1; redw=2;}
					else if((bd.lap==2 && (i==0||(i==k.qrows&&i%2==1))) || (bd.lap==1 && (i==k.qrows&&i%2==0))){ redx=1; redw=1;}
					else if((bd.lap==1 && (i==0||(i==k.qrows&&i%2==1))) || (bd.lap==2 && (i==k.qrows&&i%2==0))){ redx=0; redw=1;}
					g.fillRect(mf(k.p0.x+(x1+redx)*k.cwidth/2-lm), mf(k.p0.y+i*k.cheight-lm), (x2-x1+1-redw)*k.cwidth/2+1, lw);
				}
				if(i>k.qrows-1){ break;}
				var xs = xa;
				if((bd.lap==2 || bd.lap==3) ^ !((i%2==1)^(xs%2==0))){ xs++;}
				for(var j=xs;j<=xb;j+=2){
					if(this.vnop("bdy"+i+"_"+j+"_",1)){
						g.fillRect(mf(k.p0.x+j*k.cwidth/2-lm), mf(k.p0.y+i*k.cheight-lm), lw, k.cheight+1);
					}
				}
			}

			this.vinc();
		};

		pc.drawTCell_tawa = function(x1,y1,x2,y2){
			if(tc.cursolx < x1   || x2  +1 < tc.cursolx){ return;}
			if(tc.cursoly < y1*2 || y2*2+2 < tc.cursoly){ return;}

			var px = k.p0.x + mf(tc.cursolx*k.cwidth/2);
			var py = k.p0.y + mf((tc.cursoly-1)*k.cheight/2);
			var w = (k.cwidth<32?2:mf(k.cwidth/16));

			this.vdel(["tc1_","tc2_","tc3_","tc4_"]);
			g.fillStyle = (k.mode==1?"rgb(255,64,64)":"rgb(64,64,255)");
			if(this.vnop("tc1_",0)){ g.fillRect(px+1,           py+1, k.cwidth-2,  w);}
			if(this.vnop("tc2_",0)){ g.fillRect(px+1,           py+1, w, k.cheight-2);}
			if(this.vnop("tc3_",0)){ g.fillRect(px+1, py+k.cheight-w, k.cwidth-2,  w);}
			if(this.vnop("tc4_",0)){ g.fillRect(px+k.cwidth-w,  py+1, w, k.cheight-2);}

			this.vinc();
		};

		pc.flushCanvas_tawa = function(x1,y1,x2,y2){
			if(!g.vml){
				if(x1<=0 && y1<=0 && x2>=tc.maxx+1 && y2>=k.qrows-1){
					this.flushCanvasAll();
				}
				else{
					g.fillStyle = "rgb(255, 255, 255)";
					g.fillRect(k.p0.x+x1*k.cwidth/2, k.p0.y+y1*k.cheight, (x2-x1+1)*k.cwidth/2, (y2-y1+1)*k.cheight);
				}
			}
			else{ g.zidx=1;}
		};
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	encode_init : function(){
		enc.pzlimport = function(type, bstr){
			if(type==0 || type==1){ bstr = this.decodeTawamurenga(bstr);}
		};
		enc.pzlexport = function(type){
			if(type==0)     { document.urloutput.ta.value = this.getURLbase()+"?"+k.puzzleid+this.pzldata();}
			else if(type==1){ document.urloutput.ta.value = this.getDocbase()+k.puzzleid+"/sa/m.html?"+this.pzldata();}
			else if(type==3){ document.urloutput.ta.value = this.getURLbase()+"?m+"+k.puzzleid+this.pzldata();}
		};
		enc.pzldata = function(){
			return "/"+k.qcols+"/"+k.qrows+"/"+bd.lap+"/"+this.encodeNumber10();
		};

		enc.decodeTawamurenga = function(bstr){
			var barray = bstr.split("/");
			bd.lap = parseInt(barray[0]);
			menu.ex.newboard2(enc.uri.cols, enc.uri.rows);
			return this.decodeNumber10(barray[1]);
		};

		//---------------------------------------------------------
		fio.decodeOthers = function(array){
			if(array.length<k.qrows+1){ return false;}
			bd.lap = parseInt(array[0]);
			for(var cy=0;cy<k.qrows;cy++){
				var cols = array[cy+1].split(" ");
				var n=0;
				for(var bx=0;bx<=tc.maxx;bx++){
					var cc=bd.cnum(bx,cy);
					if(cc==-1){ continue;}
					if     (cols[n]=="#"){ bd.sQaC(cc, 1);}
					else if(cols[n]=="+"){ bd.sQsC(cc, 1);}
					else if(cols[n]=="-"){ bd.sQnC(cc, -2);}
					else if(cols[n]!="."){ bd.sQnC(cc, parseInt(cols[n]));}
					n++;
				}
			}
			return true;
		};
		fio.encodeOthers = function(){
			var bstr = "";
			for(var cy=0;cy<k.qrows;cy++){
				for(var bx=0;bx<=tc.maxx;bx++){
					var cc=bd.cnum(bx,cy);
					if(cc==-1){ continue;}
					if     (bd.QnC(cc)==-2){ bstr += "- ";}
					else if(bd.QnC(cc)!=-1){ bstr += (""+bd.QnC(cc).toString()+" ");}
					else if(bd.QaC(cc)== 1){ bstr += "# ";}
					else if(bd.QsC(cc)== 1){ bstr += "+ ";}
					else{ bstr += ". ";}
				}
				bstr += "/";
			}
			return bd.lap + "/" + bstr;
		};
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	answer_init : function(){
		ans.checkAns = function(){

			if( !this.checkThreeBlackCells() ){
				this.setAlert('黒マスが横に3マス以上続いています。','Three or more black cells continue horizonally.'); return false;
			}

			if( !this.checkUnderCells() ){
				this.setAlert('黒マスの下に黒マスがありません。','There are no black cells under a black cell..'); return false;
			}

			if( !this.checkNumbers() ){
				this.setAlert('数字の周りに入っている黒マスの数が違います。','The number of black cells around a number is not correct.'); return false;
			}

			return true;
		};

		ans.checkThreeBlackCells = function(){
			for(var cy=0;cy<k.qrows;cy++){
				var clist = [];
				for(var bx=0;bx<=tc.maxx;bx++){
					var cc = bd.cnum(bx,cy);
					if(cc==-1){ continue;}
					else if(bd.QaC(cc)!=1 || bd.QnC(cc)!=-1){
						if(clist.length>=3){ break;}
						clist=[];
					}
					else{ clist.push(cc);}
				}
				if(clist.length>=3){
					bd.sErC(clist,1);
					return false;
				}
			}
			return true;
		};
		ans.checkNumbers = function(){
			for(var c=0;c<bd.cell.length;c++){
				if(bd.QnC(c)==-1||bd.QnC(c)==-2){ continue;}
				var clist = [];
				clist.push(bd.cnum(bd.cell[c].cx-1,bd.cell[c].cy-1));
				clist.push(bd.cnum(bd.cell[c].cx+1,bd.cell[c].cy-1));
				clist.push(bd.cnum(bd.cell[c].cx-2,bd.cell[c].cy  ));
				clist.push(bd.cnum(bd.cell[c].cx+2,bd.cell[c].cy  ));
				clist.push(bd.cnum(bd.cell[c].cx-1,bd.cell[c].cy+1));
				clist.push(bd.cnum(bd.cell[c].cx+1,bd.cell[c].cy+1));

				var cnt=0;
				for(var i=0;i<clist.length;i++){ if(bd.QaC(clist[i])==1){ cnt++;} }

				if(bd.QnC(c)!=cnt){
					bd.sErC([c],1);
					bd.sErC(clist,1);
					return false;
				}
			}
			return true;
		};
		ans.checkUnderCells = function(){
			for(var c=0;c<bd.cell.length;c++){
				if(bd.QaC(c)!=1 || bd.cell[c].cy==k.qrows-1){ continue;}

				if(bd.QaC(bd.cnum(bd.cell[c].cx-1,bd.cell[c].cy+1))!=1 &&
				   bd.QaC(bd.cnum(bd.cell[c].cx+1,bd.cell[c].cy+1))!=1)
				{
					bd.sErC([c],1);
					bd.sErC([bd.cnum(bd.cell[c].cx-1,bd.cell[c].cy+1)],1);
					bd.sErC([bd.cnum(bd.cell[c].cx+1,bd.cell[c].cy+1)],1);
					return false;
				}
			}
			return true;
		};
	}
};
