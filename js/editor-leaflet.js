/* ============================================
   EDITOR-LEAFLET.JS — визуальный редактор зон для Leaflet
   Два инструмента: прямоугольник + полигон
   ============================================ */

(function() {
    'use strict';

    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') !== '1') return;

    console.log('[editor] Режим редактора ВКЛЮЧЁН');

    let fullData = {};
    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        if (window.__atlasMap) {
            clearInterval(timer);
            init();
        }
        if (tries > 100) {
            clearInterval(timer);
            console.error('[editor] Не дождались инициализации карты');
        }
    }, 100);

    // ============================================
    //   СОХРАНЕНИЕ НА СЕРВЕР
    // ============================================

    async function saveToFile() {
        try {
            fullData[window.__atlasRegion] = window.__zones;

            const res = await fetch('/save-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullData, null, 2)
            });

            if (res.ok) {
                console.log('[editor] ✅ Сохранено на сервер');
                flashStatus('✅ Сохранено');
                return true;
            } else {
                console.error('[editor] Ошибка сервера:', res.status);
                flashStatus('❌ Ошибка ' + res.status);
                return false;
            }
        } catch (err) {
            console.error('[editor] Ошибка сохранения:', err);
            flashStatus('❌ Сервер не отвечает');
            return false;
        }
    }

    function flashStatus(text) {
        const status = document.getElementById('save-status');
        if (!status) return;
        status.textContent = text;
        status.style.opacity = '1';
        setTimeout(() => { status.style.opacity = '0'; }, 1500);
    }

    function init() {
        const map = window.__atlasMap;
        const cfg = window.__atlasConfig;
        const regionId = window.__atlasRegion;
        const MAX_ZOOM = cfg.maxZoom;
        const MAP_WIDTH = cfg.width;
        const MAP_HEIGHT = cfg.height;

        console.log('[editor] Карта готова. Регион:', regionId);

        let zones = [];
        window.__zones = zones;

        let renderedShapes = [];
        let drawMode = null;         // null | 'rect' | 'poly'
        let drawing = false;
        let startLatLng = null;
        let previewRect = null;

        // Для полигона
        let polyPoints = [];         // массив L.LatLng
        let polyPolyline = null;     // превью-линия
        let polyMarkers = [];        // маркеры точек
        let polyMouseLine = null;    // линия до курсора
        let lastMouseLatLng = null;

        const container = map.getContainer();

        // ============================================
        //   ОТРИСОВКА ЗОН (прямоугольник + полигон)
        // ============================================

        function shapeOptions(active) {
            return {
                color: active ? 'lime' : 'red',
                weight: 2,
                fillColor: active ? 'lime' : 'red',
                fillOpacity: 0.25,
                interactive: true
            };
        }

        function drawZone(zone, idx) {
            let shape;

            if (zone.points && Array.isArray(zone.points)) {
                // --- Полигон ---
                const latlngs = zone.points.map(([x, y]) => {
                    const px = x * MAP_WIDTH / 100;
                    const py = y * MAP_HEIGHT / 100;
                    return map.unproject([px, py], MAX_ZOOM);
                });
                shape = L.polygon(latlngs, shapeOptions(false)).addTo(map);

            } else {
                // --- Прямоугольник ---
                const x1 = zone.x * MAP_WIDTH / 100;
                const y1 = zone.y * MAP_HEIGHT / 100;
                const x2 = (zone.x + zone.w) * MAP_WIDTH / 100;
                const y2 = (zone.y + zone.h) * MAP_HEIGHT / 100;

                const topLeft     = map.unproject([x1, y1], MAX_ZOOM);
                const bottomRight = map.unproject([x2, y2], MAX_ZOOM);
                shape = L.rectangle([topLeft, bottomRight], shapeOptions(false)).addTo(map);
            }

            shape.bindTooltip(`${idx + 1}. ${zone.name}`, {
                sticky: true,
                direction: 'top'
            });

            shape.on('click', async (e) => {
                L.DomEvent.stopPropagation(e);
                if (confirm(`Удалить зону "${zone.name}"?`)) {
                    shape.remove();
                    zones.splice(idx, 1);
                    renderAll();
                    await saveToFile();
                }
            });

            return shape;
        }

        function renderAll() {
            renderedShapes.forEach(s => s.remove());
            renderedShapes = [];
            zones.forEach((z, i) => {
                renderedShapes.push(drawZone(z, i));
            });
            updateCount();
        }

        function updateCount() {
            const el = document.getElementById('zone-count');
            if (el) el.textContent = zones.length;
        }

        // ============================================
        //   РЕЖИМЫ РИСОВАНИЯ
        // ============================================

        function setDrawMode(mode) {
            // Сброс предыдущего
            if (drawMode === 'poly') cancelPolygon();
            if (previewRect) { previewRect.remove(); previewRect = null; }
            drawing = false;
            startLatLng = null;

            drawMode = mode;

            if (mode) {
                map.dragging.disable();
                container.style.cursor = 'crosshair';
            } else {
                map.dragging.enable();
                container.style.cursor = '';
            }

            updatePanelState();
            console.log('[editor] Режим:', mode || 'выключен');
        }

        function updatePanelState() {
            const rectBtn = document.getElementById('draw-rect-btn');
            const polyBtn = document.getElementById('draw-poly-btn');
            const status = document.getElementById('draw-status');
            const polyControls = document.getElementById('poly-controls');

            if (!rectBtn || !polyBtn) return;

            // Сброс стилей
            [rectBtn, polyBtn].forEach(b => {
                b.style.background = '';
                b.style.color = '';
            });

            if (drawMode === 'rect') {
                rectBtn.style.background = '#8b1a1a';
                rectBtn.style.color = '#fff';
                rectBtn.textContent = '✖ Прямоугольник (активен)';
                polyBtn.textContent = '⬡ Полигон';
                if (status) status.textContent = '🎯 Тяни мышкой по карте';
                if (polyControls) polyControls.style.display = 'none';
            } else if (drawMode === 'poly') {
                polyBtn.style.background = '#8b1a1a';
                polyBtn.style.color = '#fff';
                polyBtn.textContent = '✖ Полигон (активен)';
                rectBtn.textContent = '➕ Прямоугольник';
                if (status) status.textContent = '🎯 Кликай точки. Enter — завершить, Esc — отмена. Точек: ' + polyPoints.length;
                if (polyControls) polyControls.style.display = polyPoints.length > 0 ? 'block' : 'none';
            } else {
                rectBtn.textContent = '➕ Прямоугольник';
                polyBtn.textContent = '⬡ Полигон';
                if (status) status.textContent = '';
                if (polyControls) polyControls.style.display = 'none';
            }
        }

        // ============================================
        //   ПРЯМОУГОЛЬНИК
        // ============================================

        container.addEventListener('mousedown', function(e) {
            if (drawMode !== 'rect') return;
            if (e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();

            startLatLng = map.mouseEventToLatLng(e);
            drawing = true;
        }, true);

        document.addEventListener('mousemove', function(e) {
            // Превью прямоугольника
            if (drawMode === 'rect' && drawing && startLatLng) {
                const currentLatLng = map.mouseEventToLatLng(e);

                const sw = L.latLng(
                    Math.min(startLatLng.lat, currentLatLng.lat),
                    Math.min(startLatLng.lng, currentLatLng.lng)
                );
                const ne = L.latLng(
                    Math.max(startLatLng.lat, currentLatLng.lat),
                    Math.max(startLatLng.lng, currentLatLng.lng)
                );
                const bounds = L.latLngBounds(sw, ne);

                if (previewRect) {
                    previewRect.setBounds(bounds);
                } else {
                    previewRect = L.rectangle(bounds, {
                        color: 'lime',
                        weight: 2,
                        dashArray: '6 4',
                        fillColor: 'lime',
                        fillOpacity: 0.2,
                        interactive: false
                    }).addTo(map);
                }
            }

            // Превью полигона (линия до курсора)
            if (drawMode === 'poly' && polyPoints.length > 0) {
                lastMouseLatLng = map.mouseEventToLatLng(e);
                updatePolyMouseLine();
            }
        }, true);

        document.addEventListener('mouseup', async function(e) {
            if (drawMode !== 'rect') return;
            if (!drawing || !startLatLng) return;

            const endLatLng = map.mouseEventToLatLng(e);

            const sw = L.latLng(
                Math.min(startLatLng.lat, endLatLng.lat),
                Math.min(startLatLng.lng, endLatLng.lng)
            );
            const ne = L.latLng(
                Math.max(startLatLng.lat, endLatLng.lat),
                Math.max(startLatLng.lng, endLatLng.lng)
            );

            const p1 = map.project(sw, MAX_ZOOM);
            const p2 = map.project(ne, MAX_ZOOM);

            const topLeftPx     = L.point(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
            const bottomRightPx = L.point(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y));

            const px = (topLeftPx.x / MAP_WIDTH) * 100;
            const py = (topLeftPx.y / MAP_HEIGHT) * 100;
            const pw = ((bottomRightPx.x - topLeftPx.x) / MAP_WIDTH) * 100;
            const ph = ((bottomRightPx.y - topLeftPx.y) / MAP_HEIGHT) * 100;

            drawing = false;
            const savedStartLatLng = startLatLng;
            startLatLng = null;

            if (pw < 0.01 || ph < 0.01) {
                console.log('[editor] Слишком маленькая зона, отмена');
                if (previewRect) { previewRect.remove(); previewRect = null; }
                return;
            }

            // Preview остаётся на экране, пока вводим данные
            const zone = await askZoneData();

            // Теперь убираем preview
            if (previewRect) { previewRect.remove(); previewRect = null; }

            if (!zone) return;

            zone.x = Math.round(px * 100) / 100;
            zone.y = Math.round(py * 100) / 100;
            zone.w = Math.round(pw * 100) / 100;
            zone.h = Math.round(ph * 100) / 100;

            zones.push(zone);
            console.log('[editor] Добавлена зона:', zone.name);
            renderAll();
            await saveToFile();
        }, true);

        // ============================================
        //   ПОЛИГОН
        // ============================================

        map.on('click', function(e) {
            if (drawMode !== 'poly') return;

            // Добавляем точку
            polyPoints.push(e.latlng);

            // Маркер точки
            const marker = L.circleMarker(e.latlng, {
                radius: 5,
                color: '#00ff00',
                fillColor: '#00ff00',
                fillOpacity: 1,
                interactive: false
            }).addTo(map);
            polyMarkers.push(marker);

            // Обновляем линию
            updatePolyLine();
            updatePanelState();

            console.log('[editor] Точка', polyPoints.length, ':', e.latlng);
        });

        function updatePolyLine() {
            if (polyPolyline) polyPolyline.remove();

            // Линия по точкам + до курсора
            const allPoints = polyPoints.slice();
            if (lastMouseLatLng) allPoints.push(lastMouseLatLng);

            polyPolyline = L.polyline(allPoints, {
                color: 'lime',
                weight: 2,
                dashArray: '6 4',
                interactive: false
            }).addTo(map);
        }

        function updatePolyMouseLine() {
            if (polyPolyline) polyPolyline.remove();

            const allPoints = polyPoints.slice();
            if (lastMouseLatLng) allPoints.push(lastMouseLatLng);

            polyPolyline = L.polyline(allPoints, {
                color: 'lime',
                weight: 2,
                dashArray: '6 4',
                interactive: false
            }).addTo(map);
        }

        function cancelPolygon() {
            polyMarkers.forEach(m => m.remove());
            polyMarkers = [];
            if (polyPolyline) { polyPolyline.remove(); polyPolyline = null; }
            polyPoints = [];
            lastMouseLatLng = null;
            updatePanelState();
            console.log('[editor] Полигон отменён');
        }

        async function finishPolygon() {
            if (polyPoints.length < 3) {
                alert('Нужно минимум 3 точки для полигона');
                return;
            }

            // Конвертируем в проценты
            const points = polyPoints.map(latlng => {
                const p = map.project(latlng, MAX_ZOOM);
                return [
                    Math.round((p.x / MAP_WIDTH) * 100 * 100) / 100,
                    Math.round((p.y / MAP_HEIGHT) * 100 * 100) / 100
                ];
            });

            const zone = await askZoneData();
            if (!zone) return;

            zone.points = points;

            zones.push(zone);
            console.log('[editor] Добавлен полигон:', zone.name);

            cancelPolygon();
            renderAll();
            await saveToFile();
        }

        // ============================================
        //   ОБЩИЙ ДИАЛОГ ВВОДА
        // ============================================

        async function askZoneData() {
            const name = prompt('1/3. Название локации:');
            if (!name) return null;

            const autoUrl = `https://wowpedia.fandom.com/ru/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`;
            const url = prompt('2/3. URL статьи (можно вписать английский вариант):', autoUrl);
            if (url === null) return null;

            const desc = prompt('3/3. Короткое описание (можно пропустить):', '');
            if (desc === null) return null;

            return {
                name: name,
                url: url || autoUrl,
                desc: desc.trim()
            };
        }

        // ============================================
        //   КЛАВИАТУРА
        // ============================================

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (drawMode === 'poly' && polyPoints.length > 0) {
                    cancelPolygon();
                } else if (drawMode) {
                    setDrawMode(null);
                }
            }
            if (e.key === 'Enter' && drawMode === 'poly' && polyPoints.length >= 3) {
                finishPolygon();
            }
        });

        // ============================================
        //   ПАНЕЛЬ УПРАВЛЕНИЯ
        // ============================================

        function createPanel() {
            const panel = document.createElement('div');
            panel.className = 'editor-panel';
            panel.innerHTML = `
                <div class="editor-title">🎨 Редактор зон</div>
                <div class="editor-info">Регион: <b>${regionId}</b></div>
                <div class="editor-info">Зон: <b id="zone-count">${zones.length}</b></div>
                <div class="editor-help">
                    <b>Прямоугольник:</b><br>
                    • Нажми → протяни мышкой<br>
                    <b>Полигон:</b><br>
                    • Нажми → кликай точки<br>
                    • <b>Enter</b> — завершить<br>
                    • <b>Esc</b> — отмена<br>
                    <br>
                    • Клик по зоне → удалить
                </div>
                <button id="draw-rect-btn" class="editor-btn">➕ Прямоугольник</button>
                <button id="draw-poly-btn" class="editor-btn">⬡ Полигон</button>
                <div id="poly-controls" style="display:none">
                    <button id="poly-finish-btn" class="editor-btn">✅ Завершить (Enter)</button>
                    <button id="poly-cancel-btn" class="editor-btn editor-btn-danger">❌ Отменить (Esc)</button>
                </div>
                <div id="draw-status" class="editor-status"></div>
                <div id="save-status" class="editor-status"></div>
                <button id="export-btn" class="editor-btn">📋 Скопировать JSON</button>
                <button id="clear-btn" class="editor-btn editor-btn-danger">🗑 Очистить всё</button>
            `;
            document.body.appendChild(panel);

            document.getElementById('draw-rect-btn').addEventListener('click', () => {
                setDrawMode(drawMode === 'rect' ? null : 'rect');
            });

            document.getElementById('draw-poly-btn').addEventListener('click', () => {
                if (drawMode === 'poly') {
                    setDrawMode(null);
                } else {
                    setDrawMode('poly');
                }
            });

            document.getElementById('poly-finish-btn').addEventListener('click', finishPolygon);
            document.getElementById('poly-cancel-btn').addEventListener('click', cancelPolygon);

            document.getElementById('export-btn').addEventListener('click', () => {
                const output = {};
                output[regionId] = zones;
                const json = JSON.stringify(output, null, 2);
                navigator.clipboard.writeText(json)
                    .then(() => alert('✅ JSON скопирован!'))
                    .catch(() => {
                        const ta = document.createElement('textarea');
                        ta.value = json;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                        alert('✅ JSON скопирован!');
                    });
            });

            document.getElementById('clear-btn').addEventListener('click', async () => {
                if (confirm('Удалить ВСЕ зоны этого региона?')) {
                    zones.length = 0;
                    renderAll();
                    await saveToFile();
                }
            });
        }

        // ============================================
        //   ЗАГРУЗКА zones.json
        // ============================================

        fetch('../data/zones.json?_=' + Date.now())
            .then(r => r.json())
            .then(data => {
                fullData = data;
                zones = data[regionId] || [];
                window.__zones = zones;
                console.log('[editor] Загружено зон:', zones.length);
                renderAll();
                createPanel();
            })
            .catch(err => {
                console.error('[editor] Ошибка загрузки zones.json:', err);
                createPanel();
            });
    }

})();