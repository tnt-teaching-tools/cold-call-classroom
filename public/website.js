(() => {
  const showView = () => {
    const view = location.hash === '#classroom' ? 'classroom' : location.hash === '#techniques' ? 'techniques' : location.hash === '#privacy' ? 'privacy' : 'welcome';
    document.body.dataset.view = view;
    const current = view === 'welcome' ? '#home' : '#' + view;
    document.querySelectorAll('.site-nav a').forEach(link => link.setAttribute('aria-current', link.getAttribute('href') === current ? 'page' : 'false'));
  };
  window.addEventListener('hashchange', showView);
  showView();
  const techniqueTabs = Array.from(document.querySelectorAll('[data-technique-tab]'));
  const selectTechnique = tab => {
    techniqueTabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
  };
  techniqueTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTechnique(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if(event.key === 'ArrowRight') next = (index + 1) % techniqueTabs.length;
      if(event.key === 'ArrowLeft') next = (index - 1 + techniqueTabs.length) % techniqueTabs.length;
      if(event.key === 'Home') next = 0;
      if(event.key === 'End') next = techniqueTabs.length - 1;
      if(next !== undefined) { event.preventDefault(); selectTechnique(techniqueTabs[next]); techniqueTabs[next].focus(); }
    });
  });
  const config = window.COLD_CALL_CONFIG || {};
  const id = config.googleAnalyticsId;
  const validId = /^G-[A-Z0-9]+$/.test(id || '');
  const key = 'cold-call-analytics-consent';
  let running = false;
  const getChoice = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const saveChoice = value => { try { localStorage.setItem(key, value); } catch {} };
  function startAnalytics() {
    if (!validId || running || getChoice() !== 'yes') return;
    running = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window['ga-disable-' + id] = false;
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    window.gtag('event', 'page_view', { page_title: 'Cold Call Classroom', page_location: location.origin + location.pathname });
    const script = document.createElement('script'); script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id); document.head.appendChild(script);
  }
  const panel = document.getElementById('analytics-consent');
  document.getElementById('analytics-settings').hidden = !validId;
  panel.hidden = !validId || !!getChoice();
  document.getElementById('analytics-settings').onclick = () => { panel.hidden = !panel.hidden; };
  document.getElementById('analytics-allow').onclick = () => { saveChoice('yes'); panel.hidden = true; startAnalytics(); };
  document.getElementById('analytics-decline').onclick = () => { saveChoice('no'); if(validId) window['ga-disable-' + id] = true; panel.hidden = true; };
  startAnalytics();
  // Only fixed event names; never read class lists, names, form fields or app storage.
  document.querySelector('.feedback-panel').addEventListener('toggle', e => { if(e.target.open && getChoice() === 'yes' && window.gtag) window.gtag('event', 'feedback_open'); });
  const form = document.getElementById('feedback-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const status = document.getElementById('feedback-status'), button = document.getElementById('feedback-send');
    const values = Object.fromEntries(new FormData(form)); if(values._honey) return;
    button.disabled = true; status.textContent = 'Sending feedback…';
    try {
      const response = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(config.feedbackEmail), { method:'POST', headers:{'Content-Type':'application/json',Accept:'application/json'}, body:JSON.stringify(values), signal:AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || (result.success !== true && result.success !== 'true')) throw new Error('Not accepted');
      status.textContent = 'Feedback submitted. Thank you for helping improve the app.'; form.reset();
      if(getChoice() === 'yes' && window.gtag) window.gtag('event','feedback_submit');
    } catch {
      status.textContent = 'The form could not send right now. Your message is still here. You can retry or email tntteachingandlearning@gmail.com.';
    } finally {button.disabled = false;}
  });
})();
