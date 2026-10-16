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

export const INTRO_STORAGE_KEY = "marketiv.landing.intro";

// Runs inline before first paint: flags that motion will run (so hero decorations can wait hidden) and decides whether
// the curtain plays, so neither ever flashes in after content.
export const INTRO_INLINE_SCRIPT = `(function(){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.setAttribute('data-motion','on');if(sessionStorage.getItem('${INTRO_STORAGE_KEY}'))return;d.setAttribute('data-intro','play');}catch(e){}})();`;
