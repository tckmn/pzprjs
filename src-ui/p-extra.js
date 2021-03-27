ui.callbackCalled = false;
ui.callbackComplete = function(puzzle, check, timeOverride) {
    if(ui.callbackCalled){
        // only record the first solve
        return;
    }
    ui.callbackCalled = true;

    // careful about using || here because timeOverride could be 0
    var time = timeOverride === undefined ? puzzle.getTime() : timeOverride;

    var pzv = ui.pzv;
    if(!pzv){
        // no boot pzv saved
        return;
    }
    if(!puzzle.playeronly){
        // don't record times in edit mode
        return;
    }
    if(ui.network.mode !== ""){
        // don't record times when network play is active
        return;
    }

    ui.localdb.send(pzv, time, puzzle.recording);

    if(puzzle.getConfig("variant")){
        // completion makes no sense for variants currently
        return;
    }
    if (timeOverride !== undefined) {
        // don't send overrides to puzz.link (only pzplus)
        return;
    }

    var xmlhttp = new XMLHttpRequest(),
        data = { pzv: pzv, time: time },
        token = localStorage.getItem('token'),
        userid = localStorage.getItem('user_id');
    if (token && userid) {
        data.user_id = userid;
        xmlhttp.open("POST", "https://puzz.link/db/api/pzv_solves");
        xmlhttp.setRequestHeader("Authorization", "Bearer " + token);
    } else {
        xmlhttp.open("POST", "https://puzz.link/db/api/pzv_solves_anon");
    }
    xmlhttp.onreadystatechange = function(){};
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.setRequestHeader("Prefer", "return=minimal"); // anon auth error otherwise
    xmlhttp.send(JSON.stringify(data));
};
