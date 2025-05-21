precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform mat4 uProjInv;
uniform mat4 uCamWorldMat;

uniform sampler2D uBoxData;
uniform int uBoxCount;

vec4 getBoxPixel(int index, int pixelOffset, int totalPixels) {
  float x = (float(index * 3 + pixelOffset) + 0.5) / float(totalPixels); // UPDATE WHEN NUMBER OF PIXELS CHANGES
  return texture(uBoxData, vec2(x, 0.5));
}

// SDF for a sphere
float sphereSDF(vec3 p, vec3 c, float r) {
    return length(p - c) - r;
}
vec3 rotateByQuat(vec3 v, vec4 q) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

float SDFBox(vec3 p, vec3 center, vec3 size, vec4 rotation) {
    // Transform p into the box's local space
    vec3 local = p - center;

    // Normalize rotation to ensure it is a unit quaternion
    vec4 q = normalize(rotation);
    vec4 invQ = vec4(-q.xyz, q.w);

    // Apply the inverse rotation
    vec3 rotated = rotateByQuat(local, invQ);

    // Compute signed distance to axis-aligned box
    vec3 d = abs(rotated) - size;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
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
    int len = uBoxCount;
    for (int i = 0; i < len; i++) {
        vec4 p0 = getBoxPixel(i, 0, len * 3);
        vec4 p1 = getBoxPixel(i, 1, len * 3);
        vec4 p2 = getBoxPixel(i, 2, len * 3);
        // PosX, PosY, PosZ, SizeX, SizeY, SizeZ, QX, QY, QZ, QW           MorphFactor
        // R-----G-----B-----A||||||R------G------B---A|||R---G------------B----------A(Padding)
        float box = SDFBox(p, vec3(p0.r, p0.g, p0.b), vec3(p0.a, p1.r, p1.g), vec4(p1.b, p1.a, p2.r, p2.g));
        if (p2.b > 0.0) {
            sdf = smoothMin(sdf, box, p2.b);
        } else {
            if (p2.b == 0.0) {
                sdf = min(sdf, box);
            } else if (p2.b == -1.0) {
                sdf = max(sdf, box);
            } else if (p2.b == -0.5) {
                sdf = max(-sdf, box);
            }
        }
    }

    return sdf;
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
    
    vec3 col = vec3(-1.0);
    if(d < EPS) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        float dif = lighting(p, n);
        col = vec3(dif);
    }
    if (col != vec3(-1.0)) {
        gl_FragColor = vec4(col, 1.0);
    } else {
        gl_FragColor = vec4(0.0);
    }
    
}