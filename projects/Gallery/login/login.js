const USERS_STORAGE_KEY = 'galleryUsers';

const DEFAULT_USERS = [
  {
    username: 'Yonatan',
    password: 'since1986',
    displayName: 'Yonatan',
    role: 'admin'
  },
  {
    username: 'guest',
    password: '1234',
    displayName: 'Guest User',
    role: 'viewer'
  }
];

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

function getStoredUsers() {
  const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);

  if (!savedUsers) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }

  try {
    const parsedUsers = JSON.parse(savedUsers);

    if (!Array.isArray(parsedUsers)) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return [...DEFAULT_USERS];
    }

    return parsedUsers;
  } catch (error) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }
}

if (localStorage.getItem('galleryLoggedIn') === 'true') {
  window.location.href = '../index.html';
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    const users = getStoredUsers();

    const matchedUser = users.find((user) => {
      return user.username === username && user.password === password;
    });

    if (!matchedUser) {
      loginError.textContent = 'שם המשתמש או הסיסמה אינם נכונים.';
      return;
    }

    localStorage.setItem('galleryLoggedIn', 'true');
    localStorage.setItem('galleryCurrentUser', matchedUser.username);
    localStorage.setItem('galleryDisplayName', matchedUser.displayName);
    localStorage.setItem('galleryRole', matchedUser.role);

    window.location.href = '../index.html';
  });
}