/**
 * GÖNCÜ MENU PRO - SPRINT 7
 * Favorites System
 * ------------------------------------------------------------
 * Mevcut HTML yapısını bozmadan ürünlere favori butonu ekler.
 * Favoriler localStorage içinde saklanır ve sonraki ziyaretlerde korunur.
 *
 * Desteklenen mevcut HTML alanları:
 * - .menu-item
 * - .item-image
 * - .item-name
 * - .item-price
 * - .item-description
 * - .menu-section > .section-title
 *
 * Script sırası önerisi:
 * nutrition.js -> allergens.js -> search.js -> modal.js -> favorites.js -> animations.js
 */
(() => {
  'use strict';

  const SELECTORS = Object.freeze({
    menuItem: '.menu-item',
    itemImage: '.item-image',
    itemName: '.item-name',
    itemPrice: '.item-price',
    itemDescription: '.item-description',
    menuSection: '.menu-section',
    sectionTitle: '.section-title',
    searchRoot: '.gmp-search',
    searchInput: '.gmp-search__input',
    activeLangButton: '.lang-btn.active',
    langButton: '.lang-btn, .language-btn, [data-lang-trigger], [data-language], [data-set-lang]'
  });

  const CSS = Object.freeze({
    ready: 'gmp-favorites-ready',
    favorite: 'is-favorite',
    itemHidden: 'gmp-favorite-hidden',
    sectionHidden: 'gmp-favorite-section-hidden',
    toolbar: 'gmp-favorites-toolbar',
    drawerOpen: 'is-open',
    filterActive: 'is-filter-active',
    empty: 'is-empty'
  });

  const STORAGE_KEY = 'goncu-menu-favorites-v1';
  const FILTER_STORAGE_KEY = 'goncu-menu-favorites-filter-v1';
  const OBSERVER_THROTTLE_MS = 80;

  const TEXT = Object.freeze({
    tr: {
      favorite: 'Favorilere ekle',
      unfavorite: 'Favorilerden çıkar',
      favorites: 'Favoriler',
      favoritesShort: 'Favoriler',
      close: 'Favoriler panelini kapat',
      open: 'Favoriler panelini aç',
      onlyFavorites: 'Sadece favoriler',
      showAll: 'Tümünü göster',
      emptyTitle: 'Henüz favori ürün yok',
      emptyText: 'Beğendiğiniz ürünlerin kalp ikonuna dokunarak favorilerinize ekleyebilirsiniz.',
      saved: 'Kaydedildi',
      remove: 'Kaldır',
      openProduct: 'Ürün detayını aç',
      countSuffix: 'ürün',
      clearAll: 'Favorileri temizle',
      clearConfirm: 'Tüm favorileri temizlemek istediğinizden emin misiniz?'
    },
    en: {
      favorite: 'Add to favorites',
      unfavorite: 'Remove from favorites',
      favorites: 'Favorites',
      favoritesShort: 'Favorites',
      close: 'Close favorites panel',
      open: 'Open favorites panel',
      onlyFavorites: 'Only favorites',
      showAll: 'Show all',
      emptyTitle: 'No favorite items yet',
      emptyText: 'Tap the heart icon on products you like to add them to favorites.',
      saved: 'Saved',
      remove: 'Remove',
      openProduct: 'Open product details',
      countSuffix: 'items',
      clearAll: 'Clear favorites',
      clearConfirm: 'Are you sure you want to clear all favorites?'
    }
  });

  const state = {
    items: [],
    favoriteIds: new Set(),
    language: 'tr',
    filterOnlyFavorites: false,
    initialized: false,
    refreshTimer: null,
    classObserver: null
  };

  const elements = {
    toolbar: null,
    count: null,
    openButton: null,
    filterButton: null,
    drawer: null,
    drawerCount: null,
    drawerList: null,
    empty: null,
    clearAllButton: null,
    modalFavoriteButton: null
  };

  /**
   * Kullanıcıya gösterilecek metinlerde fazla boşlukları temizler.
   * @param {string} value
   * @returns {string}
   */
  const cleanText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  /**
   * Türkçe karakterleri de güvenli şekilde slug formatına çevirir.
   * @param {string} value
   * @returns {string}
   */
  const slugify = (value = '') => cleanText(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  /**
   * Aktif dili mevcut TR/EN butonlarından, html lang değerinden veya localStorage içinden algılar.
   * @returns {'tr'|'en'}
   */
  const getActiveLanguage = () => {
    const activeButton = document.querySelector([
      SELECTORS.activeLangButton,
      '.language-btn.active',
      '.language-switch .active',
      '[data-lang-trigger].active',
      '[data-language].active',
      '[data-set-lang].active'
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

    const activeText = cleanText(activeButton?.textContent || '').toLowerCase();
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
    return htmlLanguage.startsWith('en') ? 'en' : 'tr';
  };

  const t = (key) => TEXT[state.language]?.[key] || TEXT.tr[key] || key;

  /**
   * data-lang yapısı kullanan alanlardan aktif dile göre metin okur.
   * @param {Element|null} node
   * @param {'tr'|'en'} language
   * @returns {string}
   */
  const getLocalizedText = (node, language = state.language) => {
    if (!node) return '';
    const translatedNode = node.querySelector(`[data-lang="${language}"]`);
    return cleanText(translatedNode?.textContent || node.textContent || '');
  };

  /**
   * Stabil favori ID üretir. Aynı isimli ürünlerde kategori de ID'ye dahil edilir.
   * @param {HTMLElement} item
   * @param {number} index
   * @returns {string}
   */
  const getFavoriteId = (item, index = 0) => {
    if (item.dataset.productId) return item.dataset.productId;
    if (item.dataset.gmpFavoriteId) return item.dataset.gmpFavoriteId;

    const nameNode = item.querySelector(SELECTORS.itemName);
    const section = item.closest(SELECTORS.menuSection);
    const categoryNode = section?.querySelector(SELECTORS.sectionTitle);
    const nameTr = getLocalizedText(nameNode, 'tr');
    const nameEn = getLocalizedText(nameNode, 'en');
    const categoryTr = getLocalizedText(categoryNode, 'tr');
    const image = item.querySelector(SELECTORS.itemImage);
    const fallback = image?.getAttribute('alt') || `product-${index}`;
    const stableKey = [categoryTr, nameTr || nameEn || fallback].filter(Boolean).join(' ');

    return slugify(stableKey) || `product-${index}`;
  };

  /**
   * Ürün kartından favori paneli için gerekli bilgileri okur.
   * @param {HTMLElement} item
   * @param {number} index
   * @returns {object}
   */
  const extractProduct = (item, index) => {
    const image = item.querySelector(SELECTORS.itemImage);
    const nameNode = item.querySelector(SELECTORS.itemName);
    const priceNode = item.querySelector(SELECTORS.itemPrice);
    const section = item.closest(SELECTORS.menuSection);
    const categoryNode = section?.querySelector(SELECTORS.sectionTitle);
    const id = getFavoriteId(item, index);

    item.dataset.gmpFavoriteId = id;

    return {
      id,
      index,
      element: item,
      section,
      name: getLocalizedText(nameNode) || cleanText(image?.alt || 'Ürün'),
      nameTr: getLocalizedText(nameNode, 'tr'),
      nameEn: getLocalizedText(nameNode, 'en'),
      category: getLocalizedText(categoryNode) || '',
      price: cleanText(priceNode?.textContent || ''),
      imageSrc: image?.getAttribute('src') || '',
      imageAlt: image?.getAttribute('alt') || getLocalizedText(nameNode) || 'Ürün'
    };
  };

  /**
   * localStorage içinden favorileri güvenli şekilde okur.
   * @returns {Set<string>}
   */
  const readFavorites = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []);
    } catch (error) {
      return new Set();
    }
  };

  /**
   * Favori filtre durumunu güvenli şekilde okur.
   * @returns {boolean}
   */
  const readFilterState = () => {
    try {
      return localStorage.getItem(FILTER_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  };

  /**
   * localStorage içine favorileri kaydeder.
   */
  const writeFavorites = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favoriteIds]));
    } catch (error) {
      // Depolama kapalıysa favori arayüzü mevcut oturumda çalışmaya devam eder.
    }
  };

  /**
   * Favori filtre durumunu kaydeder.
   */
  const writeFilterState = () => {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, String(state.filterOnlyFavorites));
    } catch (error) {
      // Sessiz geçilir.
    }
  };

  /**
   * Güvenli DOM üretimi için yardımcıdır.
   * @param {string} tagName
   * @param {string} className
   * @param {string} text
   * @returns {HTMLElement}
   */
  const createElement = (tagName, className = '', text = '') => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  /**
   * Favori araç çubuğunu ve drawer panelini oluşturur.
   */
  const createFavoritesUI = () => {
    if (document.querySelector(`.${CSS.toolbar}`)) return;

    const root = createElement('section', CSS.toolbar);
    root.setAttribute('aria-label', t('favorites'));

    const openButton = createElement('button', 'gmp-favorites-toolbar__button');
    openButton.type = 'button';
    openButton.innerHTML = '<span class="gmp-favorites-toolbar__icon" aria-hidden="true">♡</span><span class="gmp-favorites-toolbar__label"></span><strong class="gmp-favorites-toolbar__count">0</strong>';

    const filterButton = createElement('button', 'gmp-favorites-toolbar__filter');
    filterButton.type = 'button';

    root.append(openButton, filterButton);

    const searchRoot = document.querySelector(SELECTORS.searchRoot);
    const firstSection = document.querySelector(SELECTORS.menuSection);
    if (searchRoot?.parentNode) {
      searchRoot.insertAdjacentElement('afterend', root);
    } else if (firstSection?.parentNode) {
      firstSection.parentNode.insertBefore(root, firstSection);
    } else {
      document.body.appendChild(root);
    }

    const drawer = createElement('aside', 'gmp-favorites-drawer');
    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('aria-label', t('favorites'));
    drawer.innerHTML = `
      <div class="gmp-favorites-drawer__overlay" data-gmp-favorites-close></div>
      <div class="gmp-favorites-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="gmpFavoritesTitle" tabindex="-1">
        <header class="gmp-favorites-drawer__header">
          <div>
            <span class="gmp-favorites-drawer__eyebrow">${t('saved')}</span>
            <h2 id="gmpFavoritesTitle" class="gmp-favorites-drawer__title">${t('favorites')}</h2>
          </div>
          <button type="button" class="gmp-favorites-drawer__close" data-gmp-favorites-close aria-label="${t('close')}">×</button>
        </header>
        <div class="gmp-favorites-drawer__meta">
          <span class="gmp-favorites-drawer__count">0 ${t('countSuffix')}</span>
          <button type="button" class="gmp-favorites-drawer__clear">${t('clearAll')}</button>
        </div>
        <div class="gmp-favorites-drawer__list" aria-live="polite"></div>
        <div class="gmp-favorites-drawer__empty">
          <span aria-hidden="true">♡</span>
          <h3>${t('emptyTitle')}</h3>
          <p>${t('emptyText')}</p>
        </div>
      </div>
    `;

    document.body.appendChild(drawer);

    elements.toolbar = root;
    elements.openButton = openButton;
    elements.count = openButton.querySelector('.gmp-favorites-toolbar__count');
    elements.filterButton = filterButton;
    elements.drawer = drawer;
    elements.drawerCount = drawer.querySelector('.gmp-favorites-drawer__count');
    elements.drawerList = drawer.querySelector('.gmp-favorites-drawer__list');
    elements.empty = drawer.querySelector('.gmp-favorites-drawer__empty');
    elements.clearAllButton = drawer.querySelector('.gmp-favorites-drawer__clear');
  };

  /**
   * Ürün kartlarına favori kalp butonlarını ekler.
   */
  const ensureCardButtons = () => {
    state.items.forEach((product) => {
      const item = product.element;
      if (item.querySelector('.gmp-favorite-toggle')) return;

      const button = createElement('button', 'gmp-favorite-toggle');
      button.type = 'button';
      button.dataset.gmpFavoriteToggle = product.id;
      button.innerHTML = '<span aria-hidden="true">♡</span>';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(product.id);
      });

      item.appendChild(button);
    });
  };

  /**
   * Modal içindeki ürün için kalp butonu oluşturur veya günceller.
   */
  const ensureModalFavoriteButton = () => {
    const modal = document.getElementById('productModal');
    const card = modal?.querySelector('.gmp-modal__card');
    if (!modal || !card) return;

    let button = modal.querySelector('.gmp-modal-favorite');
    if (!button) {
      button = createElement('button', 'gmp-modal-favorite');
      button.type = 'button';
      button.innerHTML = '<span aria-hidden="true">♡</span><span class="gmp-modal-favorite__text"></span>';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const product = getCurrentModalProduct();
        if (product) toggleFavorite(product.id);
      });

      const preferredTarget = card.querySelector('.gmp-modal__content, .gmp-modal__body, .gmp-modal__info') || card;
      preferredTarget.prepend(button);
    }

    elements.modalFavoriteButton = button;
    updateModalFavoriteButton();
  };

  /**
   * Modalda açık olan ürünü ürün listesiyle eşleştirir.
   * @returns {object|null}
   */
  const getCurrentModalProduct = () => {
    const title = cleanText(document.getElementById('modalTitle')?.textContent || '');
    const price = cleanText(document.getElementById('modalPrice')?.textContent || '');
    if (!title) return null;

    return state.items.find((product) => {
      const names = [product.name, product.nameTr, product.nameEn].filter(Boolean).map(cleanText);
      return names.includes(title) && (!price || cleanText(product.price) === price);
    }) || state.items.find((product) => [product.name, product.nameTr, product.nameEn].filter(Boolean).map(cleanText).includes(title)) || null;
  };

  /**
   * Menüdeki ürünleri tarar ve favori modelini yeniler.
   */
  const collectItems = () => {
    state.items = [...document.querySelectorAll(SELECTORS.menuItem)].map((item, index) => extractProduct(item, index));
    state.items.forEach((product) => {
      product.element.classList.add(CSS.ready);
      product.element.classList.toggle(CSS.favorite, state.favoriteIds.has(product.id));
    });
  };

  /**
   * Favori durumunu değiştirir.
   * @param {string} id
   */
  const toggleFavorite = (id) => {
    if (!id) return;
    if (state.favoriteIds.has(id)) {
      state.favoriteIds.delete(id);
    } else {
      state.favoriteIds.add(id);
    }
    writeFavorites();
    updateUI();
    window.dispatchEvent(new CustomEvent('goncu:favorites-change', {
      detail: { ids: [...state.favoriteIds] }
    }));
  };

  /**
   * Favori panelini açar.
   */
  const openDrawer = () => {
    renderDrawerList();
    elements.drawer.hidden = false;
    requestAnimationFrame(() => {
      elements.drawer.classList.add(CSS.drawerOpen);
      elements.drawer.setAttribute('aria-hidden', 'false');
      elements.drawer.querySelector('.gmp-favorites-drawer__panel')?.focus({ preventScroll: true });
    });
  };

  /**
   * Favori panelini kapatır.
   */
  const closeDrawer = () => {
    if (!elements.drawer || !elements.drawer.classList.contains(CSS.drawerOpen)) return;
    elements.drawer.classList.remove(CSS.drawerOpen);
    elements.drawer.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      elements.drawer.hidden = true;
      elements.openButton?.focus?.({ preventScroll: true });
    }, 220);
  };

  /**
   * Sadece favoriler filtresini açar/kapatır.
   */
  const toggleFavoriteFilter = () => {
    state.filterOnlyFavorites = !state.filterOnlyFavorites;
    writeFilterState();
    updateUI();
  };

  /**
   * Tüm favorileri temizler.
   */
  const clearAllFavorites = () => {
    if (!state.favoriteIds.size) return;
    if (!window.confirm(t('clearConfirm'))) return;
    state.favoriteIds.clear();
    state.filterOnlyFavorites = false;
    writeFavorites();
    writeFilterState();
    updateUI();
  };

  /**
   * Favori panelindeki listeyi günceller.
   */
  const renderDrawerList = () => {
    if (!elements.drawerList) return;
    const favoriteProducts = state.items.filter((product) => state.favoriteIds.has(product.id));
    elements.drawerList.innerHTML = '';

    favoriteProducts.forEach((product) => {
      const row = createElement('article', 'gmp-favorite-row');
      row.dataset.gmpFavoriteRow = product.id;

      const image = createElement('img', 'gmp-favorite-row__image');
      image.src = product.imageSrc;
      image.alt = product.imageAlt || product.name;
      image.loading = 'lazy';
      image.decoding = 'async';

      const content = createElement('button', 'gmp-favorite-row__content');
      content.type = 'button';
      content.setAttribute('aria-label', `${product.name} ${t('openProduct')}`);
      content.addEventListener('click', () => {
        closeDrawer();
        window.setTimeout(() => openProduct(product), 230);
      });

      const title = createElement('strong', 'gmp-favorite-row__title', product.name);
      const meta = createElement('span', 'gmp-favorite-row__meta', [product.category, product.price].filter(Boolean).join(' • '));
      content.append(title, meta);

      const remove = createElement('button', 'gmp-favorite-row__remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `${product.name} ${t('remove')}`);
      remove.addEventListener('click', () => toggleFavorite(product.id));

      row.append(image, content, remove);
      elements.drawerList.appendChild(row);
    });

    const isEmpty = favoriteProducts.length === 0;
    elements.drawer?.classList.toggle(CSS.empty, isEmpty);
    if (elements.empty) elements.empty.hidden = !isEmpty;
  };

  /**
   * Ürünü mevcut modal sistemi üzerinden açar.
   * @param {object} product
   */
  const openProduct = (product) => {
    if (!product?.element) return;
    if (window.GoncuMenuModal?.openByIndex) {
      const modalIndex = Number(product.element.dataset.gmpIndex || product.index);
      window.GoncuMenuModal.openByIndex(modalIndex);
      return;
    }
    product.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  /**
   * Arama sistemiyle çakışmadan sadece favori filtre sınıflarını uygular.
   */
  const applyFavoriteFilter = () => {
    state.items.forEach((product) => {
      const shouldHide = state.filterOnlyFavorites && !state.favoriteIds.has(product.id);
      product.element.classList.toggle(CSS.itemHidden, shouldHide);
    });

    document.querySelectorAll(SELECTORS.menuSection).forEach((section) => {
      const visibleFavoriteItems = [...section.querySelectorAll(SELECTORS.menuItem)].filter((item) => {
        const isFavorite = item.classList.contains(CSS.favorite);
        const isHiddenBySearch = item.classList.contains('gmp-search-hidden');
        const isHiddenByFavorite = item.classList.contains(CSS.itemHidden);
        return isFavorite && !isHiddenBySearch && !isHiddenByFavorite;
      });

      section.classList.toggle(CSS.sectionHidden, state.filterOnlyFavorites && visibleFavoriteItems.length === 0);
    });
  };

  /**
   * Kart, toolbar, drawer ve modal favori butonlarını günceller.
   */
  const updateUI = () => {
    collectItems();
    ensureCardButtons();

    const count = state.favoriteIds.size;
    const toolbarLabel = elements.openButton?.querySelector('.gmp-favorites-toolbar__label');
    const toolbarIcon = elements.openButton?.querySelector('.gmp-favorites-toolbar__icon');

    if (toolbarLabel) toolbarLabel.textContent = t('favoritesShort');
    if (toolbarIcon) toolbarIcon.textContent = count > 0 ? '♥' : '♡';
    if (elements.count) elements.count.textContent = String(count);

    elements.openButton?.setAttribute('aria-label', `${t('open')} (${count})`);
    elements.filterButton.textContent = state.filterOnlyFavorites ? t('showAll') : t('onlyFavorites');
    elements.filterButton.classList.toggle(CSS.filterActive, state.filterOnlyFavorites);
    elements.filterButton.setAttribute('aria-pressed', String(state.filterOnlyFavorites));

    state.items.forEach((product) => {
      const isFavorite = state.favoriteIds.has(product.id);
      product.element.classList.toggle(CSS.favorite, isFavorite);
      const favoriteButtons = product.element.querySelectorAll('.gmp-favorite-toggle');
      favoriteButtons.forEach((button) => {
        button.classList.toggle(CSS.favorite, isFavorite);
        button.setAttribute('aria-label', isFavorite ? t('unfavorite') : t('favorite'));
        button.setAttribute('aria-pressed', String(isFavorite));
        const icon = button.querySelector('span');
        if (icon) icon.textContent = isFavorite ? '♥' : '♡';
      });
    });

    if (elements.drawerCount) elements.drawerCount.textContent = `${count} ${t('countSuffix')}`;
    if (elements.clearAllButton) {
      elements.clearAllButton.textContent = t('clearAll');
      elements.clearAllButton.disabled = count === 0;
    }

    renderDrawerList();
    applyFavoriteFilter();
    ensureModalFavoriteButton();
  };

  /**
   * CSS.escape olmayan eski tarayıcılarda güvenli buton güncelleme için küçük polyfill.
   */
  const ensureCssEscape = () => {
    if (window.CSS?.escape) return;
    window.CSS = window.CSS || {};
    window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  };

  /**
   * Modal favori butonunu açık ürüne göre günceller.
   */
  const updateModalFavoriteButton = () => {
    const button = elements.modalFavoriteButton;
    if (!button) return;

    const product = getCurrentModalProduct();
    if (!product) {
      button.hidden = true;
      return;
    }

    const isFavorite = state.favoriteIds.has(product.id);
    button.hidden = false;
    button.classList.toggle(CSS.favorite, isFavorite);
    button.setAttribute('aria-label', isFavorite ? t('unfavorite') : t('favorite'));
    button.setAttribute('aria-pressed', String(isFavorite));
    const icon = button.querySelector('span[aria-hidden="true"]');
    const text = button.querySelector('.gmp-modal-favorite__text');
    if (icon) icon.textContent = isFavorite ? '♥' : '♡';
    if (text) text.textContent = isFavorite ? t('unfavorite') : t('favorite');
  };

  /**
   * Dil değiştiğinde arayüz metinlerini ve ürün isimlerini günceller.
   */
  const refreshLanguage = () => {
    window.setTimeout(() => {
      state.language = getActiveLanguage();
      collectItems();
      if (elements.toolbar) elements.toolbar.setAttribute('aria-label', t('favorites'));
      if (elements.drawer) elements.drawer.setAttribute('aria-label', t('favorites'));
      const drawerTitle = document.getElementById('gmpFavoritesTitle');
      if (drawerTitle) drawerTitle.textContent = t('favorites');
      const drawerEyebrow = elements.drawer?.querySelector('.gmp-favorites-drawer__eyebrow');
      if (drawerEyebrow) drawerEyebrow.textContent = t('saved');
      elements.drawer?.querySelectorAll('[data-gmp-favorites-close]').forEach((button) => {
        if (button.tagName === 'BUTTON') button.setAttribute('aria-label', t('close'));
      });
      const emptyTitle = elements.empty?.querySelector('h3');
      const emptyText = elements.empty?.querySelector('p');
      if (emptyTitle) emptyTitle.textContent = t('emptyTitle');
      if (emptyText) emptyText.textContent = t('emptyText');
      updateUI();
    }, 120);
  };

  /**
   * Sık çalışan sınıf değişimlerini tek yenilemeye düşürür.
   */
  const scheduleSectionRefresh = () => {
    window.clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => {
      applyFavoriteFilter();
      updateModalFavoriteButton();
    }, OBSERVER_THROTTLE_MS);
  };

  /**
   * Arama sistemi ürünleri gizlediğinde favori filtre görünümünü güncel tutar.
   */
  const observeSearchChanges = () => {
    state.classObserver?.disconnect?.();
    state.classObserver = new MutationObserver(scheduleSectionRefresh);
    state.items.forEach((product) => {
      state.classObserver.observe(product.element, { attributes: true, attributeFilter: ['class'] });
    });

    document.querySelector(SELECTORS.searchInput)?.addEventListener('input', scheduleSectionRefresh);
  };

  /**
   * Kullanıcı etkileşimlerini bağlar.
   */
  const bindEvents = () => {
    elements.openButton.addEventListener('click', openDrawer);
    elements.filterButton.addEventListener('click', toggleFavoriteFilter);
    elements.clearAllButton.addEventListener('click', clearAllFavorites);

    elements.drawer.addEventListener('click', (event) => {
      if (event.target.closest('[data-gmp-favorites-close]')) closeDrawer();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && elements.drawer?.classList.contains(CSS.drawerOpen)) {
        closeDrawer();
      }
    });

    document.querySelectorAll(SELECTORS.langButton).forEach((button) => {
      button.addEventListener('click', refreshLanguage);
    });

    document.addEventListener('click', (event) => {
      const modal = document.getElementById('productModal');
      if (!modal || !modal.contains(event.target)) return;
      window.setTimeout(updateModalFavoriteButton, 0);
    });

    window.addEventListener('goncu:nutrition-ready', () => window.setTimeout(updateModalFavoriteButton, 0));
    window.addEventListener('pageshow', () => {
      state.language = getActiveLanguage();
      updateUI();
    });
  };

  /**
   * Public API: diğer sprintler veya manuel kullanım için küçük erişim noktası.
   */
  const exposePublicApi = () => {
    window.GoncuFavorites = Object.freeze({
      refresh() {
        collectItems();
        ensureCardButtons();
        observeSearchChanges();
        updateUI();
      },
      add(id) {
        if (!id) return;
        state.favoriteIds.add(String(id));
        writeFavorites();
        updateUI();
      },
      remove(id) {
        state.favoriteIds.delete(String(id));
        writeFavorites();
        updateUI();
      },
      toggle(id) {
        toggleFavorite(String(id));
      },
      clear() {
        state.favoriteIds.clear();
        writeFavorites();
        updateUI();
      },
      getFavorites() {
        return state.items.filter((product) => state.favoriteIds.has(product.id));
      },
      getIds() {
        return [...state.favoriteIds];
      },
      isFavorite(id) {
        return state.favoriteIds.has(String(id));
      }
    });
  };

  /**
   * Favori sistemini başlatır.
   */
  const init = () => {
    if (state.initialized) return;
    if (!document.querySelector(SELECTORS.menuItem)) return;

    state.initialized = true;
    ensureCssEscape();
    state.language = getActiveLanguage();
    state.favoriteIds = readFavorites();
    state.filterOnlyFavorites = readFilterState();

    collectItems();
    createFavoritesUI();
    ensureCardButtons();
    ensureModalFavoriteButton();
    bindEvents();
    observeSearchChanges();
    exposePublicApi();
    updateUI();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
