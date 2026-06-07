// Library manifest helpers: resolve item paths/URLs and normalize library.json
// into a flat list of {id, title, files} groups.

export function getLibraryItemPath(item) {
  return item && (item.path || item.filename) ? (item.path || item.filename) : '';
}

export function buildLibraryFileUrl(item) {
  const path = getLibraryItemPath(item);
  return 'music_xml/' + path.split('/').map(part => encodeURIComponent(part)).join('/');
}

export function normalizeLibraryGroups(data) {
  const groups = [];

  if (Array.isArray(data.folders)) {
    data.folders.forEach((folder, index) => {
      if (!folder) return;
      const files = Array.isArray(folder.files)
        ? folder.files.filter(item => getLibraryItemPath(item))
        : [];
      if (files.length === 0) return;
      groups.push({
        id: folder.id || `folder-${index + 1}`,
        title: folder.title || folder.name || '',
        files
      });
    });
  }

  const rootFiles = Array.isArray(data.files)
    ? data.files.filter(item => getLibraryItemPath(item))
    : [];

  if (rootFiles.length > 0) {
    groups.push({ id: 'root', title: '', files: rootFiles });
  }

  return groups;
}

export function flattenLibraryFiles(groups) {
  const files = [];
  groups.forEach(group => {
    group.files.forEach(item => files.push(item));
  });
  return files;
}
