/**
 * GÖNCÜ MENU PRO - Image Utilities Emergency Restore
 * --------------------------------------------------
 * Amaç:
 * - Görsel uzantı desteğini güvenli şekilde sağlamak.
 * - Eski image-utils sürümlerinden kalabilecek gizleme / donma / tıklama engelleme
 *   durumlarını temizlemek.
 * - Menü kartlarının görünürlüğüne ve search/favorites sistemine müdahale etmemek.
 *
 * Desteklenen uzantılar: webp, jpg, jpeg, png, avif, gif, svg
 */
(function () {
  'use strict';

  const SUPPORTED_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png', 'avif', 'gif', 'svg'];

  const IMAGE_SELECTOR = [
    '.menu-item img',
    'img.item-image',
    '.item-image img',
    '.product-image img',
    '#modalImage',
    '.modal img',
    '.gm-modal img',
    '.gm-modal__image img'
  ].join(',');

  const RESTORE_SELECTOR = [
    '.menu-section',
    '.menu-grid',
    '.menu-item',
    '.item-card',
    '.product-card'
  ].join(',');

  const IMAGE_UTILITY_CLASSES = [
    'gm-image-hidden',
    'gm-image-loading',
    'gm-img-hidden',
    'gm-img-loading',
    'image-utils-hidden',
    'image-utils-loading',
    'is-image-hidden',
    'is-image-loading'
  ];

  /**
   * Önceki hatalı image-utils sürümlerinden kalabilecek görünmezlik etkilerini temizler.
   * Bu işlem sadece sayfa açılışında ve yeni ürün node'u geldiğinde yapılır.
   */
  function restoreMenuVisibility() {
    document.querySelectorAll(RESTORE_SELECTOR).forEach((element) => {
      IMAGE_UTILITY_CLASSES.forEach((className) => element.classList.remove(className));

      if (!element.style) return;

      if (element.style.opacity === '0') element.style.opacity = '';
      if (element.style.visibility === 'hidden') element.style.visibility = '';
      if (element.style.pointerEvents === 'none') element.style.pointerEvents = '';

      // Eski image-utils inline display:none bıraktıysa temizle.
      // Search/favorites daha sonra kendi filtrelerini tekrar uygulayabilir.
      if (element.style.display === 'none') element.style.display = '';
    });
  }

  /**
   * Bir src yolundan farklı uzantı alternatifleri üretir.
   * Örnek: images/urun.jpg -> images/urun.webp, images/urun.jpeg, images/urun.png...
   */
  function buildImageAlternatives(source) {
    if (!source || source.startsWith('data:') || source.startsWith('blob:')) return [];

    const cleanSource = String(source).trim();
    const match = cleanSource.match(/^(.*?)(\.[a-zA-Z0-9]+)([?#].*)?$/);

    if (!match) return [];

    const basePath = match[1];
    const currentExtension = match[2].replace('.', '').toLowerCase();
    const suffix = match[3] || '';

    const orderedExtensions = [
      currentExtension,
      ...SUPPORTED_EXTENSIONS.filter((extension) => extension !== currentExtension)
    ];

    return orderedExtensions.map((extension) => `${basePath}.${extension}${suffix}`);
  }

  /**
   * Görsel hata verirse aynı dosya adında farklı uzantıları sırayla dener.
   * Kartı gizlemez, layout'a müdahale etmez.
   */
  function attachFallbackToImage(image) {
    if (!(image instanceof HTMLImageElement)) return;
    if (image.dataset.gmImageSafeReady === '1') return;

    const originalSource = image.getAttribute('src') || image.currentSrc || '';
    const alternatives = buildImageAlternatives(originalSource);

    image.dataset.gmImageSafeReady = '1';
    image.dataset.gmOriginalSource = originalSource;
    image.dataset.gmAlternativeIndex = '0';

    if (!image.hasAttribute('loading')) image.setAttribute('loading', 'lazy');
    image.setAttribute('decoding', 'async');

    if (alternatives.length <= 1) return;

    image.addEventListener('error', function handleImageError() {
      const list = buildImageAlternatives(image.dataset.gmOriginalSource || originalSource);
      let index = Number.parseInt(image.dataset.gmAlternativeIndex || '0', 10);

      while (index < list.length) {
        const nextSource = list[index];
        index += 1;
        image.dataset.gmAlternativeIndex = String(index);

        if (!nextSource) continue;
        if (nextSource === image.getAttribute('src')) continue;

        image.src = nextSource;
        return;
      }

      image.classList.add('gm-image-missing');
      image.removeEventListener('error', handleImageError);
    });
  }

  function scanImages(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(IMAGE_SELECTOR).forEach(attachFallbackToImage);
  }

  function initImageUtilities() {
    restoreMenuVisibility();
    scanImages(document);

    // Modal veya dinamik ürün alanları sonradan oluşursa sadece yeni görsellere uygula.
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          restoreMenuVisibility();
          if (node.matches && node.matches(IMAGE_SELECTOR)) attachFallbackToImage(node);
          scanImages(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.GoncuImageUtils = {
      refresh: function refresh() {
        restoreMenuVisibility();
        scanImages(document);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageUtilities, { once: true });
  } else {
    initImageUtilities();
  }
})();
