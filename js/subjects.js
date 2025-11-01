// Subjects Management
let subjects = [];

function addSubject(subject) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.type !== 'teacher' && currentUser.type !== 'admin') {
        showNotification('Only teachers and admins can add subjects', 'error');
        return;
    }

    // Get existing subjects
    subjects = safeGetItem('subjects', []);
    
    // Check if subject already exists
    if (subjects.find(s => s.code.toLowerCase() === subject.code.toLowerCase())) {
        showNotification('Subject code already exists', 'error');
        return;
    }

    subject.id = Date.now();
    subject.createdAt = new Date().toISOString();
    subjects.push(subject);
    safeSetItem('subjects', subjects);
    
    renderSubjects();
    showNotification('Subject added successfully');
}

function deleteSubject(code) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.type !== 'teacher' && currentUser.type !== 'admin') {
        showNotification('Only teachers and admins can delete subjects', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this subject?')) {
        return;
    }

    subjects = safeGetItem('subjects', []);
    subjects = subjects.filter(s => s.code !== code);
    safeSetItem('subjects', subjects);
    
    // Clean up related attendance data
    localStorage.removeItem(`students_${code}`);
    localStorage.removeItem(`attendance_${code}`);
    
    renderSubjects();
    showNotification('Subject deleted successfully');
}

function renderSubjects() {
    const subjectsDiv = document.getElementById('subjects-section');
    if (!subjectsDiv) return;

    const subjects = safeGetItem('subjects', []);
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isTeacherOrAdmin = currentUser.type === 'teacher' || currentUser.type === 'admin';

    subjectsDiv.innerHTML = `
        ${isTeacherOrAdmin ? `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Quick Add Subject -->
                <div class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-purple-100">
                    <h4 class="text-xl font-bold mb-4 text-purple-600 flex items-center">
                        <span class="mr-2">📚</span>
                        Quick Add Subject
                    </h4>
                    <div class="space-y-4">
                        <div class="flex flex-col">
                            <label for="subject-name" class="text-sm text-gray-600 mb-1">Subject Name *</label>
                            <input type="text" id="subject-name" placeholder="Enter subject name" 
                                class="border p-2 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col">
                                <label for="subject-code" class="text-sm text-gray-600 mb-1">Subject Code *</label>
                                <input type="text" id="subject-code" placeholder="e.g. CS101" 
                                    class="border p-2 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500" maxlength="10">
                            </div>
                            <div class="flex flex-col">
                                <label for="subject-semester" class="text-sm text-gray-600 mb-1">Semester *</label>
                                <select id="subject-semester" class="border p-2 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500">
                                    <option value="">Select Semester</option>
                                    <option value="1">Semester 1</option>
                                    <option value="2">Semester 2</option>
                                    <option value="3">Semester 3</option>
                                    <option value="4">Semester 4</option>
                                    <option value="5">Semester 5</option>
                                    <option value="6">Semester 6</option>
                                    <option value="7">Semester 7</option>
                                    <option value="8">Semester 8</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex flex-col">
                            <label for="subject-description" class="text-sm text-gray-600 mb-1">Description (Optional)</label>
                            <textarea id="subject-description" placeholder="Enter subject description" 
                                class="border p-2 rounded w-full focus:border-purple-500 focus:ring-1 focus:ring-purple-500" rows="2"></textarea>
                        </div>
                        <button onclick="handleAddSubject()" 
                            class="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors duration-300 flex items-center justify-center">
                            <span class="mr-2">📝</span>
                            Add Subject
                        </button>
                    </div>
                </div>

                <!-- Bulk Import -->
                <div class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-purple-100">
                    <h4 class="text-xl font-bold mb-4 text-purple-600 flex items-center">
                        <span class="mr-2">📥</span>
                        Bulk Import
                    </h4>
                    <div class="bg-purple-50 p-4 rounded-lg mb-4">
                        <p class="text-sm text-purple-800">
                            <span class="font-bold">Format (one per line):</span><br/>
                            Subject Name | Code | Semester<br/>
                            <span class="text-purple-600 mt-2 block">Example:<br/>Computer Programming | CS101 | 1<br/>Data Structures<br/>Operating Systems | OS202 | 3</span>
                        </p>
                    </div>
                    <textarea id="bulk-subjects" rows="6" 
                        class="border p-2 rounded w-full mb-4 focus:border-purple-500 focus:ring-1 focus:ring-purple-500" 
                        placeholder="Paste your subjects here, one per line..."></textarea>
                    <div class="flex gap-2">
                        <button onclick="bulkAddSubjects()" 
                            class="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors duration-300 flex items-center justify-center">
                            <span class="mr-2">📥</span>
                            Import Subjects
                        </button>
                        <button onclick="bulkImportAndGenerate()" 
                            class="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors duration-300 flex items-center justify-center">
                            <span class="mr-2">✨</span>
                            Import & Generate Timetable
                        </button>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <div class="subjects-list">
            <h4 class="font-bold mb-4 text-lg">All Subjects</h4>
            ${subjects.length === 0 ? `
                <div class="text-center p-8 bg-purple-50 rounded-lg">
                    <p class="text-purple-600 mb-2">No subjects available yet</p>
                    ${isTeacherOrAdmin ? `
                        <p class="text-sm text-gray-600">Use the form above to add subjects or import them in bulk</p>
                    ` : ''}
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${subjects.map(subject => `
                        <div class="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-purple-100">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h5 class="font-bold text-purple-600">${sanitizeInput(subject.name)}</h5>
                                    <p class="text-sm text-purple-500">Code: ${sanitizeInput(subject.code)}</p>
                                    <p class="text-sm text-gray-600">Semester: ${subject.semester}</p>
                                    ${subject.description ? `
                                        <p class="text-gray-700 mt-2 text-sm">${sanitizeInput(subject.description)}</p>
                                    ` : ''}
                                </div>
                                ${isTeacherOrAdmin ? `
                                    <button onclick="deleteSubject('${subject.code}')" 
                                        class="text-red-500 hover:text-red-700 transition-colors duration-300">
                                        <span class="text-xl">🗑️</span>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function handleAddSubject() {
    const name = document.getElementById('subject-name').value.trim();
    const code = document.getElementById('subject-code').value.trim().toUpperCase(); // Convert to uppercase for consistency
    const semester = document.getElementById('subject-semester').value;
    const description = document.getElementById('subject-description').value.trim();

    if (!name || !code || !semester) {
        showNotification('Please fill required fields', 'error');
        return;
    }

    // Validate subject code format
    if (!/^[A-Z0-9]{3,10}$/.test(code)) {
        showNotification('Subject code must be 3-10 characters long and contain only letters and numbers', 'error');
        return;
    }

    addSubject({
        name,
        code,
        semester,
        description
    });

    // Clear inputs
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-code').value = '';
    document.getElementById('subject-description').value = '';
    document.getElementById('subject-semester').value = '';
}

// Parse a single line into a subject object. Supported formats:
// - "Name | CODE | Semester"
// - "Name - CODE - Semester"
// - "Name" (code will be autogenerated, semester defaults to 1)
function parseSubjectLine(line, index) {
    const raw = line.trim();
    if (!raw) return null;

    // Try pipe-separated
    let parts = raw.split('|').map(p => p.trim()).filter(p => p !== '');
    if (parts.length === 0) return null;

    let name = parts[0];
    let code = '';
    let semester = '1';

    if (parts.length >= 2) {
        code = parts[1].toUpperCase();
    }
    if (parts.length >= 3) {
        semester = parts[2];
    }

    // If no pipe, try dash
    if (!code && raw.indexOf('-') !== -1) {
        parts = raw.split('-').map(p => p.trim()).filter(p => p !== '');
        if (parts.length >= 2) {
            name = parts[0];
            code = parts[1].toUpperCase();
            if (parts.length >= 3) semester = parts[2];
        }
    }

    // If still no code, auto-generate from name
    if (!code) {
        const letters = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const prefix = letters.substring(0, 3) || 'SUB';
        code = prefix + String(100 + index);
    }

    // Sanitize semester
    if (!/^[0-9]+$/.test(String(semester))) semester = '1';

    return {
        name: name,
        code: code,
        semester: String(semester),
        description: ''
    };
}

// Bulk add subjects from the textarea
function bulkAddSubjects() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser.type !== 'teacher' && currentUser.type !== 'admin') {
        showNotification('Only teachers and admins can import subjects', 'error');
        return;
    }

    const raw = document.getElementById('bulk-subjects').value || '';
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) {
        showNotification('Please paste at least one subject line', 'error');
        return;
    }

    const existing = safeGetItem('subjects', []);
    let added = 0;
    lines.forEach((line, idx) => {
        const subj = parseSubjectLine(line, idx + 1);
        if (!subj) return;
        // Check duplicate by code
        if (existing.find(s => s.code.toUpperCase() === subj.code.toUpperCase())) return;
        subj.id = Date.now() + idx;
        subj.createdAt = new Date().toISOString();
        existing.push(subj);
        added++;
    });

    safeSetItem('subjects', existing);
    renderSubjects();
    showNotification(`${added} subject(s) imported`);

    // Clear the textarea
    document.getElementById('bulk-subjects').value = '';
}

// Import subjects and immediately generate AI timetable (5-day week)
function bulkImportAndGenerate() {
    bulkAddSubjects();
    // After import, call existing generateAITimetable from timetable.js
    try {
        // Wait a tick for storage update
        setTimeout(() => {
            if (typeof generateAITimetable === 'function') {
                generateAITimetable();
            } else if (AI && typeof AI.generateTimetable === 'function') {
                // Fallback: call AI directly and save
                const subjects = safeGetItem('subjects', []);
                const timetable = AI.generateTimetable(subjects, { maxClassesPerDay: 4, lunchBreak: '13:00' });
                localStorage.setItem('timetableData', JSON.stringify(timetable));
                if (typeof renderTimetable === 'function') renderTimetable();
                showNotification('AI timetable generated successfully!');
            }
        }, 150);
    } catch (e) {
        console.error('Error generating timetable after import', e);
        showNotification('Imported subjects but timetable generation failed', 'warning');
    }
}

// Initialize subjects list on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('subjects-section')) {
        renderSubjects();
    }
});