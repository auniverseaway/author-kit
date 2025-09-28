import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';
const HEADER_ACTIONS = [
  '/tools/widgets/scheme',
  '/tools/widgets/language',
];

function closeAllMenus() {
  const openMenus = document.body.querySelectorAll('header .is-open');
  for (const openMenu of openMenus) {
    openMenu.classList.remove('is-open');
  }
}

function docClose(e) {
  if (e.target.closest('header')) return;
  closeAllMenus();
}

function toggleMenu(menu) {
  const isOpen = menu.classList.contains('is-open');
  closeAllMenus();
  if (isOpen) {
    window.document.removeEventListener('click', docClose);
    return;
  }

  // Setup the global close event
  window.document.addEventListener('click', docClose);

  menu.classList.add('is-open');
}

function decorateLanguage(btn) {
  const wrapper = btn.closest('.action-wrapper');
  btn.addEventListener('click', async () => {
    let menu = wrapper.querySelector('.language.menu');
    if (!menu) {
      const fragment = await loadFragment(`${locale.prefix}${HEADER_PATH}/languages`);
      menu = document.createElement('div');
      menu.className = 'language menu';
      menu.append(fragment);
      wrapper.append(menu);
    }
    toggleMenu(wrapper);
  });
}

function decorateScheme(btn) {
  btn.addEventListener('click', () => {
    const { body } = document;

    let currPref = localStorage.getItem('color-scheme');
    if (!currPref) {
      currPref = matchMedia('(prefers-color-scheme: dark)')
        .matches ? 'dark-scheme' : 'light-scheme';
    }

    const theme = currPref === 'dark-scheme'
      ? { add: 'light-scheme', remove: 'dark-scheme' }
      : { add: 'dark-scheme', remove: 'light-scheme' };

    body.classList.remove(theme.remove);
    body.classList.add(theme.add);
    localStorage.setItem('color-scheme', theme.add);
  });
}

async function decorateAction(section, pattern) {
  const link = section.querySelector(`[href*="${pattern}"]`);
  if (!link) return;

  const icon = link.querySelector('span.icon');
  const text = link.textContent;
  const btn = document.createElement('button');
  if (icon) btn.append(icon);
  if (text) {
    const textSpan = document.createElement('span');
    textSpan.className = 'text';
    textSpan.textContent = text;
    btn.append(textSpan);
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'action-wrapper';
  wrapper.append(btn);
  link.parentElement.parentElement.replaceChild(wrapper, link.parentElement);

  if (pattern === '/tools/widgets/language') decorateLanguage(btn);
  if (pattern === '/tools/widgets/scheme') decorateScheme(btn);
}

function decorateBrand(section) {
  section.classList.add('brand-section');
}

function decorateMenu(li) {
  return null;
}

function decorateMegaMenu(li) {
  const menu = li.querySelector('.fragment-content');
  if (!menu) return null;
  const megaList = menu.closest('ul');
  const wrapper = document.createElement('div');
  wrapper.className = 'mega-menu';
  wrapper.append(menu);
  megaList.parentElement.replaceChild(wrapper, megaList);
  return wrapper;
}

function decorateNavItem(li) {
  const link = li.querySelector('a');
  const menu = decorateMegaMenu(li) || decorateMenu(li);
  if (!menu) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu(li);
  });
}

function decorateMainNav(section) {
  section.classList.add('main-nav-section');

  const mainNavItems = section.querySelectorAll(':scope > .default-content > ul > li');
  for (const navItem of mainNavItems) {
    decorateNavItem(navItem);
  }
}

async function decorateActions(section) {
  section.classList.add('actions-section');
  for (const pattern of HEADER_ACTIONS) {
    decorateAction(section, pattern);
  }
}

async function decorateHeader(fragment) {
  const sections = fragment.querySelectorAll(':scope > .section');
  if (sections[0]) decorateBrand(sections[0]);
  if (sections[1]) decorateMainNav(sections[1]);
  if (sections[2]) decorateActions(sections[2]);
}

/**
 * loads and decorates the header
 * @param {Element} el The header element
 */
export default async function init(el) {
  const headerMeta = getMetadata('header');
  const path = headerMeta || HEADER_PATH;
  try {
    const fragment = await loadFragment(`${locale.prefix}${path}`);
    fragment.classList.add('header-content');
    await decorateHeader(fragment);
    el.append(fragment);
  } catch (e) {
    throw Error(e);
  }
}
