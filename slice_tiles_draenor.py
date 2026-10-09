from PIL import Image
import os

Image.MAX_IMAGE_PIXELS = None

# ============================================
#   НАСТРОЙКИ
# ============================================
SRC = "shadowlands.jpg"
OUT_DIR = "tiles/shadowlands"
TILE_SIZE = 256
JPEG_QUALITY = 85

# ============================================
#   ЧТЕНИЕ ИЗ INFO-ФАЙЛА
# ============================================
# Если есть draenor-info.json — берём оттуда maxZoom
import json
INFO_FILE = "draenor-info.json"
if os.path.exists(INFO_FILE):
    with open(INFO_FILE, "r", encoding="utf-8") as f:
        info = json.load(f)
    MAX_ZOOM = info["leafletConfig"]["maxZoom"]
    print(f"📖 maxZoom из {INFO_FILE}: {MAX_ZOOM}")
else:
    MAX_ZOOM = 5
    print(f"⚠️  {INFO_FILE} не найден, использую maxZoom = {MAX_ZOOM}")

# ============================================
#   НАРЕЗКА
# ============================================
print(f"\n🗺️  Открываю {SRC}...")
img = Image.open(SRC).convert("RGB")
print(f"   Размер: {img.size[0]}x{img.size[1]}")

total = 0
for z in range(MAX_ZOOM + 1):
    scale = 2 ** (MAX_ZOOM - z)
    level_w = img.size[0] // scale
    level_h = img.size[1] // scale

    level_img = img.resize((level_w, level_h), Image.LANCZOS)

    cols = (level_w + TILE_SIZE - 1) // TILE_SIZE
    rows = (level_h + TILE_SIZE - 1) // TILE_SIZE

    for x in range(cols):
        for y in range(rows):
            left = x * TILE_SIZE
            top = y * TILE_SIZE
            right = min(left + TILE_SIZE, level_w)
            bottom = min(top + TILE_SIZE, level_h)

            tile = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (10, 14, 20))
            crop = level_img.crop((left, top, right, bottom))
            tile.paste(crop, (0, 0))

            path = f"{OUT_DIR}/{z}/{x}/{y}.jpg"
            os.makedirs(os.path.dirname(path), exist_ok=True)
            tile.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True)

    count = cols * rows
    total += count
    print(f"   Уровень {z}: {cols}x{rows} = {count} тайлов")

print(f"\n✅ Готово! Всего {total} тайлов в {OUT_DIR}/")
print(f"   Для map-config.json:")
print(f'   "width": {img.size[0]},')
print(f'   "height": {img.size[1]},')
print(f'   "maxZoom": {MAX_ZOOM}')