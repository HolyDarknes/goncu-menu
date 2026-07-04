/**
 * GÖNCÜ MENU PRO - Sprint 3 Freeze Fix Nutrition Data Layer
 * ------------------------------------------------------------
 * data/nutrition.json dosyasını güvenli şekilde yükler.
 *
 * Bu sürüm özellikle şu problemi çözer:
 * - nutrition.json yüklenemezse modal sürekli "yükleniyor" döngüsüne girmez.
 * - Hata durumunda popup donmaz, kullanıcıya net uyarı gösterilir.
 * - JSON sonradan düzeltildiğinde sayfa yenilemesiyle sistem tekrar çalışır.
 */
(() => {
  'use strict';

  const DATA_URL = 'data/nutrition.json';
  const READY_EVENT = 'goncu:nutrition-ready';
  const ERROR_EVENT = 'goncu:nutrition-error';
  const LOAD_TIMEOUT_MS = 4500;

  const state = {
    ready: false,
    loading: false,
    settled: false,
    error: null,
    raw: null,
    byKey: new Map(),
    byNameAndCategory: new Map(),
    readyPromise: null,
  };

  /**
   * Fazla boşlukları temizler.
   * @param {string} value
   * @returns {string}
   */
  const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  /**
   * Türkçe karakterleri koruyarak güvenli slug üretir.
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
   * Kategori metninde TR/EN birlikte gelirse tek kategori anahtarı üretir.
   * @param {string} category
   * @returns {string}
   */
  const normalizeCategoryKey = (category = '') => {
    const value = normalizeText(category)
      .replace(/\bBreakfast\b|\bStarters\b|\bBowls\b|\bSalads\b|\bAppetizers\b|\bPastas\b|\bBurgers\b|\bPizzas\b|\bMain Courses\b|\bHot Coffees\b|\bCold Coffees\b|\bMocktails\b|\bSoft Drinks\b|\bWhiskies\b|\bSignatures\b|\bClassics\b|\bShots\b|\bRakı\b|\bBeers\b|\bGin\b|\bVodka\b|\bCognac\b|\bRum\b|\bTequila\b|\bBitters\b|\bLiqueurs\b|\bChampagne\b|\bRed Wines\b|\bWhite Wines\b|\bRose Wines\b|\bIce Creams\b/gi, '')
      .trim();
    return slugify(value || category);
  };

  /**
   * Alerjen kodlarını ikonlu objelere çevirir.
   * @param {object} item
   * @returns {object|null}
   */
  const enrichItem = (item) => {
    if (!item) return null;
    const legend = state.raw?.allergensLegend || {};
    return {
      ...item,
      allergens: (item.allergens || []).map((key) => ({
        key,
        ...(legend[key] || { name: key, nameEn: key, icon: '•' }),
      })),
    };
  };

  /**
   * Ürün için aranabilir tüm anahtarları üretir.
   * @param {object} item
   * @returns {string[]}
   */
  const getSearchKeys = (item) => {
    const values = [item.id, item.name, item.nameEn, ...(item.aliases || [])].filter(Boolean);
    return [...new Set(values.map(slugify).filter(Boolean))];
  };

  /**
   * JSON verisini hızlı arama map'lerine dönüştürür.
   * @param {object} data
   */
  const indexData = (data) => {
    state.byKey.clear();
    state.byNameAndCategory.clear();

    Object.values(data.items || {}).forEach((item) => {
      const enriched = enrichItem(item);
      if (!enriched) return;

      getSearchKeys(item).forEach((key) => state.byKey.set(key, enriched));

      const categoryKey = normalizeCategoryKey(item.category || '');
      getSearchKeys(item).forEach((key) => {
        state.byNameAndCategory.set(`${categoryKey}::${key}`, enriched);
      });
    });
  };

  /**
   * Fetch işlemini zaman aşımıyla çalıştırır.
   * @param {string} url
   * @returns {Promise<object>}
   */
  const fetchJsonWithTimeout = async (url) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = window.setTimeout(() => controller?.abort(), LOAD_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller?.signal,
      });

      if (!response.ok) {
        throw new Error(`nutrition.json yüklenemedi: HTTP ${response.status}`);
      }

      return await response.json();
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  /**
   * Başarılı yükleme sonrası state günceller.
   * @param {object} data
   * @returns {object}
   */
  const markReady = (data) => {
    state.raw = data;
    state.error = null;
    indexData(data);
    state.ready = true;
    state.loading = false;
    state.settled = true;

    window.dispatchEvent(new CustomEvent(READY_EVENT, {
      detail: { total: state.byKey.size },
    }));

    return data;
  };

  /**
   * Hata durumunda sonsuz yükleme döngüsünü engeller.
   * @param {Error} error
   * @returns {null}
   */
  const markFailed = (error) => {
    state.error = error;
    state.ready = false;
    state.loading = false;
    state.settled = true;

    window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { error } }));
    console.warn('[GÖNCÜ MENU PRO] Besin verisi yüklenemedi:', error);

    return null;
  };

  /**
   * Nutrition JSON dosyasını yükler.
   * @param {{force?: boolean}} options
   * @returns {Promise<object|null>}
   */
  const load = async (options = {}) => {
    const force = Boolean(options.force);

    if (state.ready && !force) return state.raw;
    if (state.loading && state.readyPromise && !force) return state.readyPromise;
    if (state.settled && state.error && !force) return null;

    state.loading = true;
    state.settled = false;
    state.error = null;

    state.readyPromise = fetchJsonWithTimeout(DATA_URL)
      .then(markReady)
      .catch(markFailed)
      .finally(() => {
        state.loading = false;
      });

    return state.readyPromise;
  };

  /**
   * Ürün adı ve kategoriye göre en doğru eşleşmeyi döndürür.
   * @param {string} name
   * @param {string} category
   * @returns {object|null}
   */
  const getByProductName = (name, category = '') => {
    if (!state.ready) return null;

    const nameKey = slugify(name);
    const categoryKey = normalizeCategoryKey(category);
    const categoryMatch = state.byNameAndCategory.get(`${categoryKey}::${nameKey}`);
    if (categoryMatch) return categoryMatch;

    return state.byKey.get(nameKey) || null;
  };

  /**
   * Modal ürün objesiyle çalışır.
   * @param {{name:string, category:string}} product
   * @returns {object|null}
   */
  const getByProductData = (product = {}) => getByProductName(product.name, product.category);

  window.GoncuNutrition = Object.freeze({
    load,
    ready: () => state.readyPromise || load(),
    isReady: () => state.ready,
    isLoading: () => state.loading,
    isSettled: () => state.settled,
    hasError: () => Boolean(state.error),
    getError: () => state.error,
    getRaw: () => state.raw,
    slugify,
    getByProductName,
    getByProductData,
    getAll: () => state.ready ? Array.from(new Set(state.byKey.values())) : [],
    refresh: () => {
      state.ready = false;
      state.loading = false;
      state.settled = false;
      state.error = null;
      state.raw = null;
      state.readyPromise = null;
      return load({ force: true });
    },
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => load(), { once: true });
  } else {
    load();
  }
})();
