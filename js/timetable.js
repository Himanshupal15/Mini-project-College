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

// Populate the subject select in the timetable form with available subjects
function populateTimetableSubjectOptions() {
    try {
        const select = document.getElementById('subject-input');
        if (!select) return;

        // Only proceed if the element is a select
        if (select.tagName !== 'SELECT') return;

        const subjects = safeGetItem('subjects', []);

        // Clear existing options, keep the placeholder
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select subject';

        select.innerHTML = '';
        select.appendChild(placeholder);

        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.code || s.name;
            opt.textContent = s.name + (s.code ? ` (${s.code})` : '');
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn('populateTimetableSubjectOptions error', e);
    }
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

    // Populate subject options for timetable form (if present)
    try { populateTimetableSubjectOptions(); } catch (e) { /* ignore */ }
});

// Make available for other modules to call when subjects change
window.populateTimetableSubjectOptions = populateTimetableSubjectOptions;

// Reset the timetable (teachers/admins only)
function resetTimetable() {
    try {
        if (!checkPermission('teacher')) {
            showNotification('Only teachers and admins can reset the timetable', 'error');
            return;
        }

        if (!confirm('This will remove the entire timetable and cannot be undone. Continue?')) return;

        // Backup current timetable (if any) so we can undo
        try {
            const currentData = safeGetItem('timetableData', safeGetItem('timetable', []));
            safeSetItem('timetableBackup', { data: currentData, createdAt: new Date().toISOString() });
        } catch (e) {
            console.warn('Failed to create timetable backup', e);
        }

        localStorage.removeItem('timetableData');
        localStorage.removeItem('timetable');
        renderTimetable();
        showNotification('Timetable has been reset');

        // Show temporary Undo button next to Reset button for quick restore
        try {
            const resetBtn = document.getElementById('reset-timetable-btn');
            if (resetBtn && resetBtn.parentNode) {
                // Remove existing undo if present
                const existing = document.getElementById('undo-reset-btn');
                if (existing) existing.remove();

                const undo = document.createElement('button');
                undo.id = 'undo-reset-btn';
                undo.className = 'ml-2 bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 transition-colors duration-300';
                undo.textContent = 'Undo Reset';

                undo.addEventListener('click', () => {
                    try {
                        const bak = safeGetItem('timetableBackup', null);
                        if (bak && bak.data) {
                            safeSetItem('timetableData', bak.data);
                            // remove backup after restore
                            try { localStorage.removeItem('timetableBackup'); } catch (e) {}
                            renderTimetable();
                            showNotification('Timetable restored from backup');
                        } else {
                            showNotification('No backup available to restore', 'error');
                        }
                    } catch (e) {
                        console.error('Undo restore failed', e);
                        showNotification('Restore failed', 'error');
                    }

                    // cleanup undo button
                    try { undo.remove(); } catch (e) {}
                });

                resetBtn.parentNode.appendChild(undo);

                // Auto-remove undo option after 20 seconds and clear backup
                setTimeout(() => {
                    try { const u = document.getElementById('undo-reset-btn'); if (u) u.remove(); } catch (e) {}
                    try { localStorage.removeItem('timetableBackup'); } catch (e) {}
                }, 20000);
            }
        } catch (e) {
            console.warn('Failed to show undo button', e);
        }
    } catch (e) {
        console.error('resetTimetable error', e);
        showNotification('Failed to reset timetable', 'error');
    }
}

window.resetTimetable = resetTimetable;

// When a subject is chosen in the timetable form, sync it to the attendance subject selector
document.addEventListener('DOMContentLoaded', () => {
    try {
        const ttSelect = document.getElementById('subject-input');
        if (!ttSelect) return;

        ttSelect.addEventListener('change', () => {
            const selected = ttSelect.value;
            const attendanceSelect = document.getElementById('subject-select');
            if (attendanceSelect) {
                attendanceSelect.value = selected;
                // If attendance date empty, set to today
                const dateInput = document.getElementById('attendance-date');
                if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
                try { loadAttendanceSheet(); } catch (e) { /* ignore if attendance not loaded */ }
            }
        });
    } catch (e) {
        console.warn('timetable -> attendance sync failed', e);
    }
});