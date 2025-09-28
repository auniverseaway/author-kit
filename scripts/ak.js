const log = async (ex, el) => (await import('./utils/error.js')).default(ex, el);

export function getMetadata(name) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = document.head.querySelector(`meta[${attr}="${name}"]`);
  return meta && meta.content;
}

export function getLocale(locales) {
  const { pathname } = window.location;
  const matches = Object.keys(locales).filter((locale) => pathname.startsWith(`${locale}/`));
  const prefix = getMetadata('locale') || matches.sort((a, b) => b.length - a.length)?.[0] || '';
  if (locales[prefix].lang) document.documentElement.lang = locales[prefix].lang;
  return { prefix, ...locales[prefix] };
}

export const [setConfig, getConfig] = (() => {
  let config;
  return [
    (conf = {}) => {
      config = {
        ...conf,
        log: conf.log || log,
        locale: getLocale(conf.locales),
        codeBase: `${import.meta.url.replace('/scripts/ak.js', '')}`,
      };
      return config;
    },
    () => (config || setConfig()),
  ];
})();

export async function loadStyle(href) {
  return new Promise((resolve) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

export async function loadBlock(block) {
  const { components } = getConfig();
  const { classList } = block;
  const name = classList[0];
  block.dataset.blockName = name;
  const blockPath = `/blocks/${name}/${name}`;
  const loaded = [new Promise((resolve) => {
    (async () => {
      try {
        await (await import(`${blockPath}.js`)).default(block);
      } catch (ex) { await getConfig().log(ex, block); }
      resolve();
    })();
  })];
  const isCmp = components.some((cmp) => name === cmp);
  if (!isCmp) loaded.push(loadStyle(`${blockPath}.css`));
  await Promise.all(loaded);
  return block;
}

function decoratePictures(el) {
  const pics = el.querySelectorAll('picture');
  for (const pic of pics) {
    const source = pic.querySelector('source');
    const clone = source.cloneNode();
    const [pathname, params] = clone.getAttribute('srcset').split('?');
    const search = new URLSearchParams(params);
    search.set('width', 4000);
    // search.set('optimize', 'low');
    clone.setAttribute('srcset', `${pathname}?${search.toString()}`);
    clone.setAttribute('media', '(min-width: 1200px)');
    pic.prepend(clone);
  }
}

function decorateButton(link) {
  const isEm = link.closest('em');
  const isStrong = link.closest('strong');
  const isStrike = link.closest('del');
  const isUnder = link.querySelector('u');
  if (!(isEm || isStrong || isStrike || isUnder)) return;
  const trueParent = link.closest('p, li, div');
  if (!trueParent) return;
  const siblings = [...trueParent.childNodes];

  const hasSibling = siblings.every(
    (el) => el.nodeName === 'A'
    || el.nodeName === 'EM'
    || el.nodeName === 'STRONG'
    || el.nodeName === 'DEL'
    || !el.textContent.trim(),
  );
  if (!hasSibling) return;
  if (siblings.length > 1) trueParent.classList.add('btn-group');

  link.classList.add('btn');
  if (isStrike) {
    link.classList.add('btn-negative');
  } else if (isEm && isStrong) {
    link.classList.add('btn-accent');
  } else if (isStrong) {
    link.classList.add('btn-primary');
  } else if (isEm) {
    link.classList.add('btn-secondary');
  }
  if (isUnder) {
    link.classList.add('btn-outline');
    link.innerHTML = isUnder.innerHTML;
    isUnder.remove();
  }
  const toReplace = isStrong || isEm || isStrike;
  if (toReplace) trueParent.replaceChild(link, toReplace);
}

function localizeLink(locales, locale, a) {
  // If we are in the root locale, do nothing
  if (locale.prefix === '') return;
  try {
    const url = new URL(a.href);
    const { origin, pathname, search, hash } = url;

    // If the link is already localized, do nothing
    if (pathname.startsWith(`${locale.prefix}/`)) return;

    const localized = Object.keys(locales).some(
      (key) => key !== '' && pathname.startsWith(`${key}/`),
    );
    if (localized) return;

    a.href = `${origin}${locale.prefix}${pathname}${search}${hash}`;
  } catch (ex) {
    getConfig().log(ex, a);
  }
}

function decorateHash(a) {
  const { hash } = new URL(a.href);
  if (!hash || hash === '#') return {};

  const findHash = (name) => {
    const found = hash.includes(name);
    if (found) a.href = a.href.replace(name, '');
    return found;
  };

  const blank = findHash('#_blank');
  if (blank) a.target = '_blank';

  const dnt = findHash('#_dnt');
  const dnb = findHash('#_dnb');
  return { dnt, dnb };
}

function decorateLinks(el) {
  const { widgets, locales, locale } = getConfig();
  const anchors = [...el.querySelectorAll('a')];
  return anchors.reduce((acc, a) => {
    const { dnt, dnb } = decorateHash(a);
    if (!dnt) localizeLink(locales, locale, a);
    decorateButton(a);

    if (!dnb) {
      const { href } = a;
      const found = widgets.some((pattern) => {
        const key = Object.keys(pattern)[0];
        if (!href.includes(pattern[key])) return false;
        a.classList.add(key, 'auto-block');
        return true;
      });
      if (found) acc.push(a);
    }
    return acc;
  }, []);
}

function loadIcons(el) {
  const icons = el.querySelectorAll('span.icon');
  if (!icons.length) return;
  import('./utils/icons.js').then((mod) => mod.default(icons));
}

function groupChildren(section) {
  const children = section.querySelectorAll(':scope > *');
  const groups = [];
  let currentGroup = null;

  for (const child of children) {
    const isDiv = child.tagName === 'DIV';
    const currentType = currentGroup?.classList.contains('block-content');

    if (!currentGroup || currentType !== isDiv) {
      currentGroup = document.createElement('div');
      currentGroup.className = isDiv
        ? 'block-content' : 'default-content';
      groups.push(currentGroup);
    }

    currentGroup.append(child);
  }

  return groups;
}

function decorateSections(parent, isDoc) {
  const selector = isDoc ? 'main > div' : ':scope > div';
  return [...parent.querySelectorAll(selector)].map((section) => {
    const groups = groupChildren(section);
    section.append(...groups);

    section.classList.add('section');
    section.dataset.status = 'decorated';

    section.widgets = decorateLinks(section);
    section.blocks = [...section.querySelectorAll('.block-content > div[class]')];
    return section;
  });
}

function decorateHeader() {
  const header = document.querySelector('header');
  if (!header) return;
  const meta = getMetadata('header') || 'header';
  if (meta === 'off') {
    header.remove();
    return;
  }
  header.className = meta;
  header.dataset.status = 'decorated';
}

export async function loadArea({ area } = { area: document }) {
  decoratePictures(area);
  const { decorateArea } = getConfig();
  if (decorateArea) decorateArea({ area });
  const isDoc = area === document;
  if (isDoc) decorateHeader();
  const sections = decorateSections(area, isDoc);
  for (const [idx, section] of sections.entries()) {
    loadIcons(section);
    await Promise.all(section.widgets.map((block) => loadBlock(block)));
    await Promise.all(section.blocks.map((block) => loadBlock(block)));
    delete section.dataset.status;
    if (isDoc && idx === 0) import('./postlcp.js');
  }
  if (isDoc) import('./lazy.js');
}

(function init() {
  // Setup scheme
  const scheme = localStorage.getItem('color-scheme');
  if (scheme) document.body.classList.add(scheme);

  // Setup template
  const template = getMetadata('template');
  if (template) { document.body.classList.add(`${template}-template`); }

  // Detect Hash
  const pageId = window.location.hash?.replace('#', '');
  if (pageId && document.getElementById(pageId)?.offsetParent === null) {
    localStorage.setItem('lazyhash', pageId);
  }

  // Setup DA
  if (new URL(window.location.href).searchParams.get('dapreview')) {
    import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadArea));
  }
}());
