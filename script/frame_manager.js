/*
 * BREIF DOCUMENT about FrameManager Class
 * 
 * -----------
 * REQUIREMENT
 * -----------
 *  - The element position parameter is absolute.
 *  - enter, exit, resume, suspend functions are idenponent and inversive.
 * 
 * ----------------------
 * PRIMARY FUNCTIONS LIST
 * ----------------------
 *  - FrameManager FrameManager([parent: element = document.body])
 *      The constructor.
 *  - frame createFrame(element: element [, enter: * [, exit: * [, resume: * [, suspend: *]]]])
 *      Create new frame.
 *  - async bool register(frame: frame, tag: string)
 *      Register a frame.
 *  - async bool trans(tag: string, [data: object [, trans: * [, x: int [, y: int]]]])
 *      Replace the top frame with another. Existing one is deleted.
 *  - async bool show(tag: string, [data: object [, trans: * [, x: int [, y: int]]]])
 *      Show a new frame at the top of thers. 
 *  - async bool hide([trans: *])
 *      Delete the top frame.
 * 
 *  *: see 'ARGUMENT FUNCTION SIGNATURES' section
 * 
 * ----------------------------
 * ARGUMENT FUNCTION SIGNATURES
 * ----------------------------
 *  - async element enter(element: element [, data: object)
 *  - async bool exit(element: element)
 *  - async element resume(element: element)
 *  - async bool suspend(element: element)
 *  - async bool trans(prev_frame: frame, current_frame: frame [, data: object])
 * 
 * --------------
 * EVENT HANDLERS
 * --------------
 *  - undefined onenable(element: element)
 *  - undefined ondisable(element: element)
 * 
 * ---------------
 * DATA STRUCTURES
 * ---------------
 *  - frame: {
 *        element: element,
 *        enter: *,
 *        exit: *,
 *        resume: *,
 *        suspend: *,
 *        onenable: **
 *        ondisable: **
 *    }
 * 
 *  *: see 'ARGUMENT FUNCTION SIGNATURES' section
 *  **: see 'EVENT HANDLERS' section
 */
function FrameManager(parent=document.body) {
    var frames = {};
    var frame_stack = [];
    this.parent = parent;

    // The element must be a child of the parent specified with constructor. 
    // The position parameter of element must be absolute.
    // z-index of the element must not be modified in enter, exit, resume and suspend.
    this.createFrame = function (element, enter, exit, resume, suspend) {
        const frame = {
            element: element,
            enter: enter,
            exit: exit,
            resume: resume,
            suspend: suspend,

            onenable: undefined,
            ondisable: undefined,

            handlers: {
                enable: [],
                disable: [],
            },
            addEventListener: function(tag, handler) {
                const handlers = frame.handlers; 
                if (!handlers[tag]) {
                    throw new Error("No such event");
                }
                handlers[tag].push(handler);
            },
        };

        if (!frame.enter) {
            frame.enter = toPromise(function (element) {
                element.style.display = "block"; 
                return element;
            });
        }
        if (!frame.exit) {
            frame.exit = toPromise(function (element) {
                element.style.display = "none";
                return true;
            });
        }
        if (!frame.resume) {
            frame.resume = toPromise(function (element) { return element; });
        }
        if (!frame.suspend) {
            frame.suspend = toPromise(function () { return true; });
        }

        return frame;
    }

    this.register = async function (frame, tag) {
        if (!frame) {
            throw new Error("frame is required");
        }
        if (!tag) {
            throw new Error("tag is required");
        }
        if (frames[tag]) {
            throw new Error("tag is already used");
        }
        if (!frame) {
            throw new Error("element must be specified in frame");
        }

        frame.tag = tag;
        frames[tag] = frame;

        if (!await frame.exit(frame.element)) {
            throw new Error("Cannot init frame");
        }

        updateZIndex(frame, -1);
        fireEvent(frame, "disable");
        return true;
    };

    this.trans = async function (tag, data, trans, x, y) {
        if (frame_stack.length == 0) {
            return this.show(tag, data, null, x, y);
        }
        if (!frames[tag]) {
            throw new Error("frame is not registered");
        }
        var prev_frame = frame_stack[frame_stack.length-1];
        var current_frame = frames[tag];

        storeFrameInfo(current_frame);

        // current_frame.element may not be loaded
        current_frame.zIndex = prev_frame.zIndex+1;

        if (!trans) {
            trans = FrameManager.template.trans.default;
        }

        if (!await trans(prev_frame, current_frame, data)) {
            restoreFrameInfo(current_frame);
            return false;
        }

        setElementPosition(current_frame.element, toPx({ x: x, y: y }));

        // apply changes
        frame_stack.pop();
        frame_stack.push(current_frame);
        // prev_frame.element may be deleted
        updateZIndex(current_frame, prev_frame.zIndex);
        updateZIndex(prev_frame, -1);
        fireEvent(current_frame, "enable");
        fireEvent(prev_frame, "disable");
        return true;
    };

    this.show = async function (tag, data, trans, x, y) {
        if (!frames[tag]) {
            throw new Error("frame is not registered");
        }
        var current_frame = frames[tag];
        var prev_frame;
        if (frame_stack.length != 0) {
            prev_frame = frame_stack[frame_stack.length-1];
        }

        storeFrameInfo(current_frame);

        current_frame.zIndex = this.getMaxZIndex()+1;

        if (!trans) {
            trans = FrameManager.template.show.default; 
        }

        if (!await trans(prev_frame, current_frame, data)) {
            restoreFrameInfo(current_frame);
            return false;
        }

        setElementPosition(current_frame.element, toPx({ x: x, y: y }));

        // apply changes
        frame_stack.push(current_frame);
        updateZIndex(current_frame, current_frame.zIndex);
        fireEvent(current_frame, "enable");
        fireEvent(prev_frame, "disable");
        return true;
    };

    this.hide = async function (trans) {
        if (frame_stack.length == 0) {
            throw new Error("No frame is on stack");
        }
        var current_frame = frame_stack[frame_stack.length-1];
        var prev_frame;
        if (frame_stack.length > 1) {
            prev_frame = frame_stack[frame_stack.length-2];
        }

        storeFrameInfo(current_frame);

        if (!trans) {
            trans = FrameManager.template.hide.default;
        }

        if (!await trans(current_frame, prev_frame)) {
            restoreFrameInfo(current_frame);
            return false;
        }

        // apply changes
        frame_stack.pop();
        updateZIndex(current_frame, -1);
        fireEvent(prev_frame, "enable");
        fireEvent(current_frame, "disable");
        return true;
    };

    function updateZIndex(frame, zIndex) {
        if (!zIndex && zIndex != 0) {
            zIndex = frame.zIndex;
        }
        if (frame.element) {
            frame.element.style.zIndex = zIndex;
        }
        frame.zIndex = zIndex;
    }

    function fireEvent(frame, tag) {
        if (frame) {
            if (frame["on"+tag]) {
                frame["on"+tag](frame.element);
            }
            frame.handlers[tag].forEach(handler => handler(frame.element));
        }
    }

    this.getFrame = function(tag) {
        if (!frames[tag]) {
            throw new Error("frame is not registered");
        }
        return frames[tag];
    };

    this.getMaxZIndex = function () {
        if (frame_stack.length == 0) {
            return -1;
        }
        return frame_stack[frame_stack.length-1].zIndex;
    };

    this.getTopFrameTag = function () {
        if (frame_stack.length == 0) {
            throw new Error("No frame is on stack");
        }
        return frame_stack[frame_stack.length-1].tag;
    };

    this.isEmpty = function () {
        return frame_stack.length == 0;
    };

    this.scrollToTopFrame = function () {
        if (frame_stack.length == 0) {
            throw new Error("No frame is on stack");
        }
        var current= frame_stack[frame_stack.length-1].element;
        scrollTo(current.offsetTop, current.offsetLeft);
    };

    var tmp_info = {};
    function storeFrameInfo(frame) {
        if (frame.element) {
            tmp_info.x = frame.element.style.left;
            tmp_info.y = frame.element.style.top;
            tmp_info.display = frame.element.style.display;
            tmp_info.zIndex = frame.element.style.zIndex;
        }
        tmp_info.element = frame.element;
        tmp_info.frame_zIndex = frame.zIndex;
    }
    function restoreFrameInfo(frame) {
        frame.zIndex = tmp_info.frame_zIndex;
        frame.element = tmp_info.element;
        if (tmp_info.element) {
            frame.element.style.left = tmp_info.x;
            frame.element.style.top = tmp_info.y;
            frame.element.style.display = tmp_info.display;
            frame.element.style.zIndex = tmp_info.zIndex;
        }
    }
}

FrameManager.mustNotFail = function (ret) {
    if (!ret) {
        throw new Error("Lost control");
    }
};
FrameManager.mustNotFailAsync = async function (ret) {
    if (!await ret) {
        throw new Error("Lost control");
    }
};

FrameManager.template = {
    trans: {
        default:
            async function (prev_frame, current_frame, data) {
                current_frame.element = await current_frame.enter(current_frame.element, data); 
                if (!current_frame.element) {
                    return false;
                }   

                if (!await prev_frame.exit(prev_frame.element)) {
                    await FrameManager.mustNotFailAsync(
                        current_frame.exit()
                    );
                    return false;
                }
                return true;
            }
    },
    show: {
        default:
            async function (prev_frame, current_frame, data) {
                current_frame.element = await current_frame.enter(current_frame.element, data); 
                if (!current_frame.element) {
                    return false;
                }   

                if (prev_frame) {
                    if (!await prev_frame.suspend(prev_frame.element)) {
                        await FrameManager.mustNotFailAsync(
                            current_frame.exit(current_frame.element)
                        );
                        return false;
                    }
                }
                return true;
            }
    },
    hide: {
        default: 
            async function(current_frame, prev_frame) {
                if (prev_frame) {
                    prev_frame.element = prev_frame.resume(prev_frame.element);
                    if (!prev_frame.element) {
                        return false;
                    }
                }
                if (!await current_frame.exit(current_frame.element)) {
                    if (prev_frame) {
                        await FrameManager.mustNotFailAsync(
                            prev_frame.suspend(prev_frame.element)
                        );
                    }
                    return false;
                }
                return true;
            }
    }
};

FrameManager.trans = {
    slideFromBottom: function (manager, current_tag, next_tag, data, area, icon) {
        if (!area) {
            area = document.createElement("div");
            area.className = "frame_manager trans slide_from_bottom area";
        }
        if (!icon) {
            icon = document.createElement("div");
            icon.className = "frame_manager trans slide_from_bottom icon";
        }
        area.appendChild(icon);

        const current = manager.getFrame(current_tag).element;
        if (!current.contains(area)) {
            current.appendChild(area);
        }

        // show open button when user scrolls
        var last_time_open_show;
        function popUpSettingOpenButton(ms=1500) {
            last_time_open_show = Date.now();
            area.style.opacity = 1;
            setTimeout(popDown, ms);

            function popDown() {
                if (Date.now() - last_time_open_show >= ms) {
                    area.style.opacity = 0;
                }
            }
        }
        current.addEventListener("touchmove", e => {
            if (e.touches.length == 1 &&
                e.changedTouches.length == 1) {
                popUpSettingOpenButton();
            }
        });
        current.addEventListener("wheel", e => {
            if (e.deltaY > 0) {
                popUpSettingOpenButton();
            }
        });

        // make icon follow touch
        const top_init = window.getComputedStyle(icon).top;
        var start_point;
        area.addEventListener("touchstart", function (e) {
            if (e.touches.length == 1 &&
                e.changedTouches.length == 1) {
                area.style.opacity = 1;
                start_point = e.touches.item(0).clientY;
            }
        });
        area.addEventListener("touchmove", function (e) {
            if (e.touches.length == 1 &&
                e.changedTouches.length == 1) {
                const touch_point_diff = e.changedTouches.item(0).clientY - start_point;
                setElementPosition(icon, { top: top_init }, toPx({ top: touch_point_diff }));
            }
        }); 
        area.addEventListener("touchend", function (e) {
            if (e.touches.length == 0 &&
                e.changedTouches.length == 1) {
                icon.style.top = top_init;
            }
        });

        // open setting
        area.addEventListener("touchstart", e => {
            if (e.touches.length == 1 &&
                e.changedTouches.length == 1) {
                manager.trans(next_tag, {
                    area: area,
                    icon: icon,
                    data: data
                }, trans);
            }
        });
        area.addEventListener("touchend", function (e) {
            if (e.touches.length == 0 &&
                e.changedTouches.length == 1) {
                area.style.opacity = 0;
            }
        });

        async function trans(prev_frame, current_frame, data) {
            const area = data.area;
            const icon = data.icon;
            data = data.data;
            const prev = prev_frame.element;
            const current = await current_frame.enter(current_frame.element, data);

            if (!current) {
                return false;
            }
            current.style.zIndex = current_frame.zIndex;
            setElementPosition(current, toPx({ top: getAbsolutePosition(icon).y+icon.offsetHeight }));
            function _touchmove_listener(e) {
                if (e.touches.length == 1 &&
                    e.changedTouches.length == 1) {
                    setElementPosition(current, toPx({ top: getAbsolutePosition(icon).top+icon.offsetHeight }));
                }
            }
            area.addEventListener("touchmove", _touchmove_listener);

            var _touchend_listener;
            const scroll = new Promise(async resolve => {
                async function scrollUp(element) {
                    const pace = window.innerHeight/10;
                    return new Promise(resolve => {
                        function scrollUp(element) {
                            if (element.offsetTop - pace <= 0) {
                                setElementPosition(element, toPx({ top: 0 }));
                                resolve();
                                return;
                            }
                            moveElementPosition(element, toPx({ top: -pace }));
                            requestAnimationFrame(() => scrollUp(element));
                        }
                        scrollUp(element);
                    });
                }
                async function _listener(e) {
                    area.removeEventListener("touchmove", _touchmove_listener);
                    area.removeEventListener("touchend", _touchend_listener);
                    if (e.changedTouches.length == 1 &&
                        e.changedTouches.item(0).pageY < getAbsolutePosition(area).top) {
                        await scrollUp(current);
                        resolve(true);
                    }
                    resolve(false);
                }
                _touchend_listener = _listener;
                area.addEventListener("touchend", _touchend_listener);
            });

            if (!await scroll) {
                await FrameManager.mustNotFailAsync(
                    current_frame.exit(current)
                );
                return false;
            }

            if (!await prev_frame.exit(prev)) {
                await FrameManager.mustNotFailAsync(
                    current_frame.exit(current)
                );
                return false;
            }

            return true;
        };
    },
    buttonClick: function (manager, current_tag, next_tag, button_selector, data, trans, x, y) {
        function _listener () { 
            if (manager.getTopFrameTag() === current_tag) {
                manager.trans(next_tag, data, trans, x, y);
            }
        }
        manager.getFrame(current_tag).addEventListener("enable", function (element) {
            const button = element.querySelector(button_selector);
            if (!button) {
                throw new Error("Cannot find button");
            }
            button.addEventListener("click", _listener);
        });
        manager.getFrame(current_tag).addEventListener("disable", function (element) {
            const button = element.querySelector(button_selector);
            if (!button) {
                throw new Error("Cannot find button");
            }
            button.removeEventListener("click", _listener);
        });
    }
};