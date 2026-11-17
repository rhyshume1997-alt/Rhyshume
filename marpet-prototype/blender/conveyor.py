# Realism test: Marpet belt conveyor, reconstructed from photographs, rendered with Blender Cycles.
#
#   python conveyor.py out.png [--view hero|drive|foot] [--samples 200] [--width 1600]
#   python conveyor.py frames_dir --anim 60 [--samples 28] [--width 864]
#   python conveyor.py out.png --glb model.glb        (also writes a glTF for the browser test)
#
# Needs the `bpy` Python module (pip install bpy). Dimensions are ESTIMATES read from
# IMG_0272.jpg, IMG_0276.jpg, header2.jpg and header7.jpg on marpet.co.uk, not Marpet drawings.
import bpy, bmesh, sys, math, os
from mathutils import Vector

argv = sys.argv[1:]
def opt(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = argv[0]
VIEW = opt('--view', 'hero'); SAMPLES = int(opt('--samples', 64)); RESX = int(opt('--width', 960))
GLB = opt('--glb'); ANIM = int(opt('--anim', 0))
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, '..', 'site', 'assets', 'img', 'logo.jpg')
HDRI = os.path.join(bpy.utils.resource_path('LOCAL'), 'datafiles', 'studiolights', 'world', 'studio.exr')

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
W = 0.60; ZT = 0.95; ZB = 0.74; LEN = 2.2; AX = -0.075; AZ = 0.845; RD = 0.05
GROUPS = {}; CUR = ['static']
def group(name): CUR[0] = name
def track(o): GROUPS.setdefault(CUR[0], []).append(o); return o

# ---------------- materials ----------------
def nodes(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(b.outputs[0], out.inputs[0]); return m, nt, b

def brushed(name, grain=(1.5, 700, 700), rough=0.32, aniso=0.55, rot=0.0, col=(0.60, 0.60, 0.61)):
    """Satin (No.4 style) stainless: metallic 1, roughness varied along the grain, anisotropic highlight."""
    m, nt, b = nodes(name); N = nt.nodes; Lk = nt.links.new
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = 1
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = grain
    Lk(tc.outputs['Object'], mp.inputs[0])
    n1 = N.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.0; n1.inputs['Detail'].default_value = 6; n1.inputs['Roughness'].default_value = 0.65
    Lk(mp.outputs[0], n1.inputs[0])
    n2 = N.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 5.0; n2.inputs['Detail'].default_value = 3   # handling marks
    Lk(tc.outputs['Object'], n2.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.inputs[3].default_value = rough - 0.07; mr.inputs[4].default_value = rough + 0.09
    Lk(n1.outputs[0], mr.inputs[0])
    mr2 = N.new('ShaderNodeMapRange'); mr2.inputs[1].default_value = 0.35; mr2.inputs[2].default_value = 0.75; mr2.inputs[3].default_value = 0.0; mr2.inputs[4].default_value = 0.07
    Lk(n2.outputs[0], mr2.inputs[0])
    add = N.new('ShaderNodeMath'); Lk(mr.outputs[0], add.inputs[0]); Lk(mr2.outputs[0], add.inputs[1])
    Lk(add.outputs[0], b.inputs['Roughness'])
    b.inputs['Anisotropic'].default_value = aniso; b.inputs['Anisotropic Rotation'].default_value = rot
    # random fine scratches lying a few degrees off the grain, as on any handled panel
    mp3 = N.new('ShaderNodeMapping'); mp3.inputs['Scale'].default_value = (grain[0] * 2.5, grain[1] * 0.45, grain[2] * 0.45); mp3.inputs['Rotation'].default_value = (0.05, 0.11, 0.17)
    Lk(tc.outputs['Object'], mp3.inputs[0])
    n3 = N.new('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = 1.0; n3.inputs['Detail'].default_value = 2; Lk(mp3.outputs[0], n3.inputs[0])
    sc_ = N.new('ShaderNodeMapRange'); sc_.inputs[1].default_value = 0.70; sc_.inputs[2].default_value = 0.78; sc_.inputs[3].default_value = 0.0; sc_.inputs[4].default_value = 1.0
    Lk(n3.outputs[0], sc_.inputs[0])
    # fingerprints and wipe marks: soft patches that are slightly rougher
    n4 = N.new('ShaderNodeTexNoise'); n4.inputs['Scale'].default_value = 9.0; n4.inputs['Detail'].default_value = 3; n4.inputs['Distortion'].default_value = 0.4
    Lk(tc.outputs['Object'], n4.inputs[0])
    sm = N.new('ShaderNodeMapRange'); sm.inputs[1].default_value = 0.5; sm.inputs[2].default_value = 0.85; sm.inputs[3].default_value = 0.0; sm.inputs[4].default_value = 0.035
    Lk(n4.outputs[0], sm.inputs[0])
    a2 = N.new('ShaderNodeMath'); Lk(add.outputs[0], a2.inputs[0]); Lk(sm.outputs[0], a2.inputs[1])
    a3 = N.new('ShaderNodeMath'); a3.operation = 'MULTIPLY_ADD'; Lk(sc_.outputs[0], a3.inputs[0]); a3.inputs[1].default_value = 0.10; Lk(a2.outputs[0], a3.inputs[2])
    Lk(a3.outputs[0], b.inputs['Roughness'])
    # a percent or two of tone variation so large panels are not one flat grey
    tv = N.new('ShaderNodeMapRange'); tv.inputs[3].default_value = 0.955; tv.inputs[4].default_value = 1.03; Lk(n2.outputs[0], tv.inputs[0])
    cm = N.new('ShaderNodeVectorMath'); cm.operation = 'SCALE'; cm.inputs[0].default_value = col; Lk(tv.outputs[0], cm.inputs['Scale']); Lk(cm.outputs[0], b.inputs['Base Color'])
    hs = N.new('ShaderNodeMath'); hs.operation = 'MULTIPLY_ADD'; Lk(sc_.outputs[0], hs.inputs[0]); hs.inputs[1].default_value = -0.6; Lk(n1.outputs[0], hs.inputs[2])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.08; bp.inputs['Distance'].default_value = 0.0002
    Lk(hs.outputs[0], bp.inputs['Height']); Lk(bp.outputs[0], b.inputs['Normal'])
    return m

def plain(name, col, rough, metal=0.0, bump=0.0, bscale=300):
    m, nt, b = nodes(name)
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if bump:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = bscale; n.inputs['Detail'].default_value = 4
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.0005
        nt.links.new(n.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[3].default_value = rough - 0.05; mr.inputs[4].default_value = rough + 0.08
        nt.links.new(n.outputs[0], mr.inputs[0]); nt.links.new(mr.outputs[0], b.inputs['Roughness'])
    return m

M_SHEET = brushed('Brushed sheet')                                           # folded side frames
M_TUBE = brushed('Brushed tube', grain=(700, 700, 1.5), rough=0.34, rot=0.25) # legs, grain runs up the tube
M_PLATE = brushed('Plate', rough=0.36, aniso=0.35)                           # laser-cut end plates
M_TURNED = plain('Polished turned', (0.63, 0.63, 0.64), 0.16, 1.0, 0.02, 900) # drums, shafts, feet
M_BOLT = plain('A2 fastener', (0.58, 0.58, 0.59), 0.27, 1.0, 0.03, 1500)
M_THREAD, _nt, _b = nodes('Threaded rod')
_b.inputs['Base Color'].default_value = (0.56, 0.56, 0.57, 1); _b.inputs['Metallic'].default_value = 1; _b.inputs['Roughness'].default_value = 0.3
_tc = _nt.nodes.new('ShaderNodeTexCoord'); _wv = _nt.nodes.new('ShaderNodeTexWave'); _wv.bands_direction = 'Z'; _wv.inputs['Scale'].default_value = 420
_nt.links.new(_tc.outputs['Object'], _wv.inputs[0]); _bp = _nt.nodes.new('ShaderNodeBump'); _bp.inputs['Strength'].default_value = 0.9; _bp.inputs['Distance'].default_value = 0.0006
_nt.links.new(_wv.outputs[0], _bp.inputs['Height']); _nt.links.new(_bp.outputs[0], _b.inputs['Normal'])
M_WELD = plain('TIG weld', (0.55, 0.50, 0.42), 0.46, 1.0, 0.25, 2500)        # slight straw heat tint
M_DARK = plain('Socket shadow', (0.02, 0.02, 0.02), 0.6, 0.5)
M_ORANGE = plain('Bearing housing', (0.78, 0.13, 0.025), 0.33, 0.0, 0.05, 500)  # moulded thermoplastic
M_BELT = plain('PU belt', (0.03, 0.17, 0.62), 0.42, 0.0, 0.12, 1800)
M_FLOOR = plain('Floor', (0.012, 0.015, 0.026), 0.36, 0.0, 0.08, 35)
M_LOGO, nt, b = nodes('Logo plate')
im = nt.nodes.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(LOGO); nt.links.new(im.outputs[0], b.inputs['Base Color'])
b.inputs['Roughness'].default_value = 0.3; b.inputs['Metallic'].default_value = 0.3
b.inputs['Coat Weight'].default_value = 0.6; b.inputs['Coat Roughness'].default_value = 0.08

# ---------------- helpers ----------------
def obj(name, me, mat):
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    if mat: me.materials.append(mat)
    return track(o)
def smooth(o, angle=35):
    for p in o.data.polygons: p.use_smooth = True
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    try: bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception: pass
    o.select_set(False)
def bevel(o, w, seg=3, angle=30):
    m = o.modifiers.new('Bevel', 'BEVEL'); m.width = w; m.segments = seg; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle); return m
def prim(name, fn, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), bev=0.0, **kw):
    fn(location=loc, rotation=rot, **kw); o = bpy.context.active_object; o.name = name; o.scale = scale
    o.data.materials.append(mat)
    if bev: bevel(o, bev)
    smooth(o); return track(o)
cyl = bpy.ops.mesh.primitive_cylinder_add; cube = bpy.ops.mesh.primitive_cube_add; sph = bpy.ops.mesh.primitive_uv_sphere_add
RX = (math.pi / 2, 0, 0)  # cylinder axis along Y

def side_panel(sign):
    """Folded 2 mm sheet: web, top flange with return lip, bottom flange. Radiused bends, slight oil-canning."""
    y0 = sign * W / 2; inn = -sign
    prof = [(y0 + inn * 0.034, ZB)] + [(y0, ZB + (ZT - ZB) * i / 18) for i in range(19)] + [(y0 + inn * 0.042, ZT), (y0 + inn * 0.042, ZT - 0.014)]
    NX = 90; bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap'); grid = []; VJ = {}
    # v runs along the folded profile (not just height), so the flanges and bends get usable UVs and tangents
    ARC = [ZB - 0.034] + [ZB + (ZT - ZB) * i / 18 for i in range(19)] + [ZT + 0.042, ZT + 0.056]
    for i in range(NX + 1):
        x = LEN * i / NX; row = []
        for j, (y, z) in enumerate(prof):
            if 1 < j < 19:
                t = math.sin(math.pi * (j - 1) / 18)
                y += sign * t * (0.00045 * math.sin(x * 7.3 + 0.6) + 0.0003 * math.sin(x * 17.0 + z * 9) + 0.00025 * math.sin(x * 3.1 - 1))
            vv = bm.verts.new((x, y, z)); VJ[vv] = j; row.append(vv)
        grid.append(row)
    for i in range(NX):
        for j in range(len(prof) - 1):
            v = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
            f = bm.faces.new(v if sign < 0 else v[::-1])
            for l in f.loops: l[uv].uv = (l.vert.co.x, ARC[VJ[l.vert]])
    me = bpy.data.meshes.new('panel'); bm.to_mesh(me); bm.free()
    o = obj('Side frame ' + ('near' if sign < 0 else 'far'), me, M_SHEET)
    bevel(o, 0.005, 6, 40)
    s = o.modifiers.new('Solidify', 'SOLIDIFY'); s.thickness = 0.002; s.offset = -1
    smooth(o, 50); return o

def rounded_plate(name, w, h, r, t, mat, loc):
    bm = bmesh.new(); pts = []
    for cx, cz, a0 in [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]:
        for k in range(9):
            a = math.radians(a0 + 90 * k / 8); pts.append(bm.verts.new((cx + r * math.cos(a), 0, cz + r * math.sin(a))))
    bm.faces.new(pts); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = obj(name, me, mat); o.location = loc
    s = o.modifiers.new('Solidify', 'SOLIDIFY'); s.thickness = t; s.offset = 0
    bevel(o, min(0.0012, t / 3), 3, 60); smooth(o, 40); return o

def weld(p0, p1, r=0.0026):
    """TIG fillet bead: a tube whose radius ripples every 3.5 mm."""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; n = max(8, int(d.length / 0.0012)); q = d.to_track_quat('Z', 'Y')
    bm = bmesh.new(); rings = []
    for i in range(n + 1):
        s = i / n; rr = r * (0.86 + 0.2 * abs(math.sin(math.pi * s * d.length / 0.0035))) * (0.35 + 0.65 * min(1, s * n / 4, (1 - s) * n / 4))
        rings.append([bm.verts.new(p0 + d * s + q @ Vector((rr * math.cos(a), rr * math.sin(a), 0))) for a in [k * math.pi / 4 for k in range(8)]])
    for a, b2 in zip(rings, rings[1:]):
        for k in range(8): bm.faces.new((a[k], a[(k + 1) % 8], b2[(k + 1) % 8], b2[k]))
    me = bpy.data.meshes.new('weld'); bm.to_mesh(me); bm.free(); o = obj('Weld bead', me, M_WELD); smooth(o, 80); return o

def hex_bolt(x, y, z, r=0.0075, sign=-1):
    prim('Washer', cyl, M_BOLT, (x, y + sign * 0.0008, z), RX, vertices=40, radius=r * 1.32, depth=0.0016, bev=0.0003)
    prim('Hex head', cyl, M_BOLT, (x, y + sign * 0.0045, z), (math.pi / 2, 0.3 * x * 40, 0), vertices=6, radius=r, depth=0.0058, bev=0.0007)
def button_screw(x, y, z, r=0.0065, sign=-1):
    prim('Button head', sph, M_BOLT, (x, y, z), RX, (1, 1, 0.42), segments=32, ring_count=16, radius=r)
    prim('Socket', cyl, M_DARK, (x, y + sign * r * 0.36, z), (math.pi / 2, 0.5, 0), vertices=6, radius=r * 0.42, depth=0.002)

# ---------------- build ----------------
group('legs')
def leg(x, sign):
    y = sign * (W / 2 - 0.022)
    prim('Leg', cube, M_TUBE, (x, y, 0.415), scale=(0.02, 0.02, 0.325), size=2, bev=0.0035)
    prim('Leg cap', cube, M_PLATE, (x, y, 0.087), scale=(0.02, 0.02, 0.003), size=2, bev=0.001)
    prim('Stud', cyl, M_THREAD, (x, y, 0.05), vertices=24, radius=0.0078, depth=0.075)
    prim('Lock nut', cyl, M_BOLT, (x, y, 0.078), vertices=6, radius=0.0125, depth=0.009, bev=0.001)
    prim('Foot', bpy.ops.mesh.primitive_cone_add, M_TURNED, (x, y, 0.014), vertices=64, radius1=0.04, radius2=0.013, depth=0.016, bev=0.0015)
    prim('Foot base', cyl, M_TURNED, (x, y, 0.003), vertices=64, radius=0.04, depth=0.006, bev=0.0012)
    # fillet welds: leg to underside of the frame, on the two visible faces
    zt = 0.7395; e = 0.0205
    weld((x - e, y + sign * e, zt), (x + e, y + sign * e, zt)); weld((x - e, y - e * sign, zt), (x - e, y + sign * e, zt)); weld((x + e, y - e * sign, zt), (x + e, y + sign * e, zt))
    for d in (-1, 1):   # 4 mm gusset each side of the leg, welded to leg and to the underside of the frame
        bm = bmesh.new(); t = 0.002; x0 = x + d * 0.02; G = 0.07
        vs = [bm.verts.new(v) for v in [(x0, y - t, 0.74), (x0 + d * G, y - t, 0.74), (x0, y - t, 0.74 - G), (x0, y + t, 0.74), (x0 + d * G, y + t, 0.74), (x0, y + t, 0.74 - G)]]
        for f in [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]: bm.faces.new([vs[i] for i in f])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new('gusset'); bm.to_mesh(me); bm.free(); g = obj('Gusset', me, M_PLATE); bevel(g, 0.0006, 2, 40)
        yo = y + sign * (-1) * 0  # bead on the outward face
        weld((x0 + d * 0.004, y + sign * 0.003, 0.7395), (x0 + d * (G - 0.004), y + sign * 0.003, 0.7395), 0.0022)
        weld((x0 + d * 0.0005, y + sign * 0.003, 0.736), (x0 + d * 0.0005, y + sign * 0.003, 0.74 - G + 0.004), 0.0022)
LEGX = (0.45, LEN - 0.45)
for x in LEGX:
    leg(x, -1); leg(x, 1)
    prim('Brace', cube, M_TUBE, (x, 0, 0.24), scale=(0.0125, W / 2 - 0.042, 0.0125), size=2, bev=0.002)
    for s in (-1, 1):   # brace to leg welds
        yb = s * (W / 2 - 0.042)
        weld((x - 0.013, yb, 0.2275), (x - 0.013, yb, 0.2525), 0.0022); weld((x - 0.013, yb, 0.2525), (x + 0.013, yb, 0.2525), 0.0022); weld((x + 0.013, yb, 0.2275), (x + 0.013, yb, 0.2525), 0.0022)

group('frame_near'); side_panel(-1)
yn = -W / 2
for x in (0.34, 0.98, 1.62):
    for z in (0.905, 0.785): button_screw(x, yn - 0.0012, z)
group('frame_far'); side_panel(1)
group('bed'); prim('Slider bed', cube, M_SHEET, (LEN / 2, 0, AZ + RD - 0.004), scale=(LEN / 2 - 0.16, W / 2 - 0.02, 0.001), size=2)

ENDS = [(AX, -1), (LEN - AX, 1)]   # (drum axis x, direction the end plate points)
for i, (ax, _) in enumerate(ENDS):
    group('drum_' + 'ab'[i])
    prim('Drum', cyl, M_TURNED, (ax, 0, AZ), RX, vertices=64, radius=RD, depth=W - 0.03, bev=0.002)
    prim('Shaft', cyl, M_TURNED, (ax, 0, AZ), RX, vertices=48, radius=0.0125, depth=W + 0.03)
group('belt')
def belt():
    bw = W - 0.07; r = RD + 0.0016; path = []
    for k in range(49):
        a = math.radians(90 + 180 * k / 48); path.append((AX + r * math.cos(a), AZ + r * math.sin(a)))
    for k in range(1, 40):   # return run hangs a few millimetres between the drums
        t = k / 40; path.append((AX + (LEN - 2 * AX) * t, AZ - r - 0.007 * math.sin(math.pi * t)))
    for k in range(49):
        a = math.radians(-90 + 180 * k / 48); path.append((LEN - AX + r * math.cos(a), AZ + r * math.sin(a)))
    path.append(path[0]); bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    rows = [(bm.verts.new((x, -bw / 2, z)), bm.verts.new((x, bw / 2, z))) for x, z in path[:-1]]
    dist = [0.0]
    for (x0, z0), (x1, z1) in zip(path, path[1:]): dist.append(dist[-1] + math.hypot(x1 - x0, z1 - z0))
    total = round(dist[-1] / 0.1) * 0.1   # whole number of 100 mm repeats so the texture closes on itself
    for i in range(len(rows)):
        a, b2 = rows[i], rows[(i + 1) % len(rows)]; f = bm.faces.new((a[0], a[1], b2[1], b2[0]))
        u0, u1 = dist[i] / dist[-1] * total / 0.1, dist[i + 1] / dist[-1] * total / 0.1
        for l, uvv in zip(f.loops, [(u0, 0), (u0, 1), (u1, 1), (u1, 0)]): l[uvl].uv = uvv
    me = bpy.data.meshes.new('belt'); bm.to_mesh(me); bm.free(); o = obj('Belt', me, M_BELT)
    s = o.modifiers.new('Solidify', 'SOLIDIFY'); s.thickness = 0.0028; s.offset = 0; bevel(o, 0.0006, 2, 60); smooth(o, 60)
belt()
for ax, d in ENDS:
    for sgn in (-1, 1):
        ys = sgn * W / 2
        group('endplates' if sgn < 0 else 'endplates_far')
        rounded_plate('End plate', 0.30, 0.17, 0.022, 0.006, M_PLATE, (ax - d * 0.06, ys + sgn * 0.0045, AZ))
        group('bolts' if sgn < 0 else 'endplates_far')
        for dx, dz in [(0.185, 0.06), (0.185, -0.06), (0.09, 0.06), (0.09, -0.06)]: hex_bolt(ax - d * dx, ys + sgn * 0.0075, AZ + dz, sign=sgn)
        group('bearings' if sgn < 0 else 'endplates_far')
        rounded_plate('Bearing flange', 0.076, 0.146, 0.036, 0.011, M_ORANGE, (ax, ys + sgn * 0.013, AZ))
        prim('Bearing housing', cyl, M_ORANGE, (ax, ys + sgn * 0.030, AZ), RX, vertices=48, radius=0.0355, depth=0.030, bev=0.005)
        prim('Housing cap', cyl, M_ORANGE, (ax, ys + sgn * 0.047, AZ), RX, vertices=48, radius=0.027, depth=0.006, bev=0.002)
        group('bolts' if sgn < 0 else 'endplates_far')
        for dz in (0.056, -0.056): hex_bolt(ax, ys + sgn * 0.0185, AZ + dz, 0.0068, sign=sgn)
        group('takeup' if sgn < 0 else 'endplates_far')
        xb = ax - d * 0.262; yb = ys + sgn * 0.008; RY = (0, math.pi / 2, 0)
        prim('Take-up block', cube, M_PLATE, (xb, yb, AZ), scale=(0.011, 0.007, 0.016), size=2, bev=0.001)
        weld((xb - 0.011, ys + sgn * 0.0015, AZ + 0.0165), (xb + 0.011, ys + sgn * 0.0015, AZ + 0.0165), 0.002)
        weld((xb - 0.011, ys + sgn * 0.0015, AZ - 0.0165), (xb + 0.011, ys + sgn * 0.0015, AZ - 0.0165), 0.002)
        prim('Take-up rod', cyl, M_THREAD, (xb + d * 0.022, yb, AZ), RY, vertices=24, radius=0.005, depth=0.075)
        for off in (0.0155, -0.0155): prim('Take-up nut', cyl, M_BOLT, (xb + d * off, yb, AZ), (0.4, math.pi / 2, 0), vertices=6, radius=0.0088, depth=0.007, bev=0.0008)
group('logo')
bpy.ops.mesh.primitive_plane_add(size=1, location=(0.66, yn - 0.0022, AZ), rotation=(math.pi / 2, 0, 0)); lp = track(bpy.context.active_object)
lp.name = 'Logo plate'; lp.scale = (0.17, 0.17 * 107 / 293, 1); lp.data.materials.append(M_LOGO)
s = lp.modifiers.new('Solidify', 'SOLIDIFY'); s.thickness = 0.0015
for dx in (-0.079, 0.079):
    for dz in (-0.025, 0.025): prim('Rivet', sph, M_BOLT, (0.66 + dx, yn - 0.003, AZ + dz), RX, (1, 1, 0.5), segments=20, ring_count=10, radius=0.0028)

def finalize():
    """One mesh per assembly group: fewer draw calls in the browser and one bake per group."""
    for name, objs in list(GROUPS.items()):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.convert(target='MESH')
        if len(objs) > 1: bpy.ops.object.join()
        j = bpy.context.view_layer.objects.active; j.name = name; j.data.name = name
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        GROUPS[name] = [j]
finalize()

if '--bake' in argv:   # ambient occlusion into vertex colours: crevices, under the frame, behind plates
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 160; sc.render.bake.target = 'VERTEX_COLORS'
    for name, (o,) in GROUPS.items():
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        ca = o.data.color_attributes.new('AO', 'BYTE_COLOR', 'CORNER'); o.data.color_attributes.active_color = ca; o.data.color_attributes.render_color_index = 0
        bpy.ops.object.bake(type='AO')
        # keep the occlusion gentle: fully enclosed parts (studs, shafts) must not go black
        n = len(ca.data); buf = [0.0] * (n * 4); ca.data.foreach_get('color', buf)
        for i in range(0, n * 4, 4):
            v = 0.42 + 0.58 * buf[i]; buf[i] = buf[i + 1] = buf[i + 2] = v
        ca.data.foreach_set('color', buf)
        print('baked', name, len(o.data.polygons))

if GLB:
    kw = dict(filepath=GLB, export_format='GLB', export_yup=True, export_materials='EXPORT', export_extras=True)
    try: bpy.ops.export_scene.gltf(**kw, export_vertex_color='ACTIVE', export_all_vertex_colors=True)
    except TypeError: bpy.ops.export_scene.gltf(**kw)
    print('GLB', sum(len(o.data.polygons) for (o,) in GROUPS.values()), 'faces')

# ---------------- stage ----------------
group('static')
prim('Floor', bpy.ops.mesh.primitive_plane_add, M_FLOOR, (0, 0, 0), size=40)
# HDRI for reflections and ambient light; the camera sees plain dark navy instead of the HDRI itself
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; wn = w.node_tree; wn.nodes.clear()
env = wn.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(HDRI)
bg1 = wn.nodes.new('ShaderNodeBackground'); bg1.inputs[1].default_value = 0.2; wn.links.new(env.outputs[0], bg1.inputs[0])
bg2 = wn.nodes.new('ShaderNodeBackground'); bg2.inputs[0].default_value = (0.004, 0.006, 0.014, 1)
lp_ = wn.nodes.new('ShaderNodeLightPath'); mix = wn.nodes.new('ShaderNodeMixShader'); wo = wn.nodes.new('ShaderNodeOutputWorld')
wn.links.new(lp_.outputs['Is Camera Ray'], mix.inputs[0]); wn.links.new(bg1.outputs[0], mix.inputs[1]); wn.links.new(bg2.outputs[0], mix.inputs[2]); wn.links.new(mix.outputs[0], wo.inputs[0])

def area(name, loc, target, size, power, sy=None, col=(1, 1, 1)):
    l = bpy.data.lights.new(name, 'AREA'); l.energy = power; l.color = col; l.size = size
    if sy: l.shape = 'RECTANGLE'; l.size_y = sy
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o
T = (LEN / 2, -0.3, 0.8)
area('Key softbox', (-1.4, -3.2, 2.9), T, 2.4, 120, 1.6)
area('Overhead', (LEN / 2, -0.2, 3.4), (LEN / 2, -0.2, 0), 3.4, 110, 1.2)
for i, x in enumerate((-2.4, -0.8, 0.8, 2.4, 4.0)):   # tall strips: the vertical light bands seen on the side panel in IMG_0272
    area(f'Strip {i}', (x, -4.6, 1.5), (x * 0.5 + 0.5, 0, 0.9), 0.28, 36, 2.8)
area('Rim', (LEN + 1.6, 2.6, 1.9), T, 1.6, 120, 1.0, (0.75, 0.84, 1.0))
area('Low fill', (-3.0, -1.4, 0.5), T, 1.4, 14, 0.8, (0.8, 0.86, 1.0))

cam = bpy.data.cameras.new('Cam'); co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); sc.camera = co
VIEWS = {
    'hero': ((-1.45, -2.6, 1.38), (0.95, -0.2, 0.56), (0.3, -0.3, 0.85), 50, 9),
    'drive': ((-0.62, -0.98, 1.0), (0.13, -0.3, 0.8), (AX, -0.3, AZ), 58, 11),
    'foot': ((-0.1, -0.95, 0.2), (0.43, -0.28, 0.13), (0.45, -0.28, 0.06), 70, 11),
    'weld': ((0.02, -0.92, 0.6), (0.44, -0.28, 0.72), (0.45, -0.28, 0.74), 85, 11),
    'takeup': ((-0.5, -0.8, 0.98), (0.1, -0.3, 0.84), (0.19, -0.3, 0.845), 80, 11),
}
loc, aim, focus, cam.lens, fstop = VIEWS[VIEW]
co.location = loc
co.rotation_euler = (Vector(aim) - co.location).to_track_quat('-Z', 'Y').to_euler()
cam.dof.use_dof = True; cam.dof.aperture_fstop = fstop; cam.dof.focus_distance = (Vector(focus) - co.location).length

sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
sc.render.resolution_x = RESX; sc.render.resolution_y = int(RESX * 0.625)
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.render.image_settings.file_format = 'PNG'

if ANIM:
    # Assembly test. Each group travels in from an offset and decelerates into place.
    plan = [  # group, offset (x, y, z), start frame, end frame as fractions of the shot
        ('frame_near', (0, 0, 0.55), 0.00, 0.36), ('frame_far', (0, 0, 0.55), 0.08, 0.44), ('bed', (0, 0, 0.7), 0.16, 0.46),
        ('drum_a', (0, 0.9, 0), 0.30, 0.56), ('drum_b', (0, 0.9, 0), 0.34, 0.60), ('belt', (0, 0, 0.5), 0.40, 0.66), ('endplates_far', (0, 0.3, 0), 0.50, 0.72),
        ('endplates', (0, -0.3, 0), 0.50, 0.72), ('bearings', (0, -0.34, 0), 0.58, 0.80), ('takeup', (0, -0.22, 0), 0.64, 0.84), ('bolts', (0, -0.14, 0), 0.72, 0.90), ('logo', (0, -0.2, 0.05), 0.76, 0.92),
    ]
    sc.frame_start = 1; sc.frame_end = ANIM; sc.render.fps = 24
    for g, off, a, b_ in plan:
        f0 = 1 + round(a * (ANIM - 1)); f1 = 1 + round(b_ * (ANIM - 1))
        for o in GROUPS.get(g, []):
            end = o.location.copy()
            o.location = end + Vector(off); o.keyframe_insert('location', frame=f0)
            o.location = end; o.keyframe_insert('location', frame=f1)
            o.hide_render = True; o.keyframe_insert('hide_render', frame=max(1, f0 - 1))
            o.hide_render = False; o.keyframe_insert('hide_render', frame=f0)
    # camera: starts low and close on the drive end, rises and pulls back to the hero composition
    tgt = bpy.data.objects.new('Aim', None); sc.collection.objects.link(tgt)
    con = co.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    cam.dof.focus_object = tgt
    keys = [(0.0, (-0.95, -1.45, 0.78), (0.35, -0.3, 0.8)), (0.45, (-1.2, -1.95, 1.05), (0.6, -0.25, 0.72)), (1.0, loc, aim)]
    for t, cl, al in keys:
        f = 1 + round(t * (ANIM - 1))
        co.location = cl; co.keyframe_insert('location', frame=f); tgt.location = al; tgt.keyframe_insert('location', frame=f)
    os.makedirs(OUT, exist_ok=True)
    sc.render.filepath = os.path.join(OUT, 'f_')
    bpy.ops.render.render(animation=True)
else:
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
