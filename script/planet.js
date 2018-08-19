function Planetarium(gl) {
    this.screen = gl;
    this.shaders = undefined;
    this.glInfo = {
        program: undefined,
        attribLocations: {},
        uniformLocations: {} 
    }

    this.onInit = undefined;

    this.changeOrientation = undefined;
    this.changePosition = undefined;
    this.changeTime = undefined;

    this.checkInitialized = function() {
        if (!this.screen) {
            throw new Error("screen menber of planetarium instance is undefined.");
        }
        if (!this.shaders) {
            throw new Error("shaders menber of planetarium instance has not initialized.");
        }
    }
}

async function plInitScreen(pl, configs) {
    if (!pl.screen) {
        throw new Error("screen menber of planetarium instance is undefined.");
    }

    const gl = pl.screen;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // The variable shaders passed below is like:
    // { tag(specified in coinfigs): shader(created) }
    const shaders = await loadShaderFiles(gl, configs);
    pl.shaders = shaders;
    pl.onInit(pl);
}

function plAttachShaders(pl, tags) {
    pl.checkInitialized();

    const gl = pl.screen;
    const shaders = tags.map(e => pl.shaders[e]);
    pl.glInfo.program = attachShaders(gl, shaders)
}

function plRegisterAttrib(pl, name) {
    const gl = pl.screen;
    pl.glInfo.attribLocations[name] = gl.getAttribLocation(pl.glInfo.program, name);
}

function plRegisterUniform(pl, name) {
    const gl = pl.screen;
    pl.glInfo.uniformLocations[name] = gl.getUniformLocation(pl.glInfo.program, name);
}