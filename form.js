(() => {
  'use strict';
  const form = document.querySelector('#application-form');
  if (!form) return;
  const submit = form.querySelector('#application-submit');
  const status = document.querySelector('#form-status');
  const success = document.querySelector('#form-success');
  const originalLabel = submit ? submit.textContent : '';
  let pending = false;

  const placeholder = 'FORMSPREE_ENDPOINT';

  const setStatus = message => {
    if (!status) return;
    status.textContent = message;
    status.focus({ preventScroll: true });
  };
  const setPending = value => {
    pending = value;
    if (submit) {
      submit.disabled = value;
      submit.textContent = value ? '送信中…' : originalLabel;
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const endpoint = form.action;
    if (!endpoint || endpoint.endsWith(placeholder) || endpoint.endsWith(`/${placeholder}`)) {
      setStatus('受付先がまだ設定されていません。入力内容は保持しています。公式LINEまたは電話でご相談ください。');
      return;
    }
    if (status) status.textContent = '';
    setPending(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort('timeout'), 25000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      let data = null;
      try { data = await response.json(); } catch { data = null; }
      if (!response.ok || !data || data.ok !== true) throw new Error('formspree-rejected');
      if (submit) submit.disabled = true;
      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus({ preventScroll: true });
      }
    } catch {
      setPending(false);
      setStatus('送信できませんでした。入力内容は保持しています。時間をおいて再度お試しいただくか、公式LINEまたは電話でご相談ください。');
    } finally { window.clearTimeout(timeout); }
  });
})();
