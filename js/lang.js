/* ============================================
   LANG.JS — Логика переключения языков
   ============================================ */

(function() {
    'use strict';

    // 1. Получаем язык: URL ?lang=en -> localStorage -> 'ru'
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    const savedLang = localStorage.getItem('atlas_lang');
    const currentLang = urlLang || savedLang || 'ru';

    // 2. Подсвечиваем активную кнопку
    const activeBtn = document.getElementById('lang-' + currentLang);
    if (activeBtn) activeBtn.classList.add('active');

    // 3. Словарь для перевода интерфейса
    const translations = {
        ru: {
                        title_azeroth: "Азерот",
            title_draenor: "Дренор",
            title_outland: "Запределье",
            title_argus: "Аргус",
            title_shadowlands: "Тёмные земли",
            hint: "💡 Нажмите на регион, чтобы открыть подробную карту. Колёсико — зум.",
            back_btn: "На главную",
            read_more: "Читать полностью на Wowpedia →",
            logo_text: "Атлас Варкрафта", // <--- ДОБАВИТЬ ЭТО
            nav_home: "Главная",
            nav_home: "Главная",
            nav_about: "О проекте",
            hero_title: "Интерактивный атлас",
            hero_subtitle: "Исследуйте миры вселенной Warcraft. Кликайте на названия локаций на карте и переходите к подробным статьям на Wowpedia.",
            section_title: "Выберите мир",
            hint: "💡 Нажмите на регион, чтобы открыть подробную карту. Колёсико — зум.",
            read_more: "Читать полностью на Wowpedia →",
            back_btn: "На главную",
            meta_description: "Интерактивный атлас вселенной Warcraft. Исследуйте Азерот, Дренор, Запределье, Аргус и Тёмные Земли. Кликайте на локации и читайте их историю.",
            
            // Карточки на главной
            region_azeroth: "Азерот", region_azeroth_desc: "Весь мир целиком. Выберите континент",
            region_draenor: "Дренор", region_draenor_desc: "Древний мир орков до разрушения",
            region_outland: "Запределье", region_outland_desc: "Осколки разрушенного Дренора",
            region_argus: "Аргус", region_argus_desc: "Родной мир эредаров и Легиона",
            region_shadowlands: "Тёмные земли", region_shadowlands_desc: "Царство смерти и загробный мир",
            article_title: "Статья",
            loading_text: "Загрузка...",
            footer_text: "© 2025-2026 Атлас Варкрафта. World of Warcraft © Blizzard Entertainment.",
            footer_text_index: "© 2025-2026 Атлас Варкрафта. Учебный проект.",
            footer_note_index: "World of Warcraft © Blizzard Entertainment. Все материалы принадлежат их правообладателям.",
            // Страница About
            about_title: "О проекте",
            about_subtitle: "«Атлас Варкрафта» — учебный интерактивный атлас миров вселенной Warcraft.",
            about_what: "Что это такое",
            about_what_p1: "«Атлас Варкрафта» — некоммерческий учебный проект, посвящённый вселенной Warcraft. На сайте собраны интерактивные карты основных миров: Азерота, Дренора, Запределья, Аргуса и Тёмных Земель. Каждая карта разбита на локации: по клику на любую из них можно прочитать краткое описание прямо на сайте или перейти к полной статье на Wowpedia.",
            about_how: "Как пользоваться",
            about_how_li1: "Выберите мир на главной странице.",
            about_how_li2: "Наведите курсор на регион — появится всплывающая подсказка с названием.",
            about_how_li3: "Кликните по региону — откроется боковая панель с картинкой, описанием и ссылкой на полную статью.",
            about_how_li4: "Колесо мыши — зум, перетаскивание — навигация по карте.",
            about_how_li5: "Кнопка «⤢» или двойной клик по карте сбрасывают масштаб.",
            about_sources: "Источники",
            about_sources_p1: "Основным источником информации служит <a href='https://wowpedia.fandom.com/' target='_blank' rel='noopener'>Wowpedia</a> — крупнейшая фанатская энциклопедия по вселенной Warcraft. Описания локаций составлены на основе материалов сайта и адаптированы для читателя.",
            about_sources_p2: "Изображения (текстуры) карт для интерактивного атласа были взяты с проекта <a href='https://maps.dadesign.ru/' target='_blank' rel='noopener'>maps.dadesign.ru</a>.",
            about_disclaimer: "Дисклеймер",
            about_disclaimer_p: "World of Warcraft © Blizzard Entertainment. Все названия, изображения и лор вселенной принадлежат их правообладателям. Проект создан в образовательных целях и не претендует на коммерческую выгоду."
        },
        en: {
            article_title: "Article",
            loading_text: "Loading...",
            footer_text: "© 2025-2026 Warcraft Atlas. World of Warcraft © Blizzard Entertainment.",
            footer_text_index: "© 2025-2026 Warcraft Atlas. Educational project.",
            footer_note_index: "World of Warcraft © Blizzard Entertainment. All materials belong to their respective owners.",
            title_azeroth: "Azeroth",
            title_draenor: "Draenor",
            title_outland: "Outland",
            title_argus: "Argus",
            title_shadowlands: "Shadowlands",
            hint: "💡 Click on a region to open the detailed map. Scroll to zoom.",
            back_btn: "Back to Home",
            read_more: "Read more on Wowpedia →",
            logo_text: "Warcraft Atlas", // <--- ДОБАВИТЬ ЭТО
            nav_home: "Home",
            nav_home: "Home",
            nav_about: "About",
            hero_title: "Interactive Atlas",
            hero_subtitle: "Explore the worlds of Warcraft. Click on location names on the map to read detailed articles on Wowpedia.",
            section_title: "Choose a world",
            hint: "💡 Click on a region to open the detailed map. Scroll to zoom.",
            read_more: "Read more on Wowpedia →",
            back_btn: "Back to Home",
            meta_description: "Interactive atlas of the Warcraft universe. Explore Azeroth, Draenor, Outland, Argus, and the Shadowlands. Click on locations to read their lore.",
            // Region cards
            region_azeroth: "Azeroth", region_azeroth_desc: "The whole world. Choose a continent",
            region_draenor: "Draenor", region_draenor_desc: "The ancient orc world before its destruction",
            region_outland: "Outland", region_outland_desc: "The shattered remnants of Draenor",
            region_argus: "Argus", region_argus_desc: "The homeworld of the Eredar and the Legion",
            region_shadowlands: "Shadowlands", region_shadowlands_desc: "The realm of death and the afterlife",

            // About page
            about_title: "About the project",
            about_subtitle: "The 'Warcraft Atlas' is an educational interactive atlas of the Warcraft universe.",
            about_what: "What is it?",
            about_what_p1: "The 'Warcraft Atlas' is a non-commercial educational project dedicated to the Warcraft universe. The site features interactive maps of the main worlds: Azeroth, Draenor, Outland, Argus, and the Shadowlands. Each map is divided into locations: by clicking on any of them, you can read a brief description right on the site or go to a full article on Wowpedia.",
            about_how: "How to use",
            about_how_li1: "Select a world on the main page.",
            about_how_li2: "Hover over a region — a tooltip with the name will appear.",
            about_how_li3: "Click on a region — a side panel with an image, description, and a link to the full article will open.",
            about_how_li4: "Mouse wheel — zoom, drag — navigate the map.",
            about_how_li5: "The '⤢' button or double-clicking the map resets the zoom.",
            about_sources: "Sources",
            about_sources_p1: "The main source of information is <a href='https://wowpedia.fandom.com/' target='_blank' rel='noopener'>Wowpedia</a> — the largest fan encyclopedia for the Warcraft universe. Location descriptions are based on site materials and adapted for the reader.",
            about_sources_p2: "Map images (textures) for the interactive atlas were taken from the <a href='https://maps.dadesign.ru/' target='_blank' rel='noopener'>maps.dadesign.ru</a> project.",
            about_disclaimer: "Disclaimer",
            about_disclaimer_p: "World of Warcraft © Blizzard Entertainment. All names, images, and lore of the universe belong to their respective owners. The project was created for educational purposes and does not claim any commercial profit."
        }
    };

    // 4. Функция перевода
    function translatePage() {
        const dict = translations[currentLang];
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                // Используем innerHTML, чтобы не сломать теги <a> в тексте
                el.innerHTML = dict[key];
            }
        });
                // --- Динамическое обновление SEO-тегов ---
        // 1. Меняем язык документа (<html lang="...">)
        document.documentElement.lang = currentLang;

        // 2. Меняем описание (meta description)
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && dict['meta_description']) {
            metaDesc.setAttribute('content', dict['meta_description']);
        }

        // 3. Меняем заголовок вкладки (<title>)
        // (этот код мы писали ранее, он должен быть здесь)
        const regionTitles = {
            'azeroth': 'title_azeroth',
            'draenor': 'title_draenor',
            'outland': 'title_outland',
            'argus': 'title_argus',
            'shadowlands': 'title_shadowlands'
        };

        const pathParts = window.location.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1].replace('.html', '');
        
        if (regionTitles[fileName]) {
            const titleKey = regionTitles[fileName];
            document.title = `${translations[currentLang][titleKey]} — ${translations[currentLang]['logo_text']}`;
        } else if (fileName === 'about') {
            document.title = `${translations[currentLang]['about_title']} — ${translations[currentLang]['logo_text']}`;
        } else {
            // Главная страница
            document.title = `${translations[currentLang]['logo_text']} — ${currentLang === 'en' ? 'Interactive Atlas' : 'Интерактивный атлас'}`;
        }
    }

    // Запускаем перевод
    translatePage();

    // Сохраняем язык
    localStorage.setItem('atlas_lang', currentLang);

    // Экспортируем переменную
    window.__ATLAS_LANG__ = currentLang;
    // 5. Перевод заголовка вкладки браузера (<title>)
    const regionTitles = {
        'azeroth': 'title_azeroth',
        'draenor': 'title_draenor',
        'outland': 'title_outland',
        'argus': 'title_argus',
        'shadowlands': 'title_shadowlands'
    };

    const pathParts = window.location.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1].replace('.html', '');
    
    if (regionTitles[fileName]) {
        // Если мы на странице региона
        const titleKey = regionTitles[fileName];
        document.title = `${translations[currentLang][titleKey]} — ${translations[currentLang]['logo_text']}`;
    } else if (fileName === 'about') {
        document.title = `${translations[currentLang]['about_title']} — ${translations[currentLang]['logo_text']}`;
    } else {
        // Главная страница
        document.title = `${translations[currentLang]['logo_text']} — Interactive Atlas`;
    }
})();