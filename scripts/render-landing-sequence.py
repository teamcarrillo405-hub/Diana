# Diana — "The Anatomy of Focus" frame sequence.
# Headless Blender script: builds a stylized schematic laptop (Diana OS
# aesthetic — dark field, violet/teal emission edges), keyframes its
# disassembly per the storyboard, renders 160 frames with EEVEE.
#
# Run:  blender --background --python scripts/render-landing-sequence.py
# Out:  public/landing-3d/frame_####.png  (webp conversion happens in Node)

import bpy
import math
import os

# ---------------------------------------------------------------- constants
FRAMES = 160
RES_X, RES_Y = 1280, 800
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "landing-3d")

VIOLET = (0.486, 0.227, 0.929, 1.0)   # 7c3aed
VIOLET_LIGHT = (0.655, 0.545, 0.980, 1.0)  # a78bfa
TEAL = (0.176, 0.831, 0.749, 1.0)     # 2dd4bf
DARK = (0.012, 0.027, 0.071, 1.0)     # 030712
PANEL = (0.024, 0.055, 0.122, 1.0)    # 0d1f33-ish

# storyboard beats (frame numbers out of 160)
F_LID_OPEN = (12, 30)      # lid opens
F_CHASSIS = (30, 46)       # chassis top lifts away
F_CPU = (34, 52)           # cpu rises
F_RAM = (52, 72)           # ram fans out
F_SSD = (72, 92)           # ssd slides out
F_KEYS = (92, 112)         # keyboard floats apart
F_BATT = (112, 130)        # battery forward
F_REASM = (132, 152)       # everything returns
F_CLOSE = (152, 160)       # lid closes, camera dives


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def emission_mat(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = color
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def body_mat(name, color, edge_color, edge_strength=6.0):
    """Dark body with fresnel-driven glowing edges — the schematic look."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    mix = nt.nodes.new("ShaderNodeMixShader")
    base = nt.nodes.new("ShaderNodeBsdfPrincipled")
    base.inputs["Base Color"].default_value = color
    base.inputs["Roughness"].default_value = 0.35
    base.inputs["Metallic"].default_value = 0.6
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = edge_color
    em.inputs["Strength"].default_value = edge_strength
    fres = nt.nodes.new("ShaderNodeFresnel")
    fres.inputs["IOR"].default_value = 1.6
    nt.links.new(fres.outputs[0], mix.inputs[0])
    nt.links.new(base.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    return m


def cube(name, size, location, mat, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = bevel
    mod.segments = 3
    obj.data.materials.append(mat)
    return obj


def key_at(obj, frame, location=None, rotation=None):
    bpy.context.scene.frame_set(frame)
    if location is not None:
        obj.location = location
        obj.keyframe_insert("location")
    if rotation is not None:
        obj.rotation_euler = rotation
        obj.keyframe_insert("rotation_euler")


def smooth_keys(obj):
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.easing = "EASE_IN_OUT"


def build():
    clean_scene()
    scn = bpy.context.scene
    scn.frame_start = 1
    scn.frame_end = FRAMES

    # world: near-black with the faintest violet
    world = bpy.data.worlds["World"] if "World" in bpy.data.worlds else bpy.data.worlds.new("World")
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.004, 0.006, 0.016, 1.0)
    bg.inputs[1].default_value = 1.0

    m_body = body_mat("body", DARK, VIOLET, 3.5)
    m_panel = body_mat("panel", PANEL, VIOLET_LIGHT, 2.0)
    m_screen = emission_mat("screen", (0.07, 0.05, 0.18, 1.0), 2.2)
    m_violet = emission_mat("violet", VIOLET_LIGHT, 5.0)
    m_teal = emission_mat("teal", TEAL, 5.0)
    m_grid = emission_mat("gridline", (0.30, 0.16, 0.55, 1.0), 0.8)

    # floor grid — thin glowing lines on the dark plane
    for i in range(-8, 9):
        cube(f"gx{i}", (0.012, 16, 0.004), (i * 1.0, 0, -1.02), m_grid, bevel=0)
        cube(f"gy{i}", (16, 0.012, 0.004), (0, i * 1.0, -1.02), m_grid, bevel=0)

    # ------- laptop base (keyboard deck)
    base = cube("base", (3.0, 2.0, 0.12), (0, 0, 0), m_body, 0.05)

    # ------- lid + screen (pivot at the hinge)
    bpy.ops.object.empty_add(location=(0, 1.0, 0.06))
    hinge = bpy.context.active_object
    hinge.name = "hinge"
    lid = cube("lid", (3.0, 2.0, 0.08), (0, -1.0, 0.0), m_body, 0.05)
    screen = cube("screenface", (2.7, 1.7, 0.02), (0, -1.0, -0.06), m_screen, 0.01)
    lid.parent = hinge
    screen.parent = hinge
    # closed: lid lies flat on base (hinge rot 0); open: rotate -100 deg around X
    key_at(hinge, 1, rotation=(0, 0, 0))
    key_at(hinge, F_LID_OPEN[0], rotation=(0, 0, 0))
    key_at(hinge, F_LID_OPEN[1], rotation=(math.radians(-100), 0, 0))
    key_at(hinge, F_REASM[1], rotation=(math.radians(-100), 0, 0))
    key_at(hinge, F_CLOSE[1], rotation=(math.radians(-15), 0, 0))
    smooth_keys(hinge)

    # ------- chassis top plate (lifts away to reveal internals)
    plate = cube("plate", (2.9, 1.9, 0.03), (0, 0, 0.09), m_panel, 0.03)
    key_at(plate, F_CHASSIS[0], location=(0, 0, 0.09))
    key_at(plate, F_CHASSIS[1], location=(0, -0.6, 2.4))
    key_at(plate, F_REASM[0], location=(0, -0.6, 2.4))
    key_at(plate, F_REASM[1], location=(0, 0, 0.09))
    smooth_keys(plate)

    # ------- CPU (violet, rises center) + traces
    cpu = cube("cpu", (0.55, 0.55, 0.08), (0, 0.25, 0.04), m_violet, 0.02)
    key_at(cpu, F_CPU[0], location=(0, 0.25, 0.04))
    key_at(cpu, F_CPU[1], location=(0, 0.25, 1.5))
    key_at(cpu, F_REASM[0], location=(0, 0.25, 1.5))
    key_at(cpu, F_REASM[1], location=(0, 0.25, 0.04))
    smooth_keys(cpu)

    # ------- RAM sticks (teal, fan out right)
    for i in range(3):
        ram = cube(f"ram{i}", (0.18, 1.1, 0.05), (0.8 + i * 0.28, 0.2, 0.03), m_teal, 0.01)
        key_at(ram, F_RAM[0], location=(0.8 + i * 0.28, 0.2, 0.03))
        key_at(ram, F_RAM[1], location=(1.4 + i * 0.55, 0.2, 0.9 + i * 0.35))
        key_at(ram, F_REASM[0], location=(1.4 + i * 0.55, 0.2, 0.9 + i * 0.35))
        key_at(ram, F_REASM[1], location=(0.8 + i * 0.28, 0.2, 0.03))
        smooth_keys(ram)

    # ------- SSD (violet-light, slides left)
    ssd = cube("ssd", (1.1, 0.5, 0.05), (-1.0, 0.3, 0.03), m_violet, 0.01)
    key_at(ssd, F_SSD[0], location=(-1.0, 0.3, 0.03))
    key_at(ssd, F_SSD[1], location=(-2.3, 0.3, 1.1))
    key_at(ssd, F_REASM[0], location=(-2.3, 0.3, 1.1))
    key_at(ssd, F_REASM[1], location=(-1.0, 0.3, 0.03))
    smooth_keys(ssd)

    # ------- keyboard keys (grid of small cubes; float up in a wave)
    keys = []
    for r in range(4):
        for c in range(10):
            k = cube(
                f"key{r}_{c}",
                (0.16, 0.16, 0.03),
                (-1.1 + c * 0.245, -0.85 + r * 0.245, 0.12),
                m_panel,
                0.01,
            )
            keys.append((k, r, c))
    # one spark key in teal
    spark_key = cube("sparkkey", (0.16, 0.16, 0.03), (-1.1 + 4 * 0.245, -0.85 + 1 * 0.245, 0.121), m_teal, 0.01)
    keys.append((spark_key, 1, 4))
    for k, r, c in keys:
        start = F_KEYS[0] + (r * 10 + c) % 8
        key_at(k, start, location=tuple(k.location))
        key_at(k, F_KEYS[1], location=(k.location.x * 1.5, k.location.y * 1.5, 0.9 + 0.5 * math.sin(r + c)))
        key_at(k, F_REASM[0], location=(k.location.x, k.location.y, k.location.z))
        # restore original
        bpy.context.scene.frame_set(F_REASM[1])
        k.location = (-1.1 + c * 0.245, -0.85 + r * 0.245, 0.12 if k.name != "sparkkey" else 0.121)
        k.keyframe_insert("location")
        smooth_keys(k)

    # ------- battery (wide slab, slides forward, slow pulse via scale)
    batt = cube("batt", (2.2, 0.5, 0.07), (0, -0.55, 0.03), m_teal, 0.02)
    key_at(batt, F_BATT[0], location=(0, -0.55, 0.03))
    key_at(batt, F_BATT[1], location=(0, -1.7, 0.9))
    key_at(batt, F_REASM[0], location=(0, -1.7, 0.9))
    key_at(batt, F_REASM[1], location=(0, -0.55, 0.03))
    smooth_keys(batt)

    # ------- camera: slow orbit + push-in at the end
    bpy.ops.object.camera_add(location=(0, -7.5, 3.2), rotation=(math.radians(68), 0, 0))
    cam = bpy.context.active_object
    scn.camera = cam
    key_at(cam, 1, location=(0, -7.5, 3.2), rotation=(math.radians(68), 0, 0))
    key_at(cam, 80, location=(2.4, -6.8, 3.8), rotation=(math.radians(64), 0, math.radians(18)))
    key_at(cam, F_REASM[1], location=(-1.6, -7.0, 3.4), rotation=(math.radians(66), 0, math.radians(-12)))
    key_at(cam, FRAMES, location=(0, -3.4, 1.6), rotation=(math.radians(72), 0, 0))
    smooth_keys(cam)

    # key light (soft violet) + rim (teal)
    bpy.ops.object.light_add(type="AREA", location=(3, -4, 6))
    keyl = bpy.context.active_object
    keyl.data.energy = 400
    keyl.data.color = (0.7, 0.55, 1.0)
    keyl.data.size = 6
    bpy.ops.object.light_add(type="AREA", location=(-4, 3, 4))
    rim = bpy.context.active_object
    rim.data.energy = 200
    rim.data.color = (0.3, 0.9, 0.85)
    rim.data.size = 5


def render():
    scn = bpy.context.scene
    # EEVEE name differs across Blender versions
    try:
        scn.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scn.render.engine = "BLENDER_EEVEE"
    if hasattr(scn.eevee, "use_bloom"):
        scn.eevee.use_bloom = True
        scn.eevee.bloom_intensity = 0.08
    scn.render.resolution_x = RES_X
    scn.render.resolution_y = RES_Y
    scn.render.film_transparent = False
    scn.render.image_settings.file_format = "PNG"
    os.makedirs(OUT_DIR, exist_ok=True)
    scn.render.filepath = os.path.join(OUT_DIR, "frame_")
    bpy.ops.render.render(animation=True)


build()
render()
print("DONE rendering", FRAMES, "frames to", OUT_DIR)
