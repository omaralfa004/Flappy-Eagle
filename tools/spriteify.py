# Turn the painted render into a pixel-art sprite: downscale, reduce the palette,
# strengthen the ink lines, and drop stray single pixels.
import os, sys
from PIL import Image, ImageEnhance, ImageFilter

src, out, W, H, COLORS = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])

im = Image.open(src).convert('RGB')
# crop to the target aspect ratio, centred
tw = round(im.height * W / H)
if tw < im.width:
    x0 = (im.width - tw) // 2
    im = im.crop((x0, 0, x0 + tw, im.height))

# Ink lines: dark strokes in the painting become 1px outlines in the sprite.
# A block is "ink" if a good share of its source pixels are very dark.
# INK env: luminance below which a pixel counts as an ink line (lower it for dark, low-key scenes)
INK = int(os.environ.get('INK', 52))
lum = im.convert('L')
dark = lum.point(lambda v: 255 if v < INK else 0).resize((W, H), Image.BOX)
ink = dark.point(lambda v: 255 if v > 70 else 0)

# Colour: area-average downscale, a little extra punch, then a fixed palette (no dithering).
small = im.resize((W, H), Image.BOX)
small = ImageEnhance.Contrast(small).enhance(1.12)
small = ImageEnhance.Color(small).enhance(1.15)
# optional pinned colours (hex list): small accents like the maroon scarf get merged away by the adaptive palette
keep = [int(h[i:i + 2], 16) for h in sys.argv[7].split(',') for i in (0, 2, 4)] if len(sys.argv) > 7 else []
n = COLORS - len(keep) // 3
q = small.quantize(colors=n, method=getattr(Image.Quantize, sys.argv[6] if len(sys.argv) > 6 else "MEDIANCUT"), dither=Image.Dither.NONE)
pal = q.getpalette()[:n * 3] + keep
if keep:
    pimg = Image.new('P', (1, 1)); pimg.putpalette(pal + [0] * (768 - len(pal)))
    q = small.quantize(palette=pimg, dither=Image.Dither.NONE)
darkest = min(range(COLORS), key=lambda i: sum(pal[i * 3:i * 3 + 3]))

px, ik = q.load(), ink.load()
w, h = q.size
# lay the ink down
for y in range(h):
    for x in range(w):
        if ik[x, y]:
            px[x, y] = darkest

# remove isolated pixels: a pixel whose 4 neighbours all agree on another colour takes that colour
for _ in range(2):
    snap = q.copy().load()
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            n = [snap[x - 1, y], snap[x + 1, y], snap[x, y - 1], snap[x, y + 1]]
            if n[0] == n[1] == n[2] == n[3] != snap[x, y]:
                px[x, y] = n[0]

q.convert('RGB').save(out)
print(out, q.size, 'colors:', len(q.convert('RGB').getcolors(1 << 16)))
