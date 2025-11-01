// Admin Dashboard Functions
function initializeAdminDashboard() {
    const users = Datastore.getUsers();
    document.getElementById('total-users').textContent = String(users.length);
    document.getElementById('active-classes').textContent = '12';
    document.getElementById('resource-usage').textContent = '75%';
    loadUsers();
    loadSettings();

    // Ensure the add-user panel is visible only to admins (defensive)
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const addPanel = document.getElementById('add-user-panel');
        if (addPanel) {
            if (currentUser && currentUser.type === 'admin') {
                addPanel.classList.remove('hidden');
            } else {
                addPanel.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error('Error toggling add-user panel visibility', e);
    }
}

async function addUser() {
    // Only admins may create new users
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.type !== 'admin') {
        showNotification('Only admins can create user accounts', 'error');
        return;
    }
    const username = document.getElementById('new-user-name').value.trim();
    const userType = document.getElementById('new-user-type').value;
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-password') ? document.getElementById('new-user-password').value : '';

    if (!username || !email) {
        showNotification('Please fill all fields');
        return;
    }

    if (!password || password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'warning');
        return;
    }

    try {
        // Hash the password before storing (client-side demo). In production do this server-side.
        const passwordHash = await hashPassword(password);

        const record = Datastore.createUser({ username, type: userType, email, passwordHash });
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-email').value = '';
        if (document.getElementById('new-user-password')) document.getElementById('new-user-password').value = '';
        loadUsers();
        showNotification('User added successfully (id: ' + record.id + ')');
    } catch (e) {
        console.error('Failed to add user', e);
        showNotification('Failed to add user', 'error');
    }
}

function loadUsers() {
    const users = Datastore.getUsers();
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<h4 class="font-bold mb-2">Registered Users</h4>';
    
    if (users.length === 0) {
        usersList.innerHTML += '<p class="text-gray-500">No users registered yet</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'w-full border-collapse custom-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Type</th>
                <th>Email</th>
                <th>Actions</th>
            </tr>
        </thead>
    `;

    const tbody = document.createElement('tbody');
    users.forEach((user) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="border p-2 text-sm text-gray-500">${user.id}</td>
            <td class="border p-2">${user.username}</td>
            <td class="border p-2">${user.type}</td>
            <td class="border p-2">${user.email}</td>
            <td class="border p-2">
                <button onclick="deleteUser('${user.id}')" class="btn btn-danger text-red-600 hover:text-red-800">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    usersList.appendChild(table);
}

function deleteUser(index) {
    const ok = Datastore.deleteUser(index);
    if (ok) {
        loadUsers();
        showNotification('User deleted successfully');
    } else {
        showNotification('Failed to delete user', 'error');
    }
}

function saveSettings() {
    const academicYear = document.getElementById('academic-year').value;
    const semester = document.getElementById('current-semester').value;
    
    localStorage.setItem('systemSettings', JSON.stringify({
        academicYear,
        semester,
        lastUpdated: new Date().toISOString()
    }));
    
    showNotification('Settings saved successfully');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    if (settings.academicYear) {
        document.getElementById('academic-year').value = settings.academicYear;
    }
    if (settings.semester) {
        document.getElementById('current-semester').value = settings.semester;
    }
}

function backupSystem() {
    const backup = {
        users: JSON.parse(localStorage.getItem('systemUsers') || '[]'),
        settings: JSON.parse(localStorage.getItem('systemSettings') || '{}'),
        timestamp: new Date().toISOString()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "system_backup_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showNotification('Backup created successfully');
}

function clearCache() {
    if (confirm('Are you sure you want to clear the system cache?')) {
        localStorage.removeItem('tempData');
        showNotification('System cache cleared successfully');
    }
}