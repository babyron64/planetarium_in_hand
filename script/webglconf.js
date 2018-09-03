/*
 * dependency:
 *     main.js
 *     utils.js
 */

async function loadShaderFile(gl, url, type) {
    const source = await loadFileText(url);
    const shader = createShader(gl, type, source);
    return shader;
}

function createShader(gl, type, source) {
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

function Render(gl, program, attribs, uniforms) {
    this.program = program;
    this.attribLocations = {};
    this.uniformLocations = {};

    attribs.forEach(a => registerAttrib(gl, this, a));
    uniforms.forEach(u => registerUniform(gl, this, u));
}

function createRender(shader_tags) {
    const gl = app_info.gl.context;
    const shaders = shader_tags.map(e => app_info.gl.shaders[e]);
    return new render(attachShaders(gl, shaders));
}

function registerAttrib(gl, render, name) {
    render.attribLocations[name] = gl.getAttribLocation(render.program, name);
}

function registerUniform(gl, render, name) {
    render.uniformLocations[name] = gl.getUniformLocation(render.program, name);
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

async function loadTextureImage(gl, url) {
    const texture = gl.createTexture();
    const image = new Image();

    return new Promise(resolve => {
        image.onload = function() {
            function isPowerOf2(value) {
                return (value & (value - 1)) == 0;
            }
            const level = 0;
            const internalFormat = gl.RGBA;
            const srcFormat = gl.RGBA;
            const srcType = gl.UNSIGNED_BYTE;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        srcFormat, srcType, image);

            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
            resolve(texture);
        };
        if (isCrossOrigin(url)) {
            image.crossOrigin = (new URL(url)).origin;
        }
        image.src = url;
    });
}

async function loadTextureVideo(gl, url) {
    const texture = gl.createTexture();
    const video = document.createElement('video');

    var playing = false;
    var timeupdate = false;

    video.playsInline = true;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    if (isCrossOrigin(url)) {
        video.crossOrigin = (new URL(url)).origin;
    }
    video.src = url;
    video.play();

    return new Promise(resolve => {
        // Waiting for these 2 events ensures
        // there is data in the video

        video.addEventListener('playing', function() {
            playing = true;
            checkReady();
        }, true);

        video.addEventListener('timeupdate', function() {
            timeupdate = true;
            checkReady();
        }, true);

        function checkReady() {
            if (playing && timeupdate) {
                const level = 0;
                const internalFormat = gl.RGBA;
                const srcFormat = gl.RGBA;
                const srcType = gl.UNSIGNED_BYTE;
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                                srcFormat, srcType, video);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

                resolve(texture);
            }
        }
    });
}

function getUnicolorTexture(gl, color = [0, 0, 255, 255]) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array(color);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);
  
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
    return texture;
}

function BufferPool() {
    var elements = [];

    function BufferPoolElement(gl, buffer, target, size, usage) {
        this.id = gl.canvas.id;
        this.buffer = buffer;
        this.target = target;
        this.size = size;
        this.usage = usage;
        this.available = true;

        this.free = function () {
            this.available = true;
        }
    }

    this.get = function (gl, target, size, usage) {
        var min_size = Infinity;
        var min_index = -1;
        const id = gl.canvas.id;
        for (var i=0;i<elements.length;++i) {
            const e = elements[i];
            if (e.id === id &&
                e.target === target &&
                e.usage === usage && 
                e.size >= size &&
                e.available) {
                if (e.size < min_size) {
                    min_size = e.size;
                    min_index = i;
                }
            }
        }
        if (min_index !== -1) {
            const e = elements[min_index];
            e.available = false;
            return e;
        }
        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, size, usage);
        const e = new BufferPoolElement(gl, buffer, target, size, usage);
        e.available = false;
        elements.push(e);
        return e;
    };
}

function sizeofTypedArray(type) {
    return type.BYTES_PER_ELEMENT;
}