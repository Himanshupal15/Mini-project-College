// Assignments Management
const AssignmentsManager = {
    getAssignments() {
        return safeGetItem('assignments', []);
    },

    setAssignments(assignments) {
        return safeSetItem('assignments', assignments);
    }
};

function addAssignment(assignment) {
    const user = safeGetItem('currentUser');
    if (!checkPermission('teacher')) {
        showNotification('Only teachers and admins can add assignments', 'error');
        return;
    }

    assignment.id = Date.now();
    assignment.createdBy = user.name;
    assignment.createdAt = new Date().toISOString();
    assignment.submissions = [];
    
    const assignments = AssignmentsManager.getAssignments();
    assignments.push(assignment);
    AssignmentsManager.setAssignments(assignments);
    
    renderAssignments();
    showNotification('Assignment added successfully');
}

// Helper: read FileList to array of {name,type,dataUrl}
// Attachment validation / reading
const ASSIGNMENT_ALLOWED_MIME = [
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation' // pptx
];
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per file

/**
 * Read files into data URLs with validation.
 * Returns { files: [{name,type,data}], skipped: [{name,reason}] }
 */
function readFilesAsDataURLs(fileList) {
    const files = Array.from(fileList || []);
    const readPromises = [];
    const skipped = [];

    files.forEach(file => {
        // Validate size
        if (file.size > MAX_ATTACHMENT_SIZE) {
            skipped.push({ name: file.name, reason: 'File too large (>5MB)' });
            return;
        }

        // Validate MIME type where possible
        if (file.type && ASSIGNMENT_ALLOWED_MIME.indexOf(file.type) === -1) {
            // allow some common types by extension fallback
            const nameLower = file.name.toLowerCase();
            if (!(nameLower.endsWith('.pdf') || nameLower.endsWith('.doc') || nameLower.endsWith('.docx') || nameLower.endsWith('.xls') || nameLower.endsWith('.xlsx') || nameLower.endsWith('.csv') || nameLower.endsWith('.ppt') || nameLower.endsWith('.pptx') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.gif') || nameLower.endsWith('.webp'))) {
                skipped.push({ name: file.name, reason: 'Unsupported file type' });
                return;
            }
        }

        // Passed basic validation - read it
        const p = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, type: file.type || '', data: reader.result });
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsDataURL(file);
        });
        readPromises.push(p);
    });

    return Promise.all(readPromises).then(results => ({ files: results, skipped }));
}

// Optionally upload files to server instead of storing base64 locally
const USE_SERVER_UPLOAD = true; // set to false to keep storing data URLs in localStorage
const SERVER_UPLOAD_URL = 'http://localhost:3001/upload';

function validateFiles(fileList) {
    const files = Array.from(fileList || []);
    const valid = [];
    const skipped = [];
    files.forEach(file => {
        if (file.size > MAX_ATTACHMENT_SIZE) {
            skipped.push({ name: file.name, reason: 'File too large (>5MB)' });
            return;
        }
        if (file.type && ASSIGNMENT_ALLOWED_MIME.indexOf(file.type) === -1) {
            const nameLower = file.name.toLowerCase();
            if (!(nameLower.endsWith('.pdf') || nameLower.endsWith('.doc') || nameLower.endsWith('.docx') || nameLower.endsWith('.xls') || nameLower.endsWith('.xlsx') || nameLower.endsWith('.csv') || nameLower.endsWith('.ppt') || nameLower.endsWith('.pptx') || nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.gif') || nameLower.endsWith('.webp'))) {
                skipped.push({ name: file.name, reason: 'Unsupported file type' });
                return;
            }
        }
        valid.push(file);
    });
    return { valid, skipped };
}

async function uploadFilesToServer(fileList) {
    const { valid, skipped } = validateFiles(fileList);
    if (valid.length === 0) return { files: [], skipped };

    const fd = new FormData();
    valid.forEach(f => fd.append('files', f));

    try {
        const resp = await fetch(SERVER_UPLOAD_URL, { method: 'POST', body: fd });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => resp.statusText || '');
            console.error('Upload server error', resp.status, txt);
            return { files: [], skipped, error: `Upload failed: ${resp.status} ${resp.statusText}` };
        }
        const body = await resp.json();
        // body.files: [{name,type,url}]
        return { files: body.files, skipped };
    } catch (err) {
        console.error('Upload request failed', err);
        return { files: [], skipped, error: err.message || 'Network error' };
    }
}

function submitAssignment(assignmentId, submissionData) {
    const user = safeGetItem('currentUser');
    if (user.type !== 'student') {
        showNotification('Only students can submit assignments', 'error');
        return;
    }

    const assignments = AssignmentsManager.getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) {
        showNotification('Assignment not found', 'error');
        return;
    }

    // Check if deadline has passed
    if (new Date(assignment.deadline) < new Date()) {
        showNotification('Assignment deadline has passed', 'error');
        return;
    }

    // Check for existing submission
    const existingSubmission = assignment.submissions.find(s => s.studentName === user.name);
    if (existingSubmission) {
        existingSubmission.content = submissionData.content;
        if (submissionData.attachments && submissionData.attachments.length) {
            existingSubmission.attachments = (existingSubmission.attachments || []).concat(submissionData.attachments);
        }
        existingSubmission.updatedAt = new Date().toISOString();
    } else {
        assignment.submissions.push({
            studentName: user.name,
            content: submissionData.content,
            attachments: submissionData.attachments || [],
            submittedAt: new Date().toISOString()
        });
    }

    AssignmentsManager.setAssignments(assignments);
    renderAssignments();
    showNotification('Assignment submitted successfully');
}

function renderAssignments() {
    const assignmentsDiv = document.getElementById('assignments-section');
    if (!assignmentsDiv) return;

    const assignments = AssignmentsManager.getAssignments();
    const user = safeGetItem('currentUser');
    const isTeacher = checkPermission('teacher');

    assignmentsDiv.innerHTML = `
        ${isTeacher ? `
            <div class="mb-4">
                <h4 class="font-bold mb-2">Add New Assignment</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    <input type="text" id="assignment-title" placeholder="Assignment Title" class="border p-2 rounded">
                    <input type="datetime-local" id="assignment-deadline" class="border p-2 rounded">
                </div>
                <textarea id="assignment-description" placeholder="Assignment Description" 
                    class="border p-2 rounded w-full mb-2" rows="3"></textarea>
                <div class="flex items-center gap-3">
                    <input id="assignment-files" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xlsx,.csv" class="border p-2 rounded" />
                    <button onclick="handleAddAssignment()" 
                        class="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
                        Add Assignment
                    </button>
                    <small class="text-xs text-gray-500">Allowed: images, pdf, docx, xlsx — max 5MB per file (files are stored locally)</small>
                </div>
            </div>
        ` : ''}
        
        <div class="assignments-list">
            <h4 class="font-bold mb-2">
                ${isTeacher ? 'All Assignments' : 'Your Assignments'}
            </h4>
            ${assignments.length === 0 ? '<p class="text-gray-500">No assignments available</p>' : ''}
            <div class="space-y-4">
                ${assignments.map(assignment => `
                    <div class="bg-white p-4 rounded-lg shadow">
                        <div class="flex justify-between items-start">
                            <div>
                                <h5 class="font-bold">${sanitizeInput(assignment.title)}</h5>
                                <p class="text-sm text-gray-600">
                                    Due: ${formatDate(assignment.deadline)} at ${formatTime(assignment.deadline)}
                                </p>
                                <p class="text-xs text-gray-500">
                                    Posted by ${sanitizeInput(assignment.createdBy)}
                                </p>
                            </div>
                            ${isTeacher ? `
                                <button onclick="viewSubmissions(${assignment.id})" 
                                    class="bg-blue-100 text-blue-700 px-3 py-1 rounded">
                                    View Submissions (${assignment.submissions.length})
                                </button>
                            ` : ''}
                        </div>
                        <div class="mt-2">
                            <p class="text-gray-700">${sanitizeInput(assignment.description)}</p>
                            ${assignment.attachments && assignment.attachments.length > 0 ? `
                                <div class="mt-3 space-y-2">
                                    <strong class="text-sm">Attachments:</strong>
                                    ${assignment.attachments.map(att => `
                                        <div class="flex items-center gap-3">
                                            ${att.type.startsWith('image/') ? `
                                                <img src="${att.data}" alt="${sanitizeInput(att.name)}" class="w-24 h-16 object-cover rounded border"/>
                                            ` : `
                                                <i class="fas fa-file mr-2 text-gray-600"></i>
                                            `}
                                            <a href="${att.data}" download="${sanitizeInput(att.name)}" class="text-sm text-blue-600 underline">${sanitizeInput(att.name)}</a>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        ${!isTeacher ? `
                            <div class="mt-4">
                                <textarea id="submission-${assignment.id}" 
                                    placeholder="Your submission" 
                                    class="border p-2 rounded w-full" rows="3"
                                    ${new Date(assignment.deadline) < new Date() ? 'disabled' : ''}
                                ></textarea>
                                <div class="flex items-center gap-3 mt-2">
                                    <input id="submission-files-${assignment.id}" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xlsx,.csv" />
                                    <button onclick="handleSubmitAssignment(${assignment.id})" 
                                        class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                        ${new Date(assignment.deadline) < new Date() ? 'disabled' : ''}>
                                        Submit Assignment
                                    </button>
                                </div>
                                <small class="text-xs text-gray-500">You can attach images or documents with your submission.</small>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function handleAddAssignment() {
    (async function(){
        const title = document.getElementById('assignment-title').value.trim();
        const deadline = document.getElementById('assignment-deadline').value;
        const description = document.getElementById('assignment-description').value.trim();
        const fileInput = document.getElementById('assignment-files');

        if (!title || !deadline || !description) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        let attachments = [];
        try {
            if (USE_SERVER_UPLOAD) {
                const res = await uploadFilesToServer(fileInput ? fileInput.files : []);
                if (res.error) {
                    // server upload failed — fall back to reading base64 locally
                    console.warn('Server upload failed, falling back to base64:', res.error);
                    showNotification('Upload server unavailable, saving attachments locally instead', 'warning');
                    const fallback = await readFilesAsDataURLs(fileInput ? fileInput.files : []);
                    attachments = fallback.files;
                    if (fallback.skipped && fallback.skipped.length) {
                        const names = fallback.skipped.map(s => `${s.name} (${s.reason})`).join(', ');
                        showNotification(`Some files were skipped: ${names}`, 'warning');
                    }
                } else {
                    // map server response to internal format: {name,type,data}
                    attachments = (res.files || []).map(f => ({ name: f.name, type: f.type, data: f.url }));
                    if (res.skipped && res.skipped.length) {
                        const names = res.skipped.map(s => `${s.name} (${s.reason})`).join(', ');
                        showNotification(`Some files were skipped: ${names}`, 'warning');
                    }
                }
            } else {
                const result = await readFilesAsDataURLs(fileInput ? fileInput.files : []);
                attachments = result.files;
                if (result.skipped && result.skipped.length) {
                    const names = result.skipped.map(s => `${s.name} (${s.reason})`).join(', ');
                    showNotification(`Some files were skipped: ${names}`, 'warning');
                }
            }
        } catch (e) {
            console.error('Failed to process assignment files', e);
            showNotification('Failed to process attachment files', 'error');
            return;
        }

        addAssignment({
            title,
            deadline,
            description,
            attachments
        });

        // Clear inputs
        document.getElementById('assignment-title').value = '';
        document.getElementById('assignment-deadline').value = '';
        document.getElementById('assignment-description').value = '';
        if (fileInput) fileInput.value = '';
    })();
}

function handleSubmitAssignment(assignmentId) {
    (async function(){
        const textarea = document.getElementById(`submission-${assignmentId}`);
        const filesInput = document.getElementById(`submission-files-${assignmentId}`);
        const content = textarea ? textarea.value.trim() : '';

        if (!content && (!filesInput || filesInput.files.length === 0)) {
            showNotification('Please enter your submission or attach files', 'error');
            return;
        }

        let attachments = [];
        try {
            if (USE_SERVER_UPLOAD) {
                const res = await uploadFilesToServer(filesInput ? filesInput.files : []);
                if (res.error) {
                    console.warn('Server upload failed, falling back to base64 for submission:', res.error);
                    showNotification('Upload server unavailable, attaching files locally instead', 'warning');
                    const fallback = await readFilesAsDataURLs(filesInput ? filesInput.files : []);
                    attachments = fallback.files;
                    if (fallback.skipped && fallback.skipped.length) {
                        const names = fallback.skipped.map(s => `${s.name} (${s.reason})`).join(', ');
                        showNotification(`Some files were skipped: ${names}`, 'warning');
                    }
                } else {
                    attachments = (res.files || []).map(f => ({ name: f.name, type: f.type, data: f.url }));
                    if (res.skipped && res.skipped.length) {
                        const names = res.skipped.map(s => `${s.name} (${s.reason})`).join(', ');
                        showNotification(`Some files were skipped: ${names}`, 'warning');
                    }
                }
            } else {
                const result = await readFilesAsDataURLs(filesInput ? filesInput.files : []);
                attachments = result.files;
                if (result.skipped && result.skipped.length) {
                    const names = result.skipped.map(s => `${s.name} (${s.reason})`).join(', ');
                    showNotification(`Some files were skipped: ${names}`, 'warning');
                }
            }
        } catch (e) {
            console.error('Failed to process submission files', e);
            showNotification('Failed to read attached files', 'error');
            return;
        }

        submitAssignment(assignmentId, { content, attachments });

        if (textarea) textarea.value = '';
        if (filesInput) filesInput.value = '';
    })();
}

function viewSubmissions(assignmentId) {
    const assignments = AssignmentsManager.getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) {
        showNotification('Assignment not found', 'error');
        return;
    }

    // Create modal for submissions
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">Submissions for: ${sanitizeInput(assignment.title)}</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="text-gray-500 hover:text-gray-700">
                    ✕
                </button>
            </div>
            ${assignment.submissions.length === 0 ? 
                '<p class="text-gray-500">No submissions yet</p>' :
                `<div class="space-y-4">
                    ${assignment.submissions.map(sub => `
                        <div class="border p-3 rounded">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-bold">${sanitizeInput(sub.studentName)}</h4>
                                <span class="text-sm text-gray-500">
                                    Submitted: ${formatDate(sub.submittedAt)} ${formatTime(sub.submittedAt)}
                                </span>
                            </div>
                            <p class="text-gray-700 whitespace-pre-wrap">${sanitizeInput(sub.content || '')}</p>
                            ${sub.attachments && sub.attachments.length ? `
                                <div class="mt-3 space-y-2">
                                    <strong class="text-sm">Submission Attachments:</strong>
                                    ${sub.attachments.map(att => `
                                        <div class="flex items-center gap-3">
                                            ${att.type.startsWith('image/') ? `
                                                <img src="${att.data}" alt="${sanitizeInput(att.name)}" class="w-24 h-16 object-cover rounded border"/>
                                            ` : `
                                                <i class="fas fa-file mr-2 text-gray-600"></i>
                                            `}
                                            <a href="${att.data}" download="${sanitizeInput(att.name)}" class="text-sm text-blue-600 underline">${sanitizeInput(att.name)}</a>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>`
            }
        </div>
    `;
    document.body.appendChild(modal);
}

// Initialize assignments on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('assignments-section')) {
        renderAssignments();
    }
});