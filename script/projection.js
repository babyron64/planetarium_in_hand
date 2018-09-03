/*
 * dependency:
 *     astroutils.js
 *     webglconf.js
 */

var cie_data;
async function initScreen() {
    const gl = app_info.gl.context;

    app_info.gl.pool = new BufferPool();

    cie_data = await loadCIE();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

async function loadCIE() {
    const data_type = data_info.CIE.type;
    return await loadFileCSV("/data/ciexyz.csv", true, data_type);
}

function flattenFloat32Array2(ary) {
    const len = ary.length;
    const elem_len = ary[0].length;
    const result = new Float32Array(len*elem_len);
    for (var i=0;i<len;++i) {
        for (var j=0;j<elem_len;++j) {
            result[elem_len*i+j] = ary[i][j];
        }
    }
    return result;
}

function clearScreen() {
    const gl = app_info.gl.context;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function swapXY(out_mat, in_mat) {
    const mat = mat3.fromValues(
        0, 1, 0,
        1, 0, 0,
        0, 0, 1,
    );
    mat3.multiply(out_mat, mat, in_mat);
}
function swapYZ(out_mat, in_mat) {
    const mat = mat3.fromValues(
        1, 0, 0,
        0, 0, 1,
        0, 1, 0,
    );
    mat3.multiply(out_mat, mat, in_mat);
}
function swapZX(out_mat, in_mat) {
    const mat = mat3.fromValues(
        0, 0, 1,
        0, 1, 0,
        1, 0, 0,
    );
    mat3.multiply(out_mat, mat, in_mat);
}
function rotateX(out_mat, in_mat, rad) {
    const mat = mat3.fromValues(
        1, 0            , 0             ,
        0, Math.cos(rad), -Math.sin(rad),
        0, Math.sin(rad), Math.cos(rad)
    );
    mat3.transpose(mat, mat);
    mat3.multiply(out_mat, mat, in_mat);
}
function rotateY(out_mat, in_mat, rad) {
    const mat = mat3.fromValues(
        Math.cos(rad), 0, Math.sin(rad),
        0            , 1, 0,
        -Math.sin(rad), 0, Math.cos(rad)
    );
    mat3.transpose(mat, mat);
    mat3.multiply(out_mat, mat, in_mat);
}
function rotateZ(out_mat, in_mat, rad) {
    const mat = mat3.fromValues(
        Math.cos(rad), -Math.sin(rad), 0,
        Math.sin(rad), Math.cos(rad) , 0,
        0            , 0             , 1
    );
    mat3.transpose(mat, mat);
    mat3.multiply(out_mat, mat, in_mat);
}

function screenTrans(out_mat, in_mat) {
    mat4.rotateY(out_mat, in_mat, -app_info.screen.gamma);
    mat4.rotateX(out_mat, in_mat, -app_info.screen.beta);
    mat4.rotateZ(out_mat, in_mat, -app_info.screen.alpha);
}

function posTrans(out_mat, in_mat, time, coord2) {
    if (!time) {
        time = new Date(Date.now());
    } 
    if (!coord2) {
        const latitude = app_info.screen.latitude;
        const longitude = app_info.screen.longitude;
        if (notEmpty(longitude) && notEmpty(latitude)) { 
            coord2 = new Coord2(longitude, latitude, "NOW", time);
        } else {
            throw new Error("longitude or latitude is not specified.");
        }
    }

    const zenith = getZenithEquatorial(time, coord2);
    rotateZ(out_mat, in_mat, degToRad(-zenith.lon));
    rotateY(out_mat, out_mat, degToRad(zenith.lat));
    swapZX(out_mat, out_mat);
    swapXY(out_mat, out_mat);
}

async function standardProject(verteces, viewMatrix=mat4.create()) {
    await standardBaseProject(verteces, viewMatrix);
}

async function screenProject(verteces, viewMatrix=mat4.create()) {
    screenTrans(viewMatrix, viewMatrix);
    await standardBaseProject(verteces, viewMatrix);
}

async function sunProject(time, pos) {
    const gl = app_info.gl.context;

    const coords = new Float32Array(new Coord3(0, 0, 0, "NOW", time).toGLArray());
    const earth_coord = new Float32Array(calcPlanetCoord("Earth", time).toGLArray());

    // render
    var render;
    if (app_info.gl.renders["sun"]) {
        render = app_info.gl.renders["sun"];
    } else {
        const shader_configs = [
            { tag: "sun_v", url: "/shader/sun.vert", type: gl.VERTEX_SHADER },,
            { tag: "sun_f", url: "/shader/sun.frag", type: gl.FRAGMENT_SHADER },,
        ];
        await Promise.all(shader_configs.map(async conf => {
            if (!app_info.gl.shaders[conf.tag]) {
                const shader = await loadShaderFile(gl, conf.url, conf.type);
                app_info.gl.shaders[conf.tag] = shader;
            }
        }));

        render = new Render(gl, attachShaders(gl, [
            app_info.gl.shaders["sun_v"],
            app_info.gl.shaders["sun_f"],
        ]),
            ["Coord"],
            ["Earth_Coord", "EclipticToEquatorialMatrix", "PosMatrix", "ViewMatrix", "ProjectionMatrix"]
        );
        app_info.gl.renders["sun"] = render; 
    }

    // matrix
    const eclipticToEquatorialMatrix = mat3.create();
    rotateX(eclipticToEquatorialMatrix, eclipticToEquatorialMatrix, -earth_obliquity);

    const posMatrix = mat3.create();
    posTrans(posMatrix, posMatrix, time, pos);

    const viewMatrix = mat4.create();
    screenTrans(viewMatrix, viewMatrix);

    const projectionMatrix = mat4.create();
    const fieldOfView = app_info.screen.fov;   // vertical view
    const aspect = app_info.screen.width/app_info.screen.height;
    const zNear = app_info.screen.near;
    const zFar = Infinity;
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    // buffer
    var bufferElements = {};

    bufferElements.coords = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*coords.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.coords.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, coords);

    // pipeline
    gl.useProgram(render.program);

    // input
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.coords.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.Coord, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.Coord);


    gl.uniform3fv(
        render.uniformLocations.Earth_Coord,
        earth_coord 
    );

    gl.uniformMatrix3fv(
        render.uniformLocations.EclipticToEquatorialMatrix,
        false,
        eclipticToEquatorialMatrix);

    gl.uniformMatrix3fv(
        render.uniformLocations.PosMatrix,
        false,
        posMatrix);

    gl.uniformMatrix4fv(
        render.uniformLocations.ViewMatrix,
        false,
        viewMatrix);

    gl.uniformMatrix4fv(
        render.uniformLocations.ProjectionMatrix,
        false,
        projectionMatrix);

    // draw
    gl.drawArrays(gl.POINTS, 0, 1);

    // clean
    bufferElements.coords.free();
}

async function planetsProject(names, time, pos) {
    if (names.length === 0) {
        return;
    }

    const gl = app_info.gl.context;

    const coords = flattenFloat32Array2(names.map(e => calcPlanetCoord(e, time).toGLArray()));
    const earth_coord = new Float32Array(calcPlanetCoord("Earth", time).toGLArray());

    // render
    var render;
    if (app_info.gl.renders["planet"]) {
        render = app_info.gl.renders["planet"];
    } else {
        const shader_configs = [
            { tag: "planet_v", url: "/shader/planet.vert", type: gl.VERTEX_SHADER },,
            { tag: "planet_f", url: "/shader/planet.frag", type: gl.FRAGMENT_SHADER },,
        ];
        await Promise.all(shader_configs.map(async conf => {
            if (!app_info.gl.shaders[conf.tag]) {
                const shader = await loadShaderFile(gl, conf.url, conf.type);
                app_info.gl.shaders[conf.tag] = shader;
            }
        }));

        render = new Render(gl, attachShaders(gl, [
            app_info.gl.shaders["planet_v"],
            app_info.gl.shaders["planet_f"],
        ]),
            ["Coord"],
            ["Earth_Coord", "EclipticToEquatorialMatrix", "PosMatrix", "ViewMatrix", "ProjectionMatrix"]
        );
        app_info.gl.renders["planet"] = render; 
    }

    // matrix
    const eclipticToEquatorialMatrix = mat3.create();
    rotateX(eclipticToEquatorialMatrix, eclipticToEquatorialMatrix, -earth_obliquity);

    const posMatrix = mat3.create();
    posTrans(posMatrix, posMatrix, time, pos);

    const viewMatrix = mat4.create();
    screenTrans(viewMatrix, viewMatrix);

    const projectionMatrix = mat4.create();
    const fieldOfView = app_info.screen.fov;   // vertical view
    const aspect = app_info.screen.width/app_info.screen.height;
    const zNear = app_info.screen.near;
    const zFar = Infinity;
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    // buffer
    var bufferElements = {};

    bufferElements.coords = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*coords.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.coords.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, coords);

    // pipeline
    gl.useProgram(render.program);

    // input
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.coords.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.Coord, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.Coord);


    gl.uniform3fv(
        render.uniformLocations.Earth_Coord,
        earth_coord 
    );

    gl.uniformMatrix3fv(
        render.uniformLocations.EclipticToEquatorialMatrix,
        false,
        eclipticToEquatorialMatrix);

    gl.uniformMatrix3fv(
        render.uniformLocations.PosMatrix,
        false,
        posMatrix);

    gl.uniformMatrix4fv(
        render.uniformLocations.ViewMatrix,
        false,
        viewMatrix);

    gl.uniformMatrix4fv(
        render.uniformLocations.ProjectionMatrix,
        false,
        projectionMatrix);

    // draw
    gl.drawArrays(gl.POINTS, 0, names.length);

    // clean
    bufferElements.coords.free();
}

var inf_plx = Number.MIN_VALUE;
async function hipStarProject(stars, time, pos) {
    const gl = app_info.gl.context;

    const epoch_coords = flattenFloat32Array2(stars.map(e => [e.RAdeg, e.DEdeg]));
    const diff_coords = flattenFloat32Array2(stars.map(e => [e.pmRA, e.pmDE]));
    const plx = new Float32Array(stars.map(e => e.plx>0?e.plx:inf_plx));
    const v_mag = new Float32Array(stars.map(e => e.Vmag));
    const bv_idx = new Float32Array(stars.map(e => e.B_V));
    const cie = flattenFloat32Array2(cie_data.map(e => [e.wavelength, e.x, e.y, e.z]));

    const diff_time = getTimeFromEpoch(time, "Y", "J1991.25");

    // render
    var render;
    if (app_info.gl.renders["star"]) {
        render = app_info.gl.renders["star"];
    } else {
        const shader_configs = [
            { tag: "star_v", url: "/shader/star.vert", type: gl.VERTEX_SHADER },
            { tag: "star_f", url: "/shader/star.frag", type: gl.FRAGMENT_SHADER },
        ];
        await Promise.all(shader_configs.map(async conf => {
            if (!app_info.gl.shaders[conf.tag]) {
                const shader = await loadShaderFile(gl, conf.url, conf.type);
                app_info.gl.shaders[conf.tag] = shader;
            }
        }));

        render = new Render(gl, attachShaders(gl, [
            app_info.gl.shaders["star_v"],
            app_info.gl.shaders["star_f"],
        ]),
            ["Epoch_Coord", "Diff_Coord", "Plx", "V_Mag", "BV_Idx"],
            ["PosMatrix", "ViewMatrix", "ProjectionMatrix", "PM_Coef", "CIE", "XyzToRgbMatrix"]
        );
        app_info.gl.renders["star"] = render; 
    }

    // matrix
    const posMatrix = mat3.create();
    posTrans(posMatrix, posMatrix, time, pos);

    const viewMatrix = mat4.create();
    screenTrans(viewMatrix, viewMatrix);

    const projectionMatrix = mat4.create();
    const fieldOfView = app_info.screen.fov;   // vertical view
    const aspect = app_info.screen.width/app_info.screen.height;
    const zNear = app_info.screen.near;
    const zFar = Infinity;
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    const xyzToRgbMatrix = mat3.fromValues(
        3.2410, -1.5374, -0.4986,
        -0.9692, 1.8760, 0.0416,
        0.0556, -0.2040, 1.0570
    );
    mat3.transpose(xyzToRgbMatrix, xyzToRgbMatrix);

    // buffer
    var bufferElements = {};

    bufferElements.epoch_coords = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*epoch_coords.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.epoch_coords.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, epoch_coords);

    bufferElements.diff_coords = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*diff_coords.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.diff_coords.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, diff_coords);

    bufferElements.plx = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*plx.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.plx.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, plx);

    bufferElements.v_mag = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*v_mag.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.v_mag.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, v_mag);

    bufferElements.bv_idx = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*bv_idx.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.bv_idx.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, bv_idx);

    // pipeline
    gl.useProgram(render.program);

    // input
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.epoch_coords.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.Epoch_Coord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.Epoch_Coord);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.diff_coords.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.Diff_Coord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.Diff_Coord);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.plx.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.Plx, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.Plx);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.v_mag.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.V_Mag, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.V_Mag);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferElements.bv_idx.buffer);
    gl.vertexAttribPointer(
        render.attribLocations.BV_Idx, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.BV_Idx);


    gl.uniformMatrix3fv(
        render.uniformLocations.PosMatrix,
        false,
        posMatrix);

    gl.uniformMatrix4fv(
        render.uniformLocations.ViewMatrix,
        false,
        viewMatrix);

    gl.uniformMatrix4fv(
        render.uniformLocations.ProjectionMatrix,
        false,
        projectionMatrix);

    gl.uniform1f(
        render.uniformLocations.PM_Coef,
        diff_time/1000/60/60);

    gl.uniformMatrix3fv(
        render.uniformLocations.XyzToRgbMatrix,
        false,
        xyzToRgbMatrix
    );

    gl.uniform4fv(
        render.uniformLocations.CIE,
        cie
    );

    // draw
    gl.drawArrays(gl.POINTS, 0, stars.length);

    // clean
    bufferElements.epoch_coords.free();
    bufferElements.diff_coords.free();
    bufferElements.plx.free();
    bufferElements.v_mag.free();
}

async function standardBaseProject(verteces, viewMatrix) {
    const gl = app_info.gl.context;

    // render
    var render;
    if (app_info.gl.renders["std"]) {
        render = app_info.gl.renders["std"];
    } else {
        const shader_configs = [
            { tag: "std_v", url: "/shader/std.vert", type: gl.VERTEX_SHADER },
            { tag: "std_f", url: "/shader/std.frag", type: gl.FRAGMENT_SHADER },
        ];
        await Promise.all(shader_configs.map(async conf => {
            if (!app_info.gl.shaders[conf.tag]) {
                const shader = await loadShaderFile(gl, conf.url, conf.type);
                app_info.gl.shaders[conf.tag] = shader;
            }
        }));

        render = new Render(gl, attachShaders(gl, [
            app_info.gl.shaders["std_v"],
            app_info.gl.shaders["std_f"],
        ]), ["VertexPosition", "VertexColor"], ["ViewMatrix", "ProjectionMatrix"]);
        app_info.gl.renders["std"] = render; 
    }

    // matrix
    const projectionMatrix = mat4.create();
    const fieldOfView = app_info.screen.fov;   // vertical view
    const aspect = app_info.screen.width/app_info.screen.height;
    const zNear = app_info.screen.near;
    const zFar = Infinity;
    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    // buffer
    const positionBufferElement = app_info.gl.pool.get(gl, gl.ARRAY_BUFFER, sizeofTypedArray(Float32Array)*verteces.length*3, gl.STATIC_DRAW);
    const positionBuffer = positionBufferElement.buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flattenFloat32Array2(verteces));

    // pipeline
    gl.useProgram(render.program);

    // input
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
        render.attribLocations.VertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
        render.attribLocations.VertexPosition);

    gl.uniformMatrix4fv(
        render.uniformLocations.ViewMatrix,
        false,
        viewMatrix);
    gl.uniformMatrix4fv(
        render.uniformLocations.ProjectionMatrix,
        false,
        projectionMatrix);

    // draw
    gl.drawArrays(gl.POINTS, 0, verteces.length);

    // clean
    positionBufferElement.free();
}