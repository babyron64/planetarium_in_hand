window.addEventListener("deviceorientation", handleOrientation, true);

function handleOrientation(orientation) {
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

function handlePosition(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;

    debugOnWindow(latitude.toString() + "</br>" +
                longitude.toString(), 2);
}

function initLocation() {
    if (!navigator.geolocation) {
        alert("GPS infomation isn't available.");
        return false;
    }
    navigator.geolocation.getCurrentPosition(handlePosition);
    navigator.geolocation.watchPosition(handlePosition);
}