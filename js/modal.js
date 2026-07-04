/**
 * GÖNCÜ MENU PRO - Sprint 2 Modal System
 * ------------------------------------------------------------
 * Vanilla JavaScript ile çalışan premium ürün popup sistemi.
 * Mevcut index.html içindeki .menu-item yapısını bozmadan okur,
 * modal HTML'ini otomatik oluşturur ve ürün verilerini kartlardan çeker.
 *
 * Desteklenen mevcut HTML alanları:
 * - .menu-item
 * - .item-image
 * - .item-name
 * - .item-price
 * - .item-description
 * - .menu-section > .section-title
 */
(() => {
  'use strict';

  const SELECTORS = Object.freeze({
    menuItem: '.menu-item',
    itemImage: '.item-image',
    itemName: '.item-name',
    itemPrice: '.item-price',
    itemDescription: '.item-description',
    section: '.menu-section',
    sectionTitle: '.section-title',
    activeLangButton: '.lang-btn.active',
  });

  const CSS = Object.freeze({
    open: 'is-open',
    closing: 'is-closing',
    imageZoomed: 'is-zoomed',
    bodyLocked: 'gmp-modal-open',
    ready: 'gmp-ready',
  });

  const SWIPE_THRESHOLD = 48;
  const EMPTY_TEXT = 'Detay bilgisi yakında eklenecek.';

  let state = {
    items: [],
    currentIndex: -1,
    lastFocusedElement: null,
    touchStartX: 0,
    touchStartY: 0,
    isPointerDown: false,
  };

  let elements = {};

  /**
   * Fazla boşlukları temizleyerek kullanıcıya düzenli metin gösterir.
   * @param {string} value
   * @returns {string}
   */
  const normalizeText = (value = '') => value.replace(/\s+/g, ' ').trim();

  /**
   * Türkçe karakterleri de güvenli şekilde slug formatına çevirir.
   * nutrition.json eşleşmeleri için aynı anahtar kullanılacak.
   * @param {string} value
   * @returns {string}
   */
  const slugify = (value = '') => normalizeText(value)
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
   * Aktif dili mevcut TR/EN butonlarından ya da html lang değerinden algılar.
   * @returns {'tr' | 'en' | string}
   */
  const getActiveLanguage = () => {
    const activeButton = document.querySelector(SELECTORS.activeLangButton);
    return activeButton?.dataset?.langTrigger || document.documentElement.lang || 'tr';
  };

  /**
   * İçinde data-lang bulunan alanlarda aktif dildeki metni alır.
   * data-lang yoksa normal textContent döner.
   * @param {Element|null} node
   * @returns {string}
   */
  const getLocalizedText = (node) => {
    if (!node) return '';
    const activeLanguage = getActiveLanguage();
    const translatedNode = node.querySelector(`[data-lang="${activeLanguage}"]`);
    return normalizeText(translatedNode?.textContent || node.textContent || '');
  };

  /**
   * Bir ürün kartından modal için gerekli tüm bilgileri okur.
   * HTML yapısını değiştirmez; sadece mevcut DOM üzerinden veri çeker.
   * @param {HTMLElement} item
   * @returns {object}
   */
  const extractProductData = (item) => {
    const image = item.querySelector(SELECTORS.itemImage);
    const nameNode = item.querySelector(SELECTORS.itemName);
    const priceNode = item.querySelector(SELECTORS.itemPrice);
    const descriptionNode = item.querySelector(SELECTORS.itemDescription);
    const section = item.closest(SELECTORS.section);
    const categoryNode = section?.querySelector(SELECTORS.sectionTitle);

    const name = getLocalizedText(nameNode) || normalizeText(image?.alt || 'Ürün');
    const description = getLocalizedText(descriptionNode) || EMPTY_TEXT;
    const category = getLocalizedText(categoryNode) || 'Menü';

    return {
      id: item.dataset.productId || slugify(name),
      name,
      price: normalizeText(priceNode?.textContent || ''),
      description,
      category,
      imageSrc: image?.getAttribute('src') || '',
      imageAlt: image?.getAttribute('alt') || name,
      rawElement: item,
    };
  };

  /**
   * Modal HTML'ini tek sefer oluşturur. Böylece index.html içine ekstra modal
   * bloğu eklemeye gerek kalmaz.
   * @returns {HTMLElement}
   */
  const createModalMarkup = () => {
    const modal = document.createElement('div');
    modal.id = 'productModal';
    modal.className = 'gmp-modal product-modal';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="gmp-modal__overlay modal-overlay" data-gmp-close></div>
      <article class="gmp-modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalDescription" tabindex="-1">
        <button class="gmp-modal__close modal-close" type="button" aria-label="Popup kapat" data-gmp-close>
          <span aria-hidden="true">×</span>
        </button>

        <button class="gmp-modal__nav gmp-modal__nav--prev" type="button" aria-label="Önceki ürün" data-gmp-prev>
          <span aria-hidden="true">‹</span>
        </button>

        <figure class="gmp-modal__media">
          <img id="modalImage" class="gmp-modal__image" src="" alt="" decoding="async">
          <figcaption class="gmp-modal__image-hint">Görsele dokunarak yakınlaştır</figcaption>
        </figure>

        <section class="gmp-modal__content">
          <div class="gmp-modal__eyebrow" id="modalCategory">Menü</div>
          <div class="gmp-modal__heading-row">
            <h2 id="modalTitle" class="gmp-modal__title"></h2>
            <div id="modalPrice" class="gmp-modal__price"></div>
          </div>
          <p id="modalDescription" class="gmp-modal__description"></p>

          <div class="gmp-modal__meta" aria-label="Ürün bilgileri">
            <span class="gmp-chip" data-gmp-product-order></span>
            <span class="gmp-chip">Premium Menü</span>
          </div>

          <div class="gmp-modal__nutrition" data-gmp-nutrition hidden>
            <h3>Besin Değerleri</h3>
            <div class="gmp-nutrition-grid" data-gmp-nutrition-grid></div>
          </div>

          <div class="gmp-modal__allergens" data-gmp-allergens hidden>
            <h3>Alerjenler</h3>
            <div class="gmp-allergen-list" data-gmp-allergen-list></div>
          </div>
        </section>

        <button class="gmp-modal__nav gmp-modal__nav--next" type="button" aria-label="Sonraki ürün" data-gmp-next>
          <span aria-hidden="true">›</span>
        </button>
      </article>
    `;

    document.body.appendChild(modal);
    return modal;
  };

  /**
   * Sık kullanılan DOM elemanlarını cache'ler.
   */
  const cacheElements = () => {
    elements.modal = document.getElementById('productModal') || createModalMarkup();
    elements.card = elements.modal.querySelector('.gmp-modal__card');
    elements.closeButtons = elements.modal.querySelectorAll('[data-gmp-close]');
    elements.prevButton = elements.modal.querySelector('[data-gmp-prev]');
    elements.nextButton = elements.modal.querySelector('[data-gmp-next]');
    elements.image = elements.modal.querySelector('#modalImage');
    elements.category = elements.modal.querySelector('#modalCategory');
    elements.title = elements.modal.querySelector('#modalTitle');
    elements.price = elements.modal.querySelector('#modalPrice');
    elements.description = elements.modal.querySelector('#modalDescription');
    elements.order = elements.modal.querySelector('[data-gmp-product-order]');
    elements.nutrition = elements.modal.querySelector('[data-gmp-nutrition]');
    elements.nutritionGrid = elements.modal.querySelector('[data-gmp-nutrition-grid]');
    elements.allergens = elements.modal.querySelector('[data-gmp-allergens]');
    elements.allergenList = elements.modal.querySelector('[data-gmp-allergen-list]');
  };

  /**
   * Ürün görsellerine lazy loading ve async decode ekler.
   */
  const prepareImages = () => {
    document.querySelectorAll(SELECTORS.itemImage).forEach((image) => {
      image.loading = image.loading || 'lazy';
      image.decoding = image.decoding || 'async';
    });
  };

  /**
   * Tüm ürünleri yeniden toplar. İleride HTML'e yeni ürün eklenirse tekrar
   * çağrıldığında otomatik dahil olur.
   */
  const collectItems = () => {
    state.items = Array.from(document.querySelectorAll(SELECTORS.menuItem));

    state.items.forEach((item, index) => {
      item.dataset.gmpIndex = String(index);
      item.classList.add(CSS.ready);
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${getLocalizedText(item.querySelector(SELECTORS.itemName)) || 'Ürün'} detayını aç`);
    });
  };

  /**
   * Sprint 2 için hazır bağlantı noktasıdır. window.GoncuNutrition varsa
   * besin değerlerini modal içinde gösterir; yoksa alanı gizler.
   * @param {object} product
   */
  const renderNutrition = (product) => {
    const api = window.GoncuNutrition;
    const nutrition = typeof api?.getByProductData === 'function'
      ? api.getByProductData(product)
      : (typeof api?.getByProductName === 'function' ? api.getByProductName(product.name, product.category) : null);

    if (!nutrition || !elements.nutritionGrid) {
      elements.nutrition.hidden = true;
      return;
    }

    const nutritionRows = [
      ['Kalori', nutrition.calories, 'kcal'],
      ['Protein', nutrition.protein, 'g'],
      ['Karbonhidrat', nutrition.carbohydrate, 'g'],
      ['Yağ', nutrition.fat, 'g'],
      ['Doymuş Yağ', nutrition.saturatedFat, 'g'],
      ['Şeker', nutrition.sugar, 'g'],
      ['Lif', nutrition.fiber, 'g'],
      ['Tuz', nutrition.salt, 'g'],
      ['Porsiyon', nutrition.portion, ''],
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');

    elements.nutritionGrid.innerHTML = nutritionRows.map(([label, value, unit]) => `
      <div class="gmp-nutrition-item">
        <span>${label}</span>
        <strong>${value}${unit ? ` ${unit}` : ''}</strong>
      </div>
    `).join('');

    elements.nutrition.hidden = nutritionRows.length === 0;
  };

  /**
   * Sprint 3 için hazır bağlantı noktasıdır. window.GoncuNutrition varsa
   * alerjen listesini modal içinde ikonlu gösterir; yoksa alanı gizler.
   * @param {object} product
   */
  const renderAllergens = (product) => {
    const api = window.GoncuNutrition;
    const nutrition = typeof api?.getByProductData === 'function'
      ? api.getByProductData(product)
      : (typeof api?.getByProductName === 'function' ? api.getByProductName(product.name, product.category) : null);

    if (!nutrition?.allergens?.length || !elements.allergenList) {
      elements.allergens.hidden = true;
      return;
    }

    elements.allergenList.innerHTML = nutrition.allergens.map((allergen) => `
      <span class="gmp-allergen-pill">${allergen.icon || '•'} ${allergen.name || allergen}</span>
    `).join('');

    elements.allergens.hidden = false;
  };

  /**
   * Modal içeriğini seçilen ürüne göre yeniler.
   * @param {number} index
   */
  const renderProduct = (index) => {
    const item = state.items[index];
    if (!item) return;

    const product = extractProductData(item);
    state.currentIndex = index;

    elements.card.classList.remove(CSS.imageZoomed);
    elements.image.src = product.imageSrc;
    elements.image.alt = product.imageAlt || product.name;
    elements.category.textContent = product.category;
    elements.title.textContent = product.name;
    elements.price.textContent = product.price;
    elements.description.textContent = product.description;
    elements.order.textContent = `${index + 1} / ${state.items.length}`;

    elements.prevButton.disabled = state.items.length < 2;
    elements.nextButton.disabled = state.items.length < 2;

    renderNutrition(product);
    renderAllergens(product);
  };

  /**
   * Modalı seçili ürünle açar.
   * @param {number} index
   */
  const openModal = (index) => {
    if (!state.items[index]) return;

    state.lastFocusedElement = document.activeElement;
    renderProduct(index);

    elements.modal.hidden = false;
    requestAnimationFrame(() => {
      elements.modal.classList.add(CSS.open);
      elements.modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add(CSS.bodyLocked);
      elements.card.focus({ preventScroll: true });
    });
  };

  /**
   * Modalı yumuşak animasyonla kapatır.
   */
  const closeModal = () => {
    if (!elements.modal.classList.contains(CSS.open)) return;

    elements.modal.classList.add(CSS.closing);
    elements.modal.classList.remove(CSS.open);
    elements.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove(CSS.bodyLocked);

    window.setTimeout(() => {
      elements.modal.classList.remove(CSS.closing);
      elements.modal.hidden = true;
      elements.image.removeAttribute('src');
      state.lastFocusedElement?.focus?.({ preventScroll: true });
    }, 220);
  };

  /**
   * Ürünler arasında ileri/geri geçiş yapar.
   * @param {1|-1} direction
   */
  const navigateProduct = (direction) => {
    if (state.items.length < 2) return;
    const nextIndex = (state.currentIndex + direction + state.items.length) % state.items.length;
    renderProduct(nextIndex);
  };

  /**
   * Modal açıkken Tab odağını dialog içinde tutar.
   * @param {KeyboardEvent} event
   */
  const trapFocus = (event) => {
    if (event.key !== 'Tab' || !elements.modal.classList.contains(CSS.open)) return;

    const focusable = Array.from(elements.modal.querySelectorAll(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ));

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /**
   * Klavye kısayollarını yönetir.
   * @param {KeyboardEvent} event
   */
  const handleKeyboard = (event) => {
    if (!elements.modal.classList.contains(CSS.open)) return;

    if (event.key === 'Escape') closeModal();
    if (event.key === 'ArrowLeft') navigateProduct(-1);
    if (event.key === 'ArrowRight') navigateProduct(1);
    trapFocus(event);
  };

  /**
   * Mobil swipe hareketini başlatır.
   * @param {PointerEvent|TouchEvent} event
   */
  const handlePointerStart = (event) => {
    const point = event.touches?.[0] || event;
    state.touchStartX = point.clientX;
    state.touchStartY = point.clientY;
    state.isPointerDown = true;
  };

  /**
   * Mobil swipe hareketini tamamlar.
   * @param {PointerEvent|TouchEvent} event
   */
  const handlePointerEnd = (event) => {
    if (!state.isPointerDown) return;

    const point = event.changedTouches?.[0] || event;
    const diffX = point.clientX - state.touchStartX;
    const diffY = point.clientY - state.touchStartY;

    state.isPointerDown = false;

    if (Math.abs(diffX) < SWIPE_THRESHOLD || Math.abs(diffX) < Math.abs(diffY)) return;
    navigateProduct(diffX < 0 ? 1 : -1);
  };

  /**
   * Kullanıcı etkileşimlerini tek merkezden bağlar.
   */
  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      const item = event.target.closest(SELECTORS.menuItem);
      if (!item || elements.modal.contains(event.target)) return;
      openModal(Number(item.dataset.gmpIndex));
    });

    document.addEventListener('keydown', (event) => {
      const item = event.target.closest?.(SELECTORS.menuItem);
      if (item && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openModal(Number(item.dataset.gmpIndex));
        return;
      }

      handleKeyboard(event);
    });

    elements.closeButtons.forEach((button) => button.addEventListener('click', closeModal));
    elements.prevButton.addEventListener('click', () => navigateProduct(-1));
    elements.nextButton.addEventListener('click', () => navigateProduct(1));
    elements.image.addEventListener('click', () => elements.card.classList.toggle(CSS.imageZoomed));

    elements.card.addEventListener('pointerdown', handlePointerStart, { passive: true });
    elements.card.addEventListener('pointerup', handlePointerEnd, { passive: true });
    elements.card.addEventListener('touchstart', handlePointerStart, { passive: true });
    elements.card.addEventListener('touchend', handlePointerEnd, { passive: true });

    window.addEventListener('goncu:nutrition-ready', () => {
      if (elements.modal.classList.contains(CSS.open) && state.currentIndex >= 0) {
        renderProduct(state.currentIndex);
      }
    });

    window.addEventListener('resize', () => {
      if (elements.modal.classList.contains(CSS.open)) elements.card.focus({ preventScroll: true });
    });
  };

  /**
   * Dışarıdan ürünler güncellenirse manuel yenileme imkanı verir.
   */
  const exposePublicApi = () => {
    window.GoncuMenuModal = Object.freeze({
      refresh() {
        prepareImages();
        collectItems();
      },
      openByIndex(index) {
        openModal(Number(index));
      },
      close() {
        closeModal();
      },
      getItems() {
        return state.items.map(extractProductData);
      },
    });
  };

  /**
   * Modal sistemini başlatır.
   */
  const init = () => {
    cacheElements();
    prepareImages();
    collectItems();
    bindEvents();
    exposePublicApi();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
