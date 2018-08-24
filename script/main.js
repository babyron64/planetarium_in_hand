//
// global variables
//
var plContainer;
var manager;

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

    const screen = document.querySelector("#plScreen");
    const gl = screen.getContext("webgl");
    if (gl === null) {
      throw new Error("Unable to initialize WebGL. Your browser or machine may not support it.");
    }

    var pl = new Planetarium(gl);
    pl.changeOrientation = debugOrientation;
    pl.changePosition = debugPosition;

    plContainer = new DIContainer();
    plContainer.add("pl", pl);

    manager = new FrameManager();

    initConfig(pl);
    initLocation(pl);
    initUI();

    enterProgress();

    const main = document.querySelector("#main_pane");
    const main_frame = manager.createFrame(main);
    await manager.register(main_frame, "main");

    const setting = await loadSettingPane();
    const setting_frame = manager.createFrame(setting);
    const _setting_enter = setting_frame.enter;
    // change style when entered
    // const setting_style = setting.querySelector("link");
    // setting_frame.enter = async function (element) {
    //     if (!element.contains(setting_style))
    //         element.appendChild(setting_style);
    //     return await _setting_enter(element);
    // };
    // const _setting_exit = setting_frame.exit;
    // setting_frame.exit = async function (element) {
    //     if (element.contains(setting_style))
    //         setting_style.remove();
    //     return await _setting_exit(element);
    // };
    setting_frame.onenable = settingPaneOnEnable;
    setting_frame.ondisable = settingPaneOnDisable;
    await manager.register(setting_frame, "setting");

    FrameManager.trans.slideFromBottom(manager, "main", "setting");
    FrameManager.trans.buttonClick(manager, "setting", "main", "#ok_button");

    var shader_confs = [
        { tag: "vshader", url: "/shader/vshader.vert", type: gl.VERTEX_SHADER },
        { tag: "fshader", url: "/shader/fshader.frag", type: gl.FRAGMENT_SHADER }
    ];
    await initScreen(pl, shader_confs);
    await plLoadData(pl);

    manager.show("main");

    exitProgress();

    plExecute(pl);
}

async function plLoadData(pl) {
    setShaders(pl);
    const objectData = await loadFileJSON("/object/cube.json");
    plContainer.add("buffers", initBuffers(pl.screen, objectData));
    plContainer.add("texture", await loadTextureVideo(pl.screen, objectData.video_url));
}

function plExecute(pl) {
    // Used for rotation animation.
    var cubeRotation = 0;
    function render(now) {
        cubeRotation = now / 1000;
        drawScene(pl.screen, pl.glInfo, plContainer.get("buffers"), plContainer.get("texture"), cubeRotation);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function setShaders(pl) {
    plAttachShaders(pl, ["vshader", "fshader"]);

    // Corresponding to shaders in use.
    plRegisterAttrib(pl, "VertexPosition");
    plRegisterAttrib(pl, "VertexColor");
    plRegisterAttrib(pl, "VertexNormal");
    plRegisterAttrib(pl, "TextureCoord");

    plRegisterUniform(pl, "ProjectionMatrix");
    plRegisterUniform(pl, "ModelViewMatrix");
    plRegisterUniform(pl, "NormalMatrix");
    plRegisterUniform(pl, "Sampler");
}

function initBuffers(gl, objectData) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(objectData.position),
                  gl.STATIC_DRAW);
    
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(objectData.color),
                  gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                  new Uint16Array(objectData.index),
                  gl.STATIC_DRAW);

    const textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(objectData.texture),
                  gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(objectData.normal),
                  gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        index: indexBuffer,
        texture: textureBuffer,
        normal: normalBuffer,
    };
}

function drawScene(gl, programInfo, buffers, texture, cubeRotation) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
  
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);
  
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix,     // destination matrix
                   modelViewMatrix,     // matrix to translate
                   [-0.0, 0.0, -6.0]);  // amount to translate
    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                cubeRotation,   // amount to rotate in radians
                [0, 0, 1]);       // axis to rotate around
    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                cubeRotation*0.7,   // amount to rotate in radians
                [0, 1, 0]);       // axis to rotate around
    
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    {
        const numComponents = 3;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        const offset = 0;         // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.VertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.VertexPosition);
    }
    {
        const numComponents = 4;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        const offset = 0;         // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.VertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.VertexColor);
    }
    {
        const numComponents = 2; // every coordinate composed of 2 values
        const type = gl.FLOAT; // the data in the buffer is 32 bit float
        const normalize = false; // don't normalize
        const stride = 0; // how many bytes to get from one set to the next
        const offset = 0; // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texture);
        gl.vertexAttribPointer(
            programInfo.attribLocations.TextureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.TextureCoord);
    }
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.attribLocations.VertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.VertexNormal);
    }

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.ProjectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.ModelViewMatrix,
        false,
        modelViewMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.NormalMatrix,
        false,
        normalMatrix);
  
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    {
        const vertexCount = 36;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
}

function debugOnWindow(msg, num) {
    document.getElementById("debug"+num.toString()).innerHTML = msg;
}