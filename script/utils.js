var data_info;
async function initUtils() {
    data_info = await loadFileJSON("/data/info.json");
}

async function loadFileText(fileurl) {
    const response = await fetch(fileurl);
    return response.text();
}

async function loadFileJSON(fileurl) {
    const response = await fetch(fileurl);
    return response.json();
}

// type is of type:
// (if header is true)
//     { header: type_name (string) }
// (if header is false)
//     [ type_name (string) ]
// where type_name may be number or string
async function loadFileCSV(fileurl, header=true, type={}) {
    return parseCSV(await loadFileText(fileurl), header, type);
}

function isURLAbsolute(url) {
    var pat = /^https?:\/\//i;
    if (pat.test(url))
    {
        return true;
    }
    return false;
}

function parseCSV(text, header=true, type={}){
    var result = [];
    var rows = text.split("\n");

    var headers;
    if (header) {
        const header_col = rows.shift();
        headers = header_col.replace(/\s/g,'').split(',');
    }

    function convertToType(raw, type) {
        if (!type) {
            return raw.toString();
        }
        if (type === "string") {
            return raw.toString();
        } else if (type === "number") {
            return Number(raw);
        } else {
            throw new Error("Unknown type: "+type);
        }
    }
    for(var i=0;i<rows.length;++i){
        var cols = rows[i].replace(/\s/g,'').split(',');
        if (header) {
            result[i] = {};
            for (var j=0;j<cols.length;++j) {
                result[i][headers[j]] = convertToType(cols[j], type[headers[j]]);
            }
        } else {
            result[i] = {};
            for (var j=0;j<cols.length;++j) {
                result[i][j] = convertToType(cols[j], type[j]);
            }
        }
    }

    return result;
}

function isCrossOrigin(url) {
    if (!isURLAbsolute(url)) {
        return false;
    }

    var currentOrigin = (new URL(document.location)).origin;
    var destOrigin = (new URL(url)).origin;
    return currentOrigin !== destOrigin;
}

// relative to body (ie. page)
function getAbsolutePosition(element) {
    const clientRect = element.getBoundingClientRect();
    const top = window.pageYOffset + clientRect.top; 
    const left = window.pageXOffset + clientRect.left;
    return {
        top: top,
        left: left,
        x: left,
        y: top
    };
}

function toPromise(func) {
    return function () {
        const _arguments = arguments;
        return new Promise(resolve => resolve(func(..._arguments)));
    };
}

function degToRad(deg) {
    return (deg/180)*Math.PI;
}
function radToDeg(rad) {
    return (rad/Math.PI)*180;
}
function normalizeRad(rad) {
    while (rad < -Math.PI) rad = rad + 2*Math.PI;
    while (rad > Math.PI) rad = rad - 2*Math.PI;
    return rad;
}
function normalizeDeg(deg) {
    while (deg < 0) deg = deg + 360;
    while (deg > 360) deg = deg - 360;
    return deg;
}

function toPx(pos) {
    var top = pos.top;
    var left = pos.left;
    var x = pos.x;
    var y = pos.y;
    
    if (top || top == 0)
        top = top + 'px';
    if (left || left == 0)
        left = left + 'px';
    if (x || x == 0)
        x = x + 'px';
    if (y || y == 0)
        y = y + 'px';

    return {
        top: top,
        left: left,
        x: x,
        y: y
    };
}
// offset is optional
function setElementPosition(element, pos, offset) {
    var top = pos.top || pos.y;
    var left = pos.left || pos.x;
    
    var offset_top;
    var offset_left;
    if (offset) {
        offset_top = offset.top || offset.y;
        offset_left = offset.left || offset.x;
    }

    if (top) {
        if (offset_top) { 
            element.style.top = "calc("+top+" + "+offset_top+")";
        } else {
            element.style.top = top;
        }
    }
    if (left) {
        if (offset_left) {
            element.style.left = "calc("+left+" + "+offset_left+")";
        } else {
            element.style.left = left;
        }
    }
}

function moveElementPosition(element, diff) {
    const style = window.getComputedStyle(element);
    setElementPosition(element, {
        top: style.top,
        left: style.left,
    }, diff);
}

// simple DIcontainer
function DIContainer() {
    var objects = {};
    var constructors = {};
    var providers = {};
    var removers = {};

    var last_label = "__last_label__";
    var labeled = {};
    labeled[last_label] = undefined;

    // The possible statuses are
    // - initialized
    // - conflicted
    // - ok
    this.status = "initialized";

    this.addCons = function (cons, tag) {
        this.status = "ok";
        if (tag in constructors || tag in providers || tag in objects) {
            this.status = "conflicted";
        }
        constructors[tag] = cons;
        delete providers[tag];
        objects[tag] = [];
    };

    this.addProv = function (prov, tag) {
        this.status = "ok";
        if (tag in providers || tag in constructors || tag in objects) {
            this.status = "conflicted";
        }
        providers[tag] = prov;
        delete constructors[tag];
        objects[tag] = [];
    };

    this.get = function (tag, args, type, label) {
        this.status = "ok";
        const obj = _getComp(tag, args, type, label);
        if (label) {
            labeled[label] = obj;
        }
        labeled[last_label] = obj;
        return obj;
    };

    function _getComp(tag, args=[], type="singleton") {
        args.unshift(null);
        if (type === "singleton") {
            if (objects[tag]) {
                return objects[tag][0];
            }
            if (constructors[tag]) {
                var newComp = new constructors[tag](...args);
                objects[tag].push(newComp);
                return newComp;
            }
            if (providers[tag]) {
                var newComp = providers[tag](...args);
                objects[tag].push(newComp);
                return newComp;
            }
            this.status = "error: not found";
            return null;
        } else if (type === "prototype") {
            if (constructors[tag]) {
                var newComp = new constructors[tag](...args);
                objects[tag].push(newComp);
                return newComp;
            }
            if (providers[tag]) {
                var newComp = providers[tag](...args);
                objects[tag].push(newComp);
                return newComp;
            }
            this.status = "error: not found";
            return null;
        } else {
            throw new Error("Invalid value: type");
        }
    }

    this.add = function (tag, comp, type, label) {
        this.status = "ok";
        _addComp(tag, comp, type);
        if (label) {
            labeled[label] = comp;
        }
        labeled[last_label] = comp;
    };

    function _addComp(tag, comp, type="singleton") {
        if (!objects[tag]) {
            objects[tag] = [];
        }

        if (type === "singleton") {
            if (tag in objects) {
                this.status = "conflicted";
            }
            objects[tag] = [comp];
        } else if (type === "prototype") {
            objects[tag].push(comp);
        }
    }

    this.clear = function (tag) {
        this.status = "ok";
        if (tag in objects) {
            delete objects[tag];
        }
    }

    this.getLastComp = function () {
        return last_label[last_label];
    };
}

function compose(funcs, arg) {
    for (var i=0;i<funcs.length;++i) {
        arg = funcs[i](arg);
    }
    return arg;
}

function pipe(funcs) {
    return compose(funcs, null);
}

function pa(func) {
    const args = Array.prototype.slice.call(arguments, 1);
    return function () {
        for (var i=0;i<args.length;++i) {
            if (args[i]) {
                Array.prototype.splice.call(arguments, i, 0, args[i]);
            }
        }
        return func.apply(null, arguments);
    };
}

function notEmpty(value) {
    return value || value === 0;
}

async function emptyAsync() {
    return new Promise(resolve => resolve());
}

function createPromise() {
    const obj = {
        promise: null,
        resolve: null,
        reject: null,
        then: null,
      	catch: null,
    };
    obj.promise = new Promise((resolve, reject) => {
        obj.resolve = resolve;
        obj.reject = reject;
    });
  	obj.then = obj.promise.then.bind(obj.promise);
  	obj.catch = obj.promise.catch.bind(obj.promise);	
    return obj;
}

//
// For debug purpose.
//

// Use like this: await waitms(1000) // wait 1 second
async function waitms(ms) {
    return new Promise(resolve => 
        setTimeout(() => resolve(), ms)
    );
}

function logging(ms, func) {
    console.log(func());
    setTimeout(() => logging(ms, func), ms);
}