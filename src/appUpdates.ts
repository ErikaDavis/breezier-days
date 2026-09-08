const reloadKey = 'breezier-days.update-reload.v1';

/** Check deployment metadata, never user/auth data. No service-worker cache is needed. */
export function startAppUpdates(buildId: string): () => void {
  let stopped = false;
  let checking = false;
  let reloading = false;
  let lastCheck = 0;
  let pending: string | null = null;
  let notice: HTMLDivElement | null = null;
  const edited = new Set<HTMLElement>();
  const cleanups: (() => void)[] = [];

  const isVisible = (element: Element) => element.getClientRects().length > 0;
  const canRefresh = () => {
    for (const field of edited) {
      if (!field.isConnected || ('value' in field && field.value === '')) edited.delete(field);
    }
    // Keep answers, drafts, dialogs and payment/auth redirects intact. The user
    // may choose Refresh when ready; a later clean Home visit updates itself.
    return document.visibilityState === 'visible'
      && navigator.onLine
      && !location.search && !location.hash
      && document.querySelector('main[data-analytics-view="home"]') !== null
      && edited.size === 0
      && !Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], [aria-busy="true"]')).some(isVisible)
      && !document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
  };

  const reload = () => {
    if (!pending || reloading || stopped || !navigator.onLine) return;
    try {
      const previous = JSON.parse(sessionStorage.getItem(reloadKey) || 'null');
      // A temporarily stale edge must not cause repeated automatic reloads.
      if (previous?.buildId === pending && Date.now() - previous.at < 300000) return;
      sessionStorage.setItem(reloadKey, JSON.stringify({ buildId: pending, at: Date.now() }));
    } catch {
      // If loop protection cannot be stored, leave the refresh to the user.
      showNotice();
      return;
    }
    reloading = true;
    location.reload();
  };

  const showNotice = () => {
    if (notice || stopped) return;
    notice = document.createElement('div');
    notice.className = 'app-update-notice';
    notice.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = 'A Breezier Days update is ready. Save any unfinished work before refreshing.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Refresh when ready';
    button.addEventListener('click', () => {
      if (navigator.onLine) location.reload();
    });
    notice.append(text, button);
    document.body.append(notice);
  };

  const applyPending = () => {
    if (!pending || stopped || reloading) return;
    if (canRefresh()) reload();
    else showNotice();
  };

  const check = async () => {
    if (stopped || checking || reloading || !navigator.onLine || document.visibilityState !== 'visible') return;
    if (pending) { applyPending(); return; }
    if (Date.now() - lastCheck < 10000) return;
    lastCheck = Date.now();
    checking = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/build-version.json', {
        cache: 'no-store', credentials: 'omit', signal: controller.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return;
      const version: unknown = await response.json();
      if (!version || typeof version !== 'object' || !('buildId' in version)
        || typeof version.buildId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(version.buildId)) return;
      if (!stopped && version.buildId !== buildId) {
        pending = version.buildId;
        applyPending();
      }
    } catch { /* Offline, captive portals and deployment errors leave the open app usable. */ }
    finally { window.clearTimeout(timeout); checking = false; }
  };

  const onEdit = (event: Event) => {
    const field = event.target;
    if (field instanceof HTMLElement && field.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), [contenteditable="true"]')) edited.add(field);
  };
  document.addEventListener('input', onEdit, true);
  cleanups.push(() => document.removeEventListener('input', onEdit, true));
  for (const [target, event] of [[window, 'focus'], [window, 'pageshow'], [window, 'online'], [document, 'visibilitychange']] as const) {
    const listener = () => void check();
    target.addEventListener(event, listener);
    cleanups.push(() => target.removeEventListener(event, listener));
  }
  const initial = window.setTimeout(() => void check(), 2000);
  const timer = window.setInterval(() => void check(), 60000);
  return () => {
    stopped = true;
    cleanups.forEach(cleanup => cleanup());
    window.clearTimeout(initial);
    window.clearInterval(timer);
    notice?.remove();
  };
}
