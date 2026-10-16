"""
Prepare the Khronos "Car Concept" model for VOLT. Edits an unpacked .gltf folder in place.

  1. Removes third-party logos (Khronos + 3D Commerce) from the textures, including the ones
     embossed into the tire sidewall's bump texture, and adds a "VOLT" plate.
  2. Replaces the petrol-style dashboard ("fuel / engine RPM") with a VOLT EV display.
  3. Gives parts clear names. The configurator and the scroll story find parts by these
     names (lib/carMaterials.ts, components/three/carModel.ts):
       materials: Body Paint, Contrast Paint, Glass, Headlight, Tail Light, Turn Signal,
                  Rim Face, Rim Inner, Caliper, Interior Accent, Dashboard Screen, Window Trim…
       nodes:     DoorL, DoorR, FrontLid, RearLid (their origins sit exactly on the hinges)
  4. Gives the window gaskets their own "Window Trim" material (they shared one with the
     interior), so the trim selector can recolor just them.
  5. Drops the model's built-in color variants (KHR_materials_variants): unused here.

Usage (see README "Reproducing the model file"):
  python3 scripts/prepare-model.py unpacked        # folder containing car.gltf + its images
"""
import copy
import json
import sys

from PIL import Image, ImageDraw, ImageFont, ImageStat

d = sys.argv[1]
g = json.load(open(f"{d}/car.gltf"))
images = g["images"]


def image_path(name_start):
    """The unpacked file name of an image (gltf-transform names them baseColor_1.png, emissive_2.png…)."""
    return f"{d}/" + next(im["uri"] for im in images if im["uri"].startswith(name_start))


def font(size):
    for path in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


# ── 1. Logos ──────────────────────────────────────────────────────────────────────
# Khronos banner, used as a glow texture on rims/brakes/emblem and as the plate → pure black.
Image.new("RGB", (512, 128), (0, 0, 0)).save(image_path("emissive_1"))
# Tire sidewall: logos on flat rubber → flat rubber only.
tire = Image.open(image_path("baseColor_2")).convert("RGB")
rubber = tuple(int(c) for c in ImageStat.Stat(tire.crop((300, 0, 700, 300))).median)
Image.new("RGB", tire.size, rubber).save(image_path("baseColor_2"))
# Tire sidewall BUMP texture (normal map): the same two logos are embossed into it,
# which would still show as raised lettering. Paint those areas "flat" (128,128,255 is
# the color of a flat surface in a normal map). The generic tire markings stay.
tire_material = next(m for m in g["materials"] if m.get("name") == "Tireside")
normal_uri = images[g["textures"][tire_material["normalTexture"]["index"]]["source"]]["uri"]
bump = Image.open(f"{d}/{normal_uri}").convert("RGB")
assert bump.size == (1024, 1024), bump.size  # the boxes below are in 1024×1024 pixels
flat = ImageDraw.Draw(bump)
flat.rectangle((14, 360, 72, 645), fill=(128, 128, 255))  # "KHRONOS GROUP"
flat.rectangle((958, 435, 1010, 600), fill=(128, 128, 255))  # "3D Commerce" + swoosh
bump.save(f"{d}/{normal_uri}")

# License plate: its own new image.
plate = Image.new("RGB", (512, 128), (18, 20, 26))
ImageDraw.Draw(plate).text((256, 64), "V O L T", fill=(235, 240, 248), font=font(78), anchor="mm")
plate.save(f"{d}/plate.png")
images.append({"uri": "plate.png", "mimeType": "image/png"})
g["textures"].append({"source": len(images) - 1, "sampler": 0})
plate_texture = len(g["textures"]) - 1

# ── 2. EV dashboard (same 1024×256 trapezoid layout the dashboard's UVs expect) ──────
W, H = 1024, 256
dash = Image.new("RGB", (W, H), (0, 0, 0))
dr = ImageDraw.Draw(dash)
white, cyan, lime, dim = (235, 242, 250), (90, 220, 255), (200, 255, 61), (70, 80, 95)
dr.line([(175, 18), (850, 18), (1005, 236), (20, 236), (175, 18)], fill=dim, width=5, joint="curve")
# Battery (left)
dr.rounded_rectangle((150, 70, 330, 130), radius=10, outline=white, width=5)
dr.rectangle((330, 88, 342, 112), fill=white)
for i in range(8):  # 82%: 7 of 8 cells lit
    dr.rectangle((158 + i * 21, 80, 173 + i * 21, 120), fill=lime if i < 7 else dim)
dr.text((240, 165), "82%", fill=white, font=font(40), anchor="mm")
dr.text((240, 205), "BATTERY", fill=dim, font=font(20), anchor="mm")
# Speed (center)
dr.text((512, 105), "0", fill=white, font=font(120), anchor="mm")
dr.text((512, 180), "MPH", fill=dim, font=font(24), anchor="mm")
# Gear row: P R N in grey, the selected D in lime, laid out letter by letter.
x = 512 - 4 * 34 / 2
for letter in "PRND":
    dr.text((x + 17, 218), letter, fill=lime if letter == "D" else dim, font=font(22), anchor="mm")
    x += 34
# Range + status (right)
dr.text((790, 95), "410", fill=cyan, font=font(64), anchor="mm")
dr.text((790, 140), "MI RANGE", fill=dim, font=font(20), anchor="mm")
dr.text((790, 195), "READY", fill=lime, font=font(34), anchor="mm")
dash.save(image_path("emissive_2"))

# ── 3. Names ──────────────────────────────────────────────────────────────────────
MATERIALS = {
    "Paint 1 Carmine": "Body Paint",
    "Paint 2 Carmine": "Contrast Paint",
    "Headlight": "Headlight",
    "Brakelight": "Tail Light",
    "Signallight": "Turn Signal",
    "Rim2": "Rim Face",
    "Rim1": "Rim Inner",
    "Brake": "Caliper",
    "Interior 3 Carmine": "Interior Accent",
    "Dashboard": "Dashboard Screen",
    "License": "License Plate",
    None: "Black Trim",  # the unnamed material: gaskets, cage, wipers…
}
for m in g["materials"]:
    m["name"] = MATERIALS.get(m.get("name"), m.get("name"))
lic = next(m for m in g["materials"] if m["name"] == "License Plate")
lic["pbrMetallicRoughness"]["baseColorTexture"] = {"index": plate_texture}

NODES = {"BodyDoorLColor1": "DoorL", "BodyDoorRColor1": "DoorR", "BodyHood": "FrontLid", "BodyRearPanelsColor1": "RearLid"}
for n in g["nodes"]:
    if n.get("name") in NODES:
        n["name"] = NODES[n["name"]]

# ── 4. Window Trim: a copy of "Black Trim" used only by the window gaskets ─────────
black = next(i for i, m in enumerate(g["materials"]) if m["name"] == "Black Trim")
trim = copy.deepcopy(g["materials"][black])
trim["name"] = "Window Trim"
g["materials"].append(trim)
trim_index = len(g["materials"]) - 1
gaskets = 0
for mesh in g["meshes"]:
    if mesh.get("name") in ("BodyWindshieldGasket", "BodyDoorLWindowGasket", "BodyDoorRWindowGasket"):
        for p in mesh["primitives"]:
            p["material"] = trim_index
        gaskets += 1
assert gaskets == 3, gaskets

# ── 5. Drop the color variants (gltf-transform's prune step then removes the unused materials) ──
g.get("extensions", {}).pop("KHR_materials_variants", None)
g["extensionsUsed"] = [e for e in g.get("extensionsUsed", []) if e != "KHR_materials_variants"]
for mesh in g["meshes"]:
    for p in mesh["primitives"]:
        p.get("extensions", {}).pop("KHR_materials_variants", None)
        if p.get("extensions") == {}:
            del p["extensions"]

json.dump(g, open(f"{d}/car.gltf", "w"))
print("prepared:", ", ".join(NODES.values()), f"+ {gaskets} gaskets")
