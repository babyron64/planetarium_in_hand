function debugOrientation(orientation) {
    var absolute = orientation.absolute; // inavailable on safari
    if (absolute == false) {
        return;
    }

    var alpha    = orientation.alpha;
    if (orientation.webkitCompassHeading) {
        alpha = orientation.webkitCompassHeading;
    }
    var beta     = orientation.beta;
    var gamma    = orientation.gamma;

    debugOnWindow(alpha.toString() + "</br>" +
                beta.toString() + "</br>" +
                gamma.toString(), 1);
}

function debugPosition(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;

    debugOnWindow(latitude.toString() + "</br>" +
                longitude.toString(), 2);
}

function initLocation(pl) {
    if (!navigator.geolocation) {
        throw new Error("GPS information isn't available.");
    }

    if (pl.changePosition) {
        navigator.geolocation.getCurrentPosition(pl.changePosition);
        navigator.geolocation.watchPosition(pl.changePosition);
    }

    if (pl.changeOrientation) {
        window.addEventListener("deviceorientation", pl.changeOrientation, true);
    }
}