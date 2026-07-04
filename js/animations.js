/**
 * GÖNCÜ MENU PRO - SPRINT 6 Animation Controller
 * ------------------------------------------------------------
 * Mevcut HTML yapısını değiştirmeden premium mikro animasyonları yönetir.
 * - IntersectionObserver ile ürün kartlarını ve başlıkları görünür oldukça açar.
 * - Ürün kartlarında pointer pozisyonuna göre hafif ışık hissi verir.
 * - Kart ve buton tıklamalarında performans dostu ripple efekti üretir.
 * - Görseller yüklenince blur/opacity geçişi tamamlanır.
 * - Kullanıcının prefers-reduced-motion tercihini dikkate alır.
 */
(() => {
  'use strict';

  const SELECTORS = Object.freeze({
    menuItem: '.menu-item',
    section: '.menu-section',
    sectionTitle: '.section-title',
    itemImage: '.item-image',
    image: '.menu-item img',
    searchRoot: '.gmp-search',
    interactive: '.menu-item, .nav-link, .lang-btn, .gmp-search__clear, .gmp-search__reset, .gmp-modal__close, .gmp-modal__nav',
  });

  const CSS = Object.freeze({
    htmlReady: 'gmp-anim-html-ready',
    bodyReady: 'gmp-anim-ready',
    reveal: 'gmp-reveal',
    visible: 'is-visible',
    imageLoaded: 'gmp-img-loaded',
    ripple: 'gmp-ripple',
  });

  const state = {
    observer: null,
    prefersReducedMotion: false,
    initialized: false,
    mutationObserver: null,
    refreshTimer: null,
  };

  /**
   * Kullanıcı hareket azaltma tercihine sahipse true döner.
   * @returns {boolean}
   */
  const getReducedMotionPreference = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  /**
   * CSS animasyon sınıflarını global olarak aktif eder.
   */
  const setReadyState = () => {
    document.documentElement.classList.add(CSS.htmlReady);
    document.body.classList.add(CSS.bodyReady);
  };

  /**
   * Bir elemana reveal sınıfı ve güvenli stagger değeri ekler.
   * @param {Element} element
   * @param {number} index
   */
  const prepareRevealElement = (element, index = 0) => {
    if (!element || element.dataset.gmpAnimPrepared === 'true') return;

    element.dataset.gmpAnimPrepared = 'true';
    element.classList.add(CSS.reveal);
    element.style.setProperty('--gmp-stagger', String(Math.min(index % 10, 9)));

    if (state.prefersReducedMotion) {
      element.classList.add(CSS.visible);
    }
  };

  /**
   * IntersectionObserver desteklenmiyorsa tüm öğeleri anında görünür yapar.
   */
  const revealAllImmediately = () => {
    document.querySelectorAll(`.${CSS.reveal}`).forEach((element) => {
      element.classList.add(CSS.visible);
    });
  };

  /**
   * Reveal animasyonları için IntersectionObserver kurar.
   */
  const createObserver = () => {
    if (state.observer || state.prefersReducedMotion) return;

    if (!('IntersectionObserver' in window)) {
      revealAllImmediately();
      return;
    }

    state.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add(CSS.visible);
        state.observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08,
    });
  };

  /**
   * Mevcut DOM'daki animasyonlanacak öğeleri toplar ve observer'a bağlar.
   */
  const collectRevealTargets = () => {
    const targets = [
      ...document.querySelectorAll(SELECTORS.sectionTitle),
      ...document.querySelectorAll(SELECTORS.section),
      ...document.querySelectorAll(SELECTORS.menuItem),
    ];

    targets.forEach((element, index) => {
      prepareRevealElement(element, index);
      if (state.observer && !element.classList.contains(CSS.visible)) {
        state.observer.observe(element);
      }
    });

    if (state.prefersReducedMotion || !state.observer) {
      revealAllImmediately();
    }
  };

  /**
   * Kart görselleri yüklenince blur/opacity geçişini tamamlar.
   */
  const prepareImages = () => {
    document.querySelectorAll(`${SELECTORS.itemImage}, ${SELECTORS.image}`).forEach((image) => {
      if (!(image instanceof HTMLImageElement)) return;

      image.loading = image.loading || 'lazy';
      image.decoding = image.decoding || 'async';

      if (image.complete && image.naturalWidth > 0) {
        image.classList.add(CSS.imageLoaded);
        return;
      }

      image.addEventListener('load', () => image.classList.add(CSS.imageLoaded), { once: true });
      image.addEventListener('error', () => image.classList.add(CSS.imageLoaded), { once: true });
    });
  };

  /**
   * Ürün kartı hover efektinde kullanılacak pointer koordinatını CSS değişkenine yazar.
   * @param {PointerEvent} event
   */
  const updatePointerGlow = (event) => {
    const card = event.target.closest?.(SELECTORS.menuItem);
    if (!card || state.prefersReducedMotion) return;

    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    card.style.setProperty('--gmp-pointer-x', `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
    card.style.setProperty('--gmp-pointer-y', `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
  };

  /**
   * Tıklanan interaktif elemanın üzerinde tek kullanımlık ripple üretir.
   * @param {MouseEvent|PointerEvent} event
   */
  const createRipple = (event) => {
    if (state.prefersReducedMotion) return;

    const target = event.target.closest?.(SELECTORS.interactive);
    if (!target) return;

    const style = window.getComputedStyle(target);
    if (style.position === 'static') {
      target.style.position = 'relative';
    }

    target.querySelector?.(`.${CSS.ripple}`)?.remove?.();

    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = CSS.ripple;
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.setProperty('--gmp-ripple-x', `${event.clientX - rect.left}px`);
    ripple.style.setProperty('--gmp-ripple-y', `${event.clientY - rect.top}px`);

    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 700);
  };

  /**
   * Search sistemi filtre uyguladığında görünür ürünleri yeniden animasyon durumuna alır.
   */
  const refreshVisibleCards = () => {
    window.clearTimeout(state.refreshTimer);

    state.refreshTimer = window.setTimeout(() => {
      document.querySelectorAll(SELECTORS.menuItem).forEach((item, index) => {
        prepareRevealElement(item, index);
        if (!item.classList.contains(CSS.visible) && state.observer) {
          state.observer.observe(item);
        }
      });
      revealAllImmediately();
    }, 120);
  };

  /**
   * DOM'a sonradan eklenen arama paneli / modal gibi bileşenler için yenileme yapar.
   */
  const observeDomChanges = () => {
    if (!('MutationObserver' in window)) return;

    state.mutationObserver = new MutationObserver((mutations) => {
      const shouldRefresh = mutations.some((mutation) => (
        mutation.type === 'childList'
        || (mutation.type === 'attributes' && ['class', 'hidden'].includes(mutation.attributeName))
      ));

      if (!shouldRefresh) return;

      prepareImages();
      refreshVisibleCards();
    });

    state.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
  };

  /**
   * Dil veya arama değişimi sonrası animasyon sistemini güvenli şekilde tazeler.
   */
  const refresh = () => {
    prepareImages();
    collectRevealTargets();
  };

  /**
   * Event listener bağlantılarını kurar.
   */
  const bindEvents = () => {
    document.addEventListener('pointermove', updatePointerGlow, { passive: true });
    document.addEventListener('pointerdown', createRipple, { passive: true });

    window.addEventListener('goncu:nutrition-ready', refresh, { passive: true });
    window.addEventListener('goncu:allergens-ready', refresh, { passive: true });
    window.addEventListener('resize', refresh, { passive: true });

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('.lang-btn, .language-btn, [data-lang], [data-language], [data-set-lang], [data-lang-trigger]')) {
        window.setTimeout(refresh, 180);
      }
    }, { passive: true });

    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', (event) => {
      state.prefersReducedMotion = event.matches;
      if (state.prefersReducedMotion) revealAllImmediately();
    });
  };

  /**
   * Dışarıdan manuel refresh yapılabilmesi için küçük API açar.
   */
  const exposePublicApi = () => {
    window.GoncuAnimations = Object.freeze({
      refresh,
      revealAll: revealAllImmediately,
      isReducedMotion() {
        return state.prefersReducedMotion;
      },
    });
  };

  /**
   * Animasyon sistemini başlatır.
   */
  const init = () => {
    if (state.initialized) return;

    state.initialized = true;
    state.prefersReducedMotion = getReducedMotionPreference();

    setReadyState();
    createObserver();
    prepareImages();
    collectRevealTargets();
    bindEvents();
    observeDomChanges();
    exposePublicApi();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
