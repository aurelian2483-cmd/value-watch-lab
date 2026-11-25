'use strict';
(() => {
  const rows = [...document.querySelectorAll('[data-pl-current]')];
  let timer;
  function expire() {
    clearTimeout(timer);
    const now = Date.now();
    let next = Infinity;
    for (const row of rows) {
      const expires = Number(row.dataset.expires);
      if (!(expires > now)) {
        row.hidden = true;
        row.replaceChildren();
        row.nextElementSibling.hidden = false;
      } else {
        row.hidden = false;
        next = Math.min(next, expires);
      }
    }
    if (Number.isFinite(next)) timer = setTimeout(expire, Math.min(next - now, 2147483647));
  }
  expire();
  window.addEventListener('pageshow', expire);
  document.addEventListener('visibilitychange', expire);
})();
