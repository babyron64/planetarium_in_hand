attribute vec4 VertexPosition;
attribute vec4 VertexColor;
attribute vec3 VertexNormal;
attribute vec2 TextureCoord;

uniform mat4 ModelViewMatrix;
uniform mat4 ProjectionMatrix;
uniform mat4 NormalMatrix;

varying lowp vec4 Color;
varying highp vec2 Texture;
varying highp vec3 Lighting;

void main() {
    gl_Position = ProjectionMatrix * ModelViewMatrix * VertexPosition;
    Color = VertexColor;
    Texture = TextureCoord;

    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
    highp vec3 directionalLightColor = vec3(1, 1, 1);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

    highp vec4 transformedNormal = NormalMatrix * vec4(VertexNormal, 1.0);

    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    Lighting = ambientLight + (directionalLightColor * directional);
}