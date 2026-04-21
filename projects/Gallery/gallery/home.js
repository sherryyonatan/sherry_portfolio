requireLogin();

const foldersGrid = document.getElementById('foldersGrid');
const sliderTrack = document.getElementById('sliderTrack');
const sliderDots = document.getElementById('sliderDots');
const logoutBtn = document.getElementById('logoutBtn');
const openFolderModalBtn = document.getElementById('openFolderModalBtn');
const newFolderForm = document.getElementById('newFolderForm');

let currentSlideIndex = 0;
let sliderInterval;

async function renderFolders() {
  const data = await getGalleryData();

  foldersGrid.innerHTML = data.folders.map((folder) => `
    <article class="folder-card">
      <div class="folder-cover-wrap">
        <div class="folder-tab"></div>
        <img class="folder-cover" src="${folder.coverImage}" alt="${folder.name}" />
      </div>
      <div class="folder-content">
        <h3>${folder.name}</h3>
        <p class="section-note">${folder.description || 'תיקיית תמונות אישית'}</p>
        <a class="folder-link" href="gallery/folder.html?id=${folder.id}">
          לאלבום
          <span class="arrow">←</span>
        </a>
      </div>
    </article>
  `).join('');
}

async function renderSlider() {
  const data = await getGalleryData();
  const allPhotos = data.folders
    .flatMap((folder) =>
      folder.photos.slice(0, 2).map((photo) => ({
        ...photo,
        folderName: folder.name
      }))
    )
    .slice(0, 5);

  if (!allPhotos.length) {
    sliderTrack.innerHTML = `
      <div class="slide active">
        <div class="slide-caption">
          <strong>עדיין אין תמונות להצגה</strong>
          <div>הוסיפי תמונות כדי להציג אותן כאן</div>
        </div>
      </div>
    `;
    sliderDots.innerHTML = '';
    return;
  }

  sliderTrack.innerHTML = allPhotos.map((photo, index) => `
  <div class="slide ${index === 0 ? 'active' : ''}">
    <img src="${photo.image.replace('../', '')}" alt="${photo.title}" />
    <div class="slide-caption">
      <strong>${photo.title}</strong>
      <div>${photo.folderName} · ${formatDate(photo.date)}</div>
    </div>
  </div>
`).join('');

  sliderDots.innerHTML = allPhotos.map((_, index) => `
    <button class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="מעבר לשקופית ${index + 1}"></button>
  `).join('');

  document.querySelectorAll('.slider-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      currentSlideIndex = Number(dot.dataset.index);
      updateSlides();
      restartInterval();
    });
  });
}

function updateSlides() {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('.slider-dot')];

  slides.forEach((slide, index) => {
    slide.classList.toggle('active', index === currentSlideIndex);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentSlideIndex);
  });
}

function startSlider() {
  const slides = document.querySelectorAll('.slide');
  clearInterval(sliderInterval);

  if (slides.length <= 1) return;

  sliderInterval = setInterval(() => {
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    updateSlides();
  }, 3500);
}

function restartInterval() {
  clearInterval(sliderInterval);
  startSlider();
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('galleryLoggedIn');
  window.location.href = 'login/login.html';
});

openFolderModalBtn.addEventListener('click', () => openModal('folderModal'));

newFolderForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('folderName').value.trim();
  const slug = document.getElementById('folderSlug').value.trim().toLowerCase();
  const coverFile = document.getElementById('folderCover').files[0];

  if (!name || !slug || !coverFile) return;

  const data = await getGalleryData();
  const exists = data.folders.some((folder) => folder.id === slug);

  if (exists) {
    alert('כבר קיימת תיקייה עם שם הזיהוי הזה.');
    return;
  }

  const coverImage = await fileToDataUrl(coverFile);

  data.folders.push({
    id: slug,
    name,
    description: 'תיקייה חדשה שנוצרה מתוך עמוד הבית.',
    coverImage,
    photos: []
  });

  saveGalleryData(data);
  newFolderForm.reset();
  closeModal('folderModal');
  currentSlideIndex = 0;
  await renderFolders();
  await renderSlider();
  restartInterval();
});

const header = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 10);
});

async function initHomePage() {
  await renderFolders();
  await renderSlider();
  startSlider();
}

initHomePage();