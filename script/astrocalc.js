/*
 * dependency:
 *     astroutils.js
 *     utils.js
 */

var planet_orbits;
var star_coords;
async function initAstroCalc() {
    planet_orbits = await loadPlanetOrbitCoord2();
    star_coords = await loadStarsCoord();
}

/*
 * reference: https://ssd.jpl.nasa.gov/txt/aprx_pos_planets.pdf
 * 
 * arg_peri: argument of perihelion
 * M: mean anomaly
 */
async function loadPlanetOrbitCoord() {
    const data_type = data_info.planet.type;
    const data = await loadFileCSV("/data/planet.csv", true, data_type);
    var planet_orbits = {};
    for (var i=0;i<data.length;++i) {
        planet_orbits[data[i].name] = data[i];
    }
    return planet_orbits;
}
async function loadPlanetOrbitCoord2() {
    const data_type = data_info.planet.type;
    const data = await loadFileCSV("/data/planet2.csv", true, data_type);
    var planet_orbits = {};
    for (var i=0;i<data.length;++i) {
        planet_orbits[data[i].name] = data[i];
        data[i].dI = data[i].dI/60/60;
        data[i].dL = data[i].dL/60/60;
        data[i].dlong_peri = data[i].dlong_peri/60/60;
        data[i].dlong_node = data[i].dlong_node/60/60;
    }
    return planet_orbits;
}

async function loadStarsCoord() {
    const data_type = data_info.hip.type;
    const data = await loadFileCSV("/data/hip_main.csv", true, data_type);
    return data;
}

// The number of expected loop is no more than 3 when tolerance is default.
function solveKeplerEquation(M, e, tolerance=0.000001) {
    function getKelplerEquation(M, e) {
        return E => E - e*Math.sin(E) - M;
    }
    function getDiffKeplerEquation(e) {
        return E => 1 - e * Math.cos(E);
    }

    const eq = getKelplerEquation(M, e);
    const diff_eq = getDiffKeplerEquation(e);

    var En = M+e*Math.sin(M);
    var dM = tolerance+1;
    while (Math.abs(dM) > tolerance) {
        En = En - eq(En) / diff_eq(En);
        dM = eq(En); 
    }

    return En;
}

// This should be re-implemented with shader.
// Return in heliocentric ecliptic coordinate at current time (ie. not J2000.0 or so).
// x: vernal equinox, z: normal of ecliptic plane
function calcPlanetCoord(name, time) {
    if (!time) {
        time = new Date(Date.now());
    }

    const diff_time = getTimeFromEpoch(time, "C", "J2000.0");

    const data_orbit = planet_orbits[name];
    var orbit = {
        a: data_orbit.a+data_orbit.da*diff_time,
        e: data_orbit.e+data_orbit.de*diff_time,
        I: normalizeRad(degToRad(data_orbit.I+data_orbit.dI*diff_time)),
        L: normalizeRad(degToRad(data_orbit.L+data_orbit.dL*diff_time)),
        long_peri: normalizeRad(degToRad(data_orbit.long_peri+data_orbit.dlong_peri*diff_time)),
        long_node: normalizeRad(degToRad(data_orbit.long_node+data_orbit.dlong_node*diff_time)),
    };

    orbit.b = orbit.a*Math.sqrt(1-orbit.e*orbit.e);
    orbit.f = orbit.a*orbit.e;

    orbit.arg_peri = orbit.long_peri - orbit.long_node;
    orbit.M = normalizeRad(orbit.L - orbit.long_peri);
    orbit.E = normalizeRad(solveKeplerEquation(orbit.M, orbit.e));

    const pos  = new Coord3(
        orbit.a*Math.cos(orbit.E)-orbit.f,
        orbit.b*Math.sin(orbit.E),
        0
    );

    // pos.rotateZ(-orbit.arg_peri).rotateX(-orbit.I).rotateZ(-orbit.long_node);
    pos.rotateZ(orbit.long_node).rotateX(orbit.I).rotateZ(orbit.arg_peri);
    pos.modCoordEpoch("NOW", time);
    return pos;
}

function calcStarCoords(time) {
    if (!time) {
        time = new Date(Date.now());
    }

    const diff_time = getTimeFromEpoch(time, "Y", "J1991.25");

    function calc (coord) {
        const ra = coord.RAdeg+coord.pmRA*diff_time/1000/60/60;
        const de = coord.DEdeg+coord.pmDE*diff_time/1000/60/60;
        return new Coord3(ra, de, coord.plx, "J2000.0");
    } 
    return star_coords.slice(0, 100).map(calc);
    // return star_coords.map(calc);
}

/*
 * standard way to work out the current position of stars in the sky
 * heliocentric-ecliptic => geocentric-ecliptic => geocentric-equatorial => horizontal
 */

// point must be in ecliptic coordinate
function heliocentricToGeocentric(coord3, time) {
    if (!time) {
        time = new Date(Date.now());
    }
    const earth_coord3 = calcPlanetCoord("Earth", time);
    coord3.sub(earth_coord3);
    return coord3;
}
function geocentricToHeliocentric(coord3, time) {
    if (!time) {
        time = new Date(Date.now());
    }
    const earth_coord3 = clacPlanetCoord("Earth", time);
    coord3.add(earth_coord3);
    return coord3;
}

// x: vernal equinox, z: north
function eclipticToEquatorial(coord3) {
    coord3.rotateX(-earth_obliquity);
    return coord3;
}
// x: vernal equinox, z: normal of ecliptic plane
function equatorialToEcliptic(coord3) {
    coord3.rotateX(earth_obliquity);
    return coord3;
}

// x: east, y: north, z: altitude
function equatorialToLocal(coord3, time, coord2) {
    if (!time) {
        time = new Date(Date.now());
    } 
    if (!coord2) {
        const latitude = app_info.screen.latitude;
        const longitude = app_info.screen.longitude;
        if (notEmpty(longitude) && notEmpty(latitude)) { 
            coord2 = new Coord2(longitude, latitude, "NOW", time);
        } else {
            throw new Error("longitude or latitude is not specified.");
        }
    }

    const zenith = getZenithEquatorial(time, coord2);
    coord3.rotateZ(degToRad(-zenith.lon)).rotateY(degToRad(zenith.lat)).swapZX().swapXY();
    coord3.modCoordEpoch("NOW", time);
    return coord3;
}

function getGeographicFromCartesian(coord3) {
    const hp = new Coord2(coord3.x, coord3.y);
    var azimuth = getRotation(hp);

    var altitude;
    const hr = hp.length();
    if (hr == 0) {
        if (coord3.z > 0) {
            altitude = Math.PI/2;
        } else if (coord3.z < 0) {
            altitude = -Math.PI/2
        } else if (coord3.z == 0) {
            altitude = 0;
        }
    } else {
        altitude = Math.atan(coord3.z / hr);
    }

    azimuth = normalizeDeg(radToDeg(azimuth));
    altitude = normalizeDeg(radToDeg(altitude));

    return new Coord2(azimuth, altitude);
}
function getCartesianFromGeographic(coord2, r) {
    const lon = degToRad(coord2.lon);
    const lat = degToRad(coord2.lat);
    return new Coord3(
        r*Math.cos(lat)*Math.cos(lon),
        r*Math.cos(lat)*Math.sin(lon),
        r*Math.sin(lat),
        coord2.epoch_type,
        coord2.epoch
    );
}

function getZenithEquatorial(time, coord2) {
    if (!time) {
        time = new Date(Date.now());
    } 
    if (!coord2) {
        const latitude = app_info.screen.latitude;
        const longitude = app_info.screen.longitude;
        if (notEmpty(longitude) && notEmpty(latitude)) { 
            coord2 = new Coord2(longitude, latitude, "NOW", time);
        } else {
            throw new Error("longitude or latitude is not specified.");
        }
    }

    const lst = getLST(time, coord2);
    return new Coord2(lst*15, coord2.lat, "NOW", time);
}

// greenwich sidereal time (hour)
function getGST(time) {
    const mjd = getMJD(time);
    // calibrated when 2018/8/31 19:00:00 UTC
    const T = 0.6712508+1.00273791*(mjd-40000.0);
    return 24 * (T - Math.floor(T));
}
// local sidereal time (hour)
function getLST(time, coord2) {
    const T = (getGST(time) + coord2.lon/15)/24; // (day)
    return 24 * (T - Math.floor(T));
}