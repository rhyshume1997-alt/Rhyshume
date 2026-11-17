# Realism test: one navigation plate, path traced, straight-on, transparent background.
# The PNG is used as a CSS 9-slice (border-image) so one render fits any plate size.
# Run: python plate.py <out.png> [samples]
import bpy, bmesh, sys, math
OUT = sys.argv[1]; SAMPLES = int(sys.argv[2]) if len(sys.argv) > 2 else 96
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
PW, PH, T, R = 0.60, 0.11, 0.004, 0.005

m = bpy.data.materials.new('Brushed 304'); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']; N = nt.nodes; Lk = nt.links.new
b.inputs['Base Color'].default_value = (0.62, 0.62, 0.63, 1); b.inputs['Metallic'].default_value = 1
tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.2, 900, 900); Lk(tc.outputs['Object'], mp.inputs[0])
n1 = N.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1; n1.inputs['Detail'].default_value = 7; n1.inputs['Roughness'].default_value = 0.7; Lk(mp.outputs[0], n1.inputs[0])
n2 = N.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 9; n2.inputs['Detail'].default_value = 3; Lk(tc.outputs['Object'], n2.inputs[0])
mr = N.new('ShaderNodeMapRange'); mr.inputs[3].default_value = 0.17; mr.inputs[4].default_value = 0.46; Lk(n1.outputs[0], mr.inputs[0])
mr2 = N.new('ShaderNodeMapRange'); mr2.inputs[1].default_value = 0.4; mr2.inputs[2].default_value = 0.8; mr2.inputs[3].default_value = 0; mr2.inputs[4].default_value = 0.06; Lk(n2.outputs[0], mr2.inputs[0])
ad = N.new('ShaderNodeMath'); Lk(mr.outputs[0], ad.inputs[0]); Lk(mr2.outputs[0], ad.inputs[1]); Lk(ad.outputs[0], b.inputs['Roughness'])
b.inputs['Anisotropic'].default_value = 0.6
bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.3; bp.inputs['Distance'].default_value = 0.0002; Lk(n1.outputs[0], bp.inputs['Height']); Lk(bp.outputs[0], b.inputs['Normal'])
fm = bpy.data.materials.new('A2 screw'); fm.use_nodes = True; fb = fm.node_tree.nodes['Principled BSDF']
fb.inputs['Base Color'].default_value = (0.6, 0.6, 0.61, 1); fb.inputs['Metallic'].default_value = 1; fb.inputs['Roughness'].default_value = 0.22
dm = bpy.data.materials.new('Recess'); dm.use_nodes = True; db = dm.node_tree.nodes['Principled BSDF']
db.inputs['Base Color'].default_value = (0.03, 0.03, 0.03, 1); db.inputs['Metallic'].default_value = 0.8; db.inputs['Roughness'].default_value = 0.5

# plate with rounded corners; face is a grid so it can carry slight oil-canning
bm = bmesh.new(); NX, NY = 120, 24; g = []
def inside(x, y):
    ax, ay = abs(x) - (PW / 2 - R), abs(y) - (PH / 2 - R)
    return not (ax > 0 and ay > 0 and ax * ax + ay * ay > R * R)
for i in range(NX + 1):
    row = []
    for j in range(NY + 1):
        x = -PW / 2 + PW * i / NX; y = -PH / 2 + PH * j / NY
        ax, ay = abs(x) - (PW / 2 - R), abs(y) - (PH / 2 - R)
        if ax > 0 and ay > 0:  # pull corner verts onto the radius
            d = math.hypot(ax, ay); k = min(1, R / d) if d else 1
            x = math.copysign(PW / 2 - R + ax * k, x); y = math.copysign(PH / 2 - R + ay * k, y)
        z = 0.00018 * math.sin(x * 21 + 1) * math.cos(y * 30) + 0.00012 * math.sin(x * 9 - y * 40)
        row.append(bm.verts.new((x, y, z)))
    g.append(row)
for i in range(NX):
    for j in range(NY): bm.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
me = bpy.data.meshes.new('plate'); bm.to_mesh(me); bm.free()
pl = bpy.data.objects.new('Plate', me); sc.collection.objects.link(pl); me.materials.append(m)
s = pl.modifiers.new('S', 'SOLIDIFY'); s.thickness = T; s.offset = -1
bv = pl.modifiers.new('B', 'BEVEL'); bv.width = 0.0011; bv.segments = 4; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50)
for p in me.polygons: p.use_smooth = True
bpy.context.view_layer.objects.active = pl; pl.select_set(True); bpy.ops.object.shade_auto_smooth(angle=math.radians(40)); pl.select_set(False)

def add(fn, mat, loc, rot=(0, 0, 0), scale=(1, 1, 1), **kw):
    fn(location=loc, rotation=rot, **kw); o = bpy.context.active_object; o.scale = scale; o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o
for sx in (-1, 1):
    for sy in (-1, 1):
        x, y = sx * (PW / 2 - 0.0135), sy * (PH / 2 - 0.0135)
        add(bpy.ops.mesh.primitive_cylinder_add, dm, (x, y, 0.0002), vertices=48, radius=0.0062, depth=0.0006)          # countersink shadow ring
        add(bpy.ops.mesh.primitive_uv_sphere_add, fm, (x, y, 0.0004), scale=(1, 1, 0.34), segments=40, ring_count=20, radius=0.0052)
        add(bpy.ops.mesh.primitive_cylinder_add, dm, (x, y, 0.0017), rot=(0, 0, 0.4 + sx * 0.5 + sy * 0.9), vertices=6, radius=0.0023, depth=0.0016)

def card(loc, sx, sy, strength, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot); o = bpy.context.active_object; o.scale = (sx, sy, 1)
    em = bpy.data.materials.new('E'); em.use_nodes = True; nt = em.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs[1].default_value = strength; out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], out.inputs[0])
    o.data.materials.append(em); o.visible_camera = False; return o
# What the plate reflects is what stops it looking flat: long cards of different brightness with dark
# gaps between, like ceiling lights. A straight-on orthographic view reflects one spot everywhere, so the
# camera is a long lens instead and each part of the plate sees a different part of the ceiling.
for x, wd, st in [(-1.05, 0.30, 7.0), (-0.62, 0.34, 0.8), (-0.2, 0.22, 4.6), (0.12, 0.10, 10.0), (0.45, 0.42, 0.6), (0.95, 0.26, 5.6)]:
    card((x, 0, 4.0), wd, 6, st)
card((0, 2.2, 0.9), 4, 0.7, 5.0, (math.radians(70), 0, 0))     # lights the top chamfer
card((-2.4, 0, 0.8), 0.7, 2, 2.5, (0, math.radians(70), 0))    # left chamfer
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.056, 0.066, 1)

cam = bpy.data.cameras.new('C'); cam.lens = 200; cam.sensor_width = 36
co = bpy.data.objects.new('C', cam); sc.collection.objects.link(co); sc.camera = co; co.location = (0, 0, (PW + 0.004) / 2 / (18 / 200))
sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True; sc.render.film_transparent = True
sc.render.resolution_x = 1812; sc.render.resolution_y = round(1812 * (PH + 0.004) / (PW + 0.004))
sc.view_settings.view_transform = 'AgX'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
