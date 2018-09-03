/* 
 * dependency
 *     setting.js
 */

async function initLocation() {
    const pp = createPromise();
    const po = createPromise();

    if (navigator.geolocation) {
        function initPosition(position) {
            updatePosition(position);
            if (app_info.location.position.onchange) {
                navigator.geolocation.getCurrentPosition(position => {
                    app_info.location.position.onchange(position);
                    navigator.geolocation.watchPosition(app_info.location.position.onchange);
                }, () => {
                    app_info.screen.latitude = 0;
                    app_info.screen.longitude = 0; 

                    updateSetting(app_info.setting.state.position);
                });
            }
            pp.resolve();
        }
        navigator.geolocation.getCurrentPosition(initPosition);
    } else {
        app_info.screen.latitude = 0;
        app_info.screen.longitude = 0; 

        updateSetting(app_info.setting.state.position);

        pp.resolve();
    }

    app_info.container.add("orientation_calib", 0);
    if (window.DeviceOrientationEvent) {
        function initOrientation(orientation) {
            updateOrientation(orientation);
            if (!calibrateOrientation(orientation)) {
                return;
            }
            window.removeEventListener("deviceorientation", initOrientation);
            if (app_info.location.orientation.onchange) {
                window.addEventListener("deviceorientation", app_info.location.orientation.onchange);
            }
            po.resolve();
        }
        var prev_calib = Infinity;
        var enable_calib = true;
        function calibrateOrientation(orientation) {
            if (notEmpty(orientation.webkitCompassHeading)) {
                const absolute = orientation.absolute; // inavailable on safari
                if (absolute === false) {
                    return true;
                }

                const tolerance = 10;
                if (enable_calib &&
                    orientation.webkitCompassAccuracy !== -1 &&
                    Math.abs(orientation.beta)<tolerance &&
                    Math.abs(orientation.gamma)<tolerance) {
                    const calib = (360-orientation.webkitCompassHeading)-orientation.alpha;
                    if (Math.abs(prev_calib - calib) < 0.3) {
                        app_info.container.add("orientation_calib", calib);
                        return true;
                    } else {
                        enable_calib = false;
                        prev_calib = calib;
                        setTimeout(() => enable_calib = true, 100);
                        return false;
                    }
                } else {
                    return false;
                }
            }
            return true;
        }
        window.addEventListener("deviceorientation", initOrientation);
        window.addEventListener("deviceorientation", calibrateOrientation);
    } else {
        app_info.screen.alpha = 0; 
        app_info.screen.beta = 0; 
        app_info.screen.gamma = 0; 

        updateSetting(app_info.setting.state.orientation);

        po.resolve();
    }

    await Promise.all([pp.promise, po.promise]);
}

function updateOrientation(orientation) {
    const absolute = orientation.absolute; // inavailable on safari
    if (absolute === false) {
        app_info.screen.alpha = 0; 
        app_info.screen.beta = 0; 
        app_info.screen.gamma = 0; 

        updateSetting(app_info.setting.state.orientation);

        return;
    }
    
    const alpha = degToRad(orientation.alpha+app_info.container.get("orientation_calib"));
    const beta = degToRad(orientation.beta);
    const gamma = degToRad(orientation.gamma);

    app_info.screen.alpha = alpha;
    app_info.screen.beta = beta;
    app_info.screen.gamma = gamma;

    updateSetting(app_info.setting.state.orientation);
}

function updatePosition(position) {
    const longitude = position.coords.longitude;
    const latitude = position.coords.latitude;

    app_info.screen.longitude = longitude;
    app_info.screen.latitude = latitude;

    updateSetting(app_info.setting.state.position);
}

// debug

function debugOrientation(orientation) {
    var absolute = orientation.absolute; // inavailable on safari
    if (absolute == false) {
        return;
    }

    var alpha = normalizeDeg(360-Math.round(orientation.alpha+app_info.container.get("orientation_calib")));
    var beta = Math.round(orientation.beta);
    var gamma = Math.round(orientation.gamma);
    
    var _alpha;
    if (notEmpty(orientation.webkitCompassHeading)) {
        _alpha = orientation.webkitCompassHeading;
    }
    debugOnWindow(
                _alpha.toString() + "</br>" +
                alpha.toString() + "</br>" +
                beta.toString() + "</br>" +
                gamma.toString(), 1);
}

function debugPosition(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;

    debugOnWindow(latitude.toString() + "</br>" +
                longitude.toString(), 2);
}