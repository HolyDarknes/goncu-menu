/**
 * GÖNCÜ MENU PRO - Sprint 8 Dark Mode System
 * ------------------------------------------------------------
 * Mevcut HTML'yi değiştirmeden tema değiştirme butonu oluşturur.
 * Tema seçimini localStorage içinde saklar ve sayfa yenilendiğinde korur.
 * Vanilla JavaScript kullanır; jQuery veya harici bağımlılık yoktur.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'gmp-theme-preference';
  const TRANSITION_CLASS = 'gmp-theme-transitioning';
  const DARK_CLASS = 'gmp-theme-dark';
  const LIGHT_CLASS = 'gmp-theme-light';
  const TOGGLE_ID = 'gmpThemeToggle';

  const SELECTORS = Object.freeze({
    languageButton: '.lang-btn, .language-btn, [data-lang-trigger], [data-language], [data-set-lang], .lang-switcher button',
    activeLanguageButton: '.lang-btn.active, .language-btn.active, [data-lang-trigger].active, [data-language].active, [data-set-lang].active, .lang-switcher button.active',
    mountTargets: [
      '.lang-switcher',
      '.language-switcher',
      '.nav-wrapper',
      '.navbar',
      'header',
    ],
  });

  const I18N = Object.freeze({
    tr: {
      dark: 'Koyu',
      light: 'Açık',
      ariaDark: 'Koyu moda geç',
      ariaLight: 'Açık moda geç',
      titleDark: 'Koyu modu aç',
      titleLight: 'Açık modu aç',
    },
    en: {
      dark: 'Dark',
      light: 'Light',
      ariaDark: 'Switch to dark mode',
      ariaLight: 'Switch to light mode',
      titleDark: 'Enable dark mode',
      titleLight: 'Enable light mode',
    },
  });

  let state = {
    theme: 'light',
    userSelected: false,
    toggle: null,
    mediaQuery: null,
    transitionTimer: null,
  };

  /**
   * Metin içindeki fazla boşlukları temizler.
   * @param {string} value
   * @returns {string}
   */
  const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

  /**
   * LocalStorage erişimini güvenli hale getirir.
   * Bazı gizli tarayıcı modlarında localStorage hata atabilir.
   */
  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        // localStorage kullanılamıyorsa tema mevcut oturumda çalışmaya devam eder.
      }
    },
  };

  /**
   * Aktif sayfa dilini mevcut TR/EN butonlarından, html lang'den veya
   * localStorage içindeki olası dil kayıtlarından algılar.
   * @returns {'tr' | 'en'}
   */
  const getActiveLanguage = () => {
    const activeButton = document.querySelector(SELECTORS.activeLanguageButton);
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

    const storedLanguage = [
      'gmp-language',
      'selectedLanguage',
      'selectedLang',
      'currentLanguage',
      'currentLang',
      'language',
      'lang',
    ].map((key) => storage.get(key)).find(Boolean);

    if (storedLanguage) {
      const normalized = String(storedLanguage).toLowerCase();
      if (normalized.startsWith('en')) return 'en';
      if (normalized.startsWith('tr')) return 'tr';
    }

    const htmlLanguage = String(document.documentElement.lang || '').toLowerCase();
    if (htmlLanguage.startsWith('en')) return 'en';
    return 'tr';
  };

  /**
   * Aktif dile göre kopya metnini döndürür.
   * @returns {object}
   */
  const getCopy = () => I18N[getActiveLanguage()] || I18N.tr;

  /**
   * Sistem temasını algılar.
   * @returns {'dark' | 'light'}
   */
  const getSystemTheme = () => (
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  /**
   * Tema geçişinde göze hoş gelen kısa transition sınıfını çalıştırır.
   */
  const runTransition = () => {
    window.clearTimeout(state.transitionTimer);
    document.documentElement.classList.add(TRANSITION_CLASS);
    state.transitionTimer = window.setTimeout(() => {
      document.documentElement.classList.remove(TRANSITION_CLASS);
    }, 260);
  };

  /**
   * Sayfanın theme-color meta değerini günceller.
   * Mobil tarayıcı üst barı tema ile uyumlu olur.
   * @param {'dark' | 'light'} theme
   */
  const updateThemeColor = (theme) => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }

    meta.setAttribute('content', theme === 'dark' ? '#07080b' : '#f6f1e7');
  };

  /**
   * Toggle butonundaki ikon, metin ve erişilebilirlik etiketlerini yeniler.
   */
  const updateToggle = () => {
    if (!state.toggle) return;

    const copy = getCopy();
    const isDark = state.theme === 'dark';
    const icon = state.toggle.querySelector('[data-gmp-theme-icon]');
    const label = state.toggle.querySelector('[data-gmp-theme-label]');

    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? copy.light : copy.dark;

    state.toggle.setAttribute('aria-label', isDark ? copy.ariaLight : copy.ariaDark);
    state.toggle.setAttribute('title', isDark ? copy.titleLight : copy.titleDark);
    state.toggle.setAttribute('aria-pressed', String(isDark));
  };

  /**
   * Temayı DOM'a uygular ve gerekiyorsa localStorage'a kaydeder.
   * @param {'dark' | 'light'} theme
   * @param {{ persist?: boolean, animate?: boolean }} options
   */
  const applyTheme = (theme, options = {}) => {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    const { persist = false, animate = true } = options;

    if (animate && state.theme !== normalizedTheme) runTransition();

    state.theme = normalizedTheme;
    document.documentElement.dataset.theme = normalizedTheme;
    document.documentElement.classList.toggle(DARK_CLASS, normalizedTheme === 'dark');
    document.documentElement.classList.toggle(LIGHT_CLASS, normalizedTheme === 'light');
    document.body?.classList?.toggle(DARK_CLASS, normalizedTheme === 'dark');
    document.body?.classList?.toggle(LIGHT_CLASS, normalizedTheme === 'light');

    updateThemeColor(normalizedTheme);
    updateToggle();

    if (persist) {
      state.userSelected = true;
      storage.set(STORAGE_KEY, normalizedTheme);
    }

    window.dispatchEvent(new CustomEvent('gmp:themechange', {
      detail: { theme: normalizedTheme, userSelected: state.userSelected },
    }));
  };

  /**
   * Kullanıcı butona bastığında light/dark arasında geçiş yapar.
   */
  const toggleTheme = () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark', { persist: true, animate: true });
  };

  /**
   * Tema butonunun DOM'un hangi alanına ekleneceğini bulur.
   * @returns {Element}
   */
  const getMountTarget = () => {
    const targetSelector = SELECTORS.mountTargets.find((selector) => document.querySelector(selector));
    return document.querySelector(targetSelector) || document.body;
  };

  /**
   * Tema butonu HTML'ini oluşturur ve sayfaya ekler.
   */
  const createToggle = () => {
    const existingToggle = document.getElementById(TOGGLE_ID);
    if (existingToggle) {
      state.toggle = existingToggle;
      state.toggle.addEventListener('click', toggleTheme);
      updateToggle();
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'gmp-theme-switcher';
    wrapper.setAttribute('data-gmp-theme-switcher', '');

    const button = document.createElement('button');
    button.id = TOGGLE_ID;
    button.className = 'gmp-theme-toggle';
    button.type = 'button';
    button.innerHTML = `
      <span class="gmp-theme-toggle__icon" data-gmp-theme-icon aria-hidden="true"></span>
      <span class="gmp-theme-toggle__label" data-gmp-theme-label></span>
    `;

    button.addEventListener('click', toggleTheme);
    wrapper.appendChild(button);

    const mountTarget = getMountTarget();

    if (mountTarget === document.body) {
      document.body.prepend(wrapper);
    } else if (mountTarget.matches?.('.lang-switcher, .language-switcher')) {
      mountTarget.appendChild(wrapper);
    } else {
      mountTarget.appendChild(wrapper);
    }

    state.toggle = button;
    updateToggle();
  };

  /**
   * Dil değiştiğinde tema butonundaki TR/EN metinlerini yeniler.
   */
  const bindLanguageUpdates = () => {
    document.addEventListener('click', (event) => {
      if (!event.target.closest(SELECTORS.languageButton)) return;
      window.setTimeout(updateToggle, 60);
    });

    const observer = new MutationObserver(() => updateToggle());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang', 'data-lang', 'data-language'],
    });
  };

  /**
   * Sistem teması değiştiğinde, kullanıcı manuel seçim yapmadıysa otomatik uygular.
   */
  const bindSystemThemeUpdates = () => {
    state.mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!state.mediaQuery) return;

    const handleSystemChange = () => {
      if (state.userSelected) return;
      applyTheme(getSystemTheme(), { persist: false, animate: true });
    };

    if (typeof state.mediaQuery.addEventListener === 'function') {
      state.mediaQuery.addEventListener('change', handleSystemChange);
    } else if (typeof state.mediaQuery.addListener === 'function') {
      state.mediaQuery.addListener(handleSystemChange);
    }
  };

  /**
   * İlk tema değerini belirler.
   * Kayıt yoksa kullanıcının sistem tercihine saygı duyar.
   * @returns {'dark' | 'light'}
   */
  const resolveInitialTheme = () => {
    const savedTheme = storage.get(STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      state.userSelected = true;
      return savedTheme;
    }

    state.userSelected = false;
    return getSystemTheme();
  };

  /**
   * Sprint 8 sistemini başlatır.
   */
  const init = () => {
    applyTheme(resolveInitialTheme(), { persist: false, animate: false });
    createToggle();
    bindLanguageUpdates();
    bindSystemThemeUpdates();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.GoncuMenuTheme = Object.freeze({
    getTheme: () => state.theme,
    setTheme: (theme) => applyTheme(theme, { persist: true, animate: true }),
    toggleTheme,
  });
})();
