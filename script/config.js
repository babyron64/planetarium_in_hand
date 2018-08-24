function initConfig() {
    var IsiPhone = navigator.userAgent.indexOf("iPhone") != -1;
    var IsiPod = navigator.userAgent.indexOf("iPod") != -1;
    var IsiPad= navigator.userAgent.indexOf("iPad") != -1;

    debugOnWindow("iPhone: "+IsiPhone+"\n"+
                  "iPod:"+IsiPod+"\n"+
                  "iPad:"+IsiPad, 3);
}