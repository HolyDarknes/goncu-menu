/**
 * GÖNCÜ MENU PRO - Safe Animation Controller
 * ------------------------------------------------------------
 * Bu sürüm sayfayı kilitleyen MutationObserver / otomatik görsel arama kullanmaz.
 * Sadece güvenli mikro animasyon, görsel load sınıfı ve ripple efekti uygular.
 */
(() => {
  'use strict';

  const CSS = {
    bodyReady: 'gmp-anim-ready',
    imageLoaded: 'gmp-img-loaded',
    ripple: 'gmp-ripple',
  };

  const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  const markImages = () => {
    document.querySelectorAll('.menu-item img, img.item-image, .gmp-modal img').forEach((img, index) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading')) img.setAttribute('loading', index < 8 ? 'eager' : 'lazy');
      if (img.complete) {
        img.classList.add(CSS.imageLoaded);
        return;
      }
      img.addEventListener('load', () => img.classList.add(CSS.imageLoaded), { once: true });
      img.addEventListener('error', () => img.classList.add(CSS.imageLoaded), { once: true });
    });
  };

  const createRipple = (event) => {
    if (prefersReducedMotion()) return;
    const target = event.target.closest?.('.menu-item, .nav-link, .lang-btn, .gmp-search__clear, .gmp-search__reset, .gmp-modal__close, .gmp-modal__nav, .gmp-favorite-toggle, .gmp-theme-toggle');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = CSS.ripple;
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.setProperty('--gmp-ripple-x', `${event.clientX - rect.left}px`);
    ripple.style.setProperty('--gmp-ripple-y', `${event.clientY - rect.top}px`);
    target.querySelector?.(`.${CSS.ripple}`)?.remove?.();
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  };

  const refresh = () => {
    markImages();
    document.querySelectorAll('.gmp-reveal').forEach((el) => el.classList.add('is-visible'));
  };

  const init = () => {
    document.body.classList.add(CSS.bodyReady);
    refresh();
    document.addEventListener('pointerdown', createRipple, { passive: true });
    window.addEventListener('goncu:nutrition-ready', refresh, { passive: true });
    window.addEventListener('goncu:allergens-ready', refresh, { passive: true });
    window.GoncuAnimations = Object.freeze({ refresh, revealAll: refresh, isReducedMotion: prefersReducedMotion });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
