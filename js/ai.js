// AI Features for Smart Classroom
const AI = {
    // AI Timetable Generation
    generateTimetable: function(subjects, constraints = {}) {
        if (!subjects || subjects.length === 0) {
            console.error('No subjects provided for timetable generation');
            return [];
        }

        const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        // Enhanced rules
        const rules = {
            maxClassesPerDay: 4,
            lunchBreak: '13:00',
            noRepeatSubjectSameDay: true,
            balanceSubjects: true, // Try to distribute subjects evenly
            preferMorningForCore: true, // Schedule important subjects in morning
            ...constraints
        };

        // Initialize timetable
        const timetable = [];
        const subjectFrequency = {};
        subjects.forEach(s => subjectFrequency[s.name] = 0);
        
        // Sort subjects by importance (lower semester = more important)
        const sortedSubjects = [...subjects].sort((a, b) => {
            const semA = parseInt(a.semester) || 1;
            const semB = parseInt(b.semester) || 1;
            return semA - semB;
        });

        // Generate slots with smart scheduling
        timeSlots.forEach(time => {
            const row = { time };
            const isMorning = parseInt(time) < 12;
            
            days.forEach(day => {
                // Handle lunch break
                if (time === rules.lunchBreak) {
                    row[day] = 'Lunch Break';
                    return;
                }

                // Get available subjects for this slot
                let availableSubjects = sortedSubjects.filter(s => {
                    // Skip if subject already used today
                    if (rules.noRepeatSubjectSameDay) {
                        const usedToday = timetable.some(r => r[day] === s.name);
                        if (usedToday) return false;
                    }

                    // Balance subject frequency
                    if (rules.balanceSubjects) {
                        const maxFreq = Math.min(3, Math.ceil(timeSlots.length * days.length / subjects.length));
                        if (subjectFrequency[s.name] >= maxFreq) return false;
                    }

                    return true;
                });

                // Prioritize core subjects in morning slots if enabled
                if (rules.preferMorningForCore && isMorning) {
                    availableSubjects.sort((a, b) => {
                        const semA = parseInt(a.semester) || 1;
                        const semB = parseInt(b.semester) || 1;
                        return semA - semB;
                    });
                }

                if (availableSubjects.length > 0) {
                    // Select subject with lowest frequency
                    availableSubjects.sort((a, b) => 
                        subjectFrequency[a.name] - subjectFrequency[b.name]
                    );
                    
                    const selected = availableSubjects[0];
                    row[day] = selected.name;
                    subjectFrequency[selected.name]++;
                } else {
                    row[day] = 'Free Period';
                }
            });
            timetable.push(row);
        });

        // Validate and balance timetable
        this.balanceTimetable(timetable, subjects);
        
        return timetable;
    },

    // Balance the timetable to ensure fair distribution
    balanceTimetable: function(timetable, subjects) {
        const frequency = {};
        subjects.forEach(s => frequency[s.name] = 0);

        // Count current frequency
        timetable.forEach(row => {
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
                if (frequency[row[day]] !== undefined) {
                    frequency[row[day]]++;
                }
            });
        });

        // Check if any subject is overused or underused
        const avgFrequency = Object.values(frequency).reduce((a, b) => a + b, 0) / subjects.length;
        const threshold = 2; // Maximum allowed deviation from average

        subjects.forEach(subject => {
            if (Math.abs(frequency[subject.name] - avgFrequency) > threshold) {
                // Subject needs rebalancing
                console.log(`Subject ${subject.name} needs rebalancing (${frequency[subject.name]} vs avg ${avgFrequency})`);
            }
        });
    },

    // Attendance Analysis
    analyzeAttendance: function() {
        const attendance = safeGetItem('attendance', []);
        const warnings = [];
        
        // Group attendance by student
        const studentAttendance = {};
        attendance.forEach(record => {
            if (!studentAttendance[record.studentName]) {
                studentAttendance[record.studentName] = {
                    present: 0,
                    total: 0
                };
            }
            studentAttendance[record.studentName].total++;
            if (record.status === 'present') {
                studentAttendance[record.studentName].present++;
            }
        });
        
        // Check attendance percentage and generate warnings
        Object.entries(studentAttendance).forEach(([student, data]) => {
            const percentage = (data.present / data.total) * 100;
            if (percentage < 60) {
                warnings.push({
                    student,
                    percentage: Math.round(percentage),
                    message: `Warning: ${student}'s attendance is ${Math.round(percentage)}% (below 60%)`
                });
            }
        });
        
        return warnings;
    },

    // Display warnings in UI
    showAttendanceWarnings: function() {
        const warnings = this.analyzeAttendance();
        const container = document.createElement('div');
        container.className = 'fixed bottom-4 right-4 max-w-md';
        
        warnings.forEach(warning => {
            const alert = document.createElement('div');
            alert.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2 rounded shadow-lg';
            alert.innerHTML = `
                <div class="flex items-center">
                    <div class="ml-3">
                        <p class="text-sm font-medium">
                            ⚠️ ${warning.message}
                        </p>
                    </div>
                </div>
            `;
            container.appendChild(alert);
        });
        
        if (warnings.length > 0) {
            // Remove existing warnings
            const existing = document.querySelector('.attendance-warnings');
            if (existing) existing.remove();
            
            // Add new warnings
            container.classList.add('attendance-warnings');
            document.body.appendChild(container);
            
            // Auto dismiss after 10 seconds
            setTimeout(() => {
                container.remove();
            }, 10000);
        }
    }
};