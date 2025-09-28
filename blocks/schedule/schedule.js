import { getConfig } from '../../scripts/ak.js';
import ENV from '../../scripts/utils/env.js';
import { loadFragment } from '../fragment/fragment.js';

const { log } = getConfig();

async function removeSchedule(a, e) {
  if (ENV === 'prod') {
    a.remove();
    return;
  }
  if (e) log(e);
  log(`Could not load: ${a.href}`);
}

async function loadEvent(a, event) {
  const { pathname } = new URL(event.fragment);
  try {
    const fragment = await loadFragment(pathname);

    let count = 0;
    let current = a;
    const parent = a.closest('.section');

    // Walk up the DOM tree from child to parent
    while (current && current !== parent) {
      current = current.parentElement;
      if (current && current !== parent) {
        count += 1;
      }
    }

    if (count === 2) {
      const sections = fragment.querySelectorAll(':scope > .section');
      for (const section of sections) {
        parent.insertAdjacentElement('afterend', section);
      }
      parent.remove();
      return;
    }

    a.parentElement.replaceChild(fragment, a);
  } catch (e) {
    removeSchedule(a, e);
  }
}

function getDate() {
  const now = Date.now();
  if (ENV === 'prod') return now;

  // Attempt a simulated schedule
  const sim = localStorage.getItem('aem-schedule')
   || new URL(window.location.href).searchParams.get('schedule');
  return sim || now;
}

export default async function init(a) {
  const resp = await fetch(a.href);
  if (!resp.ok) {
    await removeSchedule(a);
    return;
  }
  const { data } = await resp.json();
  const now = getDate();
  for (const event of data) {
    try {
      const start = Date.parse(event.start);
      const end = Date.parse(event.end);
      if (now > start && now < end) {
        await loadEvent(a, event);
      }
    } catch {
      log(`Could not get scheduled event: ${event.name}`);
    }
  }
  // fallback to default event
  const defEvent = data.find((event) => !(event.start && event.end));
  if (!defEvent) {
    await removeSchedule(a);
    return;
  }

  await loadEvent(a, defEvent);
}
