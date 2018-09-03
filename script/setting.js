/*
 * dependency:
 *     utils.js
 */

async function loadSettingPane() {
    const html_text = await loadFileText("/page/setting.html");
    const setting = document.createElement("div");
    setting.className = "setting";
    setting.innerHTML = html_text;
    initSettingPane(setting);
    document.body.appendChild(setting);

    return setting;
}

function initSettingPane(element) {
    // allow user to scroll
    element.addEventListener("touchmove", e => {
        e.stopPropagation();
    });

    function htmlToJs(value) {
        if (value === "") {
            return null;
        } else if (value === "enable") {
            return true;
        } else if (value === "disable") {
            return false;
        }
        return value;
    }
    function jsToHtml(value) {
        if (value === null || value === undefined) {
            return "";
        } else if (value === true) {
            return "enable";
        } else if (value === false) {
            return "disable";
        }
        return String(value);
    }
    function settingRecode(query, set_func, get_func, update_func) {
        const setting = element.querySelector(query+" .setting_value");
        set_func = set_func || jsToHtml;
        get_func = get_func || htmlToJs;
        this.set = (value) => setting.innerHTML=set_func(value);
        this.get = () => get_func(setting.innerHTML);
        this.update = update_func;
    }

    app_info.setting = {
        state: {
            time_ctl: {
                time: new settingRecode(".setting #state #time_ctl #time"),
                mode: new settingRecode(".setting #state #time_ctl #mode"),
                animation_rate: new settingRecode(".setting #state #time_ctl #animation_rate"),
                fps: new settingRecode(".setting #state #time_ctl #fps"),
            },
            position: {
                longitude: new settingRecode(".setting #position #longitude",
                                             x=>String(x.toFixed(3)),
                                             x=>Number(x),
                                             function () { this.set(app_info.screen.longitude); }
                                            ),
                latitude: new settingRecode(".setting #position #latitude",
                                            x=>String(x.toFixed(3)),
                                            x=>Number(x),
                                            function () { this.set(app_info.screen.latitude); }
                                           ),
            },
            orientation: {
                alpha: new settingRecode(".setting #orientation #alpha",
                                         x=>String(x.toFixed(3)),
                                         x=>Number(x),
                                         function () { this.set(app_info.screen.alpha); }
                                        ),
                beta: new settingRecode(".setting #orientation #beta",
                                         x=>String(x.toFixed(3)),
                                         x=>Number(x),
                                         function () { this.set(app_info.screen.beta); }
                                        ),
                gamma: new settingRecode(".setting #orientation #gamma",
                                         x=>String(x.toFixed(3)),
                                         x=>Number(x),
                                         function () { this.set(app_info.screen.gamma); }
                                        ),
            },
        },
        screen: {
            stars: {
                display: new settingRecode(".setting #screen #stars #display"),
                color: new settingRecode(".setting #screen #stars #color"),
                max_mag: new settingRecode(".setting #screen #stars #max_mag"),
            },
            planets: {
                display: new settingRecode(".setting #screen #planets #display"),
            }
        }
    };

    app_info.setting.state.time_ctl.mode.set("dynamic");
    app_info.setting.state.time_ctl.animation_rate.set(0);
    app_info.setting.screen.stars.display.set(true);
    app_info.setting.screen.stars.color.set(true);
    app_info.setting.screen.stars.max_mag.set(6);
    app_info.setting.screen.planets.display.set(true);
}

function updateSetting(setting) {
    for (let e in setting) {
        var c = setting[e];
        if (c.update) {
            c.update.bind(c)();
        }
        if (setting.hasOwnProperty(e)) {
            updateSetting(c);
        }
    }
}

function settingPaneOnEnable(element) {
    element.querySelector("#ok_button").style.visibility = "visible";
}

function settingPaneOnDisable(element) {
    element.querySelector("#ok_button").style.visibility = "hidden";
}