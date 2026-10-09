(() => {
  'use strict';

  const body = document.body;
  if (!body) return;
  body.classList.add('has-js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.querySelector('#motion-toggle');
  const revealSelector = '.reveal';
  const excluded = '.tab-pane,.tab-link,.faq-item,.faq-question,.faq-answer,[data-note],#sound-toggle,#motion-toggle';
  let observer = null;
  const tapTimers = new WeakMap();

  const immediateReveal = element => {
    if (!element) return;
    element.style.setProperty('transition-delay', '0s');
    element.style.setProperty('transition-duration', '0s');
    element.classList.add('is-visible');
  };
  const revealContainer = container => {
    if (!container) return;
    if (container.matches?.(revealSelector)) immediateReveal(container);
    container.querySelectorAll?.(revealSelector).forEach(immediateReveal);
  };
  const showAll = () => document.querySelectorAll(revealSelector).forEach(el => el.classList.add('is-visible'));

  // Add progressive classes only to editorial content. Interactive tab and FAQ panels stay available.
  document.querySelectorAll('main section:not(.hero):not(.course-summary-section):not(.faq-section)').forEach(section => {
    const candidates = [...section.querySelectorAll('h2,h3,.grid-item,.method-item,.lesson-content-item,.form-option,.support-item,.testimonial-card,.access-card,.detail-row')];
    const candidateSet = new Set(candidates);
    const unique = [...new Set(candidates)].filter(el => {
      if (el.matches(excluded) || el.closest(excluded)) return false;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) if (candidateSet.has(parent)) return false;
      return true;
    });
    unique.forEach((el, index) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(180, index * 42)}ms`);
    });
  });
  document.querySelectorAll('.course-summary-section .tab-pane .detail-row').forEach((row, index) => {
    row.classList.add('reveal');
    row.style.setProperty('--reveal-delay', `${Math.min(180, index * 30)}ms`);
  });

  const configureMotion = () => {
    if (observer) observer.disconnect();
    body.classList.toggle('reduce-motion', reduced.matches);
    if (motionToggle) motionToggle.hidden = reduced.matches;
    if (reduced.matches || !('IntersectionObserver' in window)) {
      body.classList.remove('has-motion');
      showAll();
      return;
    }
    body.classList.add('has-motion');
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll(`${revealSelector}:not(.is-visible)`).forEach(el => observer.observe(el));
  };
  configureMotion();

  const revealHash = () => {
    if (!location.hash || location.hash === '#') return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      for (let node = target; node && node !== document.body; node = node.parentElement) immediateReveal(node.classList.contains('reveal') ? node : null);
    }
  };
  revealHash();
  window.addEventListener('hashchange', revealHash);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById((link.getAttribute('href') || '').slice(1));
    if (target) revealContainer(target.closest('section') || target);
  }, { capture: true });
  document.addEventListener('focusin', event => {
    for (let node = event.target; node && node !== document.body; node = node.parentElement) {
      if (node.matches?.(revealSelector)) immediateReveal(node);
    }
  });

  const setPaused = paused => {
    body.classList.toggle('motion-paused', paused);
    if (!motionToggle) return;
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? '動きを再開' : '動きを止める';
    if (paused) showAll();
  };
  if (motionToggle) {
    motionToggle.addEventListener('click', () => setPaused(!body.classList.contains('motion-paused')));
    setPaused(body.classList.contains('motion-paused'));
  }

  // Supplement the original tab handler with keyboard and accessible state.
  const tabs = [...document.querySelectorAll('.tab-link[data-tab]')];
  const syncTabs = wrap => {
    if (!wrap) return;
    wrap.querySelectorAll('.tab-link[data-tab]').forEach(tab => {
      const active = tab.classList.contains('active');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', tab.dataset.tab);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  };
  tabs.forEach(tab => {
    syncTabs(tab.closest('.course-summary-section'));
    tab.addEventListener('click', () => syncTabs(tab.closest('.course-summary-section')), { passive: true });
    tab.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const group = [...tab.closest('.course-summary-section').querySelectorAll('.tab-link[data-tab]')];
      const current = group.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? group.length - 1 : (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + group.length) % group.length;
      event.preventDefault();
      group[next].focus();
      group[next].click();
    });
  });

  // Keep the original FAQ behavior, while exposing its state to assistive tech.
  const faqItems = [...document.querySelectorAll('.faq-item')];
  const syncFaq = item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question || !answer) return;
    if (!question.id) question.id = `faq-question-${faqItems.indexOf(item) + 1}`;
    if (!answer.id) answer.id = `faq-answer-${faqItems.indexOf(item) + 1}`;
    question.setAttribute('aria-controls', answer.id);
    question.setAttribute('aria-expanded', String(question.classList.contains('active') || answer.classList.contains('open')));
  };
  faqItems.forEach(syncFaq);
  if (faqItems.length && 'MutationObserver' in window) {
    const faqObserver = new MutationObserver(records => records.forEach(record => syncFaq(record.target.closest('.faq-item'))));
    faqItems.forEach(item => faqObserver.observe(item, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] }));
  }

  // The original inline script controls visibility; mirror it to inert for the new sticky booking CTA.
  const sticky = document.getElementById('stickyCta');
  const stickyMobile = window.matchMedia('(max-width: 768px)');
  const application = document.getElementById('application');
  let formInView = false;
  const syncSticky = () => {
    if (!sticky) return;
    const hidden = sticky.getAttribute('aria-hidden') === 'true' || !stickyMobile.matches || formInView;
    sticky.inert = hidden;
    sticky.classList.toggle('form-in-view', formInView);
  };
  if (sticky) {
    syncSticky();
    window.addEventListener('resize', syncSticky, { passive: true });
    if ('MutationObserver' in window) new MutationObserver(syncSticky).observe(sticky, { attributes: true, attributeFilter: ['aria-hidden', 'style', 'class'] });
  }
  if (sticky && application && 'IntersectionObserver' in window) {
    const formObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      formInView = Boolean(entry?.isIntersecting);
      syncSticky();
    }, { rootMargin: '0px', threshold: 0.01 });
    formObserver.observe(application);
  }

  const notes = { C4: 'ド♪', D4: 'レ♪', E4: 'ミ♪', F4: 'ファ♪', G4: 'ソ♪', A4: 'ラ♪', B4: 'シ♪' };
  const noteHz = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88 };
  const playArea = document.querySelector('#music-play');
  const musicCharacter = document.querySelector('.music-character');
  const musicBubbles = [...document.querySelectorAll('.music-bubble')];
  const soundToggle = document.querySelector('#sound-toggle');
  const status = document.querySelector('#music-status');
  let soundOn = false;
  let soundBusy = false;
  let audioContext = null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const enableAudio = async () => {
    if (!AudioContextClass) return false;
    if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') await audioContext.resume();
    return audioContext.state === 'running';
  };
  const setSound = enabled => {
    soundOn = enabled;
    if (!soundToggle) return;
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundToggle.textContent = enabled ? '音を止める' : '音を出す';
  };
  const playNote = note => {
    const label = notes[note] || `${note}♪`;
    if (status) status.textContent = label;
    const key = playArea?.querySelector(`[data-note="${note}"]`);
    const visualTargets = [key, ...(reduced.matches || body.classList.contains('motion-paused') ? [] : [musicCharacter, ...musicBubbles])].filter(Boolean);
    visualTargets.forEach(element => {
      const previous = tapTimers.get(element);
      if (previous) window.clearTimeout(previous);
      element.classList.remove('is-playing');
      void element.offsetWidth;
      element.classList.add('is-playing');
      const timer = window.setTimeout(() => { element.classList.remove('is-playing'); tapTimers.delete(element); }, 700);
      tapTimers.set(element, timer);
    });
    if (!soundOn || !audioContext || !noteHz[note]) return;
    if (audioContext.state === 'closed') { setSound(false); return; }
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = noteHz[note];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  };
  if (soundToggle) {
    soundToggle.setAttribute('aria-pressed', 'false');
    soundToggle.textContent = '音を出す';
    soundToggle.addEventListener('click', async () => {
      if (soundBusy) return;
      if (soundOn) { setSound(false); return; }
      soundBusy = true;
      try {
        const enabled = await enableAudio();
        if (enabled) setSound(true);
        else {
          setSound(false);
          if (status) status.textContent = 'この端末では音を出せません。音符の動きを楽しんでね。';
        }
      } catch {
        setSound(false);
        if (status) status.textContent = 'この端末では音を出せません。音符の動きを楽しんでね。';
      } finally { soundBusy = false; }
    });
  }
  if (playArea) playArea.addEventListener('click', event => {
    const key = event.target.closest('[data-note]');
    if (key && playArea.contains(key)) playNote(key.dataset.note);
  });

  const onMotionPreferenceChange = () => configureMotion();
  if (reduced.addEventListener) reduced.addEventListener('change', onMotionPreferenceChange); else reduced.addListener(onMotionPreferenceChange);
})();
