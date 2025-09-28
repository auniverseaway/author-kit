function handleBackground(content, section) {
  const pic = content.querySelector('picture');
  if (pic) {
    section.classList.add('has-background');
    pic.classList.add('section-background');
    section.prepend(pic);
    return;
  }
  const color = content.textContent;
  if (color) {
    section.classList.add(`section-background-color-${color}`);
  }
}

async function handleStyle(text, section) {
  const styles = text.split(', ').map((style) => style.replaceAll(' ', '-'));
  section.classList.add(...styles);
}

async function handleLayout(text, section, type) {
  if (text === '0') return;
  if (type === 'grid') section.classList.add('grid');
  section.classList.add(`${type}-${text}`);
}

const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = row.children[1];
    const text = content.textContent.trim().toLowerCase();
    if (key && content) rdx[key] = { content, text };
  }
  return rdx;
}, {});

export default async function init(el) {
  const section = el.closest('.section');
  if (!section) return;
  const metadata = getMetadata(el);
  if (metadata.style?.text) await handleStyle(metadata.style.text, section);
  if (metadata.grid?.text) handleLayout(metadata.grid.text, section, 'grid');
  if (metadata.gap?.text) handleLayout(metadata.gap.text, section, 'gap');
  if (metadata.spacing?.text) handleLayout(metadata.spacing.text, section, 'spacing');
  if (metadata['spacing-top']?.text) handleLayout(metadata['spacing-top'].text, section, 'spacing-top');
  if (metadata['spacing-bottom']?.text) handleLayout(metadata['spacing-bottom'].text, section, 'spacing-bottom');
  if (metadata['background-color']?.content) handleBackground(metadata['background-color'].content, section);
  if (metadata['background-image']?.content) handleBackground(metadata['background-image'].content, section);
  if (metadata.background?.content) handleBackground(metadata.background.content, section);
  el.remove();
}
