(function () {
  try {
    if (sessionStorage.getItem('pa_visit_sent')) return;
    sessionStorage.setItem('pa_visit_sent', '1'); // flag only, not the count
  } catch (e) {}
  fetch('/api/visit', { method: 'POST', keepalive: true, credentials: 'same-origin' }).catch(function () {});
})();
