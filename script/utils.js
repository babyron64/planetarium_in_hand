async function loadFileText(fileurl) {
    const response = await fetch(fileurl);
    return response.text();
}

async function loadFileJSON(fileurl) {
    const response = await fetch(fileurl);
    return response.json();
}

function isURLAbsolute(url) {
    var pat = /^https?:\/\//i;
    if (pat.test(url))
    {
        return true;
    }
    return false;
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

function toPx(pos) {
    var top = pos.top;
    var left = pos.left;
    var x = pos.x;
    var y = pos.y;
    
    if (top)
        top = top + 'px';
    if (left)
        left = left + 'px';
    if (x)
        x = x + 'px';
    if (y)
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
        if (tag in constructors) {
            this.status = "conflicted";
        }
        constructors[tag] = cons;
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
            this.status = "error: not found";
            return null;
        } else if (type === "prototype") {
            if (constructors[tag]) {
                var newComp = new constructors[tag](...args);
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
            this.status = "conflicted";
            objects[tag] = [comp];
        } else if (type === "prototype") {
            objects[tag].push(comp);
        }
    }

    this.getLastComp = function () {
        return last_label[last_label];
    };
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