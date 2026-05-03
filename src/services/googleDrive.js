// Google Drive integration for file sync
// Folder structure: GATE PREPARATION / <Subject> / files

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const ROOT_FOLDER_NAME = 'GATE PREPARATION';

// Cache folder promises to avoid repeated lookups and race conditions during concurrent uploads
let rootFolderPromise = null;
const subfolderCache = {};

function getToken() {
  return localStorage.getItem('gc_token');
}

async function driveRequest(method, path, body, isUpload = false) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated with Google');
  const base = isUpload ? UPLOAD_API : DRIVE_API;
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}` },
  };
  if (body && !isUpload) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (isUpload) {
    opts.body = body; // FormData or raw body
  }
  const res = await fetch(`${base}${path}`, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// Find or create a folder by name under a parent
async function findOrCreateFolder(name, parentId = null) {
  // Search for existing folder
  let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }
  const search = await driveRequest('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  if (search.files && search.files.length > 0) {
    return search.files[0].id;
  }

  // Create the folder
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }
  const created = await driveRequest('POST', '/files', metadata);
  return created.id;
}

// Get or create the root "GATE PREPARATION" folder
export function getRootFolder() {
  if (!rootFolderPromise) {
    rootFolderPromise = findOrCreateFolder(ROOT_FOLDER_NAME);
  }
  return rootFolderPromise;
}

// Get or create a subject subfolder inside GATE PREPARATION
export function getSubjectFolder(subject) {
  const folderName = subject || 'General Study';
  if (!subfolderCache[folderName]) {
    subfolderCache[folderName] = getRootFolder().then(rootId => findOrCreateFolder(folderName, rootId));
  }
  return subfolderCache[folderName];
}

// Initialize all subject folders (creates them if they don't exist)
export async function initFolderStructure() {
  const subjects = [
    'Biochemistry', 'Molecular Biology', 'Genetics', 'Bioprocess Engineering',
    'Microbiology', 'Immunology', 'Plant and Animal Biology',
    'Engineering Mathematics', 'General Aptitude', 'General Study'
  ];
  await Promise.all(subjects.map(subject => getSubjectFolder(subject)));
  return subfolderCache;
}

// Upload a file to Google Drive under the correct subject folder
// file: { name, type, data (base64 dataURL), subject }
// If subject is 'Other', file goes directly into GATE PREPARATION root
export async function uploadFileToDrive(file) {
  const folderId = file.subject === 'Other'
    ? await getRootFolder()
    : await getSubjectFolder(file.subject);

  // Convert base64 data URL to Blob
  const response = await fetch(file.data);
  const blob = await response.blob();

  // Build multipart request
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const token = getToken();
  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink,size`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

// List all files in a subject folder (or all folders)
export async function listDriveFiles(subject = null) {
  let parentId;
  if (subject && subject !== 'All') {
    parentId = await getSubjectFolder(subject);
  } else {
    parentId = await getRootFolder();
  }

  // If listing all, we need to search recursively
  let q;
  if (subject && subject !== 'All') {
    q = `'${parentId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
  } else {
    // List files from all subfolders
    const allFiles = [];
    const folders = await driveRequest('GET',
      `/files?q=${encodeURIComponent(`'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)}&fields=files(id,name)&spaces=drive`
    );
    for (const folder of (folders.files || [])) {
      const fq = `'${folder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`;
      const result = await driveRequest('GET',
        `/files?q=${encodeURIComponent(fq)}&fields=files(id,name,mimeType,size,createdTime,webViewLink)&spaces=drive&orderBy=createdTime desc&pageSize=100`
      );
      for (const f of (result.files || [])) {
        allFiles.push({ ...f, subject: folder.name });
      }
    }
    return allFiles;
  }

  const result = await driveRequest('GET',
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,webViewLink)&spaces=drive&orderBy=createdTime desc&pageSize=100`
  );
  return (result.files || []).map(f => ({ ...f, subject }));
}

// Download a file from Drive (returns blob URL)
export async function downloadDriveFile(fileId) {
  const token = getToken();
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Delete a file from Drive
export async function deleteDriveFile(fileId) {
  await driveRequest('DELETE', `/files/${fileId}`);
}

// Upload study data (sessions, journal, settings) as a JSON backup to Drive
export async function syncStudyDataToDrive() {
  const data = {
    settings: JSON.parse(localStorage.getItem('settings') || '{}'),
    sessions: JSON.parse(localStorage.getItem('sessions') || '{}'),
    checklists: JSON.parse(localStorage.getItem('checklists') || '{}'),
    journal: JSON.parse(localStorage.getItem('journal') || '{}'),
    reminders: JSON.parse(localStorage.getItem('reminders') || '[]'),
    syncedAt: new Date().toISOString(),
  };

  const rootId = await getRootFolder();
  const fileName = 'studysync-data.json';

  // Check if backup file already exists
  const q = `name='${fileName}' and '${rootId}' in parents and trashed=false`;
  const search = await driveRequest('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)`);

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const metadata = { name: fileName, parents: [rootId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const token = getToken();

  if (search.files && search.files.length > 0) {
    // Update existing file
    const fileId = search.files[0].id;
    const res = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    return res.json();
  } else {
    // Create new file
    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    return res.json();
  }
}

// Download study data from Drive and merge with local
export async function restoreStudyDataFromDrive() {
  const rootId = await getRootFolder();
  const q = `name='studysync-data.json' and '${rootId}' in parents and trashed=false`;
  const search = await driveRequest('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)`);

  if (!search.files || search.files.length === 0) {
    return null; // No backup found
  }

  const url = await downloadDriveFile(search.files[0].id);
  const res = await fetch(url);
  const data = await res.json();
  URL.revokeObjectURL(url);

  // Merge into localStorage
  if (data.settings) localStorage.setItem('settings', JSON.stringify(data.settings));
  if (data.sessions) localStorage.setItem('sessions', JSON.stringify(data.sessions));
  if (data.checklists) localStorage.setItem('checklists', JSON.stringify(data.checklists));
  if (data.journal) localStorage.setItem('journal', JSON.stringify(data.journal));
  if (data.reminders) localStorage.setItem('reminders', JSON.stringify(data.reminders));

  return data;
}
