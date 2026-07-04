/**
 * GÖNCÜ MENU PRO - Sprint 3 Nutrition Data Layer
 * ------------------------------------------------------------
 * data/nutrition.json dosyasını yükler, ürün adlarını Türkçe karakter
 * uyumlu slug ile eşleştirir ve modal sistemine senkron API sunar.
 *
 * Kullanım:
 * - HTML'de js/nutrition.js dosyasını js/modal.js dosyasından önce ekleyin.
 * - Yeni ürün eklemek için data/nutrition.json içine yeni kayıt eklemek yeterlidir.
 */
(() => {
  'use strict';

  const DATA_URL = 'data/nutrition.json';
  const READY_EVENT = 'goncu:nutrition-ready';
  const ERROR_EVENT = 'goncu:nutrition-error';

  const state = {
    ready: false,
    loading: false,
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
   * Modal sistemiyle aynı Türkçe uyumlu slug üretimini kullanır.
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
   * Kategori metninin TR/EN birlikte gelmesi ihtimaline karşı sade anahtar üretir.
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
   * @returns {object}
   */
  const enrichItem = (item) => {
    if (!item) return null;
    const legend = state.raw?.allergensLegend || {};
    return {
      ...item,
      allergens: (item.allergens || []).map((key) => ({
        key,
        ...(legend[key] || { name: key, icon: '•' }),
      })),
    };
  };

  /**
   * Tek bir ürün için tüm aranabilir anahtarları üretir.
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
      getSearchKeys(item).forEach((key) => state.byKey.set(key, enriched));

      const categoryKey = normalizeCategoryKey(item.category || '');
      getSearchKeys(item).forEach((key) => {
        state.byNameAndCategory.set(`${categoryKey}::${key}`, enriched);
      });
    });
  };

  /**
   * Nutrition JSON dosyasını yükler.
   * @returns {Promise<object>}
   */
  const load = async () => {
    if (state.ready) return state.raw;
    if (state.loading && state.readyPromise) return state.readyPromise;

    state.loading = true;
    state.readyPromise = fetch(DATA_URL, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`nutrition.json yüklenemedi: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        state.raw = data;
        indexData(data);
        state.ready = true;
        state.loading = false;
        window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { total: state.byKey.size } }));
        return data;
      })
      .catch((error) => {
        state.error = error;
        state.loading = false;
        window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { error } }));
        console.warn('[GÖNCÜ MENU PRO] Besin verisi yüklenemedi:', error);
        return null;
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
    getError: () => state.error,
    getRaw: () => state.raw,
    slugify,
    getByProductName,
    getByProductData,
    getAll: () => state.ready ? Array.from(new Set(state.byKey.values())) : [],
    refresh: () => {
      state.ready = false;
      state.raw = null;
      return load();
    },
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
