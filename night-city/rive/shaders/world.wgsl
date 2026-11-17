// The city: sky, ground, buildings and traffic. Everything wraps around the
// camera every `city` units, so the grid of blocks never ends.

struct Globals {
    viewProj: mat4x4<f32>,
    camPos: vec4<f32>,   // xyz, w = time in seconds
    camRight: vec4<f32>, // xyz
    camUp: vec4<f32>,    // xyz
    camFwd: vec4<f32>,   // xyz, w = tan(fovY / 2)
    misc: vec4<f32>,     // x = aspect, y = city size, z = cell size, w = boost 0..1
};
@group(0) @binding(0) var<uniform> g: Globals;

const FOG_NEAR: vec3<f32> = vec3<f32>(0.10, 0.045, 0.19);
const FOG_FAR: vec3<f32> = vec3<f32>(0.32, 0.10, 0.36);

fn hash1(p: vec2<f32>) -> f32 {
    var q = fract(p * vec2<f32>(123.34, 456.21));
    q += dot(q, q + 45.32);
    return fract(q.x * q.y);
}

fn fogColor(dir: vec3<f32>) -> vec3<f32> {
    let h = clamp(dir.y * 2.5 + 0.5, 0.0, 1.0);
    return mix(FOG_FAR, FOG_NEAR, h);
}

fn applyFog(color: vec3<f32>, world: vec3<f32>) -> vec3<f32> {
    let d = world - g.camPos.xyz;
    let dist = length(d);
    let f = 1.0 - exp(-dist * 0.0028);
    return mix(color, fogColor(d / max(dist, 0.001)), clamp(f * f * 1.25, 0.0, 1.0));
}

// Nearest copy of a wrapped point to the camera.
fn wrapXZ(p: vec2<f32>) -> vec2<f32> {
    let city = g.misc.y;
    let rel = p - g.camPos.xz;
    return g.camPos.xz + rel - city * round(rel / city);
}

fn neon(seed: f32) -> vec3<f32> {
    let k = fract(seed * 7.13);
    if (k < 0.34) { return vec3<f32>(1.0, 0.16, 0.62); }
    if (k < 0.67) { return vec3<f32>(0.10, 0.90, 1.0); }
    if (k < 0.85) { return vec3<f32>(1.0, 0.62, 0.12); }
    return vec3<f32>(0.55, 0.30, 1.0);
}

// ---------------------------------------------------------------- sky

struct SkyOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) ndc: vec2<f32>,
};

@vertex
fn vs_sky(@builtin(vertex_index) i: u32) -> SkyOut {
    var tri = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
    var o: SkyOut;
    o.pos = vec4<f32>(tri[i], 1.0, 1.0);
    o.ndc = tri[i];
    return o;
}

@fragment
fn fs_sky(i: SkyOut) -> @location(0) vec4<f32> {
    let t = g.camFwd.w;
    let dir = normalize(g.camFwd.xyz + g.camRight.xyz * (i.ndc.x * g.misc.x * t) + g.camUp.xyz * (i.ndc.y * t));
    let h = dir.y;
    var c = mix(vec3<f32>(0.34, 0.10, 0.36), vec3<f32>(0.015, 0.02, 0.07), smoothstep(-0.05, 0.55, h));
    // city glow hugging the horizon
    c += vec3<f32>(0.75, 0.22, 0.42) * exp(-abs(h) * 14.0) * 0.55;
    c += vec3<f32>(0.10, 0.45, 0.60) * exp(-abs(h - 0.06) * 30.0) * 0.25;
    // stars
    let sp = dir.xz / (abs(dir.y) + 0.35) * 90.0;
    let cell = floor(sp);
    let star = hash1(cell);
    let d = length(fract(sp) - 0.5);
    let tw = 0.6 + 0.4 * sin(g.camPos.w * 2.0 + star * 60.0);
    c += vec3<f32>(0.8, 0.9, 1.0) * step(0.985, star) * smoothstep(0.22, 0.0, d) * tw * smoothstep(0.05, 0.3, h);
    // moon
    let moonDir = normalize(vec3<f32>(-0.45, 0.42, -0.78));
    let m = dot(dir, moonDir);
    c = mix(c, vec3<f32>(0.98, 0.80, 0.88), smoothstep(0.99880, 0.99905, m) * 0.92);
    c += vec3<f32>(0.9, 0.35, 0.7) * pow(max(m, 0.0), 90.0) * 0.22;
    return vec4<f32>(c, 1.0);
}

// ---------------------------------------------------------------- ground

struct GroundOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) world: vec3<f32>,
};

@vertex
fn vs_ground(@builtin(vertex_index) i: u32) -> GroundOut {
    var quad = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, 1.0));
    let p = quad[i] * g.misc.y * 0.75 + g.camPos.xz;
    var o: GroundOut;
    o.world = vec3<f32>(p.x, 0.0, p.y);
    o.pos = g.viewProj * vec4<f32>(o.world, 1.0);
    return o;
}

@fragment
fn fs_ground(i: GroundOut) -> @location(0) vec4<f32> {
    let cell = g.misc.z;
    let m = i.world.xz - cell * floor(i.world.xz / cell); // 0..cell, roads at the edges
    let e = min(m, vec2<f32>(cell) - m);                  // distance to the nearest road centre line
    let road = 16.0;
    let onRoadX = e.x < road; // road running along z
    let onRoadZ = e.y < road; // road running along x
    var c = vec3<f32>(0.022, 0.024, 0.045);
    if (onRoadX || onRoadZ) {
        c = vec3<f32>(0.035, 0.035, 0.06);
        // dashed centre lines
        let dashX = step(0.5, fract(i.world.z / 9.0)) * smoothstep(0.55, 0.25, e.x);
        let dashZ = step(0.5, fract(i.world.x / 9.0)) * smoothstep(0.55, 0.25, e.y);
        var line = 0.0;
        if (onRoadX && !onRoadZ) { line = dashX; }
        if (onRoadZ && !onRoadX) { line = dashZ; }
        c += vec3<f32>(1.0, 0.72, 0.2) * line * 0.9;
        // glowing kerbs
        let kerb = max(smoothstep(1.2, 0.0, abs(e.x - road)), smoothstep(1.2, 0.0, abs(e.y - road)));
        c += vec3<f32>(0.08, 0.75, 0.95) * kerb * 0.55;
        // wet sheen
        let n = hash1(floor(i.world.xz * 0.35));
        c += vec3<f32>(0.5, 0.12, 0.4) * n * 0.05;
    } else {
        // pavement around each tower, lit from the windows above
        let pv = floor(i.world.xz / 4.0);
        c += vec3<f32>(0.03, 0.02, 0.05) * hash1(pv);
    }
    return vec4<f32>(applyFog(c, i.world), 1.0);
}

// ---------------------------------------------------------------- buildings

struct BoxOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) world: vec3<f32>,
    @location(1) local: vec3<f32>,
    // per-tower values must not pick up rounding from interpolation: the
    // window pattern hashes them, and a hash turns the last bit into noise
    @location(2) @interpolate(flat) normal: vec3<f32>,
    @location(3) @interpolate(flat) info: vec4<f32>, // height, seed, half width, half depth
};

@vertex
fn vs_building(
    @location(0) p: vec3<f32>,
    @location(1) n: vec3<f32>,
    @location(2) a: vec4<f32>, // centre x, centre z, half width, half depth
    @location(3) b: vec4<f32>, // height, seed, base y, unused
) -> BoxOut {
    let centre = wrapXZ(a.xy);
    let local = vec3<f32>(p.x * a.z, p.y * b.x, p.z * a.w);
    var o: BoxOut;
    o.world = vec3<f32>(centre.x + local.x, b.z + local.y, centre.y + local.z);
    o.local = local;
    o.normal = n;
    o.info = vec4<f32>(b.x, b.y, a.z, a.w);
    o.pos = g.viewProj * vec4<f32>(o.world, 1.0);
    return o;
}

@fragment
fn fs_building(i: BoxOut) -> @location(0) vec4<f32> {
    let height = i.info.x;
    let seed = i.info.y;
    let dist = length(i.world - g.camPos.xyz);
    var c = vec3<f32>(0.030, 0.034, 0.062) + vec3<f32>(0.02, 0.012, 0.03) * fract(seed * 3.7);
    let trim = neon(seed);
    if (i.normal.y > 0.5) {
        // roof: dark, with a lit rim
        let edge = min(i.info.z - abs(i.local.x), i.info.w - abs(i.local.z));
        c += trim * smoothstep(1.6, 0.0, edge) * 0.8;
    } else {
        // walls: a grid of windows, some lit
        var u = i.local.x;
        if (abs(i.normal.x) > 0.5) { u = i.local.z; }
        let side = i.normal.x * 2.0 + i.normal.z;
        let wcell = vec2<f32>(3.2, 4.2);
        let wp = vec2<f32>(u + 400.0, i.local.y) / wcell;
        let id = floor(wp);
        let f = fract(wp);
        let r = hash1(id + vec2<f32>(floor(seed * 89.0), side * 17.0));
        let lit = step(0.52, r);
        let mask = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.80);
        var wcol = vec3<f32>(1.0, 0.82, 0.50);
        if (r > 0.80) { wcol = vec3<f32>(0.45, 0.90, 1.0); }
        if (r > 0.93) { wcol = vec3<f32>(1.0, 0.35, 0.75); }
        let flicker = 0.85 + 0.15 * sin(g.camPos.w * (1.0 + r * 3.0) + r * 40.0);
        // far away the grid is finer than a pixel: blend to its average
        let detail = smoothstep(520.0, 140.0, dist);
        let glow = mix(0.20, lit * mask * flicker, detail);
        c += wcol * glow * (0.55 + 0.45 * r);
        // neon band under the roof line, and a faint one at street level
        let top = smoothstep(2.6, 1.6, height - i.local.y) ;
        c += trim * top * 1.1;
        c += trim * smoothstep(5.0, 0.0, i.local.y) * 0.25;
        // corner pillars read as structure
        let hw = select(i.info.z, i.info.w, abs(i.normal.x) > 0.5);
        c *= 0.75 + 0.25 * smoothstep(0.0, 1.2, hw - abs(u));
    }
    return vec4<f32>(applyFog(c, i.world), 1.0);
}

// ---------------------------------------------------------------- traffic

struct CarOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) world: vec3<f32>,
    @location(1) tint: vec3<f32>,
    @location(2) along: f32,
};

@vertex
fn vs_traffic(
    @location(0) p: vec3<f32>,
    @location(1) n: vec3<f32>,
    @location(2) a: vec4<f32>, // road index, altitude, phase, speed (signed)
    @location(3) b: vec4<f32>, // axis (0 = along x, 1 = along z), lane offset, hue, unused
) -> CarOut {
    let city = g.misc.y;
    let cell = g.misc.z;
    let travel = a.z + g.camPos.w * a.w;
    let s = travel - city * floor(travel / city);
    let fixed = a.x * cell + b.y;
    var centre = vec2<f32>(s, fixed);
    var size = vec3<f32>(3.4, 0.35, 0.9);
    if (b.x > 0.5) {
        centre = vec2<f32>(fixed, s);
        size = vec3<f32>(0.9, 0.35, 3.4);
    }
    centre = wrapXZ(centre);
    let local = vec3<f32>(p.x, p.y * 2.0 - 1.0, p.z) * size;
    var o: CarOut;
    o.world = vec3<f32>(centre.x + local.x, a.y + local.y, centre.y + local.z);
    o.pos = g.viewProj * vec4<f32>(o.world, 1.0);
    // white heads one way, red tails the other
    o.tint = mix(vec3<f32>(1.0, 0.16, 0.20), vec3<f32>(0.75, 0.95, 1.0), step(0.0, a.w));
    if (b.z > 0.8) { o.tint = vec3<f32>(1.0, 0.75, 0.2); }
    o.along = select(p.x, p.z, b.x > 0.5) * sign(a.w);
    return o;
}

@fragment
fn fs_traffic(i: CarOut) -> @location(0) vec4<f32> {
    let c = i.tint * (0.9 + 1.6 * smoothstep(0.2, 1.0, i.along));
    return vec4<f32>(applyFog(c, i.world), 1.0);
}
