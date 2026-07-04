/**
 * GÖNCÜ MENU PRO - Modal System / TR-EN Nutrition UI Fix
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

  const I18N = Object.freeze({
    tr: {
      close: 'Popup kapat',
      prev: 'Önceki ürün',
      next: 'Sonraki ürün',
      imageHint: 'Görsele dokunarak yakınlaştır',
      premiumMenu: 'Premium Menü',
      menuFallback: 'Menü',
      emptyDescription: 'Detay bilgisi yakında eklenecek.',
      openDetailsSuffix: 'detayını aç',
      nutritionTitle: 'Besin Değerleri',
      allergenTitle: 'Alerjen Bilgilendirmesi',
      loading: 'Yükleniyor',
      checkRequired: 'Kontrol gerekli',
      nutritionDataSource: 'Besin ve alerjen verileri data/nutrition.json dosyasından otomatik okunur.',
      nutritionLoadError: 'Besin verileri yüklenemedi. data/nutrition.json dosyasının proje klasöründe olduğundan ve sayfanın Live Server / GitHub Pages üzerinden açıldığından emin olun.',
      allergenLoadError: 'Alerjen verileri yüklenemedi. nutrition.json okunamadığı için alerjenler gösterilemiyor.',
      nutritionSystemMissing: 'Besin sistemi bağlantısı bulunamadı. index.html içinde nutrition.js dosyasının modal.js dosyasından önce eklendiğini kontrol edin.',
      nutritionLoading: 'Besin değerleri yükleniyor...',
      nutritionNotFound: 'Bu ürün için nutrition.json içinde eşleşen besin kaydı bulunamadı.',
      allergenSystemMissing: 'Alerjen sistemi için nutrition.js bağlantısı gerekli. Script sırasını kontrol edin.',
      allergenLoading: 'Alerjen bilgileri yükleniyor...',
      allergenNotFound: 'Bu ürün için nutrition.json içinde eşleşen alerjen kaydı bulunamadı.',
      noMainAllergen: 'Bu ürün için kayıtlı ana alerjen işaretlenmedi.',
      noMarkedMainAllergen: 'Kayıtlı ana alerjen yok',
      allergenNotice: 'alerjen bildirimi',
      allergenNote: 'Alerjen bilgileri bilgilendirme amaçlıdır. Çapraz temas ve içerik değişiklikleri için lütfen servis ekibine danışın.',
      nutritionJsonError: 'nutrition.json yüklenemedi. Live Server kullandığını ve data/nutrition.json dosya yolunun doğru olduğunu kontrol edin.',
      allergenJsonError: 'Alerjen verisi yüklenemedi. data/nutrition.json dosyası okunamıyor.',
      nutritionLabels: {
        calories: 'Kalori',
        protein: 'Protein',
        carbohydrate: 'Karbonhidrat',
        fat: 'Yağ',
        saturatedFat: 'Doymuş Yağ',
        sugar: 'Şeker',
        fiber: 'Lif',
        salt: 'Tuz',
        portion: 'Porsiyon',
      },
    },
    en: {
      close: 'Close popup',
      prev: 'Previous item',
      next: 'Next item',
      imageHint: 'Tap image to zoom',
      premiumMenu: 'Premium Menu',
      menuFallback: 'Menu',
      emptyDescription: 'Details will be added soon.',
      openDetailsSuffix: 'details',
      nutritionTitle: 'Nutrition Facts',
      allergenTitle: 'Allergen Information',
      loading: 'Loading',
      checkRequired: 'Check required',
      nutritionDataSource: 'Nutrition and allergen data is read automatically from data/nutrition.json.',
      nutritionLoadError: 'Nutrition data could not be loaded. Make sure data/nutrition.json exists in the project folder and the page is opened with Live Server / GitHub Pages.',
      allergenLoadError: 'Allergen data could not be loaded because nutrition.json could not be read.',
      nutritionSystemMissing: 'Nutrition system is not connected. Make sure nutrition.js is included before modal.js in index.html.',
      nutritionLoading: 'Nutrition facts are loading...',
      nutritionNotFound: 'No matching nutrition record was found for this item in nutrition.json.',
      allergenSystemMissing: 'nutrition.js is required for allergen information. Check the script order.',
      allergenLoading: 'Allergen information is loading...',
      allergenNotFound: 'No matching allergen record was found for this item in nutrition.json.',
      noMainAllergen: 'No main allergen is marked for this item.',
      noMarkedMainAllergen: 'No marked main allergen',
      allergenNotice: 'allergen notice',
      allergenNote: 'Allergen information is indicative. Please contact the service team for cross-contact and ingredient changes.',
      nutritionJsonError: 'nutrition.json could not be loaded. Make sure you are using Live Server and data/nutrition.json path is correct.',
      allergenJsonError: 'Allergen data could not be loaded. data/nutrition.json cannot be read.',
      nutritionLabels: {
        calories: 'Calories',
        protein: 'Protein',
        carbohydrate: 'Carbohydrates',
        fat: 'Fat',
        saturatedFat: 'Saturated Fat',
        sugar: 'Sugar',
        fiber: 'Fiber',
        salt: 'Salt',
        portion: 'Serving',
      },
    },
  });

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

  const getCopy = () => I18N[getActiveLanguage()] || I18N.tr;
  const t = (key) => getCopy()[key] || I18N.tr[key] || key;
  const nutritionLabel = (key) => getCopy().nutritionLabels?.[key] || I18N.tr.nutritionLabels[key] || key;

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
    const description = getLocalizedText(descriptionNode) || t('emptyDescription');
    const category = getLocalizedText(categoryNode) || t('menuFallback');

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
        <button class="gmp-modal__close modal-close" type="button" aria-label="${t('close')}" data-gmp-close>
          <span aria-hidden="true">×</span>
        </button>

        <button class="gmp-modal__nav gmp-modal__nav--prev" type="button" aria-label="${t('prev')}" data-gmp-prev>
          <span aria-hidden="true">‹</span>
        </button>

        <figure class="gmp-modal__media">
          <img id="modalImage" class="gmp-modal__image" src="" alt="" decoding="async">
          <figcaption class="gmp-modal__image-hint" data-gmp-image-hint>${t('imageHint')}</figcaption>
        </figure>

        <section class="gmp-modal__content">
          <div class="gmp-modal__eyebrow" id="modalCategory">${t('menuFallback')}</div>
          <div class="gmp-modal__heading-row">
            <h2 id="modalTitle" class="gmp-modal__title"></h2>
            <div id="modalPrice" class="gmp-modal__price"></div>
          </div>
          <p id="modalDescription" class="gmp-modal__description"></p>

          <div class="gmp-modal__meta" aria-label="Ürün bilgileri">
            <span class="gmp-chip" data-gmp-product-order></span>
            <span class="gmp-chip" data-gmp-premium-chip>${t('premiumMenu')}</span>
          </div>

          <div class="gmp-modal__nutrition" data-gmp-nutrition hidden>
            <h3 data-gmp-nutrition-title>${t('nutritionTitle')}</h3>
            <div class="gmp-nutrition-grid" data-gmp-nutrition-grid></div>
          </div>

          <div class="gmp-modal__allergens" data-gmp-allergens hidden>
            <div class="gmp-allergen-head">
              <h3 data-gmp-allergen-title>${t('allergenTitle')}</h3>
              <span class="gmp-allergen-summary" data-gmp-allergen-summary></span>
            </div>
            <div class="gmp-allergen-list" data-gmp-allergen-list></div>
            <p class="gmp-allergen-note" data-gmp-allergen-note></p>
          </div>
        </section>

        <button class="gmp-modal__nav gmp-modal__nav--next" type="button" aria-label="${t('next')}" data-gmp-next>
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
    elements.allergenSummary = elements.modal.querySelector('[data-gmp-allergen-summary]');
    elements.allergenNote = elements.modal.querySelector('[data-gmp-allergen-note]');
    elements.imageHint = elements.modal.querySelector('[data-gmp-image-hint]');
    elements.premiumChip = elements.modal.querySelector('[data-gmp-premium-chip]');
    elements.nutritionTitle = elements.modal.querySelector('[data-gmp-nutrition-title]');
    elements.allergenTitle = elements.modal.querySelector('[data-gmp-allergen-title]');
  };

  /**
   * Modal içinde JSON'dan gelmeyen sabit metinleri aktif dile göre yeniler.
   */
  const updateStaticTexts = () => {
    elements.closeButtons?.forEach((button) => button.setAttribute('aria-label', t('close')));
    elements.prevButton?.setAttribute('aria-label', t('prev'));
    elements.nextButton?.setAttribute('aria-label', t('next'));

    if (elements.imageHint) elements.imageHint.textContent = t('imageHint');
    if (elements.premiumChip) elements.premiumChip.textContent = t('premiumMenu');
    if (elements.nutritionTitle) elements.nutritionTitle.textContent = t('nutritionTitle');
    if (elements.allergenTitle) elements.allergenTitle.textContent = t('allergenTitle');
  };

  /**
   * JSON porsiyon metni Türkçe kaldığında İngilizce arayüz için okunabilir hale getirir.
   * @param {string} value
   * @returns {string}
   */
  const localizePortionText = (value = '') => {
    if (getActiveLanguage() !== 'en') return value;

    return String(value)
      .replace(/yaklaşık/gi, 'approx.')
      .replace(/1 kişi/gi, '1 person')
      .replace(/1 tabak/gi, '1 plate')
      .replace(/1 porsiyon/gi, '1 portion')
      .replace(/porsiyon/gi, 'portion')
      .replace(/yumurta/gi, 'eggs')
      .replace(/adet/gi, 'pcs')
      .replace(/dilim/gi, 'slices')
      .replace(/şişe/gi, 'bottle')
      .replace(/bardak/gi, 'glass')
      .replace(/tek/gi, 'single')
      .replace(/duble/gi, 'double')
      .replace(/kadeh/gi, 'glass')
      .replace(/kişilik/gi, 'for people')
      .replace(/gr/gi, 'g');
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
      const itemName = getLocalizedText(item.querySelector(SELECTORS.itemName)) || 'Ürün';
      item.setAttribute('aria-label', `${itemName} ${t('openDetailsSuffix')}`);
    });
  };

  /**
   * Besin alanını tamamen gizlemek yerine yükleme / uyarı mesajı gösterir.
   * Böylece entegrasyon hatalarında popup boş kalmaz.
   * @param {string} message
   * @param {'info'|'warning'} type
   */
  const showNutritionMessage = (message, type = 'info') => {
    if (!elements.nutrition || !elements.nutritionGrid) return;

    elements.nutritionGrid.innerHTML = `
      <div class="gmp-data-message gmp-data-message--${type}">${message}</div>
    `;
    elements.nutrition.hidden = false;
  };

  /**
   * Alerjen alanını tamamen gizlemek yerine yükleme / uyarı mesajı gösterir.
   * Böylece nutrition.json veya script sırası problemi olduğunda hata görünür olur.
   * @param {string} message
   * @param {'info'|'warning'} type
   */
  const showAllergenMessage = (message, type = 'info') => {
    if (!elements.allergens || !elements.allergenList) return;

    if (elements.allergenSummary) {
      elements.allergenSummary.textContent = type === 'warning' ? t('checkRequired') : t('loading');
    }

    elements.allergenList.innerHTML = `
      <span class="gmp-allergen-empty gmp-data-message--${type}">${message}</span>
    `;

    if (elements.allergenNote) {
      elements.allergenNote.textContent = t('nutritionDataSource');
    }

    elements.allergens.hidden = false;
  };


  /**
   * Nutrition yüklemesi tamamlandığında modalı yalnızca bir kez yeniler.
   * Hata durumunda sonsuz render döngüsüne girmeyi engeller.
   * @param {Promise} readyPromise
   */
  const scheduleDataRefresh = (readyPromise) => {
    if (typeof readyPromise?.then !== 'function' || !elements.modal) return;
    if (elements.modal.dataset.gmpAwaitingNutrition === 'true') return;

    elements.modal.dataset.gmpAwaitingNutrition = 'true';

    readyPromise.finally(() => {
      if (elements.modal) {
        delete elements.modal.dataset.gmpAwaitingNutrition;
      }

      if (!elements.modal?.classList.contains(CSS.open) || state.currentIndex < 0) return;

      const item = state.items[state.currentIndex];
      if (!item) return;

      const product = extractProductData(item);
      renderNutrition(product);
      renderAllergens(product);
    });
  };

  /**
   * Nutrition JSON yüklenemediğinde kullanıcıya net hata gösterir.
   * @param {object} api
   * @returns {boolean}
   */
  const showNutritionLoadErrorIfNeeded = (api) => {
    const error = typeof api?.getError === 'function' ? api.getError() : null;
    const hasError = Boolean(error) || (typeof api?.hasError === 'function' && api.hasError());

    if (!hasError) return false;

    showNutritionMessage(t('nutritionLoadError'), 'warning');
    showAllergenMessage(t('allergenLoadError'), 'warning');
    return true;
  };

  /**
   * Sprint 2 için hazır bağlantı noktasıdır. window.GoncuNutrition varsa
   * besin değerlerini modal içinde gösterir; yoksa alanı gizler.
   * @param {object} product
   */
  const renderNutrition = (product) => {
    const api = window.GoncuNutrition;

    if (!elements.nutritionGrid) return;

    if (!api || typeof api.getByProductData !== 'function') {
      showNutritionMessage(t('nutritionSystemMissing'), 'warning');
      return;
    }

    if (typeof api.isReady === 'function' && !api.isReady()) {
      if (showNutritionLoadErrorIfNeeded(api)) return;

      showNutritionMessage(t('nutritionLoading'), 'info');
      const readyPromise = typeof api.ready === 'function' ? api.ready() : null;
      scheduleDataRefresh(readyPromise);
      return;
    }

    const nutrition = api.getByProductData(product);

    if (!nutrition) {
      showNutritionMessage(t('nutritionNotFound'), 'warning');
      return;
    }

    const nutritionRows = [
      ['calories', nutrition.calories, 'kcal'],
      ['protein', nutrition.protein, 'g'],
      ['carbohydrate', nutrition.carbohydrate, 'g'],
      ['fat', nutrition.fat, 'g'],
      ['saturatedFat', nutrition.saturatedFat, 'g'],
      ['sugar', nutrition.sugar, 'g'],
      ['fiber', nutrition.fiber, 'g'],
      ['salt', nutrition.salt, 'g'],
      ['portion', nutrition.portionEn || nutrition.portion, ''],
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');

    elements.nutritionGrid.innerHTML = nutritionRows.map(([key, value, unit]) => {
      const displayValue = key === 'portion' ? localizePortionText(value) : value;
      return `
        <div class="gmp-nutrition-item">
          <span>${nutritionLabel(key)}</span>
          <strong>${displayValue}${unit ? ` ${unit}` : ''}</strong>
        </div>
      `;
    }).join('');

    elements.nutrition.hidden = nutritionRows.length === 0;
  };

  /**
   * Sprint 3 alerjen katmanını modal içine premium ikonlu kartlar olarak basar.
   * window.GoncuAllergens varsa onu kullanır; yoksa Sprint 2 nutrition verisine düşer.
   * @param {object} product
   */
  const renderAllergens = (product) => {
    const allergenApi = window.GoncuAllergens;
    const nutritionApi = window.GoncuNutrition;

    if (!elements.allergenList) return;

    if (!nutritionApi || typeof nutritionApi.getByProductData !== 'function') {
      showAllergenMessage(t('allergenSystemMissing'), 'warning');
      return;
    }

    if (typeof nutritionApi.isReady === 'function' && !nutritionApi.isReady()) {
      if (showNutritionLoadErrorIfNeeded(nutritionApi)) return;

      showAllergenMessage(t('allergenLoading'), 'info');
      const readyPromise = typeof nutritionApi.ready === 'function' ? nutritionApi.ready() : null;
      scheduleDataRefresh(readyPromise);
      return;
    }

    const allergenData = typeof allergenApi?.getForProductData === 'function'
      ? allergenApi.getForProductData(product)
      : null;
    const nutrition = allergenData?.nutrition || nutritionApi.getByProductData(product);

    if (!nutrition) {
      showAllergenMessage(t('allergenNotFound'), 'warning');
      return;
    }

    const allergens = allergenData?.allergens || nutrition.allergens || [];
    const language = getActiveLanguage();
    const hasAllergens = allergens.length > 0;
    const emptyText = t('noMainAllergen');
    const noteText = t('allergenNote');

    elements.allergenSummary.textContent = hasAllergens
      ? `${allergens.length} ${t('allergenNotice')}`
      : t('noMarkedMainAllergen');

    elements.allergenList.innerHTML = hasAllergens
      ? allergens.map((allergen) => {
        const label = allergen.label || allergen.name || allergen.key || 'Alerjen';
        return `
          <span class="gmp-allergen-pill" data-allergen-key="${allergen.key || ''}" title="${label}">
            <span class="gmp-allergen-pill__icon" aria-hidden="true">${allergen.icon || '•'}</span>
            <span class="gmp-allergen-pill__label">${label}</span>
          </span>
        `;
      }).join('')
      : `<span class="gmp-allergen-empty">✓ ${emptyText}</span>`;

    elements.allergenNote.textContent = noteText;
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

    updateStaticTexts();
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

  const isLanguageControl = (target) => {
    const control = target.closest?.([
      '.lang-btn',
      '.language-btn',
      '.language-switch button',
      '[data-lang-trigger]',
      '[data-language]',
      '[data-set-lang]',
      '[data-lang]',
    ].join(','));

    if (control) return true;

    const text = normalizeText(target.textContent || '').toUpperCase();
    return text === 'TR' || text === 'EN';
  };

  const refreshLanguageSensitiveContent = () => {
    window.setTimeout(() => {
      collectItems();
      updateStaticTexts();
      window.GoncuAllergens?.refreshCards?.();

      if (elements.modal.classList.contains(CSS.open) && state.currentIndex >= 0) {
        renderProduct(state.currentIndex);
      }
    }, 120);
  };

  /**
   * Kullanıcı etkileşimlerini tek merkezden bağlar.
   */
  const bindEvents = () => {
    document.addEventListener('click', (event) => {
      if (isLanguageControl(event.target)) {
        refreshLanguageSensitiveContent();
        return;
      }

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
      window.GoncuAllergens?.refreshCards?.();
      if (elements.modal.classList.contains(CSS.open) && state.currentIndex >= 0) {
        renderProduct(state.currentIndex);
      }
    });

    window.addEventListener('goncu:allergens-ready', () => {
      if (elements.modal.classList.contains(CSS.open) && state.currentIndex >= 0) {
        renderProduct(state.currentIndex);
      }
    });

    window.addEventListener('goncu:nutrition-error', () => {
      if (elements.modal.classList.contains(CSS.open) && state.currentIndex >= 0) {
        showNutritionMessage(t('nutritionJsonError'), 'warning');
        showAllergenMessage(t('allergenJsonError'), 'warning');
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
    updateStaticTexts();
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
