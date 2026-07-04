/**
 * GÖNCÜ MENU PRO - Safe Optimization
 * Sadece güvenli performans ayarları uygular.
 * Görsel yolu/formatı değiştirmez, sonsuz deneme yapmaz, ürünleri gizlemez.
 */
(() => {
  'use strict';

  const SELECTORS = [
    '.menu-item img',
    'img.item-image',
    '.item-image img',
    '.gm-modal-image'
  ].join(',');

  function optimizeImages() {
    document.querySelectorAll(SELECTORS).forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      img.loading = img.closest('.menu-item') ? 'lazy' : 'eager';
      img.decoding = 'async';
      img.referrerPolicy = img.referrerPolicy || 'no-referrer';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeImages, { once: true });
  } else {
    optimizeImages();
  }

  window.GoncuMenuOptimization = {
    version: 'safe-no-image-rewrite',
    refresh: optimizeImages
  };
})();
