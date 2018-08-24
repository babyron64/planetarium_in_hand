/*
 * BREIF DOCUMENT about FrameManager Class
 * 
 * -----------
 * REQUIREMENT
 * -----------
 *  - The element position parameter is absolute.
 *  - enter, exit, resume, suspend and trans functions returns true when succeded and
 *   return false when failed.
 *  - enter, exit, resume, suspend functions are idenponent and inversive. See below
 *   for more details.
 * 
 * ----------------------
 * PRIMARY FUNCTIONS LIST
 * ----------------------
 *  - FrameManager FrameManager([parent: element = document.body])
 *      The constructor.
 *  - frame register(element: element, tag: string [, enter: * [, exit: * [, resume: * [, suspend: *]]]])
 *      Register an element to be used as a frame.
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
 *  - async bool enter(element: element [, data: object)
 *  - async bool exit(element: element)
 *  - async bool resume(element: element)
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
 * 
 * -----------
 * DESCRIPTION
 * ----------- 
 *  1. Create an instance of FrameManager Class. The argument of the constructor
 *    is the element that is to a parent of all the frame element you register.
 *     The element position parameter must be absolute.
 *  2. Register the element and a tag associated with it through register function. When you
 *    specify a frame later, you use the tag instead of the element. When you register an element,
 *    you can provide your own functions to enter, exit from, resume, suspend the element.
 *    These function must return true when succeeded, and return false when failed. And when
 *    return false, all the changed you made to the element must be restored before return.
 *     They must be idempontent. Furthermore, the pair of enter and exit, and resume and
 *    suspend must be inversive at least just after they are called. That is, when you enter
 *    a frame and exit from it immediately, there must leaves no effect. And the same is
 *    applied to resume and suspend functions.
 *     In enter, exit, resume and suspend functions, you must not modify the z-index of the element.
 *     By default, enter and exit work by changing display parameter, and resume and suspend
 *    do not do anything.
 *     As described above, all the element must be siblings.
 *     When each of the functions successfully done, enable event of the destination frame and disable
 *    event of the source frame are fired. You can provide your handler through onenable and ondisable
 *    parameters of a frame, which is returned when calling register.
 *  3. You can open the first frame both by calling trans and show.
 *  4. When you use trans fucntion with some frame already on stack, the top one is replaced
 *    with the specific frame.
 *  5. When you use show function, the frame is placed at the top of other frames.
 *  6. When you use hide function, the top frame is deleted.
 *  7. You can specify where to display a frame by passing x and y arguments.
 *  8. You can pass data from the source element to the destination element when you use trans and show
 *    functions.
 *  9. You can pass your own transient function to all the functions, trans, show and hide. It must
 *    return true when succeded, and return false when failed. When return false, all the changes you
 *    made to the element must be restored.
 * 10. There is some helper functions. See the code below for more information.
 */
function FrameManager(parent=document.body) {
    var frames = {};
    var frame_stack = [];
    this.parent = parent;

    // The element must be a child of the parent specified with constructor. 
    // The position parameter of element must be absolute.
    // z-index of the element must not be modified in enter, exit, resume and suspend.
    this.register = function (element, tag, enter, exit, resume, suspend) {
        if (!tag) {
            throw new Error("tag is required");
        }
        if (frames[tag]) {
            throw new Error("tag is already used");
        }
        if (!enter) {
            enter = toPromise(function (element) {
                element.style.display = "block"; 
                return true;
            });
        }
        if (!exit) {
            exit = toPromise(function (element) {
                element.style.display = "none";
                return true;
            });
        }
        if (!resume) {
            resume = toPromise(function () { return true; });
        }
        if (!suspend) {
            suspend = toPromise(function () { return true; });
        }
        frames[tag] = {
            tag: tag,
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
        };

        return frames[tag];
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

        storeElementInfo(current_frame.element);

        setElementPosition(current_frame.element, toPx({ x: x, y: y }));
        current_frame.element.style.zIndex = prev_frame.element.style.zIndex+1;

        if (!trans) {
            trans = FrameManager.template.trans.default;
        }

        if (!await trans(prev_frame, current_frame, data)) {
            restoreElementInfo(current_frame.element);
            return false;
        }

        // apply changes
        frame_stack.pop();
        frame_stack.push(current_frame);
        current_frame.element.style.zIndex = prev_frame.element.style.zIndex;
        prev_frame.element.style.zIndex = -1;
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

        storeElementInfo(current_frame.element);

        setElementPosition(current_frame.element, toPx({ x: x, y: y }));
        current_frame.element.style.zIndex = frame_stack.length;

        if (!trans) {
            trans = FrameManager.template.show.default; 
        }

        if (!await trans(prev_frame, current_frame, data)) {
            restoreElementInfo(current_frame.element);
            return false;
        }

        // apply changes
        frame_stack.push(current_frame);
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

        storeElementInfo(current_frame.element);

        if (!trans) {
            trans = FrameManager.template.hide.default;
        }

        if (!await trans(current_frame, prev_frame)) {
            restoreElementInfo(current_frame.element);
            return false;
        }

        // apply changes
        frame_stack.pop();
        current_frame.element.style.zIndex = -1;
        fireEvent(prev_frame, "enable");
        fireEvent(current_frame, "disable");
        return true;
    };

    function fireEvent(frame, tag) {
        if (frame) {
            if (frame["on"+tag]) {
                frame["on"+tag](frame.element);
            }
            frame.handlers[tag].forEach(handler => handler(frame.element));
        }
    }

    this.addEventListener = function(frame_tag, event_tag, handler) {
        if (!frames[frame_tag]) {
            throw new Error("frame is not registered");
        }

        const handlers = frames[frame_tag].handlers; 
        if (!handlers[event_tag]) {
            throw new Error("No such event");
        }
        handlers[event_tag].push(handler);
    };

    this.getFrame = function(tag) {
        if (!frames[tag]) {
            throw new Error("frame is not registered");
        }
        return frames[tag];
    };

    this.getMaxZIndex = function () {
        if (frame_stack.length == 0) {
            throw new Error("No frame is on stack");
        }
        return frame_stack.length - 1;
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
    function storeElementInfo(element) {
        tmp_info.x = element.style.left;
        tmp_info.y = element.style.top;
        tmp_info.display = element.style.display;
        tmp_info.zIndex = element.style.zIndex;
    }
    function restoreElementInfo(element) {
        element.style.left = tmp_info.x;
        element.style.top = tmp_info.y;
        element.style.display = tmp_info.display;
        element.style.zIndex = tmp_info.zIndex;
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
                if (!await current_frame.enter(current_frame.element, data)) {
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
                if (!await current_frame.enter(current_frame.element, data)) {
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
                    if (!await prev_frame.resume(prev_frame.element)) {
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
            const current = current_frame.element;

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

            if (!await current_frame.enter(current, data)) {
                area.removeEventListener("touchmove", _touchmove_listener);
                area.removeEventListener("touchend", _touchend_listener);
                return false;
            }

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
        manager.addEventListener(current_tag, "enable", function (element) {
            const button = element.querySelector(button_selector);
            if (!button) {
                throw new Error("Cannot find button");
            }
            button.addEventListener("click", _listener);
        });
        manager.addEventListener(current_tag, "disable", function (element) {
            const button = element.querySelector(button_selector);
            if (!button) {
                throw new Error("Cannot find button");
            }
            button.removeEventListener("click", _listener);
        });
    }
};