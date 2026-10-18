(() => {
  const CONFIG = {
    metrikaId: null, // [заполнить] номер счётчика Яндекс Метрики, например 98765432
    formEndpoint: null, // адрес обработчика форм; на Битрикс24 формы заменяются CRM-формами (см. README)
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  /* ---------- Яндекс Метрика и цели ---------- */
  const goal = (name, params) => {
    if (CONFIG.metrikaId && typeof window.ym === 'function') window.ym(CONFIG.metrikaId, 'reachGoal', name, params);
  };

  const loadMetrika = () => {
    if (!CONFIG.metrikaId || window.ym) return;
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    window.ym(CONFIG.metrikaId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goal]');
    if (el) goal(el.dataset.goal);
  });

  /* ---------- Cookie ---------- */
  const COOKIE_KEY = 'legtrop_cookie';
  const cookie = $('#cookie');
  const consent = localStorage.getItem(COOKIE_KEY);
  if (consent === 'all') loadMetrika();
  if (!consent) cookie.hidden = false;
  $$('[data-cookie]', cookie).forEach((btn) => btn.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, btn.dataset.cookie);
    cookie.hidden = true;
    if (btn.dataset.cookie === 'all') loadMetrika();
  }));

  /* ---------- Шапка и меню ---------- */
  const header = $('#header');
  const burger = $('.burger');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    header.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  };
  burger.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
  $$('#nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  const navLinks = $$('#nav a[href^="#"]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });

  /* ---------- Закреплённая онлайн-бронь ---------- */
  const sticky = $('#sticky-cta');
  const hero = $('.hero');
  const mobile = window.matchMedia('(max-width: 720px)');
  const updateSticky = () => {
    const pastHero = window.scrollY > hero.offsetHeight * 0.6;
    sticky.classList.toggle('is-visible', mobile.matches || pastHero);
  };
  updateSticky();
  window.addEventListener('scroll', updateSticky, { passive: true });
  mobile.addEventListener('change', updateSticky);

  /* ---------- Вкладки цен ---------- */
  $$('[data-tabs]').forEach((tabs) => {
    const buttons = $$('[role="tab"]', tabs);
    const select = (btn) => {
      buttons.forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
        $(`#${b.getAttribute('aria-controls')}`).hidden = !on;
      });
    };
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => select(btn));
      btn.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!dir) return;
        const next = buttons[(i + dir + buttons.length) % buttons.length];
        select(next); next.focus();
      });
    });
  });

  /* ---------- Модальное окно ---------- */
  const modal = $('#modal');
  const modalForm = $('#modal-form');
  const MODAL_TEXT = {
    booking: ['Забронировать стол', 'Администратор перезвонит и подтвердит бронь.'],
    school: ['Записаться в школу', 'Перезвоним, расскажем о занятиях и подберём время.'],
    tournament: ['Записаться на турнир', 'Перезвоним и подтвердим участие.'],
  };
  let lastFocus = null;

  const openModal = (type, preset = {}) => {
    lastFocus = document.activeElement;
    const [title, lead] = MODAL_TEXT[type];
    $('#modal-title').textContent = title;
    $('#modal-lead').textContent = lead;
    modalForm.dataset.form = type;
    modalForm.elements.type.value = type;
    $$('[data-only]', modalForm).forEach((group) => {
      const on = group.dataset.only === type;
      group.hidden = !on;
      $$('input, select', group).forEach((f) => { f.disabled = !on; });
    });
    if (preset.table) modalForm.elements.table.value = preset.table;
    $('.form__status', modalForm).textContent = '';
    setMenu(false);
    modal.hidden = false;
    document.body.classList.add('is-locked');
    modalForm.elements.name.focus();
    goal(`open_${type}`);
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) openModal(opener.dataset.open, { table: opener.dataset.table });
    if (e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ---------- Формы ---------- */
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $$('input[type="date"]').forEach((i) => { i.min = iso; i.value = iso; });

  const formatPhone = (value) => {
    let d = value.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = `7${d.slice(1)}`;
    if (d[0] !== '7') d = `7${d}`;
    d = d.slice(0, 11);
    const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
    let out = '+7';
    if (p[0]) out += ` (${p[0]}`;
    if (p[0].length === 3) out += ')';
    if (p[1]) out += ` ${p[1]}`;
    if (p[2]) out += `-${p[2]}`;
    if (p[3]) out += `-${p[3]}`;
    return out;
  };
  $$('input[type="tel"]').forEach((i) => i.addEventListener('input', () => { i.value = formatPhone(i.value); }));

  const validate = (form) => {
    let ok = true;
    $$('input, select', form).forEach((f) => {
      if (f.disabled || f.type === 'hidden') return;
      let valid = f.type === 'checkbox' ? f.checked : !f.required || f.value.trim() !== '';
      if (f.type === 'tel') valid = f.value.replace(/\D/g, '').length === 11;
      f.closest('.field, .consent')?.classList.toggle('is-invalid', !valid);
      if (!valid) ok = false;
    });
    return ok;
  };

  const send = async (data) => {
    if (!CONFIG.formEndpoint) {
      console.info('[demo] Заявка не отправлена: не настроен обработчик форм', data);
      return;
    }
    const res = await fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(res.status);
  };

  $$('form[data-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('.form__status', form);
      status.classList.remove('is-error');
      if (!validate(form)) {
        status.textContent = 'Проверьте поля, отмеченные цветом, и согласие на обработку данных.';
        status.classList.add('is-error');
        return;
      }
      const type = form.dataset.form;
      const data = Object.fromEntries(new FormData(form));
      data.type = type;
      data.page = location.href;
      const button = $('button[type="submit"]', form);
      button.disabled = true;
      try {
        await send(data);
        goal(`form_${type}`);
        form.reset();
        $$('input[type="date"]', form).forEach((i) => { i.value = iso; });
        status.textContent = 'Спасибо! Заявка принята — скоро перезвоним.';
      } catch {
        status.textContent = 'Не удалось отправить. Позвоните нам — запишем по телефону.';
        status.classList.add('is-error');
      } finally {
        button.disabled = false;
      }
    });
  });

  /* Цели для CRM-форм Битрикс24, если они встроены вместо HTML-форм */
  window.addEventListener('b24:form:submit', (e) => {
    const name = e.detail?.object?.title || '';
    goal(/школ/i.test(name) ? 'form_school' : /турнир/i.test(name) ? 'form_tournament' : 'form_booking');
  });

  /* ---------- Карта: загружается при приближении ---------- */
  const map = $('[data-map]');
  if (map) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      map.innerHTML = `<iframe src="${map.dataset.map}" title="Легенда Тропарёво на карте" loading="lazy" allowfullscreen></iframe>`;
      io.disconnect();
    }, { rootMargin: '400px' });
    io.observe(map);
  }

  /* Ссылки-заглушки, которые ещё не заполнены */
  $$('a[data-todo]').forEach((a) => a.addEventListener('click', (e) => {
    if (a.getAttribute('href') === '#') e.preventDefault();
  }));
})();
