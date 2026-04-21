requireLogin();

const params = new URLSearchParams(window.location.search);
const folderId = params.get('id');

const folderTitle = document.getElementById('folderTitle');
const folderDescription = document.getElementById('folderDescription');
const galleryGrid = document.getElementById('galleryGrid');
const openImageModalBtn = document.getElementById('openImageModalBtn');
const newImageForm = document.getElementById('newImageForm');

const imageLightbox = document.getElementById('imageLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightbox = document.getElementById('closeLightbox');
const lightboxLikeBtn = document.getElementById('lightboxLikeBtn');
const lightboxCommentBtn = document.getElementById('lightboxCommentBtn');
const lightboxCommentForm = document.getElementById('lightboxCommentForm');
const lightboxCommentInput = document.getElementById('lightboxCommentInput');
const lightboxComments = document.getElementById('lightboxComments');
const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
const deletePhotoBtn = document.getElementById('deletePhotoBtn');
const successToast = document.getElementById('successToast');

async function renderFolder() {
  const data = await getGalleryData();
  const folder = data.folders.find((item) => item.id === folderId);

  if (!folder) {
    folderTitle.textContent = 'התיקייה לא נמצאה';
    folderDescription.textContent = 'חזרי לעמוד הבית ובחרי תיקייה תקינה.';
    galleryGrid.innerHTML = '';
    return;
  }

  folderTitle.textContent = folder.name;
  folderDescription.textContent = folder.description || '';

  galleryGrid.innerHTML = folder.photos.map((photo) => `
    <article class="insta-photo-card" data-open-photo="${photo.id}">
      <img src="${photo.image}" alt="${photo.title}" class="insta-photo-thumb" />
      <div class="insta-photo-overlay">
        <div class="insta-overlay-stats">
          <span class="overlay-stat">
            <strong>${photo.likes ?? 0}</strong>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="overlay-icon">
              <path d="M16.792 3.904A4.989 4.989 0 0 0 12 5.892a4.989 4.989 0 0 0-4.792-1.988C4.706 4.148 3 6.143 3 8.723c0 3.12 2.873 5.844 7.227 9.86l.773.71a1 1 0 0 0 1.35 0l.773-.71C18.127 14.567 21 11.843 21 8.723c0-2.58-1.706-4.575-4.208-4.819Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>

          <span class="overlay-stat">
            <strong>${Array.isArray(photo.comments) ? photo.comments.length : 0}</strong>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="overlay-icon">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.9 8.9 0 0 1-4-.9L3 21l1.1-5.1a8.4 8.4 0 0 1-.9-3.9A8.38 8.38 0 0 1 11.7 3.5H12A8.5 8.5 0 0 1 21 11.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>

          <a class="overlay-stat overlay-download" href="${photo.image}" download="${photo.title}" title="הורדת תמונה" aria-label="הורדת תמונה">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="overlay-icon">
              <path d="M12 3v11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M7 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M5 21h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  `).join('');

  bindFolderEvents();
}

function bindFolderEvents() {
  document.querySelectorAll('[data-open-photo]').forEach((card) => {
    card.addEventListener('click', () => {
      openPhotoModal(card.dataset.openPhoto);
    });
  });
}

async function openPhotoModal(photoId) {
  const data = await getGalleryData();
  const folder = data.folders.find((item) => item.id === folderId);
  const photo = folder?.photos.find((item) => item.id === photoId);

  if (!folder || !photo) return;

  lightboxImage.src = photo.image;
  document.getElementById('lightboxFolderName').textContent =
    localStorage.getItem('galleryCurrentUser') || 'sherry_yonatan';
  document.getElementById('lightboxLocation').textContent = folder.name;
  document.getElementById('lightboxTitle').textContent = photo.title;
  document.getElementById('lightboxDescription').textContent = photo.description;
  document.getElementById('lightboxDate').textContent = formatDate(photo.date);
  document.getElementById('lightboxLikes').textContent = `${photo.likes} לייקים`;

  lightboxComments.innerHTML = photo.comments.length
    ? photo.comments.map((comment) => `
        <div class="insta-comment-item">
          <strong>${comment.author || 'user'}</strong>
          <span>${comment.text || comment}</span>
        </div>
      `).join('')
    : `<p class="comments-empty">אין תגובות עדיין.</p>`;

  lightboxLikeBtn.dataset.photoId = photo.id;
  lightboxLikeBtn.classList.toggle('liked', photo.likedByUser);
  lightboxDownloadBtn.href = photo.image;
  lightboxDownloadBtn.setAttribute('download', photo.title);
  deletePhotoBtn.dataset.photoId = photo.id;

  imageLightbox.classList.remove('hidden');
}

async function toggleLike(photoId) {
  const data = await getGalleryData();
  const folder = data.folders.find((item) => item.id === folderId);
  const photo = folder?.photos.find((item) => item.id === photoId);

  if (!photo) return;

  photo.likedByUser = !photo.likedByUser;
  photo.likes = Math.max(0, photo.likes + (photo.likedByUser ? 1 : -1));

  saveGalleryData(data);
  await renderFolder();
  await openPhotoModal(photoId);
}

async function addComment(photoId, commentText) {
  if (!commentText) return;

  const data = await getGalleryData();
  const folder = data.folders.find((item) => item.id === folderId);
  const photo = folder?.photos.find((item) => item.id === photoId);

  if (!photo) return;

  const currentUser = localStorage.getItem('galleryCurrentUser') || 'guest';

  photo.comments.push({
    author: currentUser,
    text: commentText
  });

  saveGalleryData(data);
  await renderFolder();
  await openPhotoModal(photoId);
}

async function deletePhoto(photoId) {
  const data = await getGalleryData();
  const folder = data.folders.find((item) => item.id === folderId);

  if (!folder) return;

  folder.photos = folder.photos.filter((photo) => photo.id !== photoId);
  saveGalleryData(data);
  imageLightbox.classList.add('hidden');
  await renderFolder();
}

function showSuccessToast(message) {
  if (!successToast) return;

  successToast.textContent = message;
  successToast.classList.remove('hidden');
  successToast.classList.add('show');

  setTimeout(() => {
    successToast.classList.remove('show');
    setTimeout(() => successToast.classList.add('hidden'), 350);
  }, 2200);
}

openImageModalBtn.addEventListener('click', () => {
  openModal('imageModal');
});

newImageForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = document.getElementById('imageTitle').value.trim();
  const date = document.getElementById('imageDate').value;
  const description = document.getElementById('imageDescription').value.trim();
  const file = document.getElementById('imageFile').files[0];

  if (!title || !date || !description || !file) return;

  const image = await fileToDataUrl(file);
  const data = await getGalleryData();
  const folder = data.folders.find((item) => item.id === folderId);

  if (!folder) return;

  folder.photos.push({
    id: `${folderId}-${Date.now()}`,
    title,
    description,
    date,
    image,
    likes: 0,
    likedByUser: false,
    comments: []
  });

  saveGalleryData(data);
  newImageForm.reset();
  closeModal('imageModal');
  await renderFolder();
  showSuccessToast('התמונה שלך נוספה בהצלחה! 🎉');
});

lightboxLikeBtn.addEventListener('click', async () => {
  const photoId = lightboxLikeBtn.dataset.photoId;
  if (!photoId) return;
  await toggleLike(photoId);
});

lightboxCommentBtn.addEventListener('click', () => {
  lightboxCommentInput.focus();
});

lightboxCommentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const photoId = lightboxLikeBtn.dataset.photoId;
  const commentText = lightboxCommentInput.value.trim();

  if (!photoId || !commentText) return;

  await addComment(photoId, commentText);
  lightboxCommentInput.value = '';
});

deletePhotoBtn.addEventListener('click', async () => {
  const photoId = deletePhotoBtn.dataset.photoId;
  if (!photoId) return;

  const confirmed = confirm('האם למחוק את התמונה הזו?');
  if (!confirmed) return;

  await deletePhoto(photoId);
});

closeLightbox.addEventListener('click', () => {
  imageLightbox.classList.add('hidden');
});

imageLightbox.addEventListener('click', (event) => {
  if (event.target === imageLightbox) {
    imageLightbox.classList.add('hidden');
  }
});

const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 10);
});

renderFolder();