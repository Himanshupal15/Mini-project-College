// Timetable Management
function addClass() {
    if (!checkPermission('teacher')) {
        showNotification('Only teachers can modify the timetable', 'error');
        return;
    }

    const time = document.getElementById('time-input').value;
    const day = document.getElementById('day-input').value;
    const subject = document.getElementById('subject-input').value;
    
    if (!time || !day || !subject) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    // Get current timetable data or initialize
    let timetableData = JSON.parse(localStorage.getItem('timetableData') || '[]');
    
    // Add new row if time slot doesn't exist
    let timeRow = timetableData.find(row => row.time === time);
    if (!timeRow) {
        timeRow = {
            time: time,
            Monday: 'Free',
            Tuesday: 'Free',
            Wednesday: 'Free',
            Thursday: 'Free',
            Friday: 'Free'
        };
        timetableData.push(timeRow);
    }
    
    // Update the class
    timeRow[day] = subject;
    
    // Sort by time
    timetableData.sort((a, b) => {
        const timeA = new Date('1970/01/01 ' + a.time);
        const timeB = new Date('1970/01/01 ' + b.time);
        return timeA - timeB;
    });
    
    // Save updated timetable
    localStorage.setItem('timetableData', JSON.stringify(timetableData));
    
    // Refresh display
    renderTimetable();
    showNotification('Class added successfully');
    
    // Clear inputs
    document.getElementById('time-input').value = '';
    document.getElementById('subject-input').value = '';
}

function renderTimetable() {
    const timetableBody = document.getElementById('timetable-body');
    if (!timetableBody) return;
    
    // Get saved timetable data
    const timetableData = JSON.parse(localStorage.getItem('timetableData') || '[]');
    
    // Clear current timetable
    timetableBody.innerHTML = '';
    
    // Render each row
    timetableData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="border border-purple-200 p-3">${row.time}</td>
            <td class="border border-purple-200 p-3 hover:bg-purple-50">${row.Monday}</td>
            <td class="border border-purple-200 p-3 hover:bg-purple-50">${row.Tuesday}</td>
            <td class="border border-purple-200 p-3 hover:bg-purple-50">${row.Wednesday}</td>
            <td class="border border-purple-200 p-3 hover:bg-purple-50">${row.Thursday}</td>
            <td class="border border-purple-200 p-3 hover:bg-purple-50">${row.Friday}</td>
        `;
        timetableBody.appendChild(tr);
    });
}

// AI Timetable Generation
function generateAITimetable() {
    if (!checkPermission('teacher')) {
        showNotification('Only teachers can generate timetables', 'error');
        return;
    }

    // Get subjects
    const subjects = safeGetItem('subjects', []);
    if (subjects.length === 0) {
        showNotification('Please add subjects first', 'warning');
        return;
    }

    // Generate timetable using AI
    const timetable = AI.generateTimetable(subjects, {
        maxClassesPerDay: 4,
        lunchBreak: '13:00',
        noRepeatSubjectSameDay: true
    });

    // Save generated timetable
    localStorage.setItem('timetableData', JSON.stringify(timetable));
    
    // Show success and render
    showNotification('AI timetable generated successfully! ✨');
    renderTimetable();
}

// Initialize timetable and attendance warnings
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('timetable-body')) {
        renderTimetable();
    }
    
    // Show attendance warnings for students below 60%
    if (checkPermission('teacher')) {
        AI.showAttendanceWarnings();
        // Refresh warnings every 30 minutes
        setInterval(() => AI.showAttendanceWarnings(), 30 * 60 * 1000);
    }
});