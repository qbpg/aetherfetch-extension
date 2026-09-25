/* AetherFetch popup: no page injection, external scripts, or HTML rendering. */
const API = 'https://aetherfetch.vercel.app/api/mailbox';
const storage = globalThis.chrome?.storage?.local || globalThis.browser?.storage?.local;
const $ = (id) => document.getElementById(id);
let accounts = [];
let active = 0;
let loading = false;
let lastFetch = 0;
let retryAt = 0;
let rateLimitHits = 0;
let domainCache = null;
let inboxCache = null;
let refreshing = false;
let selectedMessage = null;
const MIN_REFRESH_MS = 30000;

function remaining() { return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)); }

function updateButtons() {
  const waiting = remaining() > 0;
  $('new').disabled = !storage || loading || waiting;
  $('refresh').disabled = !current() || loading || refreshing || waiting;
  $('copy').disabled = !current();
  const emptyButton = $('new-empty');
  if (emptyButton) emptyButton.disabled = !storage || loading || waiting;
}

function updateCooldown() {
  updateButtons();
  if (remaining()) {
    const seconds = remaining();
    status(`Mail service is busy. Try again in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.`, true);
  } else if ($('status').textContent.startsWith('Mail service is busy.')) {
    status('You can try again now.');
  }
}

function status(message = '', error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}

function current() { return accounts[active] || null; }

async function request(path, options = {}) {
  if (remaining()) throw new Error('Mail service is busy. Please wait.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      signal: controller.signal,
      cache: 'no-store'
    });
    if (response.status === 429) {
      const after = response.headers.get('Retry-After');
      const seconds = Number(after);
      const date = Date.parse(after || '');
      rateLimitHits = Math.min(rateLimitHits + 1, 5);
      const fallback = Math.min(600000, 60000 * 2 ** (rateLimitHits - 1));
      const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Number.isFinite(date) ? date - Date.now() : fallback;
      retryAt = Date.now() + Math.min(600000, Math.max(1000, delay));
      await storage?.set({ retryAt, rateLimitHits });
      updateCooldown();
      throw new Error('Mail service is busy. Please wait.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.message || data.error || `Request failed (${response.status})`);
    if (rateLimitHits) {
      rateLimitHits = 0;
      await storage?.set({ rateLimitHits: 0 });
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server took too long to respond.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function randomPart(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function members(data) {
  const list = data['hydra:member'] || data.member || data.domains || data.data || data;
  return Array.isArray(list) ? list : [];
}

async function createAddress() {
  if (loading || !storage || remaining()) return;
  loading = true; updateButtons(); status('Creating your address…');
  try {
    let domains = domainCache?.expires > Date.now() ? domainCache.list : null;
    if (!domains) {
      domains = members(await request('/domains')).filter((d) => d.isActive);
      domainCache = { list: domains, expires: Date.now() + 30 * 60 * 1000 };
      await storage.set({ domainCache });
    }
    if (!domains.length) throw new Error('No email domain is available right now.');
    const domain = domains[crypto.getRandomValues(new Uint8Array(1))[0] % domains.length].domain;
    const address = `${randomPart()}@${domain}`;
    const password = `${randomPart(16)}A1!`;
    const account = await request('/accounts', { method: 'POST', body: JSON.stringify({ address, password }) });
    accounts.push({ address, password, token: null, id: account.id });
    active = accounts.length - 1;
    await storage.set({ accounts, active });
    renderAccount();
    const session = await request('/token', { method: 'POST', body: JSON.stringify({ address, password }) });
    if (!session.token) throw new Error('Address saved. Sign-in will be retried on the next refresh.');
    current().token = session.token;
    await storage.set({ accounts });
    loading = false; updateButtons();
    const checked = await refresh(true);
    if (checked) status('Address ready. Copy it to your sign-up form.');
  } catch (error) {
    if (remaining()) updateCooldown();
    else status(error.message || 'Could not create an address.', true);
  } finally { loading = false; updateButtons(); }
}

function renderAccount() {
  const account = current();
  $('accounts').replaceChildren();
  accounts.forEach((item, index) => {
    const option = new Option(item.address, String(index));
    $('accounts').add(option);
  });
  $('accounts').value = String(active);
  $('accounts').hidden = accounts.length === 0;
  $('address').hidden = accounts.length > 0;
  updateButtons();
  if (!account) {
    $('messages').innerHTML = '<div class="empty"><strong>No address yet</strong><p>Create a temporary address for this sign-up.</p><button id="new-empty" class="create-button">Create address</button></div>';
    $('new-empty').addEventListener('click', createAddress);
    updateButtons();
    $('count').textContent = 'Inbox';
  }
}

function renderMessages(messages) {
  const list = $('messages');
  list.replaceChildren();
  $('count').textContent = `Inbox · ${messages.length}`;
  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<strong>Waiting for mail</strong>New messages will appear here.';
    list.append(empty);
  }
  for (const message of messages) {
    const button = document.createElement('button');
    button.className = 'item';
    const meta = document.createElement('span');
    meta.className = 'meta';
    const sender = document.createElement('span');
    sender.textContent = message.from?.name || message.from?.address || 'Unknown sender';
    const date = document.createElement('time');
    date.textContent = message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    meta.append(sender, date);
    const subject = document.createElement('strong'); subject.textContent = message.subject || '(No subject)';
    const intro = document.createElement('span'); intro.className = 'preview'; intro.textContent = message.intro || '';
    button.append(meta, subject, intro);
    button.addEventListener('click', () => openMessage(message));
    list.append(button);
  }
}

async function refresh(force = false) {
  const account = current();
  if (!account || loading || refreshing || remaining()) return false;
  if (Date.now() - lastFetch < MIN_REFRESH_MS) {
    if (force) status('Checked recently. Please wait a moment before refreshing.');
    return false;
  }
  const accountIndex = active;
  refreshing = true; updateButtons();
  status('Checking inbox…');
  try {
    if (!account.token) {
      const session = await request('/token', { method: 'POST', body: JSON.stringify({ address: account.address, password: account.password }) });
      account.token = session.token;
      await storage.set({ accounts });
    }
    if (!account.token) throw new Error('Could not sign in to this inbox.');
    let data;
    try {
      data = await request('/messages?page=1', { headers: { Authorization: `Bearer ${account.token}` } });
    } catch (error) {
      if (!/401|403/.test(error.message) || !account.password) throw error;
      const session = await request('/token', { method: 'POST', body: JSON.stringify({ address: account.address, password: account.password }) });
      account.token = session.token;
      await storage.set({ accounts });
      data = await request('/messages?page=1', { headers: { Authorization: `Bearer ${account.token}` } });
    }
    if (accountIndex !== active) return false;
    const messages = members(data);
    renderMessages(messages);
    lastFetch = Date.now();
    inboxCache = { address: account.address, messages, at: lastFetch };
    await storage.set({ inboxCache });
    status('Inbox is up to date.');
    return true;
  } catch (error) {
    if (remaining()) updateCooldown();
    else status(error.message || 'Could not check the inbox.', true);
    return false;
  } finally {
    refreshing = false; updateButtons();
  }
}

function verificationInfo(message, documentNode) {
  const plain = `${message.subject || ''} ${message.intro || ''} ${message.text || ''} ${documentNode?.body?.textContent || ''}`;
  const code = plain.match(/(?:verification|security|confirmation|one[- ]time|passcode|otp|code|pin)[^\d]{0,40}(\d{4,8})/i)?.[1]
    || plain.match(/(?:^|\D)(\d{6})(?!\d)/)?.[1] || null;
  const anchors = documentNode ? [...documentNode.querySelectorAll('a[href]')] : [];
  const candidates = anchors.map((anchor) => ({ href: anchor.getAttribute('href'), label: anchor.textContent || '' }));
  for (const url of (message.text || '').match(/https?:\/\/[^\s<>"']+/g) || []) candidates.push({ href: url, label: url });
  const match = candidates.find(({ href, label }) => href && /verify|confirm|activate|complete|continue|sign.?in|login/i.test(`${href} ${label}`) && /^https?:$/.test((() => { try { return new URL(href).protocol; } catch { return ''; } })()));
  return { code, link: match ? new URL(match.href).href : null };
}

function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

function renderMessageBody(detail, parsed) {
  const body = $('body');
  body.replaceChildren();
  const content = detail.text || parsed?.body?.textContent?.trim() || detail.intro || 'This message has no text.';
  const found = new Set();
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  let offset = 0;
  for (const match of content.matchAll(urlPattern)) {
    body.append(document.createTextNode(content.slice(offset, match.index)));
    const raw = match[0];
    const clean = raw.replace(/[),.;!?]+$/, '');
    const url = safeWebUrl(clean);
    if (url) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = clean;
      anchor.title = `Open ${new URL(url).hostname} in a new tab`;
      body.append(anchor);
      found.add(url);
    } else body.append(document.createTextNode(clean));
    body.append(document.createTextNode(raw.slice(clean.length)));
    offset = match.index + raw.length;
  }
  body.append(document.createTextNode(content.slice(offset)));

  const links = [];
  for (const element of parsed?.querySelectorAll('a[href]') || []) {
    const url = safeWebUrl(element.getAttribute('href'));
    if (!url || found.has(url)) continue;
    found.add(url);
    links.push({ url, label: element.textContent?.trim() || 'Open link' });
    if (links.length >= 30) break;
  }
  if (links.length) {
    const group = document.createElement('div');
    group.className = 'mail-links';
    const heading = document.createElement('strong');
    heading.textContent = 'Links in this message';
    group.append(heading);
    for (const { url, label } of links) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = `${label.slice(0, 80)} ↗ (${new URL(url).hostname})`;
      group.append(anchor);
    }
    body.append(group);
  }
}

async function openMessage(message) {
  const account = current();
  if (!account) return;
  selectedMessage = message.id;
  $('messages').hidden = true; $('detail').hidden = false;
  $('subject').textContent = message.subject || '(No subject)';
  $('sender').textContent = message.from?.address || '';
  $('body').textContent = 'Loading message…';
  $('verification').hidden = true;
  try {
    const detail = await request(`/messages/${encodeURIComponent(message.id)}`, { headers: { Authorization: `Bearer ${account.token}` } });
    if (selectedMessage !== message.id) return;
    const html = Array.isArray(detail.html) ? detail.html.join(' ') : (detail.html || '');
    const parsed = html ? new DOMParser().parseFromString(html, 'text/html') : null;
    renderMessageBody(detail, parsed);
    const { code, link } = verificationInfo(detail, parsed);
    const box = $('verification'); box.replaceChildren();
    if (code) {
      const label = document.createElement('strong'); label.textContent = 'VERIFICATION CODE';
      const value = document.createElement('span'); value.className = 'code'; value.textContent = code;
      const copy = document.createElement('button'); copy.textContent = 'Copy';
      copy.addEventListener('click', async () => { await navigator.clipboard.writeText(code); copy.textContent = 'Copied'; });
      box.append(label, value, copy);
    }
    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      anchor.textContent = `Open verification link ↗ (${new URL(link).hostname})`;
      box.append(anchor);
    }
    box.hidden = !code && !link;
  } catch (error) { $('body').textContent = error.message || 'Could not load this message.'; }
}

$('new').addEventListener('click', createAddress);
$('refresh').addEventListener('click', () => refresh(true));
$('copy').addEventListener('click', async () => {
  if (!current()) return;
  try {
    await navigator.clipboard.writeText(current().address);
    $('copy').textContent = 'Copied';
    setTimeout(() => { $('copy').textContent = 'Copy'; }, 1800);
  } catch { status('Could not copy. Select the address and copy it manually.', true); }
});
$('accounts').addEventListener('change', async (event) => {
  active = Number(event.target.value);
  selectedMessage = null;
  $('detail').hidden = true; $('messages').hidden = false;
  await storage.set({ active });
  if (inboxCache?.address === current()?.address) {
    renderMessages(inboxCache.messages);
    lastFetch = inboxCache.at;
  } else {
    lastFetch = 0;
    renderMessages([]);
  }
  await refresh(true);
});
$('back').addEventListener('click', () => {
  selectedMessage = null;
  $('detail').hidden = true; $('messages').hidden = false;
});

(async () => {
  renderAccount();
  if (!storage) {
    $('new').disabled = true;
    status('Browser storage is unavailable. Install the extension from its folder, then open it from the toolbar.', true);
    return;
  }
  try {
    const stored = await storage.get(['accounts', 'active', 'retryAt', 'rateLimitHits', 'domainCache', 'inboxCache']);
    accounts = Array.isArray(stored.accounts) ? stored.accounts : [];
    active = Math.min(Math.max(Number(stored.active) || 0, 0), Math.max(accounts.length - 1, 0));
    retryAt = Number(stored.retryAt) || 0;
    rateLimitHits = Number(stored.rateLimitHits) || 0;
    domainCache = stored.domainCache || null;
    inboxCache = stored.inboxCache || null;
    renderAccount();
    if (current()) {
      if (inboxCache?.address === current().address) {
        renderMessages(inboxCache.messages);
        lastFetch = inboxCache.at;
      } else renderMessages([]);
      if (!remaining()) await refresh();
    }
    updateCooldown();
  } catch (error) { status('Could not access browser storage. Reload or reinstall the extension.', true); }
  setInterval(updateCooldown, 1000);
  setInterval(() => { if (current()) void refresh(); }, 60000);
})();
