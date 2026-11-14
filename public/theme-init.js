// Applies the saved theme before first paint to avoid a flash.
try {
  var p = JSON.parse(localStorage.getItem('bq.prefs.v1') || '{}');
  var dark = p.theme === 'dark' || ((!p.theme || p.theme === 'system') && matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
