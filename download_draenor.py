import requests
from PIL import Image
from io import BytesIO
import os
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

# ============================================
#   НАСТРОЙКИ
# ============================================
REGION = "shadowlands"
BASE_URL = f"https://maps.dadesign.ru/{REGION}/data"
OUTPUT_FILE = f"{REGION}.jpg"
INFO_FILE = f"{REGION}-info.json"
MAX_WORKERS = 10
SCAN_LIMIT_X = 40
SCAN_LIMIT_Y = 40

# Цвет "пустого" тайла (определён вручную)
BLANK_COLOR = (133, 127, 103)
BLANK_TOLERANCE = 25          # допуск по каждому каналу
BLANK_RATIO = 0.999999999999999999999999999999999999999999999999999999999             # если 90%+ пикселей близки к BLANK_COLOR — тайл пустой

# ============================================
#   ПРОВЕРКА ПУСТОГО ТАЙЛА
# ============================================

def is_blank(img):
    return False

# ============================================
#   СКАЧИВАНИЕ ОДНОГО ТАЙЛА
# ============================================

def fetch_tile(z, x, y):
    """Скачивает тайл. Возвращает (x, y, img) или (x, y, None)."""
    url = f"{BASE_URL}/{z}-{x}-{y}.jpg"
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        img = Image.open(BytesIO(r.content)).convert("RGB")

        if is_blank(img):
            return (x, y, None)

        return (x, y, img)
    except Exception:
        return (x, y, None)

# ============================================
#   ОПРЕДЕЛЕНИЕ ГРАНИЦ
# ============================================

def detect_max_zoom():
    """Определяет максимальный уровень зума через GET + is_blank."""
    print("🔍 Определяю максимальный зум...")
    max_zoom = 0
    for z in range(0, 10):
        _, _, img = fetch_tile(z, 0, 0)
        if img:
            max_zoom = z
            print(f"   Зум {z}: ✅")
        else:
            print(f"   Зум {z}: ❌")
            break
    return max_zoom

def detect_bounds(z):
    """Определяет границы по X и Y через GET + is_blank."""
    print(f"🔍 Определяю границы для зума {z}...")

    max_x = -1
    for x in range(0, SCAN_LIMIT_X):
        _, _, img = fetch_tile(z, x, 0)
        if img:
            max_x = x
        else:
            break

    max_y = -1
    for y in range(0, SCAN_LIMIT_Y):
        _, _, img = fetch_tile(z, 0, y)
        if img:
            max_y = y
        else:
            break

    print(f"   Границы: X = 0..{max_x}, Y = 0..{max_y}")
    return max_x, max_y

# ============================================
#   ОСНОВНАЯ ЛОГИКА
# ============================================

def main():
    max_zoom = detect_max_zoom()
    if max_zoom == 0:
        print("❌ Не удалось определить зум.")
        return

    max_x, max_y = detect_bounds(max_zoom)
    if max_x < 0 or max_y < 0:
        print("❌ Не удалось определить границы.")
        return

    total = (max_x + 1) * (max_y + 1)
    print(f"\n📥 Скачиваю {total} тайлов (зум {max_zoom})...")

    tiles = {}
    done = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [
            executor.submit(fetch_tile, max_zoom, x, y)
            for x in range(0, max_x + 1)
            for y in range(0, max_y + 1)
        ]
        for future in as_completed(futures):
            x, y, img = future.result()
            if img:
                tiles[(x, y)] = img
            done += 1
            if done % 50 == 0:
                print(f"   Готово: {done}/{total}, заполнено: {len(tiles)}")

    if not tiles:
        print("❌ Не скачано ни одного тайла.")
        return

    print(f"\n🧩 Склеиваю {len(tiles)} тайлов...")
    tile_w, tile_h = list(tiles.values())[0].size
    result = Image.new(
        "RGB",
        (tile_w * (max_x + 1), tile_h * (max_y + 1)),
        BLANK_COLOR
    )

    for (x, y), img in tiles.items():
        result.paste(img, (x * tile_w, y * tile_h))

    # Обрезаем серые полосы (если они остались по краям)
    result = crop_blank_edges(result)

    W_src, H_src = result.size
    print(f"\n📐 После склейки: {W_src}x{H_src} px")

    # Подбор maxZoom для Leaflet
    leaflet_zoom = 0
    while 256 * (2 ** leaflet_zoom) < W_src and leaflet_zoom < 8:
        leaflet_zoom += 1

    target_w = 256 * (2 ** leaflet_zoom)
    target_h = int(target_w * H_src / W_src)

    if (target_w, target_h) != (W_src, H_src):
        print(f"⬆️  Апскейл до {target_w}x{target_h} (zoom {leaflet_zoom})...")
        result = result.resize((target_w, target_h), Image.LANCZOS)
    else:
        print(f"✅ Размер подходит для zoom {leaflet_zoom}")

    result.save(OUTPUT_FILE, "JPEG", quality=92, optimize=True)
    size_mb = os.path.getsize(OUTPUT_FILE) / 1024 / 1024
    print(f"\n💾 Сохранено: {OUTPUT_FILE} ({size_mb:.1f} МБ)")
    print(f"   Итог: {result.size[0]}x{result.size[1]} px")

    info = {
        "region": REGION,
        "sourceTilesX": max_x + 1,
        "sourceTilesY": max_y + 1,
        "sourceMaxZoom": max_zoom,
        "leafletConfig": {
            "width": target_w,
            "height": target_h,
            "maxZoom": leaflet_zoom
        }
    }
    with open(INFO_FILE, "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2, ensure_ascii=False)

    print(f"\n📋 Параметры для map-config.json:")
    print(f'   "width": {target_w},')
    print(f'   "height": {target_h},')
    print(f'   "maxZoom": {leaflet_zoom}')

# ============================================
#   ОБРЕЗКА СЕРЫХ ПОЛОС
# ============================================

def crop_blank_edges(img):
    """Убирает сплошные серые полосы по краям."""
    w, h = img.size
    small = img.resize((w // 8, h // 8))
    sw, sh = small.size

    r0, g0, b0 = BLANK_COLOR

    def is_blank_px(r, g, b):
        return (abs(r - r0) <= BLANK_TOLERANCE and
                abs(g - g0) <= BLANK_TOLERANCE and
                abs(b - b0) <= BLANK_TOLERANCE)

    # Ищем правую границу: последний столбец, где есть не-серые пиксели
    def col_has_content(x):
        for y in range(sh):
            r, g, b = small.getpixel((x, y))
            if not is_blank_px(r, g, b):
                return True
        return False

    def row_has_content(y):
        for x in range(sw):
            r, g, b = small.getpixel((x, y))
            if not is_blank_px(r, g, b):
                return True
        return False

    right = sw - 1
    while right > 0 and not col_has_content(right):
        right -= 1

    bottom = sh - 1
    while bottom > 0 and not row_has_content(bottom):
        bottom -= 1

    # Пересчитываем в исходные пиксели
    new_w = min(w, (right + 1) * 8)
    new_h = min(h, (bottom + 1) * 8)

    if new_w < w or new_h < h:
        print(f"✂️  Обрезаю серые полосы: {w}x{h} → {new_w}x{new_h}")
        img = img.crop((0, 0, new_w, new_h))

    return img

if __name__ == "__main__":
    main()