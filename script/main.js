window.onload = function() {
    initConfig();
    initLocation();
}

function debugOnWindow(msg, num) {
    document.getElementById("debug"+num.toString()).innerHTML = msg;
}