// A textured quad: billboards in the world, and the screens and windshield
// display in the cockpit. The texture is a live Rive artboard.

struct QuadU {
    mvp: mat4x4<f32>,
    params: vec4<f32>, // x = brightness, y = fog amount 0..1, z = scanline strength, w = time
    fog: vec4<f32>,    // rgb fog colour
};
@group(0) @binding(0) var<uniform> q: QuadU;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

struct QOut {
    @builtin(position) pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_quad(@location(0) p: vec3<f32>, @location(1) uv: vec2<f32>) -> QOut {
    var o: QOut;
    o.pos = q.mvp * vec4<f32>(p, 1.0);
    o.uv = uv;
    return o;
}

fn shade(uv: vec2<f32>) -> vec4<f32> {
    let t = textureSample(tex, samp, uv);
    let scan = 1.0 - q.params.z * (0.5 + 0.5 * sin(uv.y * 520.0 + q.params.w * 6.0));
    return vec4<f32>(t.rgb * q.params.x * scan, t.a);
}

// Opaque panel: a sign or a dashboard screen.
@fragment
fn fs_panel(i: QOut) -> @location(0) vec4<f32> {
    let c = shade(i.uv);
    return vec4<f32>(mix(c.rgb, q.fog.rgb, q.params.y), 1.0);
}

// Light projected on glass: added to whatever is behind it.
@fragment
fn fs_glass(i: QOut) -> @location(0) vec4<f32> {
    let c = shade(i.uv);
    // fade the edges so the projection has no hard border
    let e = smoothstep(0.0, 0.06, i.uv.x) * smoothstep(1.0, 0.94, i.uv.x);
    return vec4<f32>(c.rgb * e, 1.0);
}
