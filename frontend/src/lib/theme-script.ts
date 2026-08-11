/** Script inline exécuté avant le paint pour éviter le flash de thème. */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('studio_theme_mode');
    var dark;
    if (stored === 'light') dark = false;
    else if (stored === 'dark') dark = true;
    else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(dark ? 'dark' : 'light');
  } catch (e) {}
})();
`.trim();
