(() => {
  'use strict';

  // Semantic hooks only: no generated class hashes, internal APIs or React data.
  function values(root, selector, attributes = []) {
    return [...root.querySelectorAll(selector)].flatMap(node => [
      node.textContent,
      ...attributes.map(name => node.getAttribute(name)),
    ]);
  }

  // Block containers and named fields delimit independent signals; inline markup
  // stays together so formatting inside a phrase does not break matching.
  function structuredText(root) {
    const result = [];
    let text = '';
    const boundary = node => /^(ARTICLE|DIV|P|SECTION|LI|H[1-6]|BLOCKQUOTE)$/.test(node.tagName) ||
      node.hasAttribute('data-testid') || node.getAttribute('role') === 'link';
    function flush() {
      if (text.trim()) result.push(text);
      text = '';
    }
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) { text += node.data; return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const separate = node !== root && boundary(node);
      if (separate) flush();
      node.childNodes.forEach(visit);
      if (separate) flush();
    }
    visit(root);
    flush();
    return result;
  }

  const sites = {
    twitch: {
      cards: 'article, .game-card, .side-nav-card, [data-a-target="side-nav-card"], [data-a-target="shelf-card"]',
      signals(card) {
        return values(card, [
          'a[href*="/directory/category/"]',
          'a[href*="/directory/game/"]',
          '[data-a-target="preview-card-game-link"]',
          '[data-a-target="side-nav-game-title"]',
          '.tw-tag', 'h2', 'h3', 'h4',
          '[data-a-target="preview-card-title-link"]',
        ].join(','), ['title', 'href', 'aria-label', 'data-a-target']);
      },
    },
    youtube: {
      cards: [
        'ytd-rich-item-renderer', 'ytd-video-renderer',
        'ytd-grid-video-renderer', 'ytd-compact-video-renderer',
        'ytd-playlist-renderer', 'yt-lockup-view-model',
        'ytd-reel-item-renderer', 'yt-shorts-lockup-view-model',
        'ytm-shorts-lockup-view-model', 'ytd-watch-flexy',
      ].join(','),
      signals(card) {
        if (card.matches('ytd-watch-flexy')) {
          // Never let a recommendation's title hide the currently watched video.
          if (location.pathname !== '/watch' || card.hasAttribute('hidden')) return [];
          return values(card, [
            '#title h1', 'ytd-watch-metadata h1',
            'ytd-watch-metadata ytd-rich-metadata-renderer',
            '#primary #rich-metadata ytd-rich-metadata-renderer',
          ].join(','), ['title']);
        }
        return values(card, [
          '#video-title', '#video-title-link',
          '.yt-lockup-metadata-view-model__title',
          '.ytLockupMetadataViewModelTitle',
          '.shortsLockupViewModelHostOutsideMetadataTitle',
          '.ytShortsLockupViewModelHostOutsideMetadataTitle',
          'h3', 'ytd-rich-metadata-renderer',
        ].join(','), ['title']);
      },
    },
    linkedin: {
      cards: [
        '[role="listitem"][componentkey^="update-card-focus"]',
        '.feed-shared-update-v2', '.occludable-update',
        '[data-urn^="urn:li:activity:"]', '[data-id^="urn:li:activity:"]',
      ].join(','),
      signals: structuredText,
    },
    x: {
      cards: 'article[data-testid="tweet"]',
      // Includes quoted posts, display names, handles and link-preview text.
      signals: structuredText,
    },
  };

  const host = location.hostname;
  let site;
  if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) site = sites.twitch;
  if (host === 'www.youtube.com') site = sites.youtube;
  if (host === 'www.linkedin.com') site = sites.linkedin;
  if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(host)) site = sites.x;

  globalThis.GTA6Shield = Object.freeze({ ...globalThis.GTA6Shield, site });
})();
