function initConfig() {
    var IsiPhone = navigator.userAgent.indexOf("iPhone") != -1;
    var IsiPod = navigator.userAgent.indexOf("iPod") != -1;
    var IsiPad= navigator.userAgent.indexOf("iPad") != -1;

    app_info.screen.width = app_info.gl.canvas.width;
    app_info.screen.height = app_info.gl.canvas.height;
    app_info.screen.fov = degToRad(45);

    debugOnWindow("iPhone: "+IsiPhone+"\n"+
                  "iPod:"+IsiPod+"\n"+
                  "iPad:"+IsiPad, 3);
}