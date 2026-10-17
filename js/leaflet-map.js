/* ============================================
   LEAFLET-MAP.JS — интерактивная карта на Leaflet
   ============================================ */

(function() {
    'use strict';

    const pathParts = window.location.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const regionId = fileName.replace('.html', '');
    console.log('[leaflet] Регион:', regionId);

    const TILE_SIZE = 256;

    // --- Загружаем конфиг из файла, потом инициализируем карту ---
    fetch('../data/map-config.json?_=' + Date.now())
        .then(r => r.json())
        .then(configs => {
            const cfg = configs[regionId];
            if (!cfg) {
                console.error('[leaflet] Нет конфига для региона:', regionId);
                return;
            }
            initMap(cfg);
        })
        .catch(err => console.error('[leaflet] Не удалось загрузить map-config.json:', err));

    // ============================================
    //   ИНИЦИАЛИЗАЦИЯ КАРТЫ
    // ============================================

    function initMap(cfg) {
        const MAX_ZOOM  = cfg.maxZoom;
        const MAP_WIDTH  = cfg.width;
        const MAP_HEIGHT = cfg.height;

        const map = L.map('leaflet-map', {
            crs: L.CRS.Simple,
            minZoom: 0,
            maxZoom: MAX_ZOOM,
            zoomControl: false,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
            zoomSnap: 1,
            zoomDelta: 1,
            wheelPxPerZoomLevel: 120
        });

        const southWest = map.unproject([0, MAP_HEIGHT], MAX_ZOOM);
        const northEast = map.unproject([MAP_WIDTH, 0], MAX_ZOOM);
        const bounds = new L.LatLngBounds(southWest, northEast);

        L.tileLayer(`../tiles/${regionId}/{z}/{x}/{y}.jpg`, {
            tileSize: TILE_SIZE,
            minZoom: 0,
            maxZoom: MAX_ZOOM,
            noWrap: true,
            bounds: bounds,
            keepBuffer: 2,
            updateWhenIdle: false
        }).addTo(map);

        map.fitBounds(bounds);
        map.setMaxBounds(bounds);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const isEditMode = new URLSearchParams(window.location.search).get('edit') === '1';

        if (!isEditMode) {
            fetch('../data/zones.json?_=' + Date.now())
                .then(r => r.ok ? r.json() : Promise.reject('zones.json не найден'))
                .then(data => {
                    const zones = data[regionId];
                    if (!zones || !zones.length) {
                        console.warn('[leaflet] Нет зон для региона:', regionId);
                        return;
                    }
                    console.log('[leaflet] Загружено зон:', zones.length);
                    addZones(zones);
                })
                .catch(err => console.error('[leaflet]', err));
        } else {
            console.log('[leaflet] Режим редактора — зоны не подгружаются');
        }

        // ============================================
        //   ОТРИСОВКА ЗОН
        // ============================================

        function addZones(zones) {
            zones.forEach(zone => {
                let shape;

                if (zone.points && Array.isArray(zone.points)) {
                    // --- Полигон ---
                    const latlngs = zone.points.map(([x, y]) => {
                        const px = x * MAP_WIDTH / 100;
                        const py = y * MAP_HEIGHT / 100;
                        return map.unproject([px, py], MAX_ZOOM);
                    });
                    shape = L.polygon(latlngs, {
                        color: '#d4af37',
                        weight: 0,
                        fillColor: '#d4af37',
                        fillOpacity: 0,
                        interactive: true,
                        className: 'leaflet-zone'
                    }).addTo(map);

                } else {
                    // --- Прямоугольник ---
                    const x1 = zone.x * MAP_WIDTH / 100;
                    const y1 = zone.y * MAP_HEIGHT / 100;
                    const x2 = (zone.x + zone.w) * MAP_WIDTH / 100;
                    const y2 = (zone.y + zone.h) * MAP_HEIGHT / 100;

                    const topLeft     = map.unproject([x1, y1], MAX_ZOOM);
                    const bottomRight = map.unproject([x2, y2], MAX_ZOOM);

                    shape = L.rectangle([topLeft, bottomRight], {
                        color: '#d4af37',
                        weight: 0,
                        fillColor: '#d4af37',
                        fillOpacity: 0,
                        interactive: true,
                        className: 'leaflet-zone'
                    }).addTo(map);
                }

                // Hover — подсветка
                shape.on('mouseover', function() {
                    this.setStyle({ weight: 2, fillOpacity: 0.25 });
                });
                shape.on('mouseout', function() {
                    this.setStyle({ weight: 0, fillOpacity: 0 });
                });

                // Клик — переход или панель
                shape.on('click', function() {
                    const url = (zone.url || '').trim();
                    const isExternal = url.startsWith('http');
                    const isValidInternal = url && !isExternal && url !== '-';

                    // Внутренняя ссылка (например, на другой html-файл)
                    if (isValidInternal) {
                        window.location.href = url;
                        return;
                    }

                    // Внешняя ссылка (Wowpedia) — открываем панель
                    if (isExternal) {
                        if (window.__openWikiPanel) {
                            window.__openWikiPanel(zone);
                        } else {
                            window.open(url, '_blank');
                        }
                        return;
                    }

                    // url "-" или пусто — просто открываем панель с описанием
                    if (window.__openWikiPanel) {
                        window.__openWikiPanel(zone);
                    }
                });

                // Подсказка
                shape.bindTooltip(zone.name, {
                    sticky: true,
                    direction: 'top',
                    className: 'zone-tooltip'
                });
            });
        }

        // Экспортируем карту для редактора
        window.__atlasMap = map;
        window.__atlasConfig = cfg;
        window.__atlasRegion = regionId;
        window.__atlasMaxZoom = MAX_ZOOM;
    }

})();