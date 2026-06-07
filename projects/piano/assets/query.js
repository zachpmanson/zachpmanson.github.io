// URL query-param helpers for deep-linking the current song.

export function setSongQueryParam(path) {
  const url = new URL(window.location.href);
  if (path) {
    url.searchParams.set('song', path);
  } else {
    url.searchParams.delete('song');
  }
  window.history.replaceState(null, '', url);
}
