import { test, expect, fixture } from './fixtures.js';

const marker = 'data-gta6-shield-hidden';
const hidden = async (page, selector) => {
  await expect(page.locator(selector)).toHaveAttribute(marker, '');
  await expect(page.locator(selector)).toBeHidden();
};
const visible = async (page, selector) => {
  await expect(page.locator(selector)).not.toHaveAttribute(marker, '');
  await expect(page.locator(selector)).toBeVisible();
};

test('Twitch: category links, tags, titles, sidebar and safe siblings', async ({ page }) => {
  await fixture(page, 'https://www.twitch.tv/directory', `
    <main>
      <article id="category"><h3>Chill stream</h3><a data-a-target="preview-card-game-link" href="/directory/category/grand-theft-auto-vi">Grand Theft Auto VI</a></article>
      <article id="slug"><h3>Chill stream</h3><a href="/directory/category/grand-theft-auto-vi">Play</a></article>
      <article id="tag"><h3>Chill stream</h3><button class="tw-tag" data-a-target="GTA6">GTA6</button></article>
      <article id="title"><h3 title="G.T.A. 6 finale">Truncated title</h3></article>
      <div id="game" class="game-card"><a data-a-target="tw-box-art-card-link"><h2>Grand Theft Auto VI</h2></a></div>
      <div id="sidebar" class="side-nav-card"><span data-a-target="side-nav-game-title">GTA VI</span></div>
      <article id="safe"><h3>GTA V: episode 6</h3><a href="/directory/category/minecraft">Minecraft</a></article>
    </main>`);
  for (const id of ['category', 'slug', 'tag', 'title', 'game', 'sidebar']) await hidden(page, '#' + id);
  await visible(page, '#safe');
  await expect(page.locator('main')).toBeVisible();
});

test('YouTube: old and live-observed new titles, Shorts, metadata; not channel names', async ({ page }) => {
  await fixture(page, 'https://www.youtube.com/', `
    <ytd-video-renderer id="old"><a id="video-title" title="GTA 6 trailer">Truncated</a></ytd-video-renderer>
    <ytd-rich-item-renderer id="rich"><yt-lockup-view-model><h3><a class="ytLockupMetadataViewModelTitle">Grand Theft Auto VI: Trailer</a></h3></yt-lockup-view-model></ytd-rich-item-renderer>
    <yt-lockup-view-model id="new"><h3 title="GTAVI"><a class="ytLockupMetadataViewModelTitle">GTAVI</a></h3></yt-lockup-view-model>
    <ytd-reel-item-renderer id="short"><h3>GTA-6</h3></ytd-reel-item-renderer>
    <ytm-shorts-lockup-view-model id="modern-short"><h3>GTA VI</h3></ytm-shorts-lockup-view-model>
    <ytd-video-renderer id="metadata"><a id="video-title">My gameplay</a><ytd-rich-metadata-renderer>Grand Theft Auto VI</ytd-rich-metadata-renderer></ytd-video-renderer>
    <ytd-video-renderer id="safe"><a id="video-title">How to cook</a><span id="channel-name">GTA 6</span></ytd-video-renderer>
    <ytd-video-renderer id="separate"><a id="video-title">GTA</a><span>6 views</span></ytd-video-renderer>`);
  for (const id of ['old', 'rich', 'new', 'short', 'modern-short', 'metadata']) await hidden(page, '#' + id);
  for (const id of ['safe', 'separate']) await visible(page, '#' + id);
});

test('YouTube: selected game hides a neutral-titled watch page, not because of recommendations', async ({ page }) => {
  await fixture(page, 'https://www.youtube.com/watch?v=fixture', `
    <ytd-watch-flexy id="watch">
      <div id="primary"><ytd-watch-metadata><h1>Playing something</h1><div id="rich-metadata"><ytd-rich-metadata-renderer id="game">Minecraft</ytd-rich-metadata-renderer></div></ytd-watch-metadata></div>
      <div id="secondary"><ytd-compact-video-renderer id="rec"><a id="video-title">GTA VI ending</a></ytd-compact-video-renderer></div>
    </ytd-watch-flexy>`);
  await hidden(page, '#rec');
  await visible(page, '#watch');
  await page.locator('#game').evaluate(el => { el.textContent = 'Grand Theft Auto VI'; });
  await hidden(page, '#watch');
  await page.locator('#game').evaluate(el => { el.textContent = 'Minecraft'; });
  await visible(page, '#watch');
  await page.locator('h1').evaluate(el => { el.textContent = 'GTA 6 gameplay'; });
  await hidden(page, '#watch');
});

test('LinkedIn: current SDUI, legacy posts, nested reposts; never the whole feed', async ({ page }) => {
  await fixture(page, 'https://www.linkedin.com/feed/', `
    <main data-testid="mainFeed">
      <div id="modern" role="listitem" componentkey="update-card-focus-123"><span data-testid="expandable-text-box">We got a new job before GTA 6!</span></div>
      <div class="occludable-update" id="outer"><div class="feed-shared-update-v2" id="legacy"><p>GTA VI announcement</p></div></div>
      <div data-urn="urn:li:activity:123" id="urn"><p>#GrandTheftAuto6</p></div>
      <div role="listitem" componentkey="update-card-focus-456" id="safe"><p>Our new product launched</p></div>
    </main><aside id="outside">GTA 6</aside>`);
  for (const id of ['modern', 'outer', 'legacy', 'urn']) await hidden(page, '#' + id);
  for (const selector of ['main', '#safe', '#outside']) await visible(page, selector);
});

for (const host of ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']) {
  test(host + ': tweets, quotes and display names', async ({ page }) => {
    await fixture(page, 'https://' + host + '/home', `
      <main>
        <article data-testid="tweet" id="text"><div data-testid="tweetText">GTA 6 trailer</div></article>
        <article data-testid="tweet" id="quote"><div data-testid="tweetText">Amazing!</div><div role="link"><div data-testid="tweetText">Grand Theft Auto VI</div></div></article>
        <article data-testid="tweet" id="name"><div data-testid="User-Name">GTA6</div><div data-testid="tweetText">Hi!</div></article>
        <article data-testid="tweet" id="safe"><div data-testid="tweetText">GTA V is still fun</div></article>
      </main><aside id="outside">GTA 6</aside>`);
    for (const id of ['text', 'quote', 'name']) await hidden(page, '#' + id);
    for (const selector of ['main', '#safe', '#outside']) await visible(page, selector);
  });
}

test('handles infinite-scroll inserts, late hydration, text-node edits and recycled cards', async ({ page }) => {
  await fixture(page, 'https://x.com/home', '<main id="feed"></main>');
  await page.evaluate(() => {
    document.querySelector('#feed').innerHTML = '<article data-testid="tweet" id="dynamic"><span>Safe initially</span></article>';
  });
  await visible(page, '#dynamic');
  // characterData (not only childList)
  await page.locator('#dynamic span').evaluate(el => { el.firstChild.data = 'GTA\u200b6'; });
  await hidden(page, '#dynamic');
  // Keep React's original element mounted and restore if reused for safe content.
  await expect(page.locator('#dynamic')).toHaveCount(1);
  await page.locator('#dynamic span').evaluate(el => { el.firstChild.data = 'Cooking recipes'; });
  await visible(page, '#dynamic');
  await page.locator('#feed').evaluate(el => {
    const card = document.createElement('article');
    card.id = 'hydrated';
    card.textContent = 'GTAVI';
    el.append(card);
  });
  await visible(page, '#hydrated');
  await page.locator('#hydrated').evaluate(el => { el.dataset.testid = 'tweet'; });
  await hidden(page, '#hydrated');
});

test('attribute-only changes and SPA navigation recheck existing cards', async ({ page }) => {
  await fixture(page, 'https://www.youtube.com/', `
    <ytd-video-renderer id="card"><a id="video-title" title="Cooking">Truncated</a></ytd-video-renderer>`);
  await visible(page, '#card');
  await page.locator('#video-title').evaluate(el => { el.title = 'ＧＴＡ ６'; });
  await hidden(page, '#card');
  await page.evaluate(() => {
    history.pushState({}, '', '/results?search_query=cooking');
    document.querySelector('#video-title').title = 'Cooking';
    document.dispatchEvent(new Event('yt-navigate-finish'));
  });
  await visible(page, '#card');
});

test('Twitch category href-only changes are detected and undone', async ({ page }) => {
  await fixture(page, 'https://www.twitch.tv/', '<article id="card"><a id="game" href="/directory/category/minecraft">Play</a></article>');
  await visible(page, '#card');
  await page.locator('#game').evaluate(el => { el.href = '/directory/category/grand-theft-auto-vi'; });
  await hidden(page, '#card');
  await page.locator('#game').evaluate(el => { el.href = '/directory/category/minecraft'; });
  await visible(page, '#card');
});

test('burst of feed updates hides matching cards without hiding safe cards', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixture(page, 'https://x.com/home', '<main id="feed"></main>');
  await page.locator('#feed').evaluate(el => {
    for (let i = 0; i < 500; i++) {
      const card = document.createElement('article');
      card.dataset.testid = 'tweet';
      card.textContent = i % 2 ? 'GTA 6' : 'Cooking';
      el.append(card);
    }
  });
  await expect(page.locator('[' + marker + ']')).toHaveCount(250);
  await expect(page.locator('article:visible')).toHaveCount(250);
  expect(errors).toEqual([]);
});

test('pauses blocked previews and catches later play events', async ({ page }) => {
  await fixture(page, 'https://x.com/home', '<article id="card" data-testid="tweet"><span>GTA 6</span><video></video></article>');
  await hidden(page, '#card');
  // A page-world monkey-patch of pause() cannot spy on isolated-world calls.
  // Use real media playback instead and observe the shared media state.
  await page.locator('video').evaluate(video => {
    const bytes = new Uint8Array(44 + 8000);
    const view = new DataView(bytes.buffer);
    const label = (offset, text) => [...text].forEach((c, i) => { bytes[offset + i] = c.charCodeAt(0); });
    label(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true);
    label(8, 'WAVE'); label(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true); view.setUint32(28, 8000, true);
    view.setUint16(32, 1, true); view.setUint16(34, 8, true);
    label(36, 'data'); view.setUint32(40, 8000, true); bytes.fill(128, 44);
    video.src = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    video.addEventListener('play', () => { video.dataset.playSeen = 'yes'; });
    video.play().catch(() => {}); // Expected AbortError when the shield pauses it.
  });
  await expect(page.locator('video')).toHaveAttribute('data-play-seen', 'yes');
  await expect.poll(() => page.locator('video').evaluate(video => video.paused)).toBe(true);
});

test('does not inject on unrelated hosts', async ({ page }) => {
  await fixture(page, 'https://example.com/', '<article data-testid="tweet" id="card">GTA 6</article>');
  await page.waitForLoadState('load');
  await visible(page, '#card');
  const styles = await page.evaluate(() => [...document.styleSheets].some(sheet => {
    try { return [...sheet.cssRules].some(rule => rule.cssText.includes('data-gta6-shield-hidden')); }
    catch { return false; }
  }));
  expect(styles).toBe(false);
});

for (const [url, card] of [
  ['https://www.twitch.tv/', '<article id="general"><h3>Grand Theft Auto</h3></article>'],
  ['https://www.youtube.com/', '<ytd-video-renderer id="general"><a id="video-title">Grand Theft Auto</a></ytd-video-renderer>'],
  ['https://www.linkedin.com/feed/', '<div id="general" role="listitem" componentkey="update-card-focus-general">Grand Theft Auto</div>'],
  ['https://x.com/home', '<article id="general" data-testid="tweet">Grand Theft Auto</article>'],
]) {
  test('general franchise name is hidden on ' + url, async ({ page }) => {
    await fixture(page, url, card);
    await hidden(page, '#general');
  });
}

test('namespace stays isolated from page scripts', async ({ page }) => {
  await fixture(page, 'https://x.com/home', '<article data-testid="tweet" id="card">GTA 6</article>');
  await hidden(page, '#card');
  expect(await page.evaluate(() => globalThis.GTA6Shield)).toBeUndefined();
});

test('X keeps independent fields separate while retaining inline and preview text', async ({ page }) => {
  await fixture(page, 'https://x.com/home', `
    <article id="safe" data-testid="tweet"><div data-testid="User-Name">GTA</div><div data-testid="tweetText">6 tips for cooking</div></article>
    <article id="inline" data-testid="tweet"><div data-testid="tweetText">GTA <b>6</b> trailer</div></article>
    <article id="preview" data-testid="tweet"><div data-testid="tweetText">Look</div><div data-testid="card.layout"><span>Grand Theft Auto VI</span></div></article>`);
  await visible(page, '#safe');
  await hidden(page, '#inline');
  await hidden(page, '#preview');
});

test('LinkedIn structured fields do not join unrelated blocks in either layout', async ({ page }) => {
  await fixture(page, 'https://www.linkedin.com/feed/', `
    <div id="modern-safe" role="listitem" componentkey="update-card-focus-1"><div>GTA</div><div data-testid="expandable-text-box">6 tips</div></div>
    <div id="legacy-safe" class="feed-shared-update-v2"><div>GTA</div><p>6 tips</p></div>
    <div id="modern-inline" role="listitem" componentkey="update-card-focus-2"><div data-testid="expandable-text-box">GTA <b>6</b> news</div></div>
    <div id="legacy-preview" class="feed-shared-update-v2"><p>Look</p><div><span>Grand Theft Auto VI</span></div></div>`);
  for (const id of ['modern-safe', 'legacy-safe']) await visible(page, '#' + id);
  for (const id of ['modern-inline', 'legacy-preview']) await hidden(page, '#' + id);
});

test('restores marked cards that lose their identifying selector', async ({ page }) => {
  await fixture(page, 'https://x.com/home', '<article id="card" data-testid="tweet">GTA 6</article>');
  await hidden(page, '#card');
  await page.locator('#card').evaluate(el => { el.removeAttribute('data-testid'); el.textContent = 'Safe'; });
  await visible(page, '#card');
});

test('LinkedIn role applied last triggers hydration', async ({ page }) => {
  await fixture(page, 'https://www.linkedin.com/feed/', '<div id="card" componentkey="update-card-focus-1">GTA 6</div>');
  await visible(page, '#card');
  await page.locator('#card').evaluate(el => el.setAttribute('role', 'listitem'));
  await hidden(page, '#card');
});

test('inline important display is hidden and latest site display is restored', async ({ page }) => {
  await fixture(page, 'https://x.com/home', '<article id="card" data-testid="tweet" style="display:block!important"><span>GTA 6</span></article>');
  await hidden(page, '#card');
  await expect(page.locator('#card')).toHaveCSS('display', 'none');
  await page.locator('#card span').evaluate(el => { el.textContent = 'Safe'; });
  await visible(page, '#card');
  expect(await page.locator('#card').evaluate(el => [el.style.display, el.style.getPropertyPriority('display')])).toEqual(['block', 'important']);
  await page.locator('#card span').evaluate(el => { el.textContent = 'GTA 6'; });
  await hidden(page, '#card');
  await page.locator('#card').evaluate(el => el.style.setProperty('display', 'flex', 'important'));
  await expect(page.locator('#card')).toHaveCSS('display', 'none');
  await page.locator('#card span').evaluate(el => { el.textContent = 'Safe again'; });
  await visible(page, '#card');
  expect(await page.locator('#card').evaluate(el => [el.style.display, el.style.getPropertyPriority('display')])).toEqual(['flex', 'important']);
});
