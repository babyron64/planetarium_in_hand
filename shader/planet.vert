attribute highp vec3 Coord;

uniform highp vec3 Earth_Coord;

uniform highp mat3 EclipticToEquatorialMatrix;
uniform highp mat3 PosMatrix;
uniform mediump mat4 ViewMatrix;
uniform mediump mat4 ProjectionMatrix;

void main() {
    highp vec3 Position = PosMatrix * EclipticToEquatorialMatrix * (Coord - Earth_Coord);
    gl_Position = ProjectionMatrix * ViewMatrix * vec4(Position, 1.0);
    gl_PointSize = 13.0;
}