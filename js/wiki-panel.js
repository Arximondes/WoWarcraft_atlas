/* ============================================
   WIKI-PANEL.JS — боковая панель с описанием локации
   ============================================ */

(function() {
    'use strict';

    const panel = document.getElementById('wiki-panel');
    const panelBody = document.getElementById('wiki-panel-body');
    const panelTitle = document.getElementById('wiki-panel-title');
    const panelLink = document.getElementById('wiki-panel-link');
    const closeBtn = document.getElementById('wiki-panel-close');

    if (!panel) return;

    console.log('[wiki-panel] Панель готова');

    // --- Закрытие ---
    closeBtn.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePanel();
    });

    function closePanel() {
        panel.classList.remove('open');
        document.querySelector('.map-wrapper')?.classList.remove('panel-open');
        window.__atlasMap?.invalidateSize(); // Фикс для дергания карты при закрытии
    }

    function openPanel() {
        panel.classList.add('open');
        document.querySelector('.map-wrapper')?.classList.add('panel-open');
        setTimeout(() => window.__atlasMap?.invalidateSize(), 350); // Фикс для дергания карты
    }

    function loadZone(zone) {
        openPanel();

        panelTitle.textContent = zone.name;

        const url = (zone.url || '').trim();
        const hasValidUrl = url && url.startsWith('http');

        // Ссылка «Читать полностью» — показываем только при валидном URL
        if (hasValidUrl) {
            panelLink.href = url;
            panelLink.style.display = '';
        } else {
            panelLink.href = '#';
            panelLink.style.display = 'none';
        }

        let html = '';

        // Картинка (если указана в zones.json полем "img")
        if (zone.img) {
            html += `<img src="../img/locations/${zone.img}" alt="${zone.name}">`;
        }

        // Описание
        if (zone.desc) {
            html += `<p>${zone.desc}</p>`;
        } else {
            const lang = window.__ATLAS_LANG__ || 'en';
            let fallback = lang === 'en' ? 'Description for this location has not been added yet.' : 'Описание для этой локации пока не добавлено.';
            
            if (hasValidUrl) {
                fallback += lang === 'en' 
                    ? '<br>Click "Read more" to open the article on Warcraft Wiki.' 
                    : '<br>Нажмите «Читать полностью», чтобы открыть статью на Warcraft Wiki.';
            }
            html += `<p style="color:var(--text-dim);font-style:italic">${fallback}</p>`;
        }

        panelBody.innerHTML = html;
        panelBody.scrollTop = 0;
    }

    // --- Экспорт ---
    window.__openWikiPanel = loadZone;

})();