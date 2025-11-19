// Default nav title shown on the login page
const DEFAULT_NAV_TITLE = '📚 Smart Classroom and Timetable Scheduler';

// Assignments feature removed from project; no auto-clear flag needed.

// Small wrapper to use global showNotification from utils if available
function notify(message, type = 'success') {
	if (typeof showNotification === 'function') {
		try { showNotification(message, type); return; } catch (e) { /* fallthrough */ }
	}
	const el = document.getElementById('notification');
	if (!el) { alert(message); return; }
	el.textContent = message;
	el.classList.remove('hidden');
	setTimeout(() => el.classList.add('hidden'), 3000);
}

function init() {
	const navTitle = document.querySelector('nav h1');
	if (navTitle) navTitle.textContent = DEFAULT_NAV_TITLE;

	const logoutBtn = document.getElementById('logout-btn');
	if (logoutBtn) logoutBtn.classList.add('hidden');

	const user = safeGetItem('currentUser', null);
	if (user) {
		showDashboard();
		updateUserInterface(user);
	} else {
		// ensure login view visible
		document.getElementById('login-section').classList.remove('hidden');
	}
}

window.addEventListener('DOMContentLoaded', init);

async function handleLogin() {
	const username = document.getElementById('username').value.trim();
	const password = document.getElementById('password').value;
	const userType = document.getElementById('user-type').value;
	const errorDiv = document.getElementById('login-error');

	errorDiv.classList.add('hidden');
	errorDiv.textContent = '';

	if (!username || !password) {
		errorDiv.textContent = 'Please fill in all fields';
		errorDiv.classList.remove('hidden');
		return;
	}

	if (password.length < 6) {
		errorDiv.textContent = 'Password must be at least 6 characters long';
		errorDiv.classList.remove('hidden');
		return;
	}

	try {
		let users = Datastore.getUsers(u => u.username === username && u.type === userType);

		// If no user found and admin login attempted, create fallback admin (only when no admins exist)
		if ((!users || users.length === 0) && userType === 'admin') {
			const admins = Datastore.getUsers(u => u.type === 'admin');
			if (!admins || admins.length === 0) {
				const defaultPass = 'admin123';
				const passHash = await hashPassword(defaultPass);
				Datastore.createUser({ username: 'admin', type: 'admin', email: 'admin@school.com', name: 'Administrator', passwordHash: passHash });
				notify('Default admin created: username `admin`, password `admin123`', 'warning');
				users = Datastore.getUsers(u => u.username === username && u.type === userType);
			}
		}

		if (!users || users.length === 0) {
			errorDiv.textContent = 'User not found. Please contact admin to create this account.';
			errorDiv.classList.remove('hidden');
			return;
		}

		const matched = users[0];

		if (matched.passwordHash) {
			const attemptHash = await hashPassword(password);
			if (attemptHash !== matched.passwordHash) {
				errorDiv.textContent = 'Invalid credentials. Please try again.';
				errorDiv.classList.remove('hidden');
				return;
			}
		}

		const sessionId = Math.random().toString(36).substring(2);
		const currentUser = Object.assign({}, matched, { sessionId, loginTime: new Date().toISOString() });
		localStorage.setItem('currentUser', JSON.stringify(currentUser));

		if (document.getElementById('remember-me').checked) {
			localStorage.setItem('lastSession', sessionId);
		}

		// assignments feature removed: nothing to clear here

		showDashboard();
		updateUserInterface(currentUser);

		document.getElementById('username').value = '';
		document.getElementById('password').value = '';
	} catch (e) {
		console.error('Login error', e);
		errorDiv.textContent = 'Login failed due to an internal error';
		errorDiv.classList.remove('hidden');
	}
}

function showDashboard() {
	const login = document.getElementById('login-section');
	if (login) login.classList.add('hidden');
	const dash = document.getElementById('dashboard-section');
	if (dash) dash.classList.remove('hidden');
}

function showLogin() {
	try { localStorage.removeItem('currentUser'); } catch (e) { console.warn(e); }
	const dash = document.getElementById('dashboard-section'); if (dash) dash.classList.add('hidden');
	const admin = document.getElementById('admin-dashboard'); if (admin) admin.classList.add('hidden');
	const login = document.getElementById('login-section'); if (login) login.classList.remove('hidden');

	const navTitle = document.querySelector('nav h1'); if (navTitle) navTitle.textContent = DEFAULT_NAV_TITLE;
	const logoutBtn = document.getElementById('logout-btn'); if (logoutBtn) logoutBtn.classList.add('hidden');

	// Ensure subjects area refreshes when returning to login (hides teacher controls)
	if (typeof renderSubjects === 'function') {
		try { renderSubjects(); } catch (e) { console.warn('renderSubjects error on showLogin', e); }
	}
}

function updateUserInterface(user) {
	const navTitle = document.querySelector('nav h1');
	if (navTitle) navTitle.textContent = `Smart Classroom & Timetable Scheduler - ${user.name} (${user.type})`;

	const logoutBtn = document.getElementById('logout-btn'); if (logoutBtn) logoutBtn.classList.remove('hidden');

	// Hide both dashboards then show relevant
	const adminSection = document.getElementById('admin-dashboard'); if (adminSection) adminSection.classList.add('hidden');
	const dashboard = document.getElementById('dashboard-section'); if (dashboard) dashboard.classList.add('hidden');

	if (user.type === 'admin') {
		if (adminSection) adminSection.classList.remove('hidden');
		if (typeof initializeAdminDashboard === 'function') initializeAdminDashboard();
	} else {
		if (dashboard) dashboard.classList.remove('hidden');
		if (typeof setupDashboardByRole === 'function') setupDashboardByRole(user.type);
	}

	// Hide controls from students
	if (user.type === 'student') {
		const pollCreate = document.getElementById('poll-create'); if (pollCreate) pollCreate.style.display = 'none';
		const timetableEdit = document.getElementById('timetable-edit'); if (timetableEdit) timetableEdit.style.display = 'none';
		const attendanceControls = document.getElementById('attendance-controls'); if (attendanceControls) attendanceControls.style.display = 'none';
		const announcementControls = document.getElementById('announcement-controls'); if (announcementControls && announcementControls.parentElement) announcementControls.parentElement.style.display = 'none';
	}

	// Re-render subjects so teacher/admin controls (Add Subject) appear appropriately
	if (typeof renderSubjects === 'function') {
		try { renderSubjects(); } catch (e) { console.warn('renderSubjects error on updateUserInterface', e); }
	}

	// If the user is a student, ensure their attendance view is loaded
	try {
		if (user.type === 'student' && typeof loadStudentAttendance === 'function') {
			console.log('Main: loading student attendance for', user.username || user.name);
			loadStudentAttendance();
		}
	} catch (e) { console.warn('Error calling loadStudentAttendance from main', e); }
}

// Create default admin or reset first admin's password to admin123
async function createOrResetAdmin() {
	try {
		if (typeof Datastore === 'undefined' || typeof hashPassword !== 'function') {
			alert('Datastore or utilities not available yet. Reload the page and try again.');
			return;
		}
		const admins = Datastore.getUsers(u => u.type === 'admin');
		const newPassword = 'admin123';
		const newHash = await hashPassword(newPassword);

		if (!admins || admins.length === 0) {
			Datastore.createUser({ username: 'admin', type: 'admin', email: 'admin@school.com', name: 'Administrator', passwordHash: newHash });
			notify('Default admin created: username `admin`, password `admin123`', 'warning');
			return;
		}

		const admin = admins[0];
		const updated = Datastore.updateUser(admin.id, { passwordHash: newHash });
		if (updated) {
			notify('Admin password reset to `admin123`. Please login and change it.', 'warning');
		} else {
			notify('Failed to reset admin password', 'error');
		}
	} catch (e) {
		console.error('createOrResetAdmin error', e);
		notify('Error resetting/creating admin. Check console.', 'error');
	}
}

// Export functions to global scope if needed by inline onclick handlers
window.handleLogin = handleLogin;
window.showLogin = showLogin;
window.createOrResetAdmin = createOrResetAdmin;