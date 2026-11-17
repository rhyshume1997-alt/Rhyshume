// The hovercar's interior, drawn in the camera's own space.

struct CockpitU {
    proj: mat4x4<f32>,
    params: vec4<f32>, // x = time, y = boost 0..1, z = warning 0..1
};
@group(0) @binding(0) var<uniform> c: CockpitU;

struct COut {
    @builtin(position) pos: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) view: vec3<f32>,
};

@vertex
fn vs_cockpit(@location(0) p: vec3<f32>, @location(1) color: vec4<f32>) -> COut {
    var o: COut;
    o.pos = c.proj * vec4<f32>(p, 1.0);
    o.color = color;
    o.view = p;
    return o;
}

@fragment
fn fs_cockpit(i: COut) -> @location(0) vec4<f32> {
    // alpha carries how much a surface glows: 0 = matte trim, 1 = light strip
    let glow = i.color.a;
    var matte = i.color.rgb * (0.55 + 0.45 * smoothstep(-0.5, 0.3, i.view.y));
    // the city's light washing over the dash
    matte += vec3<f32>(0.05, 0.015, 0.06) * (0.5 + 0.5 * sin(i.view.x * 3.0 + c.params.x * 0.7));
    let pulse = 0.8 + 0.2 * sin(c.params.x * 3.0);
    var strip = i.color.rgb * (1.2 + c.params.y * 1.2) * pulse;
    strip = mix(strip, vec3<f32>(1.0, 0.15, 0.1) * 1.6, c.params.z * (0.5 + 0.5 * sin(c.params.x * 14.0)));
    return vec4<f32>(mix(matte, strip, glow), 1.0);
}
