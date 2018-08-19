/*
 * gl is web gl context of a canvas.
 * 
 * fds is of type:
 * [ { tag: string, url: string, type: (gl shader type) } ]
 */
function loadShaderFiles(gl, fds) {
    const fetches = fds.map(e => 
        loadFile(e.url).then(source => 
            ({ tag: e.tag, shader: loadShader(gl, e.type, source) })
        )
    );

    return Promise.all(fetches).then(pairs => {
        var shaders = {};
        pairs.forEach(e => shaders[e.tag] = e.shader);
        return shaders;
    });
}

function loadFile(fileurl) {
    return fetch(fileurl).then(function(response) {
        return response.text();
    });
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var msg = 'An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(msg);
    }

    return shader;
}

function attachShaders(gl, shaders) {
    const shaderProgram = gl.createProgram();
    shaders.forEach(e => gl.attachShader(shaderProgram, e));
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    }
    return shaderProgram;
}