// Timetable Functions
function addClass() {
    const time = document.getElementById('time-input').value;
    const day = document.getElementById('day-input').value;
    const subject = document.getElementById('subject-input').value;
    const row = parseInt(document.getElementById('row-input').value) || 1;

    if (!time || !subject) {
        showNotification('Please fill in all fields');
        return;
    }

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
    const dayIndex = days.indexOf(day) + 1;
    const tableRow = document.getElementById('timetable-body').rows[row-1];
    
    if (tableRow) {
        tableRow.cells[0].textContent = time;
        tableRow.cells[dayIndex].textContent = subject;
        showNotification('Timetable Updated!');
        
        // Save timetable to localStorage
        saveTimetable();
    }
}

function saveTimetable() {
    const timetable = [];
    const rows = document.getElementById('timetable-body').rows;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowData = {
            time: row.cells[0].textContent,
            monday: row.cells[1].textContent,
            tuesday: row.cells[2].textContent,
            wednesday: row.cells[3].textContent,
            thursday: row.cells[4].textContent,
            friday: row.cells[5].textContent
        };
        timetable.push(rowData);
    }
    
    localStorage.setItem('timetable', JSON.stringify(timetable));
}

function loadTimetable() {
    const savedTimetable = JSON.parse(localStorage.getItem('timetable') || '[]');
    if (savedTimetable.length > 0) {
        const tbody = document.getElementById('timetable-body');
        tbody.innerHTML = '';
        
        savedTimetable.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="border p-2">${row.time}</td>
                <td class="border p-2">${row.monday}</td>
                <td class="border p-2">${row.tuesday}</td>
                <td class="border p-2">${row.wednesday}</td>
                <td class="border p-2">${row.thursday}</td>
                <td class="border p-2">${row.friday}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Chat Functions
function sendMessage() {
    const msg = document.getElementById('chat-input').value;
    if (msg.trim() !== '') {
        const chatBox = document.getElementById('chat-box');
        const messageElement = document.createElement('p');
        const user = JSON.parse(localStorage.getItem('currentUser'));
        messageElement.textContent = `${user.name}: ${msg}`;
        chatBox.appendChild(messageElement);
        document.getElementById('chat-input').value = '';
        
        // Auto-scroll to bottom
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Save chat history
        saveChatHistory(messageElement.textContent);
    }
}

function saveChatHistory(message) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatHistory.push({
        message,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    
    chatHistory.forEach(item => {
        const messageElement = document.createElement('p');
        messageElement.textContent = item.message;
        chatBox.appendChild(messageElement);
    });
    
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Resource Management
function toggleResource(id) {
    const span = document.getElementById(id);
    if (span.textContent === "Available" || span.textContent === "Online") {
        span.textContent = "In Use";
        span.classList.remove("status-available");
        span.classList.add("status-inuse");
    } else {
        span.textContent = "Available";
        span.classList.remove("status-inuse");
        span.classList.add("status-available");
        if (id === "wifi-status") span.textContent = "Online";
    }
    
    // Save resource status
    saveResourceStatus();
}

function saveResourceStatus() {
    const resources = {
        projector: document.getElementById('projector-status').textContent,
        smartboard: document.getElementById('smartboard-status').textContent,
        wifi: document.getElementById('wifi-status').textContent
    };
    localStorage.setItem('resourceStatus', JSON.stringify(resources));
}

function loadResourceStatus() {
    const resources = JSON.parse(localStorage.getItem('resourceStatus') || '{}');
    if (resources.projector) {
        const projectorStatus = document.getElementById('projector-status');
        projectorStatus.textContent = resources.projector;
        projectorStatus.className = resources.projector === "Available" ? "status-available" : "status-inuse";
    }
    if (resources.smartboard) {
        const smartboardStatus = document.getElementById('smartboard-status');
        smartboardStatus.textContent = resources.smartboard;
        smartboardStatus.className = resources.smartboard === "Available" ? "status-available" : "status-inuse";
    }
    if (resources.wifi) {
        const wifiStatus = document.getElementById('wifi-status');
        wifiStatus.textContent = resources.wifi;
        wifiStatus.className = resources.wifi === "Online" ? "status-available" : "status-inuse";
    }
}

// Role-based dashboard setup
function setupDashboardByRole(userType) {
    const isTeacher = userType === 'teacher';
    const isStudent = userType === 'student';

    // Handle timetable edit permissions
    const timetableEditSection = document.querySelector('.bg-blue-50');
    if (isStudent) {
        timetableEditSection.classList.add('hidden');
    }

    // Handle attendance tracking
    const attendanceSection = document.querySelector('.attendance-section');
    if (attendanceSection) {
        if (isTeacher) {
            attendanceSection.classList.remove('hidden');
        } else {
            attendanceSection.classList.add('hidden');
        }
    }

    // Load appropriate content
    loadTimetable();
    loadChatHistory();
    loadResourceStatus();
    loadAnnouncements();
    if (isStudent) {
        loadStudentAttendance();
    }
}

// Enhanced timetable functions
function addClass() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.type === 'student') {
        showNotification('Only teachers and admins can modify the timetable');
        return;
    }

    const time = document.getElementById('time-input').value;
    const day = document.getElementById('day-input').value;
    const subject = document.getElementById('subject-input').value;
    const row = parseInt(document.getElementById('row-input').value) || 1;

    if (!time || !subject) {
        showNotification('Please fill in all fields');
        return;
    }

    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
    const dayIndex = days.indexOf(day) + 1;
    const tableRow = document.getElementById('timetable-body').rows[row-1];
    
    if (tableRow) {
        tableRow.cells[0].textContent = time;
        tableRow.cells[dayIndex].textContent = subject;
        showNotification('Timetable Updated!');
        saveTimetable();
    }
}

// Student attendance view
function loadStudentAttendance() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const attendanceData = JSON.parse(localStorage.getItem('attendanceData') || '{}');
    const userAttendance = attendanceData[user.username] || [];
    
    // Create attendance view section if it doesn't exist
    let attendanceView = document.getElementById('student-attendance-view');
    if (!attendanceView) {
        attendanceView = document.createElement('div');
        attendanceView.id = 'student-attendance-view';
        attendanceView.className = 'bg-white rounded-xl shadow-md p-6 mb-8';
        attendanceView.innerHTML = `
            <h3 class="text-2xl font-bold mb-4 text-blue-700">My Attendance</h3>
            <div class="attendance-summary mb-4">
                <p>Total Classes: <span id="total-classes">0</span></p>
                <p>Present: <span id="present-count">0</span></p>
                <p>Absent: <span id="absent-count">0</span></p>
            </div>
            <div class="attendance-history">
                <h4 class="font-bold mb-2">Attendance History</h4>
                <ul id="attendance-list" class="list-disc ml-6"></ul>
            </div>
        `;
        document.getElementById('dashboard-section').insertBefore(
            attendanceView,
            document.querySelector('.announcements-section')
        );
    }

    // Update attendance statistics
    let presentCount = 0;
    let absentCount = 0;
    const attendanceList = document.getElementById('attendance-list');
    attendanceList.innerHTML = '';

    userAttendance.forEach(record => {
        if (record.status === 'Present') presentCount++;
        else if (record.status === 'Absent') absentCount++;

        const li = document.createElement('li');
        li.textContent = `${record.date}: ${record.status}`;
        attendanceList.appendChild(li);
    });

    document.getElementById('total-classes').textContent = userAttendance.length;
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('absent-count').textContent = absentCount;
}

// Enhanced announcements
function addAnnouncement() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.type === 'student') {
        showNotification('Only teachers and admins can add announcements');
        return;
    }

    const text = document.getElementById('announcement-input').value;
    if (text.trim() !== '') {
        const announcement = {
            text: text,
            timestamp: new Date().toISOString(),
            author: user.name
        };

        const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
        announcements.unshift(announcement);
        localStorage.setItem('announcements', JSON.stringify(announcements));

        loadAnnouncements();
        document.getElementById('announcement-input').value = '';
        showNotification('New Announcement Added!');
    }
}

function loadAnnouncements() {
    const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
    const announcementsList = document.getElementById('announcements');
    announcementsList.innerHTML = '';

    announcements.forEach(announcement => {
        const li = document.createElement('li');
        const date = new Date(announcement.timestamp).toLocaleString();
        li.innerHTML = `
            <div class="announcement-item mb-2">
                <p class="text-gray-900">${announcement.text}</p>
                <p class="text-sm text-gray-600">Posted by ${announcement.author} on ${date}</p>
            </div>
        `;
        announcementsList.appendChild(li);
    });
}

// Initialize dashboard components
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
        setupDashboardByRole(user.type);
    }
});