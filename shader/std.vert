attribute highp vec3 VertexPosition;

uniform mat4 ViewMatrix;
uniform mat4 ProjectionMatrix;

void main() {
    gl_Position = ProjectionMatrix * ViewMatrix * vec4(VertexPosition, 1.0);
    gl_PointSize = 10.0;
}