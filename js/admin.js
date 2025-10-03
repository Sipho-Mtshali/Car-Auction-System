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
        
        // Wait for authentication to be fully initialized
        const user = await waitForAuth();
        
        if (!user) {
            alert('Please login to access the admin panel.');
            window.location.href = '../html/login.html';
            return;
        }
        
        // Check if user is admin
        if (user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = '../html/user-dashboard.html';
            return;
        }

        console.log('Admin user confirmed:', user.email);
        
        // Initialize dashboard
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

// Initialize Charts with proper configuration
function initializeCharts() {
    // Common chart options for dark theme
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

    // Revenue Chart
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
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f8f9fa',
                            callback: function(value) {
                                return 'R' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f8f9fa'
                        }
                    }
                }
            }
        });
    }

    // Users Chart
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
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f8f9fa'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#f8f9fa'
                        }
                    }
                }
            }
        });
    }

    // Payment Method Chart
    const paymentCtx = document.getElementById('paymentChart');
    if (paymentCtx) {
        paymentChart = new Chart(paymentCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Credit Card', 'EFT', 'Cash', 'Mobile Payment'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#3a86ff',
                        '#06d6a0',
                        '#ffd166',
                        '#8338ec'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                ...commonOptions,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#f8f9fa'
                        }
                    }
                }
            }
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // Close sidebar when clicking on overlay
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Navigation
    const navLinks = document.querySelectorAll('.nav-links a:not(#logout-btn)');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            
            if (!page) return;
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            const pageContents = document.querySelectorAll('[id$="-content"]');
            pageContents.forEach(content => content.classList.add('hidden'));
            
            const targetContent = document.getElementById(`${page}-content`);
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }
            
            // Close mobile menu
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            
            // Load content based on page
            loadPageContent(page);
        });
    });

    // Tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Get parent container to scope tab switching
            const tabContainer = this.closest('.tabs');
            const parentContent = tabContainer.nextElementSibling.parentElement;
            
            // Update active tab
            tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            parentContent.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // Load tab-specific data
            loadTabContent(tabId);
        });
    });

    // Modals
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

    // Close Modals
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Quick Stats Refresh
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

    // Form submissions
    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }
    
    const createAuctionForm = document.getElementById('create-auction-form');
    if (createAuctionForm) {
        createAuctionForm.addEventListener('submit', handleCreateAuction);
    }
    
    const saveGeneralSettings = document.getElementById('save-general-settings');
    if (saveGeneralSettings) {
        saveGeneralSettings.addEventListener('click', handleSaveGeneralSettings);
    }
    
    const saveSecuritySettings = document.getElementById('save-security-settings');
    if (saveSecuritySettings) {
        saveSecuritySettings.addEventListener('click', handleSaveSecuritySettings);
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Load page content based on navigation
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
        case 'sellers':
        case 'buyers':
        case 'admins':
            loadUsers(tabId);
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
        // Get total users
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        document.getElementById('total-users').textContent = totalUsers.toLocaleString();

        // Get pending approvals (cars with status 'pending')
        const pendingCarsSnapshot = await db.collection('cars').where('status', '==', 'pending').get();
        const pendingApprovals = pendingCarsSnapshot.size;
        document.getElementById('pending-approvals').textContent = pendingApprovals;

        // Get active auctions
        const activeAuctionsSnapshot = await db.collection('auctions').where('status', '==', 'active').get();
        const activeAuctions = activeAuctionsSnapshot.size;
        document.getElementById('active-auctions').textContent = activeAuctions;

        // Calculate total revenue
        const totalRevenue = await calculateTotalRevenue();
        document.getElementById('total-revenue').textContent = `R${totalRevenue.toLocaleString()}`;

        // Update stats grid
        document.getElementById('new-cars-listed').textContent = await getNewCarsCount();
        document.getElementById('deals-closed').textContent = await getDealsClosedCount();
        document.getElementById('pending-issues').textContent = pendingApprovals;
        document.getElementById('rejected-listings').textContent = await getRejectedCarsCount();

        // Update recent activity
        await loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Get counts for dashboard stats
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

// Calculate Total Revenue
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

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activityBody = document.getElementById('recent-activity-body');
        if (!activityBody) return;
        
        activityBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        // Get recent users (last 5)
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

// Load Users with optional filter
async function loadUsers(filter = 'all-users') {
    try {
        const usersTableBody = document.getElementById('users-table-body');
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

        let query = db.collection('users');
        
        // Apply filter
        if (filter === 'sellers') {
            query = query.where('role', '==', 'seller');
        } else if (filter === 'buyers') {
            query = query.where('role', '==', 'buyer');
        } else if (filter === 'admins') {
            query = query.where('role', '==', 'admin');
        }
        
        const usersSnapshot = await query.get();
        
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
                    <button class="btn btn-sm btn-outline" onclick="editUser('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
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

// Load Pending Cars (with optional status filter)
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
                    ${status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveCar('${doc.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectCar('${doc.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline" onclick="viewCar('${doc.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
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
                    <button class="btn btn-sm btn-outline" onclick="viewAuction('${doc.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="toggleAuction('${doc.id}', '${auction.status}')">
                        <i class="fas fa-${auction.status === 'active' ? 'pause' : 'play'}"></i>
                    </button>
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

// Handle Add User
async function handleAddUser(e) {
    e.preventDefault();
    
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const role = document.getElementById('user-role').value;
    const password = document.getElementById('user-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    try {
        submitBtn.disabled = true;
        document.getElementById('create-user-text').classList.add('hidden');
        document.getElementById('create-user-loading').classList.remove('hidden');

        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('User created successfully!', 'success');
        document.getElementById('add-user-modal').style.display = 'none';
        document.getElementById('add-user-form').reset();
        
        // Reload users list
        loadUsers();

    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Error creating user: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        document.getElementById('create-user-text').classList.remove('hidden');
        document.getElementById('create-user-loading').classList.add('hidden');
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

        // Get car details
        const carDoc = await db.collection('cars').doc(carId).get();
        if (!carDoc.exists) {
            throw new Error('Car not found');
        }
        
        const car = carDoc.data();

        // Create auction document
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

        // Update car status to 'onAuction'
        await db.collection('cars').doc(carId).update({
            status: 'onAuction',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Auction created successfully!', 'success');
        document.getElementById('create-auction-modal').style.display = 'none';
        document.getElementById('create-auction-form').reset();
        
        // Reload auctions list
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

// Load Cars for Auction Creation
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

// User Management Functions
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        try {
            await db.collection('users').doc(userId).delete();
            showNotification('User deleted successfully!', 'success');
            loadUsers();
            loadDashboardData();
        } catch (error) {
            console.error('Error deleting user:', error);
            showNotification('Error deleting user', 'error');
        }
    }
}

function editUser(userId) {
    showNotification('Edit user functionality coming soon', 'info');
    // TODO: Implement edit user modal and functionality
}

// Car Management Functions
function viewCar(carId) {
    showNotification('View car details functionality coming soon', 'info');
    // TODO: Implement view car modal with full details
}

// Auction Management Functions
function viewAuction(auctionId) {
    showNotification('View auction details functionality coming soon', 'info');
    // TODO: Implement view auction modal with full details
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
        
        // Save to Firestore settings collection
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
        
        // Save to Firestore settings collection
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
    // Charts are already initialized, just update with real data if needed
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
    // Simple alert for now - can be enhanced with custom notification UI
    alert(message);
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Admin User Creation Utility (for initial setup)
async function createAdminUser(email, password, name) {
    try {
        // Save current user state
        const previousUser = auth.currentUser;
        
        // Create new admin user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const adminData = {
            name: name,
            email: email,
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(user.uid).set(adminData);
        console.log('Admin user created successfully:', email);
        
        // Sign out the new admin and sign back in as previous user if exists
        await auth.signOut();
        
        if (previousUser) {
            console.log('Please sign back in with your admin credentials');
        }
        
        return true;
    } catch (error) {
        console.error('Error creating admin:', error);
        return false;
    }
}
// Admin User Creation Utility
async function createAdminUser(email, password, name) {
    try {
        console.log('Creating admin user:', email);
        
        // Create new admin user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const adminData = {
            name: name,
            email: email,
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };
        
        await db.collection('users').doc(user.uid).set(adminData);
        console.log('Admin user created successfully:', email);
        
        showNotification(`Admin user "${name}" created successfully!`, 'success');
        
        return true;
    } catch (error) {
        console.error('Error creating admin:', error);
        showNotification('Error creating admin: ' + error.message, 'error');
        return false;
    }
}

// Seller Creation Utility
async function createSellerUser(email, password, name, phone = '', address = '') {
    try {
        console.log('Creating seller user:', email);
        
        // Create new seller user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const sellerData = {
            name: name,
            email: email,
            role: 'seller',
            phone: phone,
            address: address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };
        
        await db.collection('users').doc(user.uid).set(sellerData);
        console.log('Seller user created successfully:', email);
        
        showNotification(`Seller user "${name}" created successfully!`, 'success');
        
        return true;
    } catch (error) {
        console.error('Error creating seller:', error);
        showNotification('Error creating seller: ' + error.message, 'error');
        return false;
    }
}

// Quick User Creation Panel (for admin dashboard)
function showQuickUserCreation() {
    const email = prompt('Enter email for new user:');
    if (!email) return;
    
    const password = prompt('Enter temporary password:');
    if (!password) return;
    
    const name = prompt('Enter full name:');
    if (!name) return;
    
    const role = prompt('Enter role (admin/seller/buyer):', 'buyer');
    if (!role) return;
    
    if (confirm(`Create ${role} user?\nName: ${name}\nEmail: ${email}`)) {
        if (role === 'admin') {
            createAdminUser(email, password, name);
        } else if (role === 'seller') {
            createSellerUser(email, password, name);
        } else {
            // For buyer, use the standard registration flow
            alert('For buyer accounts, please use the public registration form.');
        }
    }
}

// Make functions globally accessible (add to existing window exports)
window.createAdminUser = createAdminUser;
window.createSellerUser = createSellerUser;
window.showQuickUserCreation = showQuickUserCreation;

console.log('Admin utilities loaded');
console.log('Quick user creation: showQuickUserCreation()');
console.log('Admin creation: createAdminUser("admin@example.com", "password123", "Admin Name")');
console.log('Seller creation: createSellerUser("seller@example.com", "password123", "Seller Name")');

// Expose createAdminUser to window for console access
window.createAdminUser = createAdminUser;

// Make functions globally accessible
window.approveCar = approveCar;
window.rejectCar = rejectCar;
window.deleteUser = deleteUser;
window.editUser = editUser;
window.viewCar = viewCar;
window.viewAuction = viewAuction;
window.toggleAuction = toggleAuction;

console.log('Admin dashboard loaded successfully');
console.log('To create an admin user, use: createAdminUser("email@example.com", "password", "Admin Name")');