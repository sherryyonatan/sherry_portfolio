const STORAGE_KEY = 'galleryAppData';
const GALLERY_SOURCE_PATH = window.location.pathname.includes('/gallery/') ||
   window.location.pathname.includes('/admin/') ||
   window.location.pathname.includes('/login/')
  ? '../data/gallery.json'
  : 'data/gallery.json';

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizePhoto(photo = {}) {
  return {
    id: photo.id || `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: photo.title || 'ללא כותרת',
    description: photo.description || '',
    date: photo.date || '',
    image: photo.image || '',
    likes: Number.isFinite(photo.likes) ? Math.max(0, photo.likes) : 0,
    likedByUser: Boolean(photo.likedByUser),
    comments: Array.isArray(photo.comments) ? photo.comments.filter(Boolean) : []
  };
}

function normalizeFolder(folder = {}) {
  return {
    id: folder.id || `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: folder.name || 'תיקייה חדשה',
    description: folder.description || 'תיקיית תמונות אישית',
    coverImage: folder.coverImage || '',
    photos: Array.isArray(folder.photos) ? folder.photos.map(normalizePhoto) : []
  };
}

function normalizeGalleryData(data = {}) {
  return {
    folders: Array.isArray(data.folders) ? data.folders.map(normalizeFolder) : []
  };
}

async function fetchGalleryFromJson() {
  const response = await fetch(GALLERY_SOURCE_PATH, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load gallery JSON: ${response.status}`);
  }

  const data = await response.json();
  return normalizeGalleryData(data);
}

async function getGalleryData() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return normalizeGalleryData(JSON.parse(saved));
    } catch (error) {
      console.error('שגיאה בקריאת הנתונים השמורים. מתבצעת טעינה מחדש מה-JSON.', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  try {
    const data = await fetchGalleryFromJson();
    saveGalleryData(data);
    return cloneData(data);
  } catch (error) {
    console.error('שגיאה בטעינת קובץ gallery.json', error);
    return { folders: [] };
  }
}

function saveGalleryData(data) {
  const normalized = normalizeGalleryData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

async function resetGalleryData() {
  localStorage.removeItem(STORAGE_KEY);
  const data = await fetchGalleryFromJson();
  saveGalleryData(data);
  return cloneData(data);
}

function requireLogin() {
  if (localStorage.getItem('galleryLoggedIn') !== 'true') {
    window.location.href = window.location.pathname.includes('/gallery/') ||
     window.location.pathname.includes('/admin/')
      ? '../login/login.html'
      : 'login/login.html';
  }
}

async function getFolderById(folderId) {
  const data = await getGalleryData();
  return data.folders.find((folder) => folder.id === folderId) || null;
}

function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

document.addEventListener('click', (event) => {
  const closeTarget = event.target.dataset.close;
  if (closeTarget) {
    closeModal(closeTarget);
  }
});
const adminBtn = document.getElementById('adminBtn');

if (adminBtn) {
  const role = localStorage.getItem('galleryRole');

  if (role === 'admin') {
    adminBtn.classList.remove('hidden');
  }
}