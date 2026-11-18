(() => {
  'use strict';
  const { matches, site } = globalThis.GTA6Shield;
  if (!site) return;

  const hiddenAttribute = 'data-gta6-shield-hidden';
  const pending = new Set();
  const displayState = new WeakMap();
  let timer;

  function pauseMedia(card) {
    card.querySelectorAll('video, audio').forEach(media => media.pause());
  }

  function flush() {
    timer = undefined;
    for (const card of pending) {
      if (!card.isConnected) continue;
      const state = displayState.get(card);
      // A site may change its inline display while the card is hidden.
      if (state && (card.style.getPropertyValue('display') !== 'none' ||
          card.style.getPropertyPriority('display') !== 'important')) {
        state.value = card.style.getPropertyValue('display');
        state.priority = card.style.getPropertyPriority('display');
      }
      const blocked = card.matches(site.cards) && site.signals(card).some(matches);
      if (blocked) {
        if (!state) displayState.set(card, {
          value: card.style.getPropertyValue('display'),
          priority: card.style.getPropertyPriority('display'),
        });
        card.toggleAttribute(hiddenAttribute, true);
        if (card.style.getPropertyValue('display') !== 'none' ||
            card.style.getPropertyPriority('display') !== 'important') {
          card.style.setProperty('display', 'none', 'important');
        }
      } else {
        card.removeAttribute(hiddenAttribute);
        if (state) {
          if (state.value) card.style.setProperty('display', state.value, state.priority);
          else card.style.removeProperty('display');
          displayState.delete(card);
        }
      }
      if (blocked) pauseMedia(card);
    }
    pending.clear();
  }

  function enqueue(node, includeDescendants = false) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return;
    // Recheck all enclosing cards (e.g. a quoted post inside a repost).
    for (let parent = element; parent; parent = parent.parentElement) {
      if (parent.matches(site.cards) || parent.hasAttribute(hiddenAttribute)) pending.add(parent);
    }
    if (includeDescendants) {
      element.querySelectorAll(`${site.cards}, [${hiddenAttribute}]`).forEach(card => pending.add(card));
    }
    if (pending.size && timer === undefined) timer = setTimeout(flush, 16);
  }

  // The marker is excluded; style writes are guarded to avoid feedback loops.
  new MutationObserver(records => {
    for (const record of records) {
      enqueue(record.target);
      for (const node of record.addedNodes) enqueue(node, true);
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'title', 'aria-label', 'href', 'class', 'id', 'hidden', 'role', 'style',
      'data-testid', 'data-a-target', 'data-urn', 'data-id', 'componentkey',
    ],
  });

  function scan() {
    if (document.documentElement) enqueue(document.documentElement, true);
  }
  scan();
  document.addEventListener('DOMContentLoaded', scan, { once: true });
  document.addEventListener('yt-navigate-finish', scan);
  window.addEventListener('popstate', scan);
  window.addEventListener('pageshow', scan);

  // Hidden previews/watch pages should not continue playing spoiler audio.
  document.addEventListener('play', event => {
    if (event.target instanceof HTMLMediaElement &&
        event.target.closest(`[${hiddenAttribute}]`)) {
      event.target.pause();
    }
  }, true);
})();
