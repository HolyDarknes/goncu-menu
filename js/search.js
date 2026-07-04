/* ============================================================
   GÖNCÜ MENU PRO - SPRINT 4
   Premium Search & Filtering System
   ------------------------------------------------------------
   Amaç:
   - Mevcut HTML yapısını bozmadan arama paneli oluşturmak.
   - .menu-item kartlarını ad, açıklama, fiyat ve kategoriye göre filtrelemek.
   - Kategori chip sistemi, sonuç sayacı ve boş sonuç durumunu yönetmek.
   - Türkçe / İngilizce dil değişimine uyumlu çalışmak.

   Script sırası önerisi:
   nutrition.js -> allergens.js -> search.js -> modal.js
   ============================================================ */

(() => {
  'use strict';

  const SELECTORS = Object.freeze({
    menuItem: '.menu-item',
    itemName: '.item-name',
    itemPrice: '.item-price',
    itemDescription: '.item-description',
    menuSection: '.menu-section',
    sectionTitle: '.section-title',
    activeLangButton: '.lang-btn.active',
    langButton: '.lang-btn',
  });

  const CSS = Object.freeze({
    searchRoot: 'gmp-search',
    hasQuery: 'has-query',
    isFiltering: 'is-filtering',
    hidden: 'gmp-search-hidden',
    match: 'gmp-search-match',
    active: 'is-active',
    emptyVisible: 'is-visible',
  });

  const STORAGE_KEY = 'goncu-menu-search-state-v1';
  const SEARCH_DEBOUNCE_MS = 90;

  const TEXT = Object.freeze({
    tr: {
      placeholder: 'Menüde ara: ürün, içerik, fiyat...',
      reset: 'Temizle',
      all: 'Tümü',
      resultPrefix: 'sonuç',
      hint: 'Ürün adı, açıklama, kategori ve fiyat içinde arama yapar.',
      emptyTitle: 'Sonuç bulunamadı',
      emptyText: 'Arama kelimesini sadeleştirin veya kategori filtresini tümü olarak değiştirin.',
      searchLabel: 'Menü arama ve filtreleme',
      clearLabel: 'Arama metnini temizle',
      resetLabel: 'Tüm filtreleri temizle',
      categoryLabel: 'Kategori seç',
    },
    en: {
      placeholder: 'Search menu: product, ingredient, price...',
      reset: 'Clear',
      all: 'All',
      resultPrefix: 'results',
      hint: 'Searches inside product name, description, category and price.',
      emptyTitle: 'No results found',
      emptyText: 'Try a simpler keyword or switch the category filter back to all.',
      searchLabel: 'Menu search and filtering',
      clearLabel: 'Clear search text',
      resetLabel: 'Clear all filters',
      categoryLabel: 'Choose category',
    },
  });

  const state = {
    products: [],
    categories: [],
    query: '',
    activeCategory: 'all',
    language: 'tr',
    initialized: false,
    debounceTimer: null,
  };

  const elements = {
    root: null,
    input: null,
    clearButton: null,
    resetButton: null,
    count: null,
    hint: null,
    categories: null,
    empty: null,
    emptyTitle: null,
    emptyText: null,
  };

  /** Türkçe karakterleri arama için güvenli ve sade forma dönüştürür. */
  const normalizeForSearch = (value = '') => String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9₺€$%.,\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  /** Kullanıcıya gösterilecek metinlerde fazla boşlukları temizler. */
  const cleanText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  /** Aktif dili mevcut butondan veya html lang değerinden okur. */
  const getActiveLanguage = () => {
    const activeButton = document.querySelector(SELECTORS.activeLangButton);
    const lang = activeButton?.dataset?.langTrigger || document.documentElement.lang || 'tr';
    return lang === 'en' ? 'en' : 'tr';
  };

  /** data-lang kullanan mevcut yapıda aktif dile göre metin döndürür. */
  const getLocalizedText = (node, language = state.language) => {
    if (!node) return '';
    const translatedNode = node.querySelector(`[data-lang="${language}"]`);
    return cleanText(translatedNode?.textContent || node.textContent || '');
  };

  /** Bir node içindeki tüm dil varyasyonlarını arama indeksine ekler. */
  const getAllLanguageText = (node) => {
    if (!node) return '';
    const translations = [...node.querySelectorAll('[data-lang]')].map((entry) => entry.textContent);
    return cleanText([node.textContent, ...translations].filter(Boolean).join(' '));
  };

  /** LocalStorage bozuksa sistemi durdurmadan güvenli şekilde okur. */
  const readStoredState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  /** Arama durumunu küçük şekilde saklar; sonraki ziyaretlerde kullanıcıya kolaylık sağlar. */
  const writeStoredState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        query: state.query,
        activeCategory: state.activeCategory,
      }));
    } catch (error) {
      // Depolama kapalıysa sessiz geçilir; arama sistemi çalışmaya devam eder.
    }
  };

  /** HTML içindeki ürünleri ve kategorileri tarayıp filtrelenebilir modele çevirir. */
  const collectProducts = () => {
    const sections = [...document.querySelectorAll(SELECTORS.menuSection)];
    const categoryMap = new Map();

    state.products = [...document.querySelectorAll(SELECTORS.menuItem)].map((item, index) => {
      const section = item.closest(SELECTORS.menuSection);
      const categoryTitle = section?.querySelector(SELECTORS.sectionTitle);
      const categoryTr = getLocalizedText(categoryTitle, 'tr') || `Kategori ${index + 1}`;
      const categoryEn = getLocalizedText(categoryTitle, 'en') || categoryTr;
      const categoryKey = normalizeForSearch(categoryTr || categoryEn || `category-${index}`) || `category-${index}`;
      const nameNode = item.querySelector(SELECTORS.itemName);
      const descriptionNode = item.querySelector(SELECTORS.itemDescription);
      const priceNode = item.querySelector(SELECTORS.itemPrice);

      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, {
          key: categoryKey,
          section,
          label: { tr: categoryTr, en: categoryEn },
          count: 0,
        });
      }

      categoryMap.get(categoryKey).count += 1;

      const searchText = [
        getAllLanguageText(nameNode),
        getAllLanguageText(descriptionNode),
        getAllLanguageText(priceNode),
        categoryTr,
        categoryEn,
      ].join(' ');

      item.dataset.gmpSearchIndex = String(index);
      item.dataset.gmpSearchCategory = categoryKey;
      item.setAttribute('data-gmp-search-ready', 'true');

      return {
        index,
        element: item,
        section,
        categoryKey,
        searchIndex: normalizeForSearch(searchText),
      };
    });

    state.categories = [...categoryMap.values()].filter((category) => category.section);

    sections.forEach((section) => {
      section.setAttribute('data-gmp-search-section', 'true');
    });
  };

  /** Güvenli HTML üretmek için textContent kullanan yardımcıdır. */
  const createElement = (tagName, className, text = '') => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  /** Arama panelini mevcut menünün üzerine otomatik yerleştirir. */
  const createSearchUI = () => {
    if (document.querySelector(`.${CSS.searchRoot}`)) return;

    const firstSection = document.querySelector(SELECTORS.menuSection);
    if (!firstSection) return;

    const labels = TEXT[state.language];
    const root = createElement('section', CSS.searchRoot);
    root.setAttribute('role', 'search');
    root.setAttribute('aria-label', labels.searchLabel);

    const top = createElement('div', 'gmp-search__top');
    const field = createElement('label', 'gmp-search__field');
    const icon = createElement('span', 'gmp-search__icon', '⌕');
    icon.setAttribute('aria-hidden', 'true');

    const input = createElement('input', 'gmp-search__input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = labels.placeholder;
    input.setAttribute('aria-label', labels.searchLabel);

    const clearButton = createElement('button', 'gmp-search__clear', '×');
    clearButton.type = 'button';
    clearButton.setAttribute('aria-label', labels.clearLabel);

    const resetButton = createElement('button', 'gmp-search__reset', labels.reset);
    resetButton.type = 'button';
    resetButton.setAttribute('aria-label', labels.resetLabel);

    field.append(icon, input, clearButton);
    top.append(field, resetButton);

    const meta = createElement('div', 'gmp-search__meta');
    const count = createElement('div', 'gmp-search__count');
    count.setAttribute('aria-live', 'polite');
    const hint = createElement('div', 'gmp-search__hint', labels.hint);
    meta.append(count, hint);

    const categories = createElement('div', 'gmp-search__categories');
    categories.setAttribute('role', 'tablist');
    categories.setAttribute('aria-label', labels.categoryLabel);

    root.append(top, meta, categories);
    firstSection.parentNode.insertBefore(root, firstSection);

    const empty = createElement('section', 'gmp-search-empty');
    empty.setAttribute('aria-live', 'polite');
    const emptyIcon = createElement('div', 'gmp-search-empty__icon', '⌕');
    emptyIcon.setAttribute('aria-hidden', 'true');
    const emptyTitle = createElement('h2', 'gmp-search-empty__title', labels.emptyTitle);
    const emptyText = createElement('p', 'gmp-search-empty__text', labels.emptyText);
    empty.append(emptyIcon, emptyTitle, emptyText);
    root.parentNode.insertBefore(empty, firstSection);

    elements.root = root;
    elements.input = input;
    elements.clearButton = clearButton;
    elements.resetButton = resetButton;
    elements.count = count;
    elements.hint = hint;
    elements.categories = categories;
    elements.empty = empty;
    elements.emptyTitle = emptyTitle;
    elements.emptyText = emptyText;
  };

  /** Kategori butonlarını aktif dile göre yeniden üretir. */
  const renderCategoryButtons = () => {
    if (!elements.categories) return;

    const labels = TEXT[state.language];
    elements.categories.innerHTML = '';

    const allButton = createElement('button', `gmp-search__category ${state.activeCategory === 'all' ? CSS.active : ''}`, labels.all);
    allButton.type = 'button';
    allButton.dataset.categoryKey = 'all';
    allButton.setAttribute('role', 'tab');
    allButton.setAttribute('aria-selected', String(state.activeCategory === 'all'));
    elements.categories.appendChild(allButton);

    state.categories.forEach((category) => {
      const label = category.label[state.language] || category.label.tr || category.key;
      const button = createElement(
        'button',
        `gmp-search__category ${state.activeCategory === category.key ? CSS.active : ''}`,
        `${label} (${category.count})`,
      );
      button.type = 'button';
      button.dataset.categoryKey = category.key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(state.activeCategory === category.key));
      elements.categories.appendChild(button);
    });
  };

  /** UI metinlerini dil değişimine göre günceller. */
  const updateLocalizedUI = () => {
    const labels = TEXT[state.language];
    if (!elements.root) return;

    elements.root.setAttribute('aria-label', labels.searchLabel);
    elements.input.placeholder = labels.placeholder;
    elements.input.setAttribute('aria-label', labels.searchLabel);
    elements.clearButton.setAttribute('aria-label', labels.clearLabel);
    elements.resetButton.textContent = labels.reset;
    elements.resetButton.setAttribute('aria-label', labels.resetLabel);
    elements.hint.textContent = labels.hint;
    elements.emptyTitle.textContent = labels.emptyTitle;
    elements.emptyText.textContent = labels.emptyText;
    elements.categories.setAttribute('aria-label', labels.categoryLabel);

    renderCategoryButtons();
  };

  /** Sonuç sayacını kullanıcının aktif diline göre yazar. */
  const updateCount = (visibleCount) => {
    if (!elements.count) return;
    const labels = TEXT[state.language];
    const total = state.products.length;
    elements.count.innerHTML = '';
    const strong = createElement('strong', '', `${visibleCount}/${total}`);
    const label = document.createTextNode(` ${labels.resultPrefix}`);
    elements.count.append(strong, label);
  };

  /** Filtreleri uygulayıp kartları ve bölümleri gösterir/gizler. */
  const applyFilters = () => {
    const normalizedQuery = normalizeForSearch(state.query);
    const hasQuery = normalizedQuery.length > 0;
    const isCategoryFiltered = state.activeCategory !== 'all';
    const activeSectionMap = new Map();
    let visibleCount = 0;

    state.products.forEach((product) => {
      const matchesQuery = !hasQuery || product.searchIndex.includes(normalizedQuery);
      const matchesCategory = !isCategoryFiltered || product.categoryKey === state.activeCategory;
      const isVisible = matchesQuery && matchesCategory;

      product.element.classList.toggle(CSS.hidden, !isVisible);
      product.element.classList.toggle(CSS.match, isVisible && (hasQuery || isCategoryFiltered));

      if (isVisible) {
        visibleCount += 1;
        activeSectionMap.set(product.section, true);
      }
    });

    document.querySelectorAll(SELECTORS.menuSection).forEach((section) => {
      section.classList.toggle(CSS.hidden, !activeSectionMap.has(section));
    });

    elements.root?.classList.toggle(CSS.hasQuery, hasQuery);
    elements.root?.classList.toggle(CSS.isFiltering, hasQuery || isCategoryFiltered);
    elements.empty?.classList.toggle(CSS.emptyVisible, visibleCount === 0);

    updateCount(visibleCount);
    writeStoredState();
  };

  /** Fazla çalışmayı önlemek için aramayı kısa gecikmeyle uygular. */
  const scheduleFilters = () => {
    window.clearTimeout(state.debounceTimer);
    state.debounceTimer = window.setTimeout(applyFilters, SEARCH_DEBOUNCE_MS);
  };

  /** Input ve buton eventlerini bağlar. */
  const bindEvents = () => {
    elements.input.addEventListener('input', (event) => {
      state.query = event.target.value;
      scheduleFilters();
    });

    elements.clearButton.addEventListener('click', () => {
      state.query = '';
      elements.input.value = '';
      elements.input.focus();
      applyFilters();
    });

    elements.resetButton.addEventListener('click', () => {
      state.query = '';
      state.activeCategory = 'all';
      elements.input.value = '';
      renderCategoryButtons();
      applyFilters();
      elements.input.focus();
    });

    elements.categories.addEventListener('click', (event) => {
      const button = event.target.closest('.gmp-search__category');
      if (!button) return;
      state.activeCategory = button.dataset.categoryKey || 'all';
      renderCategoryButtons();
      applyFilters();
    });

    document.querySelectorAll(SELECTORS.langButton).forEach((button) => {
      button.addEventListener('click', () => {
        window.setTimeout(() => {
          state.language = getActiveLanguage();
          collectProducts();
          updateLocalizedUI();
          applyFilters();
        }, 0);
      });
    });

    window.addEventListener('pageshow', () => {
      state.language = getActiveLanguage();
      updateLocalizedUI();
      applyFilters();
    });
  };

  /** Sistemi başlatır; mevcut HTML yoksa sessizce çıkılır. */
  const init = () => {
    if (state.initialized) return;
    if (!document.querySelector(SELECTORS.menuItem) || !document.querySelector(SELECTORS.menuSection)) return;

    state.initialized = true;
    state.language = getActiveLanguage();

    const stored = readStoredState();
    state.query = typeof stored.query === 'string' ? stored.query : '';
    state.activeCategory = typeof stored.activeCategory === 'string' ? stored.activeCategory : 'all';

    collectProducts();

    if (state.activeCategory !== 'all' && !state.categories.some((category) => category.key === state.activeCategory)) {
      state.activeCategory = 'all';
    }

    createSearchUI();
    renderCategoryButtons();
    updateLocalizedUI();

    if (elements.input) {
      elements.input.value = state.query;
    }

    bindEvents();
    applyFilters();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  /** Diğer sprintlerde gerekirse arama sistemine erişim için küçük public API. */
  window.GoncuSearch = Object.freeze({
    refresh() {
      collectProducts();
      renderCategoryButtons();
      applyFilters();
    },
    reset() {
      state.query = '';
      state.activeCategory = 'all';
      if (elements.input) elements.input.value = '';
      renderCategoryButtons();
      applyFilters();
    },
    getState() {
      return {
        query: state.query,
        activeCategory: state.activeCategory,
        visibleCount: state.products.filter((product) => !product.element.classList.contains(CSS.hidden)).length,
        totalCount: state.products.length,
      };
    },
  });
})();
