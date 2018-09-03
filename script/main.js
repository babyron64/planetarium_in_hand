/*
 * dependency:
 *     planet.js
 *     setting.js
 *     ui.js
 *     utils.js
 *     frame_manager.js
 *     location.js
 *     config.js
 *     webglconf.js
 *     astrocalc.js
 */

//
// global variables
//
var app_info = {
    location: {
        orientation: {
            get: null,
            onchange: null,
        },
        position: {
            get: null,
            onchange: null,
        }
    },
    gl: {
        canvas: null,
        context: null,
        shaders: {},
        buffers: {},
        renders: {}, // see Render class in webglconf.js
        pool: {}, // see BufferPool class in webglconf.js
    },
    screen: {
        width: null,
        height: null,
        fov: null, // radian
        near: 0.1,

        // radian
        alpha: null, 
        beta: null,
        gamma: null,

        // radian
        longitude: null,
        latitude: null,
    },
    setting: null, // see setting.js
    frame: {
        manager: null,
    },
    container: null,
};

//
// entry point
//

// var dummy = async function() {
window.onload = async function() {
    //
    // Initialization
    //

    // disable auto scroll that restores the previous state.
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    };

    // disable scroll by default
    document.addEventListener("touchmove", e => {
        e.preventDefault();
    }, {passive: false});
    document.addEventListener("wheel", e => {
        e.preventDefault();
    });

    app_info.container = new DIContainer();
    app_info.frame.manager = new FrameManager();

    app_info.gl.canvas = document.querySelector("#plScreen");
    app_info.gl.canvas.width = window.innerWidth;
    app_info.gl.canvas.height = window.innerHeight;
    app_info.gl.context = app_info.gl.canvas.getContext("webgl");
    if (app_info.gl.context === null) {
      throw new Error("Unable to initialize WebGL. Your browser or machine may not support it.");
    }

    app_info.location.orientation.onchange = updateOrientation;
    app_info.location.position.onchange = updatePosition;

    initUI();

    enterProgress();

    initConfig();

    const manager = app_info.frame.manager;
    // main pane
    const main = document.querySelector("#main_pane");
    const main_frame = manager.createFrame(main);
    await manager.register(main_frame, "main");
    // setting pane
    const setting = await loadSettingPane();
    const setting_frame = manager.createFrame(setting);
    setting_frame.onenable = settingPaneOnEnable;
    setting_frame.ondisable = settingPaneOnDisable;
    await manager.register(setting_frame, "setting");

    FrameManager.trans.slideFromBottom(manager, "main", "setting");
    FrameManager.trans.buttonClick(manager, "setting", "main", "#ok_button");

    await initLocation();
    await initUtils();
    await initScreen();

    await initAstroCalc();

    startPlanet();

    manager.show("main");
    // manager.show("setting");

    exitProgress();
}

var diff_time = 0;
async function loop() {
    const time = new Date(Date.now()+diff_time);
    // const time = getJSTTime(2018, 9, 2, 22);
    const animation_rate = 0;
    const pos = new Coord2(app_info.screen.longitude, app_info.screen.latitude, "NOW", time);

    app_info.setting.state.time_ctl.time.set(time);
    app_info.setting.state.time_ctl.animation_rate.set(animation_rate);

    clearScreen();

    await hipStarProject(star_coords.filter(e => notEmpty(e.Vmag) && e.Vmag<6), time, pos);

    const planet_names = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
    await planetsProject(planet_names, time, pos);

    await sunProject(time, pos);

    diff_time = diff_time+animation_rate;
}

function startPlanet() {
    var frame_counter = 0;
    async function frame_loop () {
        frame_counter = frame_counter + 1;
        await loop();
        requestAnimationFrame(frame_loop);
    }
    frame_loop();

    function calcFPS() {
        app_info.setting.state.time_ctl.fps.set(frame_counter);
        frame_counter = 0;
        setTimeout(calcFPS, 1000);
    }
    calcFPS();
}

function debugOnWindow(msg, num) {
    const debug = document.getElementById("debug"+num.toString());
    if (debug) {
        debug.innerHTML = msg;
    }
}