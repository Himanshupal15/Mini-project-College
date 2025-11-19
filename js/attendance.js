// Attendance Management
let students = [];
let attendance = {};
let currentSubject = null; // Track current subject for attendance

function addStudent() {
    const studentInput = document.getElementById('student-name');
    if (!studentInput) return;

    const name = studentInput.value.trim();
    if (!name) {
        showNotification('Please enter a student name', 'error');
        return;
    }

    // Get registered students from Datastore
    const registeredStudents = Datastore.getUsers(user => user.type === 'student');
    
    // Check if the student is registered
    const studentExists = registeredStudents.find(s => 
        s.username.toLowerCase() === name.toLowerCase() || 
        (s.name && s.name.toLowerCase() === name.toLowerCase())
    );

    if (!studentExists) {
        showNotification('Student is not registered in the system', 'error');
        return;
    }

    // Use the official name from registration
    const studentName = studentExists.name || studentExists.username;

    // Check for duplicate in attendance
    if (students.includes(studentName)) {
        showNotification('Student is already in the attendance list', 'error');
        studentInput.value = '';
        return;
    }

    // Add student to attendance
    students.push(studentName);
    attendance[studentName] = 'Not Marked';

    // Update UI and save
    updateAttendanceTable();
    saveAttendanceData();
    
    // Clear input
    studentInput.value = '';
    showNotification('Student added to attendance list');
}

function updateAttendanceTable() {
    const attendanceBody = document.getElementById('attendance-body');
    if (!attendanceBody) return;
    
    // Update subject selector
    const subjectSelect = document.getElementById('subject-select');
    if (subjectSelect) {
        const subjects = safeGetItem('subjects', []);
        subjectSelect.innerHTML = `
            <option value="">Choose a subject</option>
            ${subjects.map(s => `
                <option value="${s.code}" ${currentSubject === s.code ? 'selected' : ''}>
                    ${s.name} (${s.code})
                </option>
            `).join('')}
        `;
    }

    // Show message if no subject selected
    if (!currentSubject) {
        attendanceBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-8 text-gray-500">
                    Please select a subject and date to manage attendance
                </td>
            </tr>
        `;
        return;
    }

    // Clear existing rows
    attendanceBody.innerHTML = '';
    
    if (students.length === 0) {
        attendanceBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-8 text-gray-500">
                    No students added yet. Use the form above to add students.
                </td>
            </tr>
        `;
        return;
    }

    // Add student rows
    students.forEach(student => {
        const status = attendance[student];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="border px-4 py-2">${student}</td>
            <td class="border px-4 py-2 text-center">
                <button onclick="markAttendance('${student}', 'Present')" 
                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors duration-300 ${
                        status === 'Present' ? 'ring-2 ring-green-300' : ''
                    }">
                    Present
                </button>
            </td>
            <td class="border px-4 py-2 text-center">
                <button onclick="markAttendance('${student}', 'Absent')" 
                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors duration-300 ${
                        status === 'Absent' ? 'ring-2 ring-red-300' : ''
                    }">
                    Absent
                </button>
            </td>
            <td id="status-${student}" class="border px-4 py-2 text-center font-semibold ${
                status === 'Present' ? 'text-green-600' : 
                status === 'Absent' ? 'text-red-600' : 
                'text-gray-600'
            }">
                ${status}
            </td>
        `;
        attendanceBody.appendChild(row);
    });

    updateAttendanceSummary();
}

function markAttendance(student, status) {
    attendance[student] = status;
    
    // Update status cell
    const statusCell = document.getElementById(`status-${student}`);
    if (statusCell) {
        statusCell.textContent = status;
        statusCell.className = `border px-4 py-2 text-center font-semibold ${
            status === 'Present' ? 'text-green-600' : 
            status === 'Absent' ? 'text-red-600' : 
            'text-gray-600'
        }`;
    }
    
    updateAttendanceSummary();
    saveAttendanceData();
}

function updateAttendanceSummary() {
    let presentCount = 0;
    let absentCount = 0;

    for (const student in attendance) {
        if (attendance[student] === "Present") presentCount++;
        if (attendance[student] === "Absent") absentCount++;
    }

    // Update counters in UI
    const totalPresentElem = document.getElementById('total-present');
    const totalAbsentElem = document.getElementById('total-absent');
    
    if (totalPresentElem) totalPresentElem.textContent = presentCount;
    if (totalAbsentElem) totalAbsentElem.textContent = absentCount;

    // Save daily attendance record
    const dateInput = document.getElementById('attendance-date');
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    if (currentSubject && date) {
        const attendanceHistory = safeGetItem('attendanceHistory', {});
        const key = `${currentSubject}_${date}`;
        attendanceHistory[key] = {
            subject: currentSubject,
            date: date,
            summary: {
                total: students.length,
                present: presentCount,
                absent: absentCount,
                notMarked: students.length - (presentCount + absentCount)
            },
            records: {...attendance}
        };
        safeSetItem('attendanceHistory', attendanceHistory);
    }
}

function loadAttendanceSheet() {
    const subjectSelect = document.getElementById('subject-select');
    const dateInput = document.getElementById('attendance-date');
    
    if (!subjectSelect || !dateInput) return;
    
    const subject = subjectSelect.value;
    const date = dateInput.value;
    
    // If date is missing, default to today
    if (!date) {
        const today = new Date().toISOString().split('T')[0];
        if (dateInput) dateInput.value = today;
    }

    if (!subject) {
        showNotification('Please select a subject', 'error');
        return;
    }

    // Load existing attendance data
    const attendanceHistory = safeGetItem('attendanceHistory', {});
    const key = `${subject}_${date}`;
    const existingData = attendanceHistory[key];

    if (existingData) {
        currentSubject = subject;
        students = Object.keys(existingData.records);
        attendance = {...existingData.records};
    } else {
        currentSubject = subject;
        students = [];
        attendance = {};
    }

    updateAttendanceTable();
    showNotification('Attendance sheet loaded');
}

function saveAttendanceData() {
    if (!currentSubject) return;
    
    const dateInput = document.getElementById('attendance-date');
    if (!dateInput || !dateInput.value) return;

    const key = `attendance_${currentSubject}_${dateInput.value}`;
    safeSetItem(key, {
        students: students,
        attendance: attendance
    });
}

function saveAttendance() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user.type !== 'teacher' && user.type !== 'admin') {
        showNotification('Only teachers can save attendance', 'error');
        return;
    }

    const notMarkedStudents = students.filter(student => attendance[student] === 'Not Marked');
    if (notMarkedStudents.length > 0) {
        if (!confirm(`${notMarkedStudents.length} student(s) are not marked. Continue anyway?`)) {
            return;
        }
    }

    saveAttendanceData();
    showNotification('Attendance saved successfully!');
}

// Initialize attendance system
function initAttendance() {
    // Set today's date by default
    const dateInput = document.getElementById('attendance-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.max = today; // Can't mark attendance for future dates
    }

    // Load subjects into dropdown
    const subjectSelect = document.getElementById('subject-select');
    if (subjectSelect) {
        const subjects = safeGetItem('subjects', []);
        subjectSelect.innerHTML = `
            <option value="">Choose a subject</option>
            ${subjects.map(s => `
                <option value="${s.code}">${s.name} (${s.code})</option>
            `).join('')}
        `;

        // Auto-load attendance when subject is chosen
        subjectSelect.addEventListener('change', () => {
            // If date empty, set to today
            const dateInput = document.getElementById('attendance-date');
            if (dateInput && !dateInput.value) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
            // Load the attendance sheet for the selected subject
            try { loadAttendanceSheet(); } catch (e) { console.warn('loadAttendanceSheet error', e); }
        });
    }

    // Initialize empty attendance sheet
    updateAttendanceTable();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAttendance);