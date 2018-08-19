window.onload = function() {
    //
    // Initialization
    //
    const screen = document.querySelector("#plScreen");
    const gl = screen.getContext("webgl");
    if (gl === null) {
      throw new Error("Unable to initialize WebGL. Your browser or machine may not support it.");
    }

    var pl = new Planetarium(gl);
    pl.changeOrientation = debugOrientation;
    pl.changePosition = debugPosition;

    initConfig(pl);
    initLocation(pl);

    var shader_confs = [
        { tag: "vshader", url: "shader/vshader.vert", type: gl.VERTEX_SHADER },
        { tag: "fshader", url: "shader/fshader.frag", type: gl.FRAGMENT_SHADER }
    ];
    pl.onInit = plExecute;
    plInitScreen(pl, shader_confs)
}

function plExecute(pl) {
    setShaders(pl);
    const buffers = initBuffers(pl.screen);
    drawScene(pl.screen, pl.glInfo, buffers);
}

function setShaders(pl) {
    plAttachShaders(pl, ["vshader", "fshader"]);
    // Corresponding to shaders in use.
    plRegisterAttrib(pl, "VertexPosition");
    plRegisterUniform(pl, "ProjectionMatrix");
    plRegisterUniform(pl, "ModelViewMatrix");
}

function initBuffers(gl) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0,  1.0,
        1.0,  1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(positions),
                  gl.STATIC_DRAW);
    return {
        position: positionBuffer,
    };
}

function drawScene(gl, programInfo, buffers) {
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
    {
      const numComponents = 2;  // pull out 2 values per iteration
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
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.ProjectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.ModelViewMatrix,
        false,
        modelViewMatrix);
  
    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

function debugOnWindow(msg, num) {
    document.getElementById("debug"+num.toString()).innerHTML = msg;
}