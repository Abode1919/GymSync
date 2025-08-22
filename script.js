// Global variables
let workouts = JSON.parse(localStorage.getItem('gymSyncWorkouts')) || [];
let profile = JSON.parse(localStorage.getItem('gymSyncProfile')) || {};
let workoutPlans = JSON.parse(localStorage.getItem('gymSyncWorkoutPlans')) || [];
let strengthChart, volumeChart;
let isMetric = JSON.parse(localStorage.getItem('gymSyncUnits')) || false;
let currentPlanExercises = [];

// Workout Timer Variables
let activeWorkout = null;
let workoutTimer = null;
let restTimer = null;
let workoutStartTime = null;
let isPaused = false;
let isResting = false;
let currentExerciseIndex = 0;
let currentSetIndex = 0;

// Unit conversion functions
function lbsToKg(lbs) {
    return Math.round(lbs * 0.453592 * 10) / 10;
}

function kgToLbs(kg) {
    return Math.round(kg * 2.20462 * 10) / 10;
}

function inchesToCm(inches) {
    return Math.round(inches * 2.54 * 10) / 10;
}

function cmToInches(cm) {
    return Math.round(cm * 0.393701 * 10) / 10;
}

function formatWeight(weight) {
    return isMetric ? `${weight} kg` : `${weight} lbs`;
}

function formatHeight(height) {
    return isMetric ? `${height} cm` : `${height} in`;
}

function toggleUnits() {
    isMetric = !isMetric;
    localStorage.setItem('gymSyncUnits', JSON.stringify(isMetric));
    updateUnitLabels();
    convertExistingData();
    updateAllDisplays();
}

function updateUnitLabels() {
    const weightUnits = document.querySelectorAll('.weight-unit');
    const heightUnits = document.querySelectorAll('.height-unit');
    const unitDisplay = document.getElementById('unitDisplay');
    const mobileUnitDisplay = document.getElementById('mobileUnitDisplay');
    
    weightUnits.forEach(unit => {
        unit.textContent = isMetric ? 'kg' : 'lbs';
    });
    
    heightUnits.forEach(unit => {
        unit.textContent = isMetric ? 'cm' : 'inches';
    });
    
    if (unitDisplay) unitDisplay.textContent = isMetric ? 'Metric' : 'Imperial';
    if (mobileUnitDisplay) mobileUnitDisplay.textContent = isMetric ? 'Metric' : 'Imperial';
}

function convertExistingData() {
    // Convert workout data
    workouts = workouts.map(workout => {
        const newWeight = isMetric ? lbsToKg(workout.weight) : kgToLbs(workout.weight);
        return {
            ...workout,
            weight: newWeight,
            volume: newWeight * workout.sets * workout.reps
        };
    });
    localStorage.setItem('gymSyncWorkouts', JSON.stringify(workouts));

    // Convert profile data
    if (profile.weight) {
        profile.weight = isMetric ? lbsToKg(profile.weight) : kgToLbs(profile.weight);
    }
    if (profile.height) {
        profile.height = isMetric ? inchesToCm(profile.height) : cmToInches(profile.height);
    }
    localStorage.setItem('gymSyncProfile', JSON.stringify(profile));
}

function updateAllDisplays() {
    updateTodaySummary();
    updateRecentWorkouts();
    updateStatistics();
    loadProfile();
    if (document.getElementById('statisticsPage').classList.contains('hidden') === false) {
        setTimeout(() => updateCharts(), 100);
    }
    if (document.getElementById('profilePage').classList.contains('hidden') === false) {
        updateProfileStats();
    }
    if (document.getElementById('plansPage').classList.contains('hidden') === false) {
        displayWorkoutPlans();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    updateUnitLabels();
    loadProfile();
    updateTodaySummary();
    updateRecentWorkouts();
    updateStatistics();
    displayWorkoutPlans();
    showPage('home');
});

// Navigation functions
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show selected page
    document.getElementById(pageId + 'Page').classList.remove('hidden');
    
    // Update navigation active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-emerald-600', 'bg-emerald-50');
        btn.classList.add('text-gray-700');
    });
    
    // Set active nav button
    if (event && event.target) {
        event.target.classList.remove('text-gray-700');
        event.target.classList.add('text-emerald-600');
    }
    
    // Load page-specific content
    if (pageId === 'statistics') {
        setTimeout(() => {
            updateCharts();
        }, 100);
    } else if (pageId === 'profile') {
        updateProfileStats();
    } else if (pageId === 'plans') {
        displayWorkoutPlans();
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('open');
}

// Workout Timer Functions
function startWorkout(plan) {
    activeWorkout = plan;
    currentExerciseIndex = 0;
    currentSetIndex = 0;
    workoutStartTime = Date.now();
    isPaused = false;
    isResting = false;
    
    // Show the timer overlay
    document.getElementById('workoutTimerOverlay').classList.remove('hidden');
    
    // Initialize the display
    updateWorkoutDisplay();
    
    // Start the main workout timer
    workoutTimer = setInterval(updateWorkoutTimer, 1000);
}

function stopWorkout() {
    if (confirm('Are you sure you want to stop this workout?')) {
        // Clear timers
        if (workoutTimer) clearInterval(workoutTimer);
        if (restTimer) clearInterval(restTimer);
        
        // Reset variables
        activeWorkout = null;
        workoutTimer = null;
        restTimer = null;
        isPaused = false;
        isResting = false;
        
        // Hide overlay
        document.getElementById('workoutTimerOverlay').classList.add('hidden');
        
        showNotification('Workout stopped', 'info');
    }
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseResumeBtn');
    
    if (isPaused) {
        btn.innerHTML = '<i class="fas fa-play mr-2"></i>Resume Workout';
        btn.className = 'w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors';
    } else {
        btn.innerHTML = '<i class="fas fa-pause mr-2"></i>Pause Workout';
        btn.className = 'w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors';
    }
}

function completeSet() {
    if (!activeWorkout || isPaused) return;
    
    const currentExercise = activeWorkout.exercises[currentExerciseIndex];
    currentSetIndex++;
    
    if (currentSetIndex >= currentExercise.sets) {
        // Exercise complete, show next exercise button
        document.getElementById('setCompleteBtn').classList.add('hidden');
        document.getElementById('nextExerciseBtn').classList.remove('hidden');
    } else {
        // Start rest timer
        startRestTimer(currentExercise.rest);
    }
    
    updateWorkoutDisplay();
}

function nextExercise() {
    if (!activeWorkout) return;
    
    currentExerciseIndex++;
    currentSetIndex = 0;
    
    if (currentExerciseIndex >= activeWorkout.exercises.length) {
        // Workout complete!
        completeWorkout();
        return;
    }
    
    // Reset buttons
    document.getElementById('setCompleteBtn').classList.remove('hidden');
    document.getElementById('nextExerciseBtn').classList.add('hidden');
    
    updateWorkoutDisplay();
}

function startRestTimer(restSeconds) {
    isResting = true;
    let remainingTime = restSeconds;
    
    // Show rest timer section
    document.getElementById('restTimerSection').classList.remove('hidden');
    document.getElementById('skipRestBtn').classList.remove('hidden');
    document.getElementById('setCompleteBtn').classList.add('hidden');
    
    // Update rest timer display
    document.getElementById('restTimer').textContent = remainingTime;
    
    restTimer = setInterval(() => {
        if (isPaused) return;
        
        remainingTime--;
        document.getElementById('restTimer').textContent = remainingTime;
        
        if (remainingTime <= 0) {
            endRest();
        }
    }, 1000);
}

function skipRest() {
    if (restTimer) {
        clearInterval(restTimer);
        restTimer = null;
    }
    endRest();
}

function endRest() {
    isResting = false;
    
    // Hide rest timer section
    document.getElementById('restTimerSection').classList.add('hidden');
    document.getElementById('skipRestBtn').classList.add('hidden');
    document.getElementById('setCompleteBtn').classList.remove('hidden');
    
    if (restTimer) {
        clearInterval(restTimer);
        restTimer = null;
    }
}

function completeWorkout() {
    // Clear timers
    if (workoutTimer) clearInterval(workoutTimer);
    if (restTimer) clearInterval(restTimer);
    
    const workoutDuration = Math.floor((Date.now() - workoutStartTime) / 1000);
    const minutes = Math.floor(workoutDuration / 60);
    const seconds = workoutDuration % 60;
    
    // Hide overlay
    document.getElementById('workoutTimerOverlay').classList.add('hidden');
    
    // Reset variables
    activeWorkout = null;
    workoutTimer = null;
    restTimer = null;
    isPaused = false;
    isResting = false;
    
    showNotification(`Workout completed in ${minutes}:${seconds.toString().padStart(2, '0')}!`, 'success');
}

function updateWorkoutTimer() {
    if (isPaused || !workoutStartTime) return;
    
    const elapsed = Math.floor((Date.now() - workoutStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('workoutTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateWorkoutDisplay() {
    if (!activeWorkout) return;
    
    const currentExercise = activeWorkout.exercises[currentExerciseIndex];
    
    // Update plan name
    document.getElementById('workoutPlanName').textContent = activeWorkout.name;
    
    // Update current exercise info
    document.getElementById('currentExerciseName').textContent = currentExercise.name;
    document.getElementById('currentSet').textContent = currentSetIndex + 1;
    document.getElementById('totalSets').textContent = currentExercise.sets;
    document.getElementById('currentReps').textContent = currentExercise.reps;
    document.getElementById('currentExerciseNumber').textContent = currentExerciseIndex + 1;
    document.getElementById('totalExercises').textContent = activeWorkout.exercises.length;
    
    // Update progress bar
    const totalSets = activeWorkout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const completedSets = activeWorkout.exercises.slice(0, currentExerciseIndex).reduce((sum, ex) => sum + ex.sets, 0) + currentSetIndex;
    const progress = Math.round((completedSets / totalSets) * 100);
    
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressPercentage').textContent = `${progress}%`;
}

// Workout Plans Functions
function openCreatePlanModal() {
    document.getElementById('createPlanModal').classList.add('active');
    currentPlanExercises = [];
    updateExercisesList();
}

function closeCreatePlanModal() {
    document.getElementById('createPlanModal').classList.remove('active');
    document.getElementById('createPlanForm').reset();
    currentPlanExercises = [];
    updateExercisesList();
}

function addExerciseToPlan() {
    const name = document.getElementById('planExerciseName').value;
    const sets = document.getElementById('planSets').value;
    const reps = document.getElementById('planReps').value;
    const rest = document.getElementById('planRest').value;
    
    if (!name || !sets || !reps) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const exercise = {
        id: Date.now(),
        name,
        sets: parseInt(sets),
        reps: parseInt(reps),
        rest: parseInt(rest) || 60
    };
    
    currentPlanExercises.push(exercise);
    updateExercisesList();
    
    // Clear exercise form
    document.getElementById('planExerciseName').value = '';
    document.getElementById('planSets').value = '';
    document.getElementById('planReps').value = '';
    document.getElementById('planRest').value = '60';
}

function removeExerciseFromPlan(exerciseId) {
    currentPlanExercises = currentPlanExercises.filter(ex => ex.id !== exerciseId);
    updateExercisesList();
}

function updateExercisesList() {
    const container = document.getElementById('planExercisesList');
    
    if (currentPlanExercises.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No exercises added yet</p>';
        return;
    }
    
    container.innerHTML = currentPlanExercises.map(exercise => `
        <div class="exercise-item flex justify-between items-center">
            <div>
                <h4 class="font-medium text-gray-900">${exercise.name}</h4>
                <p class="text-sm text-gray-600">${exercise.sets} sets × ${exercise.reps} reps • ${exercise.rest}s rest</p>
            </div>
            <button onclick="removeExerciseFromPlan(${exercise.id})" class="text-red-500 hover:text-red-700 p-1">
                <i class="fas fa-trash text-sm"></i>
            </button>
        </div>
    `).join('');
}

function createWorkoutPlan(event) {
    event.preventDefault();
    
    const planName = document.getElementById('planName').value;
    const planCategory = document.getElementById('planCategory').value;
    const planDescription = document.getElementById('planDescription').value;
    
    if (!planName || currentPlanExercises.length === 0) {
        showNotification('Please add a plan name and at least one exercise', 'error');
        return;
    }
    
    const newPlan = {
        id: Date.now(),
        name: planName,
        category: planCategory,
        description: planDescription,
        exercises: [...currentPlanExercises],
        createdAt: new Date().toISOString(),
        timesUsed: 0
    };
    
    workoutPlans.push(newPlan);
    localStorage.setItem('gymSyncWorkoutPlans', JSON.stringify(workoutPlans));
    
    closeCreatePlanModal();
    displayWorkoutPlans();
    showNotification('Workout plan created successfully!', 'success');
}

function displayWorkoutPlans() {
    const container = document.getElementById('workoutPlansList');
    
    if (workoutPlans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">No workout plans yet</h3>
                <p class="text-gray-500 mb-6">Create your first workout plan to get started</p>
                <button onclick="openCreatePlanModal()" class="accent-gradient text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    <i class="fas fa-plus mr-2"></i>Create Your First Plan
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = workoutPlans.map(plan => `
        <div class="plan-card bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${plan.name}</h3>
                    <span class="category-badge category-${plan.category.toLowerCase()}">${plan.category}</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="usePlan(${plan.id})" class="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors">
                        <i class="fas fa-play mr-1"></i>Use Plan
                    </button>
                    <button onclick="deletePlan(${plan.id})" class="text-red-500 hover:text-red-700 p-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            ${plan.description ? `<p class="text-gray-600 mb-4">${plan.description}</p>` : ''}
            
            <div class="space-y-2 mb-4">
                ${plan.exercises.slice(0, 3).map(exercise => `
                    <div class="text-sm text-gray-700">
                        <span class="font-medium">${exercise.name}</span> - ${exercise.sets}×${exercise.reps}
                    </div>
                `).join('')}
                ${plan.exercises.length > 3 ? `<div class="text-sm text-gray-500">+${plan.exercises.length - 3} more exercises</div>` : ''}
            </div>
            
            <div class="plan-stats">
                <span><i class="fas fa-dumbbell"></i> ${plan.exercises.length} exercises</span>
                <span><i class="fas fa-clock"></i> ~${plan.exercises.reduce((total, ex) => total + (ex.sets * 2) + (ex.rest / 60), 0).toFixed(0)} min</span>
                <span><i class="fas fa-chart-line"></i> Used ${plan.timesUsed} times</span>
            </div>
        </div>
    `).join('');
}

function usePlan(planId) {
    const plan = workoutPlans.find(p => p.id === planId);
    if (!plan || plan.exercises.length === 0) return;
    
    // Update usage count
    plan.timesUsed++;
    localStorage.setItem('gymSyncWorkoutPlans', JSON.stringify(workoutPlans));
    
    // Start the workout timer
    startWorkout(plan);
    
    showNotification(`Started "${plan.name}" workout!`, 'success');
    displayWorkoutPlans(); // Update usage count display
}

function deletePlan(planId) {
    if (confirm('Are you sure you want to delete this workout plan?')) {
        workoutPlans = workoutPlans.filter(p => p.id !== planId);
        localStorage.setItem('gymSyncWorkoutPlans', JSON.stringify(workoutPlans));
        displayWorkoutPlans();
        showNotification('Workout plan deleted', 'info');
    }
}

// Workout functions
function addWorkout(event) {
    event.preventDefault();
    
    const workout = {
        id: Date.now(),
        exercise: document.getElementById('exerciseName').value,
        weight: parseFloat(document.getElementById('weight').value),
        sets: parseInt(document.getElementById('sets').value),
        reps: parseInt(document.getElementById('reps').value),
        notes: document.getElementById('notes').value,
        date: new Date().toISOString(),
        volume: parseFloat(document.getElementById('weight').value) * parseInt(document.getElementById('sets').value) * parseInt(document.getElementById('reps').value)
    };
    
    workouts.push(workout);
    localStorage.setItem('gymSyncWorkouts', JSON.stringify(workouts));
    
    // Reset form
    event.target.reset();
    
    // Update displays
    updateTodaySummary();
    updateRecentWorkouts();
    
    // Show success message
    showNotification('Workout logged successfully!', 'success');
}

function deleteWorkout(id) {
    workouts = workouts.filter(w => w.id !== id);
    localStorage.setItem('gymSyncWorkouts', JSON.stringify(workouts));
    updateTodaySummary();
    updateRecentWorkouts();
    showNotification('Workout deleted', 'info');
}

function updateTodaySummary() {
    const today = new Date().toDateString();
    const todayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === today);
    
    const totalExercises = todayWorkouts.length;
    const totalSets = todayWorkouts.reduce((sum, w) => sum + w.sets, 0);
    const uniqueExercises = new Set(todayWorkouts.map(w => w.exercise)).size;
    
    document.getElementById('todaySummary').innerHTML = `
        <div class="bg-emerald-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-emerald-600">${totalExercises}</div>
            <div class="text-sm text-emerald-700">Exercises Logged</div>
        </div>
        <div class="bg-blue-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">${totalSets}</div>
            <div class="text-sm text-blue-700">Total Sets</div>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-purple-600">${uniqueExercises}</div>
            <div class="text-sm text-purple-700">Unique Exercises</div>
        </div>
    `;
}

function updateRecentWorkouts() {
    const recent = workouts.slice(-10).reverse();
    const container = document.getElementById('recentWorkouts');
    const weightUnit = isMetric ? 'kg' : 'lbs';
    
    if (recent.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">No workouts logged yet. Start by adding your first exercise above!</p>';
        return;
    }
    
    container.innerHTML = recent.map(workout => `
        <div class="border border-gray-200 rounded-lg p-4 hover-lift">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-900">${workout.exercise}</h3>
                    <p class="text-sm text-gray-600">${workout.sets} sets × ${workout.reps} reps @ ${workout.weight} ${weightUnit}</p>
                    <p class="text-xs text-gray-500 mt-1">${new Date(workout.date).toLocaleDateString()}</p>
                    ${workout.notes ? `<p class="text-sm text-gray-700 mt-2 italic">"${workout.notes}"</p>` : ''}
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-emerald-600">${Math.round(workout.volume).toLocaleString()} ${weightUnit}</span>
                    <button onclick="deleteWorkout(${workout.id})" class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Statistics functions
function updateStatistics() {
    const totalWorkouts = workouts.length;
    const maxVolume = workouts.length > 0 ? Math.max(...workouts.map(w => w.volume)) : 0;
    const weightUnit = isMetric ? 'kg' : 'lbs';
    
    // Calculate personal records
    const exerciseMaxes = {};
    workouts.forEach(w => {
        if (!exerciseMaxes[w.exercise] || w.weight > exerciseMaxes[w.exercise]) {
            exerciseMaxes[w.exercise] = w.weight;
        }
    });
    const personalRecords = Object.keys(exerciseMaxes).length;
    
    // Calculate streak
    const dates = [...new Set(workouts.map(w => new Date(w.date).toDateString()))].sort();
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        if (dates.includes(checkDate.toDateString())) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    
    document.getElementById('totalWorkouts').textContent = totalWorkouts;
    document.getElementById('maxVolume').textContent = Math.round(maxVolume).toLocaleString() + ' ' + weightUnit;
    document.getElementById('personalRecords').textContent = personalRecords;
    document.getElementById('currentStreak').textContent = streak + ' days';
    
    // Update exercise filter
    const exercises = [...new Set(workouts.map(w => w.exercise))];
    const exerciseFilter = document.getElementById('exerciseFilter');
    exerciseFilter.innerHTML = '<option value="all">All Exercises</option>' + 
        exercises.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

function updateCharts() {
    const exerciseFilter = document.getElementById('exerciseFilter').value;
    const timeFilter = parseInt(document.getElementById('timeFilter').value);
    
    let filteredWorkouts = workouts;
    
    // Filter by exercise
    if (exerciseFilter !== 'all') {
        filteredWorkouts = filteredWorkouts.filter(w => w.exercise === exerciseFilter);
    }
    
    // Filter by time
    if (timeFilter !== 'all') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
        filteredWorkouts = filteredWorkouts.filter(w => new Date(w.date) >= cutoffDate);
    }
    
    updateStrengthChart(filteredWorkouts);
    updateVolumeChart(filteredWorkouts);
}

function updateStrengthChart(data) {
    const ctx = document.getElementById('strengthChart').getContext('2d');
    const weightUnit = isMetric ? 'kg' : 'lbs';
    
    if (strengthChart) {
        strengthChart.destroy();
    }
    
    // Group by exercise and get max weight over time
    const exerciseData = {};
    data.forEach(w => {
        if (!exerciseData[w.exercise]) {
            exerciseData[w.exercise] = [];
        }
        exerciseData[w.exercise].push({
            date: new Date(w.date),
            weight: w.weight
        });
    });
    
    const datasets = Object.keys(exerciseData).slice(0, 5).map((exercise, index) => {
        const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
        const sortedData = exerciseData[exercise].sort((a, b) => a.date - b.date);
        
        return {
            label: exercise,
            data: sortedData.map(d => ({x: d.date, y: d.weight})),
            borderColor: colors[index],
            backgroundColor: colors[index] + '20',
            tension: 0.4
        };
    });
    
    strengthChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: `Weight (${weightUnit})` }
                }
            },
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

function updateVolumeChart(data) {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    const weightUnit = isMetric ? 'kg' : 'lbs';
    
    if (volumeChart) {
        volumeChart.destroy();
    }
    
    // Group by date and sum volume
    const volumeByDate = {};
    data.forEach(w => {
        const date = new Date(w.date).toDateString();
        volumeByDate[date] = (volumeByDate[date] || 0) + w.volume;
    });
    
    const sortedDates = Object.keys(volumeByDate).sort((a, b) => new Date(a) - new Date(b));
    
    volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDates.map(d => new Date(d).toLocaleDateString()),
            datasets: [{
                label: 'Total Volume',
                data: sortedDates.map(d => Math.round(volumeByDate[d])),
                backgroundColor: '#10b981',
                borderColor: '#059669',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: `Volume (${weightUnit})` }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Profile functions
function loadProfile() {
    if (profile.height) document.getElementById('profileHeight').value = profile.height;
    if (profile.weight) document.getElementById('profileWeight').value = profile.weight;
    if (profile.gender) document.getElementById('profileGender').value = profile.gender;
    if (profile.frequency) document.getElementById('profileFrequency').value = profile.frequency;
}

function updateProfile(event) {
    event.preventDefault();
    
    profile = {
        height: parseFloat(document.getElementById('profileHeight').value) || profile.height,
        weight: parseFloat(document.getElementById('profileWeight').value) || profile.weight,
        gender: document.getElementById('profileGender').value || profile.gender,
        frequency: document.getElementById('profileFrequency').value || profile.frequency
    };
    
    localStorage.setItem('gymSyncProfile', JSON.stringify(profile));
    showNotification('Profile updated successfully!', 'success');
}

function updateProfileStats() {
    const now = new Date();
    const thisMonth = workouts.filter(w => {
        const workoutDate = new Date(w.date);
        return workoutDate.getMonth() === now.getMonth() && workoutDate.getFullYear() === now.getFullYear();
    });
    
    const monthlyWorkouts = thisMonth.length;
    const monthlySets = thisMonth.reduce((sum, w) => sum + w.sets, 0);
    const weeklyAverage = Math.round(monthlyWorkouts / 4);
    
    document.getElementById('monthlyWorkouts').textContent = monthlyWorkouts;
    document.getElementById('monthlySets').textContent = monthlySets;
    document.getElementById('weeklyAverage').textContent = weeklyAverage;
    
    updateAchievements();
}

function updateAchievements() {
    const achievements = [];
    
    if (workouts.length >= 1) achievements.push({ icon: 'fa-star', text: 'First Workout Logged', color: 'text-yellow-500' });
    if (workouts.length >= 10) achievements.push({ icon: 'fa-fire', text: '10 Workouts Completed', color: 'text-orange-500' });
    if (workouts.length >= 50) achievements.push({ icon: 'fa-trophy', text: '50 Workouts Milestone', color: 'text-purple-500' });
    if (workouts.length >= 100) achievements.push({ icon: 'fa-crown', text: 'Century Club', color: 'text-emerald-500' });
    
    const totalVolume = workouts.reduce((sum, w) => sum + w.volume, 0);
    const volumeThreshold1 = isMetric ? 4536 : 10000; // 10k lbs = ~4536 kg
    const volumeThreshold2 = isMetric ? 22680 : 50000; // 50k lbs = ~22680 kg
    
    if (totalVolume >= volumeThreshold1) achievements.push({ icon: 'fa-dumbbell', text: `${isMetric ? '4.5K' : '10K'} Volume Club`, color: 'text-blue-500' });
    if (totalVolume >= volumeThreshold2) achievements.push({ icon: 'fa-medal', text: `${isMetric ? '22K' : '50K'} Volume Beast`, color: 'text-red-500' });
    
    const container = document.getElementById('achievements');
    if (achievements.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Complete workouts to earn achievements!</p>';
    } else {
        container.innerHTML = achievements.map(achievement => `
            <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <i class="fas ${achievement.icon} ${achievement.color} text-lg"></i>
                <span class="text-sm font-medium text-gray-900">${achievement.text}</span>
            </div>
        `).join('');
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium ${
        type === 'success' ? 'bg-emerald-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}