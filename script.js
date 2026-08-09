document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

navToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

document.querySelectorAll('.project-item__header').forEach((header) => {
  header.addEventListener('click', () => {
    const item = header.closest('.project-item');
    const isOpen = item.classList.toggle('is-open');
    header.setAttribute('aria-expanded', String(isOpen));
  });
});

document.querySelectorAll('.gallery__item img, .hero__photo-frame img').forEach((img) => {
  img.setAttribute('draggable', 'false');
  img.addEventListener('contextmenu', (e) => e.preventDefault());
  img.addEventListener('dragstart', (e) => e.preventDefault());
});

/* ---------- Idiomas ---------- */

const LANG_TAGS = { pt: 'pt-PT', en: 'en', es: 'es' };
const originalText = new WeakMap();
let currentLang = 'pt';

function collectTextNodes() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue.trim()) continue;
    if (node.parentElement.closest('script, style, .lang-switch')) continue;
    nodes.push(node);
  }
  return nodes;
}

const textNodes = collectTextNodes();
textNodes.forEach((node) => originalText.set(node, node.nodeValue));

const translatableAttrs = [
  { el: document.getElementById('cfNome'), attr: 'placeholder' },
  { el: document.getElementById('cfEmail'), attr: 'placeholder' },
  { el: document.getElementById('cfServico'), attr: 'placeholder' },
  { el: document.getElementById('cfIndicativo'), attr: 'aria-label' },
  { el: document.getElementById('navToggle'), attr: 'aria-label' },
];
translatableAttrs.forEach((entry) => {
  entry.original = entry.el.getAttribute(entry.attr);
});

const originalTitle = document.title;
const metaDesc = document.querySelector('meta[name="description"]');
const originalDesc = metaDesc.getAttribute('content');

function t(key) {
  if (currentLang === 'pt') return null;
  const dict = I18N[currentLang];
  return dict && dict[key] ? dict[key] : null;
}

function applyLanguage(lang) {
  currentLang = lang;
  const dict = lang === 'pt' ? null : I18N[lang];

  textNodes.forEach((node) => {
    const original = originalText.get(node);
    if (!dict) {
      node.nodeValue = original;
      return;
    }
    const key = original.trim();
    const translated = dict[key];
    node.nodeValue = translated ? original.replace(key, translated) : original;
  });

  translatableAttrs.forEach(({ el, attr, original }) => {
    const translated = dict ? dict[`@${attr === 'placeholder' ? 'placeholder' : 'aria'}:${original}`] : null;
    el.setAttribute(attr, translated || original);
  });

  document.title = (dict && dict['@title']) || originalTitle;
  metaDesc.setAttribute('content', (dict && dict['@desc']) || originalDesc);
  document.documentElement.lang = LANG_TAGS[lang];

  document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === lang);
  });

  try {
    localStorage.setItem('lang', lang);
  } catch (err) {
    /* armazenamento indisponível — segue sem persistir */
  }
}

document.querySelectorAll('.lang-switch__btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

let savedLang = null;
try {
  savedLang = localStorage.getItem('lang');
} catch (err) {
  /* ignorado */
}
if (!savedLang) {
  const browser = (navigator.language || 'pt').slice(0, 2).toLowerCase();
  savedLang = ['en', 'es'].includes(browser) ? browser : 'pt';
}
if (savedLang !== 'pt') applyLanguage(savedLang);

/* ---------- Formulário ---------- */

const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const indicativo = document.getElementById('cfIndicativo');
const telefone = document.getElementById('cfTelefone');
const nome = document.getElementById('cfNome');
const email = document.getElementById('cfEmail');
const servico = document.getElementById('cfServico');

// Quantidade de dígitos aceite por indicativo (sem o código do país).
const PHONE_DIGITS = {
  '+351': [9, 9],
  '+55': [10, 11],
  '+34': [9, 9],
  '+33': [9, 9],
  '+44': [10, 10],
  '+49': [10, 11],
  '+39': [9, 10],
  '+41': [9, 9],
  '+32': [9, 9],
  '+31': [9, 9],
  '+352': [9, 9],
  '+353': [9, 9],
  '+43': [10, 13],
  '+244': [9, 9],
  '+258': [9, 9],
  '+1': [10, 10],
};

// Máscaras por indicativo; '#' representa um dígito. Listas em ordem
// crescente cobrem países com números de comprimento variável.
const PHONE_MASKS = {
  '+351': ['### ### ###'],
  '+55': ['(##) ####-####', '(##) #####-####'],
  '+34': ['### ### ###'],
  '+33': ['# ## ## ## ##'],
  '+44': ['#### ######'],
  '+49': ['### #######', '### ########'],
  '+39': ['### ### ###', '### ### ####'],
  '+41': ['## ### ## ##'],
  '+32': ['### ## ## ##'],
  '+31': ['# ## ## ## ##'],
  '+352': ['### ### ###'],
  '+353': ['## ### ####'],
  '+43': ['### #######', '### ########', '### #########', '### ##########'],
  '+244': ['### ### ###'],
  '+258': ['## ### ####'],
  '+1': ['(###) ###-####'],
};

function countDigitSlots(mask) {
  return (mask.match(/#/g) || []).length;
}

function pickMask(digits, masks) {
  return masks.find((m) => countDigitSlots(m) >= digits.length) || masks[masks.length - 1];
}

function maskDigits(digits, masks) {
  const mask = pickMask(digits, masks);
  let out = '';
  let di = 0;
  for (let i = 0; i < mask.length; i += 1) {
    const ch = mask[i];
    if (ch === '#') {
      if (di >= digits.length) break;
      out += digits[di];
      di += 1;
    } else {
      if (di >= digits.length) break;
      out += ch;
    }
  }
  // Fecha os separadores que vêm logo a seguir ao último dígito, para que
  // "11" apareça já como "(11) " no formato brasileiro.
  if (di === digits.length && digits.length) {
    let consumed = 0;
    for (let i = 0; i < mask.length; i += 1) {
      if (mask[i] === '#') consumed += 1;
      if (consumed === digits.length) {
        for (let j = i + 1; j < mask.length && mask[j] !== '#'; j += 1) out += mask[j];
        break;
      }
    }
  }
  return out;
}

function formatPhoneInput() {
  const masks = PHONE_MASKS[indicativo.value];
  if (!masks) return;

  const raw = telefone.value;
  const cursor = telefone.selectionStart;
  const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, '').length;
  const maxDigits = Math.max(...masks.map(countDigitSlots));
  const digits = raw.replace(/\D/g, '').slice(0, maxDigits);
  const formatted = maskDigits(digits, masks);

  if (formatted === raw) return;
  telefone.value = formatted;

  let pos = formatted.length;
  if (digitsBeforeCursor === 0) {
    pos = 0;
  } else {
    let seen = 0;
    for (let i = 0; i < formatted.length; i += 1) {
      if (/\d/.test(formatted[i])) {
        seen += 1;
        if (seen === digitsBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
    }
  }
  telefone.setSelectionRange(pos, pos);
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function setError(field, messageKey) {
  const holder = contactForm.querySelector(`[data-error-for="${field.id}"]`);
  if (!messageKey) {
    holder.textContent = '';
    holder.classList.remove('is-visible');
    field.classList.remove('has-error');
    field.removeAttribute('aria-invalid');
    return false;
  }
  holder.textContent = t(messageKey) || ERR_PT[messageKey];
  holder.classList.add('is-visible');
  field.classList.add('has-error');
  field.setAttribute('aria-invalid', 'true');
  return true;
}

const ERR_PT = {
  '@err:nome': 'Escreva o seu nome completo (nome e sobrenome/apelido).',
  '@err:telefone': 'Introduza um número de telefone válido para o país selecionado.',
  '@err:email': 'Introduza um e-mail válido, por exemplo nome@dominio.com.',
  '@err:servico': 'Descreva brevemente o serviço que procura.',
};

function validateNome() {
  const value = nome.value.trim().replace(/\s+/g, ' ');
  const parts = value.split(' ').filter((p) => p.length >= 2);
  return setError(nome, parts.length >= 2 ? null : '@err:nome');
}

function validateTelefone() {
  const digits = telefone.value.replace(/\D/g, '');
  const range = PHONE_DIGITS[indicativo.value] || [6, 15];
  const ok = digits.length >= range[0] && digits.length <= range[1];
  return setError(telefone, ok ? null : '@err:telefone');
}

function validateEmail() {
  return setError(email, EMAIL_RE.test(email.value.trim()) ? null : '@err:email');
}

function validateServico() {
  return setError(servico, servico.value.trim().length >= 10 ? null : '@err:servico');
}

[
  [nome, validateNome],
  [telefone, validateTelefone],
  [email, validateEmail],
  [servico, validateServico],
].forEach(([field, validate]) => {
  field.addEventListener('blur', validate);
  field.addEventListener('input', () => {
    if (field.classList.contains('has-error')) validate();
  });
});

telefone.addEventListener('input', formatPhoneInput);

indicativo.addEventListener('change', () => {
  const option = indicativo.selectedOptions[0];
  telefone.placeholder = option.dataset.placeholder || '';
  formatPhoneInput();
  if (telefone.classList.contains('has-error')) validateTelefone();
});

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Valida todos os campos antes de enviar.
  const errors = [validateNome(), validateTelefone(), validateEmail(), validateServico()];
  if (errors.some(Boolean)) {
    contactForm.querySelector('.has-error').focus();
    return;
  }

  const submit = contactForm.querySelector('.contact-form__submit');
  const originalLabel = submit.textContent;

  submit.disabled = true;
  submit.textContent = t('@status:sending') || 'A enviar…';
  formStatus.className = 'contact-form__status';
  formStatus.textContent = '';

  const payload = new FormData(contactForm);
  payload.set('telefone', `${indicativo.value} ${telefone.value}`.trim());
  payload.delete('indicativo');

  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: payload,
    });
    const result = await response.json();

    if (response.ok && result.success) {
      contactForm.reset();
      telefone.placeholder = indicativo.selectedOptions[0].dataset.placeholder || '';
      formStatus.className = 'contact-form__status is-success';
      formStatus.textContent = t('@status:success') || 'Pedido enviado com sucesso. Entrarei em contato em breve.';
    } else {
      throw new Error(result.message || 'Falha no envio');
    }
  } catch (err) {
    formStatus.className = 'contact-form__status is-error';
    formStatus.textContent = t('@status:error') || 'Não foi possível enviar o pedido. Tente novamente ou escreva para tchris.eng@gmail.com.';
  } finally {
    submit.disabled = false;
    submit.textContent = originalLabel;
  }
});

