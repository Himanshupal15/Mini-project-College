// Check if user is already logged in
window.onload = function() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        showDashboard();
        updateUserInterface(user);
    }
}

async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.getElementById('user-type').value;
    const errorDiv = document.getElementById('login-error');

    // Reset error message
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    // Validate empty fields
    if (!username || !password) {
        errorDiv.textContent = 'Please fill in all fields';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Password validation
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters long';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Authenticate against Datastore (client-side). If a passwordHash exists for the user, validate it.
    try {
        const users = Datastore.getUsers(u => u.username === username && u.type === userType);
        if (!users || users.length === 0) {
            errorDiv.textContent = 'User not found. Please contact admin to create this account.';
            errorDiv.classList.remove('hidden');
            return;
        }

        const matched = users[0];

        // If the user record contains a passwordHash, validate it
        if (matched.passwordHash) {
            const attemptHash = await hashPassword(password);
            if (attemptHash !== matched.passwordHash) {
                errorDiv.textContent = 'Invalid credentials. Please try again.';
                errorDiv.classList.remove('hidden');
                return;
            }
        } else {
            // No password set for this account (legacy/demo). Allow login but warn in console.
            console.warn('Logging in to an account without a passwordHash set. Consider recreating the user with a password.');
        }

        const sessionId = Math.random().toString(36).substring(2);
        const currentUser = Object.assign({}, matched, { sessionId, loginTime: new Date().toISOString() });
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        if (document.getElementById('remember-me').checked) {
            localStorage.setItem('lastSession', sessionId);
        }

        // Show dashboard and update UI
        showDashboard();
        updateUserInterface(currentUser);

        // Clear login form
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } catch (e) {
        console.error('Login error', e);
        errorDiv.textContent = 'Login failed due to an internal error';
        errorDiv.classList.remove('hidden');
    }
}

function showDashboard() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
}

function showLogin() {
    localStorage.removeItem('currentUser');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
}

function updateUserInterface(user) {
    const navTitle = document.querySelector('nav h1');
    navTitle.textContent = `Smart Classroom & Timetable Scheduler - ${user.name} (${user.type})`;
    
    // Hide all sections first
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    
    // Show appropriate section based on user type
    if (user.type === 'admin') {
        document.getElementById('admin-dashboard').classList.remove('hidden');
        initializeAdminDashboard();
    } else {
        document.getElementById('dashboard-section').classList.remove('hidden');
        setupDashboardByRole(user.type);
    }
    
    // Hide admin controls from students
    if (user.type === 'student') {
        // Hide poll creation
        const pollCreate = document.getElementById('poll-create');
        if (pollCreate) pollCreate.style.display = 'none';
        
        // Hide timetable edit
        const timetableEdit = document.getElementById('timetable-edit');
        if (timetableEdit) timetableEdit.style.display = 'none';
        
        // Hide attendance controls
        const attendanceControls = document.getElementById('attendance-controls');
        if (attendanceControls) attendanceControls.style.display = 'none';
        
        // Hide attendance tracker controls
        const trackerControls = document.getElementById('attendance-tracker-controls');
        if (trackerControls) trackerControls.style.display = 'none';
        
        // Hide announcement controls
        const announcementControls = document.getElementById('announcement-controls');
        if (announcementControls) announcementControls.parentElement.style.display = 'none';
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 2000);
}