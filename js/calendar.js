// Calendar and Events Management
let events = [];

function addEvent(event) {
    const user = safeGetItem('currentUser');
    if (!checkPermission('teacher')) {
        showNotification('Only teachers and admins can add events', 'error');
        return;
    }

    event.id = Date.now();
    event.createdBy = user.name;
    event.createdAt = new Date().toISOString();
    
    events = safeGetItem('events', []);
    events.push(event);
    safeSetItem('events', events);
    
    renderCalendar();
    showNotification('Event added successfully');
}

function deleteEvent(eventId) {
    const user = safeGetItem('currentUser');
    if (!checkPermission('teacher')) {
        showNotification('Only teachers and admins can delete events', 'error');
        return;
    }

    events = events.filter(e => e.id !== eventId);
    safeSetItem('events', events);
    renderCalendar();
    showNotification('Event deleted successfully');
}

function renderCalendar() {
    const calendarDiv = document.getElementById('calendar-events');
    if (!calendarDiv) return;

    const events = safeGetItem('events', []);
    const today = new Date();
    const upcomingEvents = events
        .filter(e => new Date(e.date) >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    calendarDiv.innerHTML = `
        <div class="mb-4">
            <h4 class="font-bold mb-2">Add New Event</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="text" id="event-title" placeholder="Event Title" class="border p-2 rounded">
                <input type="datetime-local" id="event-date" class="border p-2 rounded">
                <button onclick="handleAddEvent()" class="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
                    Add Event
                </button>
            </div>
        </div>
        <div class="upcoming-events">
            <h4 class="font-bold mb-2">Upcoming Events</h4>
            ${upcomingEvents.length === 0 ? '<p class="text-gray-500">No upcoming events</p>' : ''}
            <div class="space-y-2">
                ${upcomingEvents.map(event => `
                    <div class="flex justify-between items-center bg-blue-50 p-3 rounded">
                        <div>
                            <h5 class="font-bold">${sanitizeInput(event.title)}</h5>
                            <p class="text-sm text-gray-600">
                                ${formatDate(event.date)} at ${formatTime(event.date)}
                            </p>
                            <p class="text-xs text-gray-500">Added by ${sanitizeInput(event.createdBy)}</p>
                        </div>
                        ${checkPermission('teacher') ? `
                            <button onclick="deleteEvent(${event.id})" 
                                class="text-red-600 hover:text-red-800">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function handleAddEvent() {
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;

    if (!title || !date) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    addEvent({
        title,
        date,
        type: 'general'
    });

    // Clear inputs
    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
}