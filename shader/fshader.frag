varying lowp vec4 Color;
varying highp vec2 Texture;
varying highp vec3 Lighting;

uniform sampler2D Sampler;

void main() {
    // gl_FragColor = Color;
    highp vec4 texelColor = texture2D(Sampler, Texture);
    gl_FragColor = vec4(texelColor.rgb * Lighting, texelColor.a);
}