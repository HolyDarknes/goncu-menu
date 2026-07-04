/*
 * GÖNCÜ MENU PRO - Safe Image Format Resolver
 * Amaç: HTML'de .jpg yazsa bile aynı isimli .webp/.png/.jpeg vb. görselleri güvenli şekilde denemek.
 * Bu sürüm sadece ürün ve modal görsellerine dokunur; menü layout'una, tıklamalara ve filtrelere müdahale etmez.
 */
(function () {
  'use strict';

  const CONFIG = {
    selector: '.menu-item .item-image, .menu-item img, .gm-modal img, .product-modal img, .modal-content img',
    extensions: ['webp', 'jpg', 'jpeg', 'png', 'avif', 'gif', 'svg'],
    resolvedClass: 'gm-image-resolved',
    missingClass: 'gm-image-missing',
    maxAttempts: 12
  };

  const imageStates = new WeakMap();

  const normalizePath = (value) => String(value || '').split('#')[0].split('?')[0];

  const parsePath = (src) => {
    const clean = normalizePath(src);
    const slashIndex = clean.lastIndexOf('/');
    const folder = slashIndex >= 0 ? clean.slice(0, slashIndex + 1) : '';
    const filename = slashIndex >= 0 ? clean.slice(slashIndex + 1) : clean;
    const dotIndex = filename.lastIndexOf('.');

    return {
      clean,
      folder,
      base: dotIndex > 0 ? filename.slice(0, dotIndex) : filename,
      extension: dotIndex > 0 ? filename.slice(dotIndex + 1).toLowerCase() : ''
    };
  };

  const slugify = (value) => {
    const map = {
      ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
      ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u'
    };

    return String(value || '')
      .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (char) => map[char] || char)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const unique = (items) => {
    const seen = new Set();
    return items.filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  };

  const getTitle = (img) => {
    const card = img.closest?.('.menu-item, .gm-modal, .product-modal, .modal-content');
    const titleNode = card?.querySelector?.('.item-name, .gm-modal-title, .modal-title, h2, h3');
    return (img.getAttribute('alt') || titleNode?.textContent || '').trim();
  };

  const buildCandidates = (img) => {
    const src = img.getAttribute('src') || img.dataset.src || '';
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return [];

    const parsed = parsePath(src);
    const titleSlug = slugify(getTitle(img));
    const baseSlug = slugify(parsed.base);
    const bases = unique([parsed.base, baseSlug, titleSlug]);
    const extensions = unique([parsed.extension, ...CONFIG.extensions]);
    const candidates = [];

    bases.forEach((base) => {
      extensions.forEach((extension) => {
        if (!base || !extension) return;
        candidates.push(`${parsed.folder}${base}.${extension}`);
      });
    });

    return unique(candidates)
      .filter((candidate) => normalizePath(candidate) !== parsed.clean)
      .slice(0, CONFIG.maxAttempts);
  };

  const getState = (img) => {
    let state = imageStates.get(img);
    if (!state) {
      state = {
        candidates: buildCandidates(img),
        index: 0,
        busy: false
      };
      imageStates.set(img, state);
    }
    return state;
  };

  const tryNext = (img) => {
    const state = getState(img);
    if (state.busy) return;

    const nextSrc = state.candidates[state.index++];
    if (!nextSrc) {
      img.classList.add(CONFIG.missingClass);
      return;
    }

    state.busy = true;
    img.src = nextSrc;
    window.requestAnimationFrame(() => {
      state.busy = false;
    });
  };

  const prepareImage = (img) => {
    if (!img || img.dataset.gmSafeImageReady === '1') return;

    img.dataset.gmSafeImageReady = '1';

    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');

    img.addEventListener('load', () => {
      img.classList.remove(CONFIG.missingClass);
      img.classList.add(CONFIG.resolvedClass);
    });

    img.addEventListener('error', () => {
      tryNext(img);
    });

    if (img.complete && img.naturalWidth === 0) {
      tryNext(img);
    }
  };

  const scan = (root = document) => {
    root.querySelectorAll?.(CONFIG.selector).forEach(prepareImage);
  };

  const init = () => {
    scan(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.(CONFIG.selector)) prepareImage(node);
          scan(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  window.GoncuMenuImages = {
    init,
    scan,
    prepareImage,
    extensions: [...CONFIG.extensions]
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
