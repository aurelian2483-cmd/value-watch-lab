(function () {
  'use strict';
  function announce(message) {
    const target = document.getElementById('page-status');
    if (target) { target.hidden = false; target.textContent = message; }
  }
  window.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'SCRIPT') {
      announce('A required component could not load. Reload this page to retry. Previously saved research has not been changed.');
    } else if (event.error) {
      announce('A view could not finish updating. Your saved research is retained. Reload this page to recover the current view.');
    }
  }, true);
  window.addEventListener('unhandledrejection', function () {
    announce('An update could not finish. Your saved research is retained. Refresh the sources or reload this page to retry.');
  });
})();
