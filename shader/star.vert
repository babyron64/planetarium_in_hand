attribute highp vec2 Epoch_Coord; // ra, de
attribute highp vec2 Diff_Coord; // d_ra, d_de
attribute mediump float Plx;
attribute mediump float V_Mag;
attribute mediump float BV_Idx;

uniform highp mat3 PosMatrix;
uniform mediump mat4 ViewMatrix;
uniform mediump mat4 ProjectionMatrix;

uniform highp float PM_Coef;

uniform highp vec4 CIE[95];
uniform mediump mat3 XyzToRgbMatrix;

varying mediump vec4 Color;

mediump vec3 getBKStrength(mediump vec4 cie, mediump float T) {
    highp float l = cie[0];
    highp float Me = pow(10.0, -16.0) / pow(l, 5.0) / (exp(1.438775 * pow(10.0, 7.0)/ l / T) - 1.0);
    return vec3(
        cie[1] * Me,
        cie[2] * Me,
        cie[3] * Me
    );
}

void main() {
    highp vec2 Coord = radians(Epoch_Coord + PM_Coef * Diff_Coord);
    highp float RA = Coord[0];
    highp float DE = Coord[1];
    highp float R = 1.0 / Plx; // parsec
    highp vec3 Cart = vec3(
        Plx * cos(DE) * cos(RA),
        Plx * cos(DE) * sin(RA),
        Plx * sin(DE)
    );
    highp vec3 Position = PosMatrix * Cart;
    gl_Position = ProjectionMatrix * ViewMatrix * vec4(Position, 1.0);
    gl_PointSize = 8.0 - V_Mag;

    highp float T = 9000.0 /  (BV_Idx + 0.85);
    highp vec3 xyz = vec3(0.0);
    for (int i=0;i<95;i++) {
        mediump vec3 d_xyz = getBKStrength(CIE[i], T);
        xyz[0] += d_xyz[0]; // ignore the width of 5nm
        xyz[1] += d_xyz[1]; // ignore the width of 5nm
        xyz[2] += d_xyz[2]; // ignore the width of 5nm
    }
    highp vec2 xy = vec2(
        xyz[0] / (xyz[0] + xyz[1] + xyz[2]),
        xyz[1] / (xyz[0] + xyz[1] + xyz[2])
    );
    highp vec3 XYZ = vec3(
        xy[0] / xy[1],
        1.0,
        (1.0 - xy[0] - xy[1]) / xy[1]
    );
    highp vec3 RGB = XyzToRgbMatrix * XYZ;
    highp vec3 RGB_gamma = vec3 (
        pow(RGB[0], 1.0 / 2.2),
        pow(RGB[1], 1.0 / 2.2),
        pow(RGB[2], 1.0 / 2.2)
    );
    Color = vec4(RGB_gamma, 1.0);
}