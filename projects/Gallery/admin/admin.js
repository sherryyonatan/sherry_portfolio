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

const createUserForm = document.getElementById('createUserForm');
const usersTableBody = document.getElementById('usersTableBody');
const statusText = document.getElementById('statusText');
const resetUsersBtn = document.getElementById('resetUsersBtn');
const logoutBtn = document.getElementById('logoutBtn');

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

function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function requireAdminAccess() {
  const isLoggedIn = localStorage.getItem('galleryLoggedIn') === 'true';
  const currentRole = localStorage.getItem('galleryRole') || 'viewer';

  if (!isLoggedIn) {
    window.location.href = '../login/login.html';
    return;
  }

  if (currentRole !== 'admin') {
    alert('רק משתמש admin יכול להיכנס לעמוד הזה.');
    window.location.href = '../index.html';
  }
}

function setStatus(message, type = '') {
  statusText.textContent = message;
  statusText.className = 'status-text';

  if (type) {
    statusText.classList.add(type);
  }
}

function renderUsersTable() {
  const users = getStoredUsers();

  usersTableBody.innerHTML = users.map((user) => {
    const isCurrentUser = user.username === localStorage.getItem('galleryCurrentUser');

    return `
      <tr>
        <td>${user.displayName}</td>
        <td>${user.username}${isCurrentUser ? ' (מחובר/ת כעת)' : ''}</td>
        <td><span class="role-badge ${user.role}">${user.role}</span></td>
        <td>${user.password}</td>
        <td>
          <button class="inline-btn" type="button" data-action="toggle-role" data-username="${user.username}">
            החלפת הרשאה
          </button>
          <button class="inline-btn danger" type="button" data-action="delete-user" data-username="${user.username}">
            מחיקה
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function createUser(event) {
  event.preventDefault();

  const displayName = document.getElementById('displayName').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.getElementById('role').value;

  if (!displayName || !username || !password || !role) {
    setStatus('יש למלא את כל השדות.', 'error');
    return;
  }

  const users = getStoredUsers();
  const exists = users.some((user) => user.username === username);

  if (exists) {
    setStatus('שם המשתמש הזה כבר קיים.', 'error');
    return;
  }

  users.push({
    displayName,
    username,
    password,
    role
  });

  saveUsers(users);
  createUserForm.reset();
  setStatus('המשתמש נשמר בהצלחה.', 'success');
  renderUsersTable();
}

function toggleUserRole(username) {
  const users = getStoredUsers();
  const userIndex = users.findIndex((user) => user.username === username);

  if (userIndex === -1) return;

  users[userIndex].role = users[userIndex].role === 'admin' ? 'viewer' : 'admin';
  saveUsers(users);

  if (username === localStorage.getItem('galleryCurrentUser')) {
    localStorage.setItem('galleryRole', users[userIndex].role);
  }

  setStatus('ההרשאה עודכנה בהצלחה.', 'success');
  renderUsersTable();
}

function deleteUser(username) {
  const currentUser = localStorage.getItem('galleryCurrentUser');

  if (username === currentUser) {
    setStatus('אי אפשר למחוק את המשתמש שמחובר כרגע.', 'error');
    return;
  }

  const confirmed = confirm('למחוק את המשתמש הזה?');

  if (!confirmed) return;

  const users = getStoredUsers().filter((user) => user.username !== username);
  saveUsers(users);
  setStatus('המשתמש נמחק.', 'success');
  renderUsersTable();
}

function handleTableClick(event) {
  const action = event.target.dataset.action;
  const username = event.target.dataset.username;

  if (!action || !username) return;

  if (action === 'toggle-role') {
    toggleUserRole(username);
    return;
  }

  if (action === 'delete-user') {
    deleteUser(username);
  }
}

function resetUsers() {
  const confirmed = confirm('לאפס לרשימת ברירת המחדל?');

  if (!confirmed) return;

  saveUsers(DEFAULT_USERS);
  setStatus('רשימת המשתמשים אופסה.', 'success');
  renderUsersTable();
}

function logoutUser() {
  localStorage.removeItem('galleryLoggedIn');
  localStorage.removeItem('galleryCurrentUser');
  localStorage.removeItem('galleryDisplayName');
  localStorage.removeItem('galleryRole');
  window.location.href = '../login/login.html';
}

requireAdminAccess();
renderUsersTable();

createUserForm.addEventListener('submit', createUser);
usersTableBody.addEventListener('click', handleTableClick);
resetUsersBtn.addEventListener('click', resetUsers);
logoutBtn.addEventListener('click', logoutUser);