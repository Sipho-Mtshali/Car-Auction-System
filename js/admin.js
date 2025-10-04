// Admin Dashboard JavaScript - Fixed Version
let revenueChart, usersChart, paymentChart;

// Wait for Firebase and currentUser to be ready
function waitForAuth() {
    return new Promise((resolve) => {
        const checkAuth = () => {
            if (authInitialized && currentUser) {
                resolve(currentUser);
            } else if (authInitialized && !currentUser) {
                resolve(null);
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    });
}

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Initializing admin dashboard...');
        
        const user = await waitForAuth();
        
        if (!user) {
            alert('Please login to access the admin panel.');
            window.location.href = '../html/login.html';
            return;
        }
        
        if (user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '../html/user-dashboard.html';
            return;
        }

        console.log('Admin user confirmed:', user.email);
        
        initializeCharts();
        setupEventListeners();
        loadDashboardData();
        loadUsers();
        loadPendingCars();
        loadAuctions();
        
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        alert('Error loading admin panel. Please try again.');
    }
});

// Initialize Charts
function initializeCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#f8f9fa'
                }
            }
        }
    };

    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        revenueChart = new Chart(revenueCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Revenue (R)',
                    data: [1200000, 1900000, 1500000, 2200000, 1800000, 2450000, 2100000],
                    borderColor: '#3a86ff',
                    backgroundColor: 'rgba(58, 134, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: '#f8f9fa',
                            callback: function(value) {
                                return 'R' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8f9fa' }
                    }
                }
            }
        });
    }

    const usersCtx = document.getElementById('usersChart');
    if (usersCtx) {
        usersChart = new Chart(usersCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'New Users',
                    data: [45, 78, 56, 92, 67, 124, 98],
                    backgroundColor: '#06d6a0',
                    borderColor: '#06d6a0',
                    borderWidth: 1
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8f9fa' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#f8f9fa' }
                    }
                }
            }
        });
    }

    const paymentCtx = document.getElementById('paymentChart');
    if (paymentCtx) {
        paymentChart = new Chart(paymentCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Credit Card', 'EFT', 'Cash', 'Mobile Payment'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: ['#3a86ff', '#06d6a0', '#ffd166', '#8338ec'],
                    borderWidth: 0
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#f8f9fa' }
                    }
                }
            }
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    const navLinks = document.querySelectorAll('.nav-links a:not(#logout-btn)');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            
            if (!page) return;
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const pageContents = document.querySelectorAll('[id$="-content"]');
            pageContents.forEach(content => content.classList.add('hidden'));
            
            const targetContent = document.getElementById(`${page}-content`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            
            loadPageContent(page);
        });
    });

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const tabContainer = this.closest('.tabs');
            const parentContent = tabContainer.nextElementSibling.parentElement;
            
            tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            parentContent.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            loadTabContent(tabId);
        });
    });

    const addUserBtn = document.getElementById('add-user-btn');
    const addUserModal = document.getElementById('add-user-modal');
    const createAuctionBtn = document.getElementById('create-auction-btn');
    const createAuctionModal = document.getElementById('create-auction-modal');
    
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            addUserModal.style.display = 'flex';
        });
    }

    if (createAuctionBtn) {
        createAuctionBtn.addEventListener('click', function() {
            loadCarsForAuction();
            createAuctionModal.style.display = 'flex';
        });
    }

    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    const quickStatsBtn = document.getElementById('quick-stats-btn');
    if (quickStatsBtn) {
        quickStatsBtn.addEventListener('click', function() {
            loadDashboardData();
            this.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-sync"></i> Refresh Stats';
            }, 2000);
        });
    }

    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    const createAuctionForm = document.getElementById('create-auction-form');
    if (createAuctionForm) {
        createAuctionForm.addEventListener('submit', handleCreateAuction);
    }

    const addCarForm = document.getElementById('add-car-form');
    if (addCarForm) {
        addCarForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const carData = {
                brand: document.getElementById('admin-car-brand').value,
                model: document.getElementById('admin-car-model').value,
                year: parseInt(document.getElementById('admin-car-year').value),
                price: parseFloat(document.getElementById('admin-car-price').value),
                mileage: parseFloat(document.getElementById('admin-car-mileage').value),
                condition: document.getElementById('admin-car-condition').value,
                color: document.getElementById('admin-car-color').value,
                transmission: document.getElementById('admin-car-transmission').value,
                description: document.getElementById('admin-car-description').value
            };
            
            const images = document.getElementById('admin-car-images').files;
            
            try {
                const imageUrls = [];
                for (let i = 0; i < Math.min(images.length, 5); i++) {
                    const image = images[i];
                    const imageRef = storage.ref(`car-images/${currentUser.uid}/${Date.now()}_${image.name}`);
                    const uploadTask = await imageRef.put(image);
                    const imageUrl = await uploadTask.ref.getDownloadURL();
                    imageUrls.push(imageUrl);
                }
                
                if (imageUrls.length > 0) {
                    carData.images = imageUrls;
                }
                
                await adminAddCar(carData);
                document.getElementById('add-car-modal').style.display = 'none';
                loadPendingCars();
            } catch (error) {
                console.error('Error in add car form:', error);
                showNotification('Error adding car: ' + error.message, 'error');
            }
        });
    }
    
    const saveGeneralSettings = document.getElementById('save-general-settings');
    if (saveGeneralSettings) {
        saveGeneralSettings.addEventListener('click', handleSaveGeneralSettings);
    }
    
    const saveSecuritySettings = document.getElementById('save-security-settings');
    if (saveSecuritySettings) {
        saveSecuritySettings.addEventListener('click', handleSaveSecuritySettings);
    }

    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Load page content
function loadPageContent(page) {
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'cars':
            loadPendingCars();
            break;
        case 'auctions':
            loadAuctions();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Load tab content
function loadTabContent(tabId) {
    switch(tabId) {
        case 'all-users':
            loadUsers('all-users');
            break;
        case 'sellers':
            loadUsers('sellers');
            break;
        case 'buyers':
            loadUsers('buyers');
            break;
        case 'admins':
            loadUsers('admins');
            break;
        case 'pending-cars':
        case 'approved-cars':
        case 'rejected-cars':
            loadCarsByStatus(tabId);
            break;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        document.getElementById('total-users').textContent = totalUsers.toLocaleString();

        const pendingCarsSnapshot = await db.collection('cars').where('status', '==', 'pending').get();
        const pendingApprovals = pendingCarsSnapshot.size;
        document.getElementById('pending-approvals').textContent = pendingApprovals;

        const activeAuctionsSnapshot = await db.collection('auctions').where('status', '==', 'active').get();
        const activeAuctions = activeAuctionsSnapshot.size;
        document.getElementById('active-auctions').textContent = activeAuctions;

        const totalRevenue = await calculateTotalRevenue();
        document.getElementById('total-revenue').textContent = `R${totalRevenue.toLocaleString()}`;

        document.getElementById('new-cars-listed').textContent = await getNewCarsCount();
        document.getElementById('deals-closed').textContent = await getDealsClosedCount();
        document.getElementById('pending-issues').textContent = pendingApprovals;
        document.getElementById('rejected-listings').textContent = await getRejectedCarsCount();

        await loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function getNewCarsCount() {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const snapshot = await db.collection('cars')
            .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(oneWeekAgo))
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error getting new cars count:', error);
        return 0;
    }
}

async function getDealsClosedCount() {
    try {
        const snapshot = await db.collection('auctions')
            .where('status', '==', 'completed')
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error getting deals closed count:', error);
        return 0;
    }
}

async function getRejectedCarsCount() {
    try {
        const snapshot = await db.collection('cars')
            .where('status', '==', 'rejected')
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error('Error getting rejected cars count:', error);
        return 0;
    }
}

async function calculateTotalRevenue() {
    try {
        const completedAuctions = await db.collection('auctions')
            .where('status', '==', 'completed')
            .get();
        
        let totalRevenue = 0;
        completedAuctions.forEach(doc => {
            const auction = doc.data();
            totalRevenue += auction.finalPrice || auction.currentBid || 0;
        });
        
        return totalRevenue;
    } catch (error) {
        console.error('Error calculating revenue:', error);
        return 0;
    }
}

async function loadRecentActivity() {
    try {
        const activityBody = document.getElementById('recent-activity-body');
        if (!activityBody) return;
        
        activityBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        const usersSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        activityBody.innerHTML = '';

        if (usersSnapshot.empty) {
            activityBody.innerHTML = '<tr><td colspan="5" class="text-center">No recent activity</td></tr>';
            return;
        }

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.name || 'Unknown'}</td>
                <td>Registered as ${user.role || 'user'}</td>
                <td>New account</td>
                <td>${formatDate(user.createdAt?.toDate())}</td>
                <td><span class="status-badge status-approved">Completed</span></td>
            `;
            
            activityBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading recent activity:', error);
        const activityBody = document.getElementById('recent-activity-body');
        if (activityBody) {
            activityBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading activity</td></tr>';
        }
    }
}

// Load Users
async function loadUsers(filter = 'all-users') {
    try {
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) {
            console.error('users-table-body not found');
            return;
        }
        
        usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

        let query = db.collection('users');
        
        // Parse the filter correctly
        let roleFilter = null;
        if (filter === 'sellers') {
            roleFilter = 'seller';
        } else if (filter === 'buyers') {
            roleFilter = 'buyer';
        } else if (filter === 'admins') {
            roleFilter = 'admin';
        }
        
        // Apply filter if not "all-users"
        if (roleFilter) {
            console.log('Filtering by role:', roleFilter);
            query = query.where('role', '==', roleFilter);
        }
        
        const usersSnapshot = await query.get();
        
        console.log(`Found ${usersSnapshot.size} users for filter: ${filter}`);
        
        usersTableBody.innerHTML = '';
        
        if (usersSnapshot.empty) {
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>#${doc.id.substring(0, 8)}</td>
                <td>${user.name || 'Unknown'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="status-badge status-active">${user.role || 'user'}</span></td>
                <td>${formatDate(user.createdAt?.toDate())}</td>
                <td><span class="status-badge status-active">Active</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-outline" onclick="editUser('${doc.id}', '${(user.name || '').replace(/'/g, "\\'")}', '${user.email}', '${user.role}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            usersTableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading users:', error);
        const usersTableBody = document.getElementById('users-table-body');
        if (usersTableBody) {
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading users</td></tr>';
        }
    }
}

// Load Cars by Status
async function loadCarsByStatus(tabId) {
    const statusMap = {
        'pending-cars': 'pending',
        'approved-cars': 'approved',
        'rejected-cars': 'rejected'
    };
    
    const status = statusMap[tabId];
    if (!status) return;
    
    await loadPendingCars(status);
}

// Load Cars
async function loadPendingCars(status = 'pending') {
    try {
        const pendingCarsBody = document.getElementById('pending-cars-body');
        if (!pendingCarsBody) return;
        
        pendingCarsBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

        const pendingCarsSnapshot = await db.collection('cars')
            .where('status', '==', status)
            .get();

        pendingCarsBody.innerHTML = '';

        if (pendingCarsSnapshot.empty) {
            pendingCarsBody.innerHTML = '<tr><td colspan="7" class="text-center">No cars found</td></tr>';
            return;
        }

        for (const doc of pendingCarsSnapshot.docs) {
            const car = doc.data();
            let sellerName = 'Unknown';
            
            try {
                if (car.sellerId) {
                    const sellerDoc = await db.collection('users').doc(car.sellerId).get();
                    if (sellerDoc.exists) {
                        sellerName = sellerDoc.data().name || 'Unknown';
                    }
                }
            } catch (error) {
                console.error('Error fetching seller:', error);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${doc.id.substring(0, 8)}</td>
                <td>${car.brand || 'N/A'} ${car.model || ''}</td>
                <td>${car.year || 'N/A'}</td>
                <td>${sellerName}</td>
                <td>R${(car.price || 0).toLocaleString()}</td>
                <td>${formatDate(car.createdAt?.toDate())}</td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        ${status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="approveCar('${doc.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="rejectCar('${doc.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline" onclick="viewCar('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            
            pendingCarsBody.appendChild(row);
        }

    } catch (error) {
        console.error('Error loading cars:', error);
        const pendingCarsBody = document.getElementById('pending-cars-body');
        if (pendingCarsBody) {
            pendingCarsBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading cars</td></tr>';
        }
    }
}

// Load Auctions
async function loadAuctions() {
    try {
        const auctionsTableBody = document.getElementById('auctions-table-body');
        if (!auctionsTableBody) return;
        
        auctionsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';

        const auctionsSnapshot = await db.collection('auctions').get();

        auctionsTableBody.innerHTML = '';

        if (auctionsSnapshot.empty) {
            auctionsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No auctions found</td></tr>';
            return;
        }

        for (const doc of auctionsSnapshot.docs) {
            const auction = doc.data();
            let carDetails = 'Unknown Car';
            let sellerName = 'Unknown';
            
            try {
                if (auction.carId) {
                    const carDoc = await db.collection('cars').doc(auction.carId).get();
                    if (carDoc.exists) {
                        const car = carDoc.data();
                        carDetails = `${car.brand || ''} ${car.model || ''} (${car.year || ''})`;
                    }
                }
                
                if (auction.sellerId) {
                    const sellerDoc = await db.collection('users').doc(auction.sellerId).get();
                    if (sellerDoc.exists) {
                        sellerName = sellerDoc.data().name || 'Unknown';
                    }
                }
            } catch (error) {
                console.error('Error fetching auction details:', error);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${doc.id.substring(0, 8)}</td>
                <td>${carDetails}</td>
                <td>${sellerName}</td>
                <td>R${(auction.currentBid || 0).toLocaleString()}</td>
                <td>${auction.bidCount || 0}</td>
                <td>${calculateTimeLeft(auction.endTime?.toDate())}</td>
                <td><span class="status-badge status-${auction.status || 'inactive'}">${auction.status || 'Inactive'}</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-outline" onclick="viewAuction('${doc.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="toggleAuction('${doc.id}', '${auction.status}')">
                            <i class="fas fa-${auction.status === 'active' ? 'pause' : 'play'}"></i>
                        </button>
                    </div>
                </td>
            `;
            
            auctionsTableBody.appendChild(row);
        }

    } catch (error) {
        console.error('Error loading auctions:', error);
        const auctionsTableBody = document.getElementById('auctions-table-body');
        if (auctionsTableBody) {
            auctionsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading auctions</td></tr>';
        }
    }
}

// Handle Add User - Using Firebase Cloud Function approach
async function handleAddUser(e) {
    e.preventDefault();
    
    console.log('Add user form submitted');
    
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const roleInput = document.getElementById('user-role');
    const passwordInput = document.getElementById('user-password');
    
    console.log('Form elements found:', {
        nameInput: nameInput,
        emailInput: emailInput,
        roleInput: roleInput,
        passwordInput: passwordInput
    });

    if (!nameInput || !emailInput || !roleInput || !passwordInput) {
        console.error('Missing form elements');
        alert('Form error: One or more fields are missing.');
        return;
    }

    const name = nameInput.value ? nameInput.value.trim() : '';
    const email = emailInput.value ? emailInput.value.trim() : '';
    const role = roleInput.value;
    const password = passwordInput.value;

    console.log('Form values:', { name, email, role, passwordLength: password.length });

    if (!name || !email || !role || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        if (submitBtn) submitBtn.disabled = true;
        
        const createText = document.getElementById('create-user-text');
        const createLoading = document.getElementById('create-user-loading');
        
        if (createText) createText.classList.add('hidden');
        if (createLoading) createLoading.classList.remove('hidden');

        console.log('Creating user in Firebase Auth...');

        const currentUserId = currentUser.uid;
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;

        console.log('User created in Auth, saving to Firestore...');

        await db.collection('users').doc(newUser.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUserId
        });

        console.log('User saved to Firestore, signing out...');
        await auth.signOut();

        alert('User created successfully! You will be redirected to login.');
        window.location.href = '../html/login.html';

    } catch (error) {
        console.error('Error creating user:', error);
        
        let errorMessage = 'Error: ';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage += 'This email is already registered';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
            errorMessage += 'Password is too weak';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
        
        if (submitBtn) submitBtn.disabled = false;
        const createText = document.getElementById('create-user-text');
        const createLoading = document.getElementById('create-user-loading');
        
        if (createText) createText.classList.remove('hidden');
        if (createLoading) createLoading.classList.add('hidden');
    }
}

// Handle Create Auction
async function handleCreateAuction(e) {
    e.preventDefault();
    
    const carId = document.getElementById('auction-car').value;
    const startTime = document.getElementById('auction-start').value;
    const endTime = document.getElementById('auction-end').value;
    const reservePrice = document.getElementById('auction-reserve').value;
    const bidIncrement = document.getElementById('auction-increment').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        document.getElementById('create-auction-text').classList.add('hidden');
        document.getElementById('create-auction-loading').classList.remove('hidden');

        const carDoc = await db.collection('cars').doc(carId).get();
        if (!carDoc.exists) {
            throw new Error('Car not found');
        }
        
        const car = carDoc.data();

        const auctionData = {
            carId: carId,
            sellerId: car.sellerId,
            startTime: firebase.firestore.Timestamp.fromDate(new Date(startTime)),
            endTime: firebase.firestore.Timestamp.fromDate(new Date(endTime)),
            reservePrice: parseFloat(reservePrice),
            bidIncrement: parseFloat(bidIncrement),
            currentBid: parseFloat(reservePrice),
            bidCount: 0,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('auctions').add(auctionData);

        await db.collection('cars').doc(carId).update({
            status: 'onAuction',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Auction created successfully!', 'success');
        document.getElementById('create-auction-modal').style.display = 'none';
        document.getElementById('create-auction-form').reset();
        
        loadAuctions();

    } catch (error) {
        console.error('Error creating auction:', error);
        showNotification('Error creating auction: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        document.getElementById('create-auction-text').classList.remove('hidden');
        document.getElementById('create-auction-loading').classList.add('hidden');
    }
}

// Load Cars for Auction
async function loadCarsForAuction() {
    try {
        const auctionCarSelect = document.getElementById('auction-car');
        if (!auctionCarSelect) return;
        
        auctionCarSelect.innerHTML = '<option value="">Select a car</option>';

        const approvedCarsSnapshot = await db.collection('cars')
            .where('status', '==', 'approved')
            .get();

        for (const doc of approvedCarsSnapshot.docs) {
            const car = doc.data();
            let sellerName = 'Unknown';
            
            try {
                if (car.sellerId) {
                    const sellerDoc = await db.collection('users').doc(car.sellerId).get();
                    if (sellerDoc.exists) {
                        sellerName = sellerDoc.data().name || 'Unknown';
                    }
                }
            } catch (error) {
                console.error('Error fetching seller:', error);
            }
            
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${car.brand || ''} ${car.model || ''} ${car.year || ''} - ${sellerName}`;
            auctionCarSelect.appendChild(option);
        }

    } catch (error) {
        console.error('Error loading cars for auction:', error);
    }
}

// Car Approval Functions
async function approveCar(carId) {
    if (confirm('Are you sure you want to approve this car?')) {
        try {
            await db.collection('cars').doc(carId).update({
                status: 'approved',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Car approved successfully!', 'success');
            loadPendingCars();
            loadDashboardData();
        } catch (error) {
            console.error('Error approving car:', error);
            showNotification('Error approving car', 'error');
        }
    }
}

async function rejectCar(carId) {
    if (confirm('Are you sure you want to reject this car?')) {
        try {
            await db.collection('cars').doc(carId).update({
                status: 'rejected',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Car rejected successfully!', 'success');
            loadPendingCars();
            loadDashboardData();
        } catch (error) {
            console.error('Error rejecting car:', error);
            showNotification('Error rejecting car', 'error');
        }
    }
}

// Admin Car Creation
async function adminAddCar(carData) {
    try {
        const carDoc = await db.collection('cars').add({
            ...carData,
            status: 'approved',
            sellerId: currentUser.uid,
            sellerName: currentUser.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Car added successfully!', 'success');
        return carDoc.id;
    } catch (error) {
        console.error('Error adding car:', error);
        showNotification('Error adding car: ' + error.message, 'error');
    }
}

// Show Add Car Modal
function showAddCarModal() {
    const modal = document.getElementById('add-car-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('add-car-form').reset();
    }
}

// User Management Functions
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        try {
            await db.collection('users').doc(userId).delete();
            
            showNotification('User deleted successfully! Note: Firebase Auth account still exists.', 'success');
            loadUsers();
            loadDashboardData();
        } catch (error) {
            console.error('Error deleting user:', error);
            showNotification('Error deleting user: ' + error.message, 'error');
        }
    }
}

function editUser(userId, userName, userEmail, userRole) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit User</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <form id="edit-user-form">
                <div class="form-group">
                    <label for="edit-user-name">Full Name</label>
                    <input type="text" id="edit-user-name" class="form-control" value="${userName}" required>
                </div>
                <div class="form-group">
                    <label for="edit-user-email">Email Address</label>
                    <input type="email" id="edit-user-email" class="form-control" value="${userEmail}" disabled>
                    <small style="color: var(--gray);">Email cannot be changed</small>
                </div>
                <div class="form-group">
                    <label for="edit-user-role">User Role</label>
                    <select id="edit-user-role" class="form-control" required>
                        <option value="buyer" ${userRole === 'buyer' ? 'selected' : ''}>Buyer</option>
                        <option value="seller" ${userRole === 'seller' ? 'selected' : ''}>Seller</option>
                        <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Administrator</option>
                    </select>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Update User
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newName = document.getElementById('edit-user-name').value.trim();
        const newRole = document.getElementById('edit-user-role').value;
        
        try {
            await db.collection('users').doc(userId).update({
                name: newName,
                role: newRole,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('User updated successfully!', 'success');
            modal.remove();
            loadUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            showNotification('Error updating user: ' + error.message, 'error');
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Car Management Functions
function viewCar(carId) {
    showNotification('View car details functionality coming soon', 'info');
}

// Auction Management Functions
function viewAuction(auctionId) {
    showNotification('View auction details functionality coming soon', 'info');
}

async function toggleAuction(auctionId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const action = newStatus === 'active' ? 'resume' : 'pause';
    
    if (confirm(`Are you sure you want to ${action} this auction?`)) {
        try {
            await db.collection('auctions').doc(auctionId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification(`Auction ${action}d successfully!`, 'success');
            loadAuctions();
        } catch (error) {
            console.error(`Error ${action}ing auction:`, error);
            showNotification(`Error ${action}ing auction`, 'error');
        }
    }
}

// Settings Functions
async function handleSaveGeneralSettings() {
    try {
        const siteName = document.getElementById('site-name').value;
        const adminEmail = document.getElementById('admin-email').value;
        const commissionRate = document.getElementById('commission-rate').value;
        
        await db.collection('settings').doc('general').set({
            siteName: siteName,
            adminEmail: adminEmail,
            commissionRate: parseFloat(commissionRate),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        }, { merge: true });
        
        showNotification('General settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving general settings:', error);
        showNotification('Error saving general settings', 'error');
    }
}

async function handleSaveSecuritySettings() {
    try {
        const sessionTimeout = document.getElementById('session-timeout').value;
        const maxLoginAttempts = document.getElementById('max-login-attempts').value;
        const passwordExpiry = document.getElementById('password-expiry').value;
        
        await db.collection('settings').doc('security').set({
            sessionTimeout: parseInt(sessionTimeout),
            maxLoginAttempts: parseInt(maxLoginAttempts),
            passwordExpiry: parseInt(passwordExpiry),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        }, { merge: true });
        
        showNotification('Security settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving security settings:', error);
        showNotification('Error saving security settings', 'error');
    }
}

// Load Reports
function loadReports() {
    console.log('Loading reports...');
    showNotification('Reports loaded successfully', 'success');
}

// Utility Functions
function formatDate(date) {
    if (!date) return 'Unknown';
    
    try {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-ZA', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function calculateTimeLeft(endDate) {
    if (!endDate) return 'Unknown';
    
    try {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        
        if (diff <= 0) return 'Ended';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    } catch (error) {
        console.error('Error calculating time left:', error);
        return 'Unknown';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    
    const colors = {
        success: '#06d6a0',
        error: '#ef476f',
        warning: '#ffd166',
        info: '#3a86ff'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Make functions globally accessible
window.approveCar = approveCar;
window.rejectCar = rejectCar;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.viewCar = viewCar;
window.viewAuction = viewAuction;
window.toggleAuction = toggleAuction;
window.adminAddCar = adminAddCar;
window.showAddCarModal = showAddCarModal;

console.log('Admin dashboard loaded successfully');