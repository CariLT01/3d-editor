#version 330 core

precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat4 uProjInv;
uniform mat4 uCamWorldMat;

uniform vec3 uBoxCenters[];
uniform vec3 uBoxExtents[];
uniform float uBoxPairs[];

uniform vec3 uSphereCenters[];
uniform vec3 uSphereRadius[];
uniform float uSpherePairs[];

// SDF for a sphere
float sphereSDF(vec3 p, vec3 c, float r) {
    return length(p - c) - r;
}

float boxSDF(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float smoothMin(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Scene SDF (add more primitives/unions here)
float map(in vec3 p) {
    //float sphere = sphereSDF(p, vec3(0.0, 0.0, 0.0), 1.0);
    //float box = boxSDF(p - vec3(1.5), vec3(1));
    //return smoothMin(sphere, box, mod(uTime, 10.0));
    float sdf = 9999.0;
    for (int i = 0; i < boxCenters.length() - 1; i++) {
        float box = boxSDF(p - boxCenters[i], boxExtents[i]);
        if (boxPairs[i] > 0.0) {
            sdf = smoothMin(sdf, box, boxPairs[i]);
        } else {
            if (boxPairs[i] == 0.0) {
                sdf = min(sdf, box);
            } else if (boxPairs[i] == -1.0) {
                sdf = max(sdf, box);
            }
        }
    }
}

// Compute normal via gradient
vec3 getNormal(vec3 p) {
    float eps = 0.0001;
    return normalize(vec3(
    map(p + vec3(eps,0,0)) - map(p - vec3(eps,0,0)),
    map(p + vec3(0,eps,0)) - map(p - vec3(0,eps,0)),
    map(p + vec3(0,0,eps)) - map(p - vec3(0,0,eps))
    ));
}

// Simple Phong lighting
float lighting(vec3 p, vec3 n) {
    vec3 lightPos = vec3(5.0*sin(uTime), 5.0, 5.0*cos(uTime));
    vec3 l = normalize(lightPos - p);
    float diff = max(dot(n, l), 0.0);
    return max(diff, 0.2);
}

// reconstruct a view‐space ray, then rotate into world space
vec3 getRayDir(vec2 uv) {
  // uv in [-1,+1], z = −1 at the near plane
  vec4 clip = vec4(uv, -1.0, 1.0);
  // undo projection → eye space
  vec4 eye = uProjInv * clip;
  eye.z = -1.0;    // forward
  eye.w = 0.0;     // direction, not position
  // transform by camera world matrix → world space
  vec4 worldDir4 = uCamWorldMat * eye;
  return normalize( worldDir4.xyz );
}


void main() {
    vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    
    // Ray origin & direction
    vec3 ro = (uCamWorldMat * vec4(0.,0.,0.,1.)).xyz;
    vec3 rd = getRayDir(uv);
    
    // Ray march
    float t = 0.0;
    const float MAX_DIST = 20.0;
    const float EPS = 0.001;
    const int MAX_STEPS = 100;
    float d;
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        d = map(p);
        if(d < EPS) break;
        t += d;
        if(t > MAX_DIST) break;
    }
    
    vec3 col = vec3(0.0);
    if(d < EPS) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        float dif = lighting(p, n);
        col = vec3(dif);
    }
    
    gl_FragColor = vec4(col, 1.0);
}