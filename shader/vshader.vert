attribute vec4 VertexPosition;

uniform mat4 ModelViewMatrix;
uniform mat4 ProjectionMatrix;

void main() {
    gl_Position = ProjectionMatrix * ModelViewMatrix * VertexPosition;
}