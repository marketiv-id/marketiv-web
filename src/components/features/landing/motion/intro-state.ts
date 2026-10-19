// The intro curtain and the hero timeline live in different components; this tiny bus lets the hero wait for the curtain.
let done = false;
const listeners = new Set<() => void>();

export function markIntroDone() {
  if (done) return;
  done = true;
  listeners.forEach((listener) => listener());
  listeners.clear();
}

export function whenIntroDone(callback: () => void): () => void {
  if (done) {
    callback();
    return () => {};
  }
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function resetIntroState() {
  done = false;
}

// Runs inline before first paint: flags that motion will run and starts the intro on every load (owner asked for it on refresh),
// so the overlay never flashes in after content. Reduced-motion visitors and no-JS visitors never see it.
// Scroll restoration is switched off here, before the browser restores the old position on load; switching it later
// from React let the restore land after the intro and left the page mid-scroll with the navbar hidden.
export const INTRO_INLINE_SCRIPT = `(function(){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if('scrollRestoration' in history)history.scrollRestoration='manual';var d=document.documentElement;d.setAttribute('data-motion','on');d.setAttribute('data-intro','play');}catch(e){}})();`;
