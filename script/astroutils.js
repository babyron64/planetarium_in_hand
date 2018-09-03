// dependency:
//     utils.js
//

/*
 * constant values
 */

// in right-hand coordinate
const earth_obliquity = degToRad(-23.43928);

function getTimeWithTimezone(year, month=1, day=1, hour=0, minute=0, second=0, millisecond=0, timezone="0000") {
    return new Date(Date.parse(year+'/'+month+'/'+day+' '+hour+':'+minute+':'+second+'+'+timezone)+millisecond);
}
function getUTCTime(year, month=1, day=1, hour=0, minute=0, second=0, millisecond=0) {
    return getTimeWithTimezone(year, month, day, hour, minute, second, millisecond, "0000");
}
function getJSTTime(year, month=1, day=1, hour=0, minute=0, second=0, millisecond=0) {
    return getTimeWithTimezone(year, month, day, hour, minute, second, millisecond, "0900");
}

function getMJD(time) {
    const Y = time.getUTCFullYear();
    const M = time.getUTCMonth()+1;
    const D = time.getUTCDate();
    const h = time.getUTCHours();
    const m = time.getUTCMinutes();
    const s = time.getUTCSeconds();
    const ms = time.getUTCMilliseconds();

    if (M === 1 || M === 2) {
        Y = Y-1;
        M = M+12;
    }

    const MJDN = Math.floor(365.25*Y) +
                 Math.floor(Y/400) -
                 Math.floor(Y/100) +
                 Math.floor(30.59*(M-2)) +
                 D - 678912;
    const MJD = MJDN+(h+(m+(s+ms/1000)/60)/60)/24;
    return MJD;
}

// unit: "C" // century
//       "Y" // year
//       "D" // day
//       "H" // hour
//       "M" // minute
//       "S" // second
//       "MS" // millisecond
// epoch_type: "J2000.0"
//             "MJD"
//             "NOW"
function getTimeFromEpoch(time, unit="C", epoch_type="J2000.0", epoch=0) {
    const second_ms = 1000;
    const minute_ms = 60000;
    const hour_ms = 3600000;
    const day_ms = 86400000;
    const year_ms = 31556952000;
    const century_ms = 3155695200000;

    // TT - UTC = 64184 ms
    if (epoch_type === "J2000.0") {
        const J2000_epoch = getUTCTime(2000,1,1,12,0,0,-64184);
        epoch = J2000_epoch;
    } else if (epoch_type === "J1991.25") {
        const J1991_25_epoch = getUTCTime(1991,1,1,0,0,0,year_ms*0.25-64184);
        epoch = J1991_25_epoch;
    } else if (epoch_type === "MJD") {
        const MJD_epoch = getUTCTime(1858, 11, 17, 0, 0, 0, 0);
        epoch = MJD_epoch.setDate(MJD_epoch.getDate()+epoch);
    } else if (epoch_type === "NOW") {
        ;
    } else {
        throw new Error("Unknown epoch");
    }

    const delta = time - epoch;

    if (unit === "C") {
        return delta/century_ms;
    } else if (unit === "Y") {
        return delta/year_ms;
    } else if (unit === "D") {
        return delta/day_ms;
    } else if (unit === "H") {
        return delta/hour_ms;
    } else if (unit === "M") {
        return delta/minute_ms;
    } else if (unit === "S") {
        return delta/second_ms;
    } else if (unit === "MS") {
        return delta;
    } else {
        throw new Error("Unknown unit");
    }
} 

// return 0 when x = y = 0
function getRotation(coord2) {
    const x = coord2.x;
    const y = coord2.y;

    if (x == 0) {
        if (y < 0) {
            return Math.PI;
        } else if (y > 0) {
            return 0;
        } else if (y === 0) {
            return 0;
        }
    }

    const tan_r = Math.atan(y/x);
    if (x > 0) {
        return tan_r;
    } else if (x < 0) {
        return tan_r + Math.PI;
    }
}

// epoch: "J2000.0"
//        "MJD"
//        "Now"
function Coord4(x, y, z, w, epoch_type="J2000.0", epoch=0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;

    this.epoch_type = epoch_type;
    this.epoch = epoch;

    this.modPosition = function (x, y, z, w) {
        if (x)
            this.x = x;
        if (y)
            this.y = y;
        if (z)
            this.z = z;
        if (w)
            this.w = w;
    };
    this.modCoordEpoch = function (epoch_type, epoch) {
        if (epoch_type)
            this.epoch_type = epoch_type;
        if (epoch || epoch === 0)
            this.epoch = epoch;
    };

    this.toArray = function () {
        return [this.x, this.y, this.z, this.w];
    };
    this.toGLArray = function () {
        return [this.x, this.y, this.z, this.w];
    };
    
    this.getCoord3 = function () {
        return new Coord3(this.x, this.y, this.z, this.epoch_type, this.epoch);
    };
}

function Coord3(x, y, z, epoch_type="J2000.0", epoch=0) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.epoch_type = epoch_type;
    this.epoch = epoch;

    this.modPosition = function (x, y, z) {
        if (x)
            this.x = x;
        if (y)
            this.y = y;
        if (z)
            this.z = z;
    };
    this.modCoordEpoch = function (epoch_type, epoch) {
        if (epoch_type)
            this.epoch_type = epoch_type;
        if (epoch || epoch === 0)
            this.epoch = epoch;
    };

    this.toArray = function () {
        return [this.x, this.y, this.z];
    };
    this.toGLArray = function () {
        return [this.x, this.y, this.z];
    };

    this.getCoord2 = function () {
        return new Coord2(this.x, this.y, this.epoch_type, this.epoch);
    };

    this.duplicate = function() {
        return new Coord3(this.x, this.y, this.z, epoch_type=this.epoch_type, epoch=this.epoch);
    }

    this.rotateX = function (theta) {
        const y = this.y*Math.cos(theta)-this.z*Math.sin(theta);
        const z = this.y*Math.sin(theta)+this.z*Math.cos(theta);
        this.y = y;
        this.z = z;
        return this;
    };
    this.rotateY = function (theta) {
        const z = this.z*Math.cos(theta)-this.x*Math.sin(theta);
        const x = this.z*Math.sin(theta)+this.x*Math.cos(theta);
        this.z = z;
        this.x = x;
        return this;
    };
    this.rotateZ = function (theta) {
        const x = this.x*Math.cos(theta)-this.y*Math.sin(theta);
        const y = this.x*Math.sin(theta)+this.y*Math.cos(theta);
        this.x = x;
        this.y = y;
        return this;
    };
    this.transX = function (d) {
        this.x = this.x+d;
        return this;
    };
    this.transY = function (d) {
        this.y = this.y+d;
        return this;
    };
    this.transZ = function (d) {
        this.z = this.z+d;
        return this;
    };
    this.swapXY = function () {
        const tmp = this.x;
        this.x = this.y;
        this.y = tmp;
        return this;
    }
    this.swapYZ = function () {
        const tmp = this.y;
        this.y = this.z;
        this.z = tmp;
        return this;
    }
    this.swapZX = function () {
        const tmp = this.z;
        this.z = this.x;
        this.x = tmp;
        return this;
    }

    this.length = function () {
        return Math.sqrt(this.x**2 + this.y**2 + this.z**2);
    };

    this.add = function (p) {
        this.x = this.x + p.x;
        this.y = this.y + p.y;
        this.z = this.z + p.z;
        return this;
    };
    this.sub = function (p) {
        this.x = this.x - p.x;
        this.y = this.y - p.y;
        this.z = this.z - p.z;
        return this;
    };
}

// longitude and latitude (deg) or x and y
function Coord2(x, y, epoch_type="J2000.0", epoch=0) {
    this.lon = x;
    this.lat = y;

    this.azimuth = x;
    this.altitude = y;

    this.x = x;
    this.y = y;

    this.epoch_type = epoch_type;
    this.epoch = epoch;

    this.modPosition = function (x, y) {
        if (x) {
            this.lon = x;
            this.x = x;
            this.azimuth = x;
        }
        if (y) {
            this.lat = y;
            this.y = y;
            this.altitude = y;
        }
    };
    this.modCoordEpoch = function (epoch_type, epoch) {
        if (epoch_type)
            this.epoch_type = epoch_type;
        if (epoch || epoch === 0)
            this.epoch = epoch;
    };

    this.toArray = function () {
        return [this.x, this.y];
    };
    this.toGLArray = function () {
        return [this.x, this.y];
    };

    this.length = function () {
        return Math.sqrt(this.x**2 + this.y**2);
    };
}

function getFlattenArray(coords) {
    return coords.map(coord => coord.toArray()).reduce((l, r) => l.concat(r));
}
function getFlattenGLArray(coords) {
    return coords.map(coord => coord.toGLArray()).reduce((l, r) => l.concat(r));
}