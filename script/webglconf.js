/*
 * gl is web gl context of a canvas.
 * 
 * fds is of type:
 * [ { tag: string, url: string, type: (gl shader type) } ]
 */
async function loadShaderFiles(gl, fds) {
    // not using await due to performance enhancement
    const fetches = fds.map(e =>  
        loadFileText(e.url).then(source =>
            ({ tag: e.tag, shader: loadShader(gl, e.type, source) })
        )
    );

    const pairs = await Promise.all(fetches);

    var shaders = {};
    pairs.forEach(e => shaders[e.tag] = e.shader);
    return shaders;
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