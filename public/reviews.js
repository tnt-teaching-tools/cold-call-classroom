(() => {
  const settings = (window.COLD_CALL_CONFIG || {}).reviews || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(settings.url || '') && !!settings.publishableKey;
  const section = document.getElementById('community-reviews');
  const admin = document.getElementById('review-admin');
  if (!configured) return;
  if (section) section.hidden = false;
  const privacy = document.getElementById('review-privacy'); if (privacy) privacy.hidden = false;
  const api = async (path, options = {}, token) => {
    const headers = { apikey: settings.publishableKey, 'Content-Type': 'application/json', ...options.headers };
    if (token) headers.Authorization = 'Bearer ' + token;
    const result = await fetch(settings.url + path, { ...options, headers, signal: AbortSignal.timeout(20000) });
    const body = await result.text();
    if (!result.ok) throw new Error('Request failed');
    return body ? JSON.parse(body) : null;
  };
  const card = review => {
    const article = document.createElement('article'); article.className = 'review-card';
    const stars = document.createElement('p'); stars.className = 'review-stars'; stars.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating); stars.setAttribute('aria-label', review.rating + ' out of 5 stars');
    const comment = document.createElement('p'); comment.textContent = review.comment;
    const name = document.createElement('strong'); name.textContent = review.display_name;
    article.append(stars, comment, name); return article;
  };
  if (section) {
    const form = document.getElementById('review-form'), status = document.getElementById('review-status');
    const list = document.getElementById('approved-reviews'), summary = document.getElementById('review-summary');
    const load = async () => {
      try {
        const rows = await api('/rest/v1/site_reviews?select=rating,comment,display_name,created_at&status=eq.approved&order=created_at.desc&limit=100');
        list.replaceChildren(...rows.map(card));
        summary.textContent = rows.length ? 'Approved teacher reviews' : 'No published reviews yet. Be the first to share your thoughts.';
      } catch { summary.textContent = 'Reviews are unavailable right now. Please try again later.'; }
    };
    let openedAt = Date.now();
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity() || form.elements.website.value) return;
      if (Date.now() - openedAt < 3000) { status.textContent = 'Please take a moment to check your review, then try again.'; return; }
      const button = form.querySelector('button[type=submit]'); button.disabled = true;
      status.textContent = 'Sending your review…';
      try {
        await api('/rest/v1/rpc/submit_site_review', { method:'POST', body:JSON.stringify({p_rating:Number(form.elements.rating.value),p_comment:form.elements.comment.value.trim(),p_name:form.elements.display_name.value.trim() || 'Teacher'}) });
        form.reset(); openedAt = Date.now(); status.textContent = 'Thank you. Your review is awaiting approval and is not public yet.';
      } catch { status.textContent = 'Your review could not be sent. Your text is still here. Please try again later.'; }
      finally { button.disabled = false; }
    });
    load(); setInterval(() => { if (!document.hidden && document.body.dataset.view === 'welcome') load(); }, 60000);
  }
  if (admin) {
    document.getElementById('admin-setup').hidden = true;
    const login = document.getElementById('review-login'), panel = document.getElementById('moderation-panel'), status = document.getElementById('admin-status'), list = document.getElementById('pending-reviews');
    let session;
    try { session = JSON.parse(sessionStorage.getItem('tnt-review-session')); } catch {}
    const save = value => { session = value; try { if (value) sessionStorage.setItem('tnt-review-session', JSON.stringify(value)); else sessionStorage.removeItem('tnt-review-session'); } catch {} };
    const token = async () => {
      if (!session) throw new Error('Sign in required');
      if (Date.now() / 1000 > session.expires_at - 60) {
        const refreshed = await api('/auth/v1/token?grant_type=refresh_token', {method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
        save({...refreshed,expires_at:Date.now()/1000+refreshed.expires_in});
      }
      return session.access_token;
    };
    const load = async () => {
      const access = await token();
      if (!await api('/rest/v1/rpc/is_review_moderator', {method:'POST',body:'{}'},access)) throw new Error('Moderator access required');
      const filter = document.getElementById('review-filter').value;
      const rows = await api('/rest/v1/site_reviews?select=*&status=eq.' + filter + '&order=created_at.desc&limit=100', {}, access);
      login.hidden = true; panel.hidden = false; list.replaceChildren();
      if (!rows.length) list.textContent = 'No reviews in this category.';
      rows.forEach(review => {
        const article = card(review);
        const actions = document.createElement('div'); actions.className = 'review-actions';
        [['Approve','approved'],['Hide','hidden'],['Delete',null]].forEach(([label,next]) => {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
          button.disabled = next === review.status;
          button.onclick = async () => {
            if (next === null && !confirm('Permanently delete this review?')) return;
            button.disabled = true;
            try {
              await api('/rest/v1/site_reviews?id=eq.' + encodeURIComponent(review.id), {method:next === null ? 'DELETE' : 'PATCH',body:next === null ? undefined : JSON.stringify({status:next})},await token());
              status.textContent = next === 'approved' ? 'Review approved. It will appear on the homepage.' : next === 'hidden' ? 'Review hidden from the homepage.' : 'Review deleted.';
              await load();
            } catch { status.textContent = 'Could not save the change. Please sign in again if needed.'; button.disabled = false; }
          };
          actions.append(button);
        });
        article.append(actions); list.append(article);
      });
    };
    login.hidden = false;
    login.addEventListener('submit', async event => {
      event.preventDefault(); const button = login.querySelector('button'); button.disabled = true; status.textContent = 'Signing in…';
      try {
        const signed = await api('/auth/v1/token?grant_type=password', {method:'POST',body:JSON.stringify({email:login.elements.email.value,password:login.elements.password.value})});
        save({...signed,expires_at:Date.now()/1000+signed.expires_in}); login.elements.password.value = ''; await load(); status.textContent = '';
      } catch { save(null); status.textContent = 'Could not sign in as a moderator. Check your login and admin access.'; }
      finally { button.disabled = false; }
    });
    document.getElementById('review-filter').onchange = () => load().catch(() => { status.textContent = 'Could not load reviews. Please sign in again.'; });
    document.getElementById('review-refresh').onclick = () => load().catch(() => { status.textContent = 'Could not load reviews. Please sign in again.'; });
    document.getElementById('review-logout').onclick = async () => { try { await api('/auth/v1/logout',{method:'POST'},await token()); } catch {} save(null); panel.hidden = true; login.hidden = false; list.replaceChildren(); status.textContent = 'Signed out.'; };
    if (session) load().catch(() => { save(null); panel.hidden = true; login.hidden = false; status.textContent = 'Please sign in again.'; });
  }
})();
