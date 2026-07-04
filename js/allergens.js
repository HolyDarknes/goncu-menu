/**
 * GÖNCÜ MENU PRO - Allergen System / TR-EN UI Fix
 * ------------------------------------------------------------
 * Alerjen verisini nutrition.json üzerinden okur, ürün kartlarına mini ikonlar
 * ekler ve modal sistemine premium alerjen objeleri sunar.
 *
 * Bu dosya mevcut HTML yapısını değiştirmez. .menu-item kartlarını DOM'dan okur.
 * Script sırası: nutrition.js -> allergens.js -> modal.js
 */
(() => {
  'use strict';

  const READY_EVENT = 'goncu:allergens-ready';

  const SELECTORS = Object.freeze({
    menuItem: '.menu-item',
    itemImage: '.item-image',
    itemName: '.item-name',
    section: '.menu-section',
    sectionTitle: '.section-title',
    activeLangButton: '.lang-btn.active',
    langButton: '.lang-btn',
  });

  const FALLBACK_LEGEND = Object.freeze({
    milk: { name: 'Süt', nameEn: 'Milk', icon: '🥛' },
    gluten: { name: 'Gluten', nameEn: 'Gluten', icon: '🌾' },
    egg: { name: 'Yumurta', nameEn: 'Egg', icon: '🥚' },
    peanut: { name: 'Yer Fıstığı', nameEn: 'Peanut', icon: '🥜' },
    tree_nuts: { name: 'Kuruyemiş', nameEn: 'Tree nuts', icon: '🌰' },
    fish: { name: 'Balık', nameEn: 'Fish', icon: '🐟' },
    shellfish: { name: 'Kabuklu Deniz Ürünleri', nameEn: 'Shellfish', icon: '🍤' },
    soy: { name: 'Soya', nameEn: 'Soy', icon: '🌱' },
    sesame: { name: 'Susam', nameEn: 'Sesame', icon: '⚪' },
    mustard: { name: 'Hardal', nameEn: 'Mustard', icon: '🟡' },
    celery: { name: 'Kereviz', nameEn: 'Celery', icon: '🥬' },
    sulfite: { name: 'Sülfit', nameEn: 'Sulphites', icon: '🍷' },
  });

  const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  const getActiveLanguage = () => {
    const activeButton = document.querySelector([
      SELECTORS.activeLangButton,
      '.language-btn.active',
      '.language-switch .active',
      '[data-lang-trigger].active',
      '[data-language].active',
      '[data-set-lang].active',
      '[data-lang].active',
    ].join(','));

    const explicitLanguage = activeButton?.dataset?.langTrigger
      || activeButton?.dataset?.language
      || activeButton?.dataset?.setLang
      || activeButton?.dataset?.lang;

    if (explicitLanguage) {
      const normalized = String(explicitLanguage).toLowerCase();
      if (normalized.startsWith('en')) return 'en';
      if (normalized.startsWith('tr')) return 'tr';
    }

    const activeText = normalizeText(activeButton?.textContent || '').toLowerCase();
    if (activeText === 'en' || activeText.includes('english')) return 'en';
    if (activeText === 'tr' || activeText.includes('türkçe') || activeText.includes('turkish')) return 'tr';

    const storedLanguage = ['gmp-language', 'selectedLanguage', 'selectedLang', 'currentLanguage', 'currentLang', 'language', 'lang']
      .map((key) => window.localStorage?.getItem?.(key))
      .find(Boolean);

    if (storedLanguage) {
      const normalized = String(storedLanguage).toLowerCase();
      if (normalized.startsWith('en')) return 'en';
      if (normalized.startsWith('tr')) return 'tr';
    }

    const htmlLanguage = String(document.documentElement.lang || '').toLowerCase();
    if (htmlLanguage.startsWith('en')) return 'en';
    if (htmlLanguage.startsWith('tr')) return 'tr';

    return 'tr';
  };

  const getLocalizedText = (node) => {
    if (!node) return '';
    const activeLanguage = getActiveLanguage();
    const translatedNode = node.querySelector(`[data-lang="${activeLanguage}"]`);
    return normalizeText(translatedNode?.textContent || node.textContent || '');
  };

  const extractProductData = (item) => {
    const image = item.querySelector(SELECTORS.itemImage);
    const section = item.closest(SELECTORS.section);
    return {
      name: getLocalizedText(item.querySelector(SELECTORS.itemName)) || normalizeText(image?.alt || ''),
      category: getLocalizedText(section?.querySelector(SELECTORS.sectionTitle)) || '',
      rawElement: item,
    };
  };

  const getLegend = () => {
    const raw = window.GoncuNutrition?.getRaw?.();
    return { ...FALLBACK_LEGEND, ...(raw?.allergensLegend || {}) };
  };

  const getLabel = (allergen) => {
    const language = getActiveLanguage();
    return language === 'en'
      ? (allergen.nameEn || allergen.name || allergen.key)
      : (allergen.name || allergen.nameEn || allergen.key);
  };

  /**
   * JSON'dan gelen alerjen kaydını modal ve kartlarda kullanılacak objeye çevirir.
   * @param {string|object} allergen
   * @returns {{key:string, icon:string, name:string, nameEn:string, label:string}}
   */
  const normalizeAllergen = (allergen) => {
    if (typeof allergen === 'object' && allergen !== null) {
      const key = allergen.key || allergen.id || allergen.name || 'allergen';
      const merged = { key, ...(FALLBACK_LEGEND[key] || {}), ...allergen };
      return { ...merged, label: getLabel(merged) };
    }

    const key = String(allergen || '').trim();
    const merged = { key, ...(getLegend()[key] || { name: key, nameEn: key, icon: '•' }) };
    return { ...merged, label: getLabel(merged) };
  };

  /**
   * Ürün objesinden nutrition kaydını ve alerjen listesini üretir.
   * @param {{name:string, category:string}} product
   * @returns {{nutrition: object|null, allergens: object[], hasAllergens: boolean}}
   */
  const getForProductData = (product = {}) => {
    const nutrition = window.GoncuNutrition?.getByProductData?.(product) || null;
    const allergens = (nutrition?.allergens || []).map(normalizeAllergen);

    return {
      nutrition,
      allergens,
      hasAllergens: allergens.length > 0,
      count: allergens.length,
    };
  };

  /**
   * Kart üzerine küçük alerjen ikonları ekler. Fazla ikonlar +N olarak gösterilir.
   * @param {HTMLElement} item
   */
  const renderCardBadges = (item) => {
    item.querySelector('.gmp-card-allergens')?.remove();

    const product = extractProductData(item);
    const data = getForProductData(product);

    item.classList.toggle('gmp-has-allergens', data.hasAllergens);
    item.classList.toggle('gmp-no-known-allergens', Boolean(data.nutrition && !data.hasAllergens));

    if (!data.hasAllergens) return;

    const maxVisible = 3;
    const visible = data.allergens.slice(0, maxVisible);
    const hiddenCount = data.allergens.length - visible.length;
    const label = data.allergens.map((allergen) => allergen.label).join(', ');
    const language = getActiveLanguage();
    const ariaPrefix = language === 'en' ? 'Allergens' : 'Alerjenler';

    const wrapper = document.createElement('div');
    wrapper.className = 'gmp-card-allergens';
    wrapper.setAttribute('aria-label', `${ariaPrefix}: ${label}`);
    wrapper.innerHTML = visible.map((allergen) => `
      <span class="gmp-card-allergen" title="${allergen.label}" aria-hidden="true">${allergen.icon || '•'}</span>
    `).join('') + (hiddenCount > 0 ? `<span class="gmp-card-allergen gmp-card-allergen--more" aria-hidden="true">+${hiddenCount}</span>` : '');

    item.appendChild(wrapper);
  };

  /**
   * Tüm ürün kartlarındaki mini alerjen ikonlarını yeniler.
   */
  const refreshCards = () => {
    if (!window.GoncuNutrition?.isReady?.()) return;
    document.querySelectorAll(SELECTORS.menuItem).forEach(renderCardBadges);
    window.dispatchEvent(new CustomEvent(READY_EVENT, {
      detail: { totalCards: document.querySelectorAll('.gmp-card-allergens').length },
    }));
  };

  const bindEvents = () => {
    window.addEventListener('goncu:nutrition-ready', refreshCards);

    document.addEventListener('click', (event) => {
      const control = event.target.closest?.([
        SELECTORS.langButton,
        '.language-btn',
        '.language-switch button',
        '[data-lang-trigger]',
        '[data-language]',
        '[data-set-lang]',
      ].join(','));

      const text = normalizeText((control || event.target).textContent || '').toUpperCase();
      if (!control && text !== 'TR' && text !== 'EN') return;

      window.setTimeout(refreshCards, 120);
    });
  };

  const init = () => {
    bindEvents();
    const nutritionReady = window.GoncuNutrition?.ready?.();
    if (typeof nutritionReady?.then === 'function') {
      nutritionReady.then(refreshCards);
    } else {
      refreshCards();
    }
  };

  window.GoncuAllergens = Object.freeze({
    getForProductData,
    normalizeAllergen,
    getLegend,
    refreshCards,
    getActiveLanguage,
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
