// Date and Time Utilities
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Validation Utilities
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function sanitizeInput(input) {
    return input.replace(/[<>]/g, '');
}

// Storage Utilities
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Storage error:', e);
        showNotification('Storage error occurred');
        return false;
    }
}

function safeGetItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Storage error:', e);
        return defaultValue;
    }
}

// Permission Utilities
function checkPermission(requiredType) {
    const user = safeGetItem('currentUser');
    if (!user) return false;
    
    if (requiredType === 'admin') {
        return user.type === 'admin';
    }
    
    if (requiredType === 'teacher') {
        return user.type === 'teacher' || user.type === 'admin';
    }
    
    return true;
}

// UI Utilities
function showLoading(message = 'Loading...') {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50';
    loader.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-lg text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto mb-2"></div>
            <p class="text-gray-700">${message}</p>
        </div>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.remove();
    }
}

// Error Handling
function handleError(error, userMessage = 'An error occurred') {
    console.error('Error:', error);
    showNotification(userMessage, 'error');
}

// Enhanced Notification System
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'bg-yellow-500');
    
    switch(type) {
        case 'error':
            notification.classList.add('bg-red-500');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500');
            break;
        default:
            notification.classList.add('bg-green-500');
    }
    
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 3000);
}

// Session Management
function checkSession() {
    const user = safeGetItem('currentUser');
    const lastSession = localStorage.getItem('lastSession');
    
    if (!user) {
        if (lastSession) {
            // Handle auto-login if remember-me was checked
            return false;
        }
        return false;
    }
    
    // Check if session is expired (24 hours)
    const loginTime = new Date(user.loginTime);
    const now = new Date();
    if (now - loginTime > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('currentUser');
        return false;
    }
    
    return true;
}

// Data Export
function exportData(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Password hashing (SHA-256) - returns hex string
async function hashPassword(password) {
    if (!password) return '';
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}