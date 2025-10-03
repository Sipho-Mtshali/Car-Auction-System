// User Dashboard JavaScript
let salesChart;
let userFavorites = [];

// Wait for Firebase and currentUser to be ready
function waitForAuth() {
    return new Promise((resolve) => {
        if (typeof auth === 'undefined') {
            setTimeout(() => waitForAuth().then(resolve), 100);
        } else {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        }
    });
}

// Initialize User Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await waitForAuth();
        
        if (!currentUser) {
            alert('Please login to access your dashboard.');
            window.location.href = '../html/login.html';
            return;
        }
        
        // Check if user is admin - redirect to admin panel
        if (currentUser.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
            return;
        }

        // Initialize dashboard based on role
        setupDashboardByRole();
        setupEventListeners();
        loadDashboardData();
        loadRecentActivity();
        loadFavorites();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard. Please try again.');
    }
});

// Setup Dashboard Based on User Role
function setupDashboardByRole() {
    const isSeller = currentUser.role === 'seller';
    
    // Show/hide seller-specific elements
    const sellerElements = [
        'nav-my-cars',
        'nav-list-car',
        'nav-my-sales',
        'card-my-cars',
        'card-earnings',
        'action-list-car'
    ];
    
    sellerElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = isSeller ? 'block' : 'none';
        }
    });
    
    // Update welcome message
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = currentUser.name || 'User';
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
            
            navigateTo(page);
        });
    });

    // Tabs
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

    // Forms
    const listCarForm = document.getElementById('list-car-form');
    if (listCarForm) {
        listCarForm.addEventListener('submit', handleListCar);
    }
    
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleUpdateProfile);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refresh-dashboard-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardData();
            this.innerHTML = '<i class="fas fa-check"></i> Refreshed!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-sync"></i> Refresh';
            }, 2000);
        });
    }

    // Search in auctions
    const auctionSearch = document.getElementById('auction-search');
    if (auctionSearch) {
        auctionSearch.addEventListener('input', function() {
            loadAuctions(this.value);
        });
    }

    // Close modals
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Profile photo upload
    const profilePhoto = document.getElementById('profile-photo');
    if (profilePhoto) {
        profilePhoto.addEventListener('change', handleProfilePhotoPreview);
    }
}

// Navigate to page
function navigateTo(page) {
    const navLinks = document.querySelectorAll('.nav-links a:not(#logout-btn)');
    navLinks.forEach(l => l.classList.remove('active'));
    
    const targetLink = document.querySelector(`[data-page="${page}"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }
    
    const pageContents = document.querySelectorAll('[id$="-content"]');
    pageContents.forEach(content => content.classList.add('hidden'));
    
    const targetContent = document.getElementById(`${page}-content`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }
    
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    
    loadPageContent(page);
}

// Load page content
function loadPageContent(page) {
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'my-cars':
            loadMyCars();
            break;
        case 'auctions':
            loadAuctions();
            break;
        case 'my-bids':
            loadMyBids();
            break;
        case 'my-sales':
            loadMySales();
            break;
        case 'favorites':
            loadFavorites();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// Load tab content
function loadTabContent(tabId) {
    switch(tabId) {
        case 'all-my-cars':
        case 'pending-my-cars':
        case 'approved-my-cars':
        case 'on-auction-my-cars':
            loadMyCars(tabId);
            break;
        case 'active-bids':
        case 'won-bids':
        case 'lost-bids':
            loadMyBids(tabId);
            break;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load stats based on role
        if (currentUser.role === 'seller') {
            await loadSellerStats();
        }
        
        await loadBuyerStats();
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load Seller Stats
async function loadSellerStats() {
    try {
        // Get seller's cars
        const carsSnapshot = await db.collection('cars')
            .where('sellerId', '==', currentUser.uid)
            .get();
        
        const totalCars = carsSnapshot.size;
        const activeCars = carsSnapshot.docs.filter(doc => 
            doc.data().status === 'approved' || doc.data().status === 'onAuction'
        ).length;
        
        document.getElementById('stat-my-cars').textContent = totalCars;
        document.getElementById('stat-active-listings').textContent = `${activeCars} active`;
        
        // Get completed auctions (sales)
        const salesSnapshot = await db.collection('auctions')
            .where('sellerId', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .get();
        
        let totalEarnings = 0;
        salesSnapshot.forEach(doc => {
            const auction = doc.data();
            totalEarnings += auction.finalPrice || auction.currentBid || 0;
        });
        
        document.getElementById('stat-earnings').textContent = `R${totalEarnings.toLocaleString()}`;
        document.getElementById('stat-sold-cars').textContent = `${salesSnapshot.size} cars sold`;
        
    } catch (error) {
        console.error('Error loading seller stats:', error);
    }
}

// Load Buyer Stats
async function loadBuyerStats() {
    try {
        // Get active bids
        const bidsSnapshot = await db.collection('bids')
            .where('bidderId', '==', currentUser.uid)
            .get();
        
        const activeBids = new Set();
        const winningBids = [];
        
        for (const doc of bidsSnapshot.docs) {
            const bid = doc.data();
            activeBids.add(bid.auctionId);
            
            // Check if this is the highest bid
            const auctionDoc = await db.collection('auctions').doc(bid.auctionId).get();
            if (auctionDoc.exists) {
                const auction = auctionDoc.data();
                if (auction.status === 'active' && auction.highestBidderId === currentUser.uid) {
                    winningBids.push(bid.auctionId);
                }
            }
        }
        
        document.getElementById('stat-active-bids').textContent = activeBids.size;
        document.getElementById('stat-winning').textContent = `${winningBids.length} winning`;
        
        // Get favorites
        document.getElementById('stat-favorites').textContent = userFavorites.length;
        
    } catch (error) {
        console.error('Error loading buyer stats:', error);
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activityBody = document.getElementById('recent-activity-body');
        if (!activityBody) return;
        
        activityBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        
        const activities = [];
        
        // Get recent bids
        const bidsSnapshot = await db.collection('bids')
            .where('bidderId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        for (const doc of bidsSnapshot.docs) {
            const bid = doc.data();
            const auctionDoc = await db.collection('auctions').doc(bid.auctionId).get();
            
            if (auctionDoc.exists) {
                const auction = auctionDoc.data();
                const carDoc = await db.collection('cars').doc(auction.carId).get();
                
                if (carDoc.exists) {
                    const car = carDoc.data();
                    activities.push({
                        type: 'bid',
                        description: 'Placed bid',
                        car: `${car.brand} ${car.model}`,
                        amount: bid.amount,
                        date: bid.createdAt?.toDate(),
                        status: auction.highestBidderId === currentUser.uid ? 'winning' : 'outbid'
                    });
                }
            }
        }
        
        // Sort by date
        activities.sort((a, b) => b.date - a.date);
        
        activityBody.innerHTML = '';
        
        if (activities.length === 0) {
            activityBody.innerHTML = '<tr><td colspan="5" class="text-center">No recent activity</td></tr>';
            return;
        }
        
        activities.forEach(activity => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${activity.description}</td>
                <td>${activity.car}</td>
                <td>R${activity.amount.toLocaleString()}</td>
                <td>${formatDate(activity.date)}</td>
                <td><span class="status-badge status-${activity.status === 'winning' ? 'active' : 'pending'}">${activity.status}</span></td>
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

// Load My Cars (Seller)
async function loadMyCars(filter = 'all-my-cars') {
    try {
        const carsGrid = document.getElementById('my-cars-grid');
        if (!carsGrid) return;
        
        carsGrid.innerHTML = '<p style="text-align: center; width: 100%;">Loading...</p>';
        
        let query = db.collection('cars').where('sellerId', '==', currentUser.uid);
        
        // Apply filter
        const statusMap = {
            'pending-my-cars': 'pending',
            'approved-my-cars': 'approved',
            'on-auction-my-cars': 'onAuction'
        };
        
        if (statusMap[filter]) {
            query = query.where('status', '==', statusMap[filter]);
        }
        
        const carsSnapshot = await query.get();
        
        carsGrid.innerHTML = '';
        
        if (carsSnapshot.empty) {
            carsGrid.innerHTML = '<p style="text-align: center; width: 100%;">No cars found</p>';
            return;
        }
        
        carsSnapshot.forEach(doc => {
            const car = doc.data();
            const carCard = createCarCard(doc.id, car, true);
            carsGrid.appendChild(carCard);
        });
        
    } catch (error) {
        console.error('Error loading my cars:', error);
        const carsGrid = document.getElementById('my-cars-grid');
        if (carsGrid) {
            carsGrid.innerHTML = '<p style="text-align: center; width: 100%;">Error loading cars</p>';
        }
    }
}

// Load Auctions
async function loadAuctions(searchTerm = '') {
    try {
        const auctionsGrid = document.getElementById('auctions-grid');
        if (!auctionsGrid) return;
        
        auctionsGrid.innerHTML = '<p style="text-align: center; width: 100%;">Loading...</p>';
        
        const auctionsSnapshot = await db.collection('auctions')
            .where('status', '==', 'active')
            .get();
        
        auctionsGrid.innerHTML = '';
        
        if (auctionsSnapshot.empty) {
            auctionsGrid.innerHTML = '<p style="text-align: center; width: 100%;">No active auctions</p>';
            return;
        }
        
        for (const doc of auctionsSnapshot.docs) {
            const auction = doc.data();
            const carDoc = await db.collection('cars').doc(auction.carId).get();
            
            if (carDoc.exists) {
                const car = carDoc.data();
                
                // Apply search filter
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matches = 
                        car.brand?.toLowerCase().includes(searchLower) ||
                        car.model?.toLowerCase().includes(searchLower);
                    
                    if (!matches) continue;
                }
                
                const auctionCard = createAuctionCard(doc.id, auction, car);
                auctionsGrid.appendChild(auctionCard);
            }
        }
        
        if (auctionsGrid.children.length === 0) {
            auctionsGrid.innerHTML = '<p style="text-align: center; width: 100%;">No auctions match your search</p>';
        }
        
    } catch (error) {
        console.error('Error loading auctions:', error);
        const auctionsGrid = document.getElementById('auctions-grid');
        if (auctionsGrid) {
            auctionsGrid.innerHTML = '<p style="text-align: center; width: 100%;">Error loading auctions</p>';
        }
    }
}

// Load My Bids
async function loadMyBids(filter = 'active-bids') {
    try {
        const bidsBody = document.getElementById('active-bids-body');
        if (!bidsBody) return;
        
        bidsBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        
        const bidsSnapshot = await db.collection('bids')
            .where('bidderId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const bidsMap = new Map();
        
        for (const doc of bidsSnapshot.docs) {
            const bid = doc.data();
            if (!bidsMap.has(bid.auctionId) || bid.amount > bidsMap.get(bid.auctionId).amount) {
                bidsMap.set(bid.auctionId, bid);
            }
        }
        
        bidsBody.innerHTML = '';
        
        if (bidsMap.size === 0) {
            bidsBody.innerHTML = '<tr><td colspan="6" class="text-center">No bids found</td></tr>';
            return;
        }
        
        for (const [auctionId, bid] of bidsMap) {
            const auctionDoc = await db.collection('auctions').doc(auctionId).get();
            
            if (!auctionDoc.exists) continue;
            
            const auction = auctionDoc.data();
            
            // Filter by status
            let shouldShow = false;
            if (filter === 'active-bids' && auction.status === 'active') {
                shouldShow = true;
            } else if (filter === 'won-bids' && auction.status === 'completed' && auction.highestBidderId === currentUser.uid) {
                shouldShow = true;
            } else if (filter === 'lost-bids' && auction.status === 'completed' && auction.highestBidderId !== currentUser.uid) {
                shouldShow = true;
            }
            
            if (!shouldShow) continue;
            
            const carDoc = await db.collection('cars').doc(auction.carId).get();
            if (!carDoc.exists) continue;
            
            const car = carDoc.data();
            const isWinning = auction.highestBidderId === currentUser.uid;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${car.brand} ${car.model} (${car.year})</td>
                <td>R${bid.amount.toLocaleString()}</td>
                <td>R${auction.currentBid.toLocaleString()}</td>
                <td>${calculateTimeLeft(auction.endTime?.toDate())}</td>
                <td><span class="status-badge status-${isWinning ? 'active' : 'pending'}">${isWinning ? 'Winning' : 'Outbid'}</span></td>
                <td>
                    ${auction.status === 'active' ? `
                        <button class="btn btn-sm btn-primary" onclick="showBidModal('${auctionId}')">
                            <i class="fas fa-gavel"></i> Bid
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline" onclick="viewAuctionDetails('${auctionId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            bidsBody.appendChild(row);
        }
        
        if (bidsBody.children.length === 0) {
            bidsBody.innerHTML = '<tr><td colspan="6" class="text-center">No bids found</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading my bids:', error);
        const bidsBody = document.getElementById('active-bids-body');
        if (bidsBody) {
            bidsBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading bids</td></tr>';
        }
    }
}

// Load My Sales (Seller)
async function loadMySales() {
    try {
        const salesBody = document.getElementById('sales-history-body');
        if (!salesBody) return;
        
        salesBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        
        const salesSnapshot = await db.collection('auctions')
            .where('sellerId', '==', currentUser.uid)
            .where('status', '==', 'completed')
            .get();
        
        salesBody.innerHTML = '';
        
        if (salesSnapshot.empty) {
            salesBody.innerHTML = '<tr><td colspan="5" class="text-center">No sales yet</td></tr>';
            
            // Update stats
            document.getElementById('total-sales-count').textContent = '0';
            document.getElementById('total-revenue').textContent = 'R0';
            document.getElementById('avg-sale-price').textContent = 'R0';
            
            return;
        }
        
        let totalRevenue = 0;
        const salesData = [];
        
        for (const doc of salesSnapshot.docs) {
            const auction = doc.data();
            const finalPrice = auction.finalPrice || auction.currentBid || 0;
            totalRevenue += finalPrice;
            
            const carDoc = await db.collection('cars').doc(auction.carId).get();
            const buyerDoc = await db.collection('users').doc(auction.highestBidderId).get();
            
            const car = carDoc.exists ? carDoc.data() : {};
            const buyer = buyerDoc.exists ? buyerDoc.data() : {};
            
            salesData.push({
                car: `${car.brand || 'Unknown'} ${car.model || ''} (${car.year || ''})`,
                buyer: buyer.name || 'Unknown',
                price: finalPrice,
                date: auction.endTime?.toDate()
            });
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${salesData[salesData.length - 1].car}</td>
                <td>${salesData[salesData.length - 1].buyer}</td>
                <td>R${finalPrice.toLocaleString()}</td>
                <td>${formatDate(auction.endTime?.toDate())}</td>
                <td><span class="status-badge status-approved">Completed</span></td>
            `;
            salesBody.appendChild(row);
        }
        
        // Update stats
        document.getElementById('total-sales-count').textContent = salesSnapshot.size;
        document.getElementById('total-revenue').textContent = `R${totalRevenue.toLocaleString()}`;
        document.getElementById('avg-sale-price').textContent = `R${Math.round(totalRevenue / salesSnapshot.size).toLocaleString()}`;
        
        // Initialize sales chart
        initializeSalesChart(salesData);
        
    } catch (error) {
        console.error('Error loading sales:', error);
        const salesBody = document.getElementById('sales-history-body');
        if (salesBody) {
            salesBody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading sales</td></tr>';
        }
    }
}

// Initialize Sales Chart
function initializeSalesChart(salesData) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    // Group sales by month
    const monthlyData = {};
    salesData.forEach(sale => {
        if (sale.date) {
            const month = sale.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthlyData[month] = (monthlyData[month] || 0) + sale.price;
        }
    });
    
    const labels = Object.keys(monthlyData);
    const data = Object.values(monthlyData);
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sales Revenue (R)',
                data: data,
                borderColor: '#06d6a0',
                backgroundColor: 'rgba(6, 214, 160, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
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

// Load Favorites
async function loadFavorites() {
    try {
        const favoritesGrid = document.getElementById('favorites-grid');
        if (!favoritesGrid) return;
        
        favoritesGrid.innerHTML = '<p style="text-align: center; width: 100%;">Loading...</p>';
        
        // Get user's favorites
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        userFavorites = userDoc.exists && userDoc.data().favorites ? userDoc.data().favorites : [];
        
        favoritesGrid.innerHTML = '';
        
        if (userFavorites.length === 0) {
            favoritesGrid.innerHTML = '<p style="text-align: center; width: 100%;">No favorites yet</p>';
            return;
        }
        
        for (const carId of userFavorites) {
            const carDoc = await db.collection('cars').doc(carId).get();
            if (carDoc.exists) {
                const car = carDoc.data();
                const carCard = createCarCard(carId, car, false);
                favoritesGrid.appendChild(carCard);
            }
        }
        
    } catch (error) {
        console.error('Error loading favorites:', error);
        const favoritesGrid = document.getElementById('favorites-grid');
        if (favoritesGrid) {
            favoritesGrid.innerHTML = '<p style="text-align: center; width: 100%;">Error loading favorites</p>';
        }
    }
}

// Load Profile
async function loadProfile() {
    try {
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profilePhone = document.getElementById('profile-phone');
        const profileRole = document.getElementById('profile-role');
        const profileAddress = document.getElementById('profile-address');
        const profileAvatar = document.getElementById('profile-avatar');
        
        if (profileName) profileName.value = currentUser.name || '';
        if (profileEmail) profileEmail.value = currentUser.email || '';
        if (profilePhone) profilePhone.value = currentUser.phone || '';
        if (profileRole) profileRole.value = capitalizeFirst(currentUser.role || 'user');
        if (profileAddress) profileAddress.value = currentUser.address || '';
        
        if (profileAvatar && currentUser.photoURL) {
            profileAvatar.src = currentUser.photoURL;
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Handle List Car
async function handleListCar(e) {
    e.preventDefault();
    
    const brand = document.getElementById('car-brand').value;
    const model = document.getElementById('car-model').value;
    const year = parseInt(document.getElementById('car-year').value);
    const price = parseFloat(document.getElementById('car-price').value);
    const mileage = parseFloat(document.getElementById('car-mileage').value);
    const condition = document.getElementById('car-condition').value;
    const color = document.getElementById('car-color').value;
    const transmission = document.getElementById('car-transmission').value;
    const description = document.getElementById('car-description').value;
    const images = document.getElementById('car-images').files;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        // Upload images
        const imageUrls = [];
        for (let i = 0; i < Math.min(images.length, 5); i++) {
            const image = images[i];
            const imageRef = storage.ref(`car-images/${currentUser.uid}/${Date.now()}_${image.name}`);
            const uploadTask = await imageRef.put(image);
            const imageUrl = await uploadTask.ref.getDownloadURL();
            imageUrls.push(imageUrl);
        }
        
        // Create car document
        const carData = {
            brand,
            model,
            year,
            price,
            mileage,
            condition,
            color,
            transmission,
            description,
            images: imageUrls,
            sellerId: currentUser.uid,
            sellerName: currentUser.name,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('cars').add(carData);
        
        showNotification('Car submitted for approval!', 'success');
        document.getElementById('list-car-form').reset();
        navigateTo('my-cars');
        
    } catch (error) {
        console.error('Error listing car:', error);
        showNotification('Error listing car: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-upload"></i> Submit for Approval';
    }
}

// Handle Update Profile
async function handleUpdateProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const address = document.getElementById('profile-address').value;
    const photoFile = document.getElementById('profile-photo').files[0];
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        const updateData = {
            name,
            phone,
            address,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Upload new photo if selected
        if (photoFile) {
            const photoRef = storage.ref(`profile-photos/${currentUser.uid}/${Date.now()}_${photoFile.name}`);
            const uploadTask = await photoRef.put(photoFile);
            const photoURL = await uploadTask.ref.getDownloadURL();
            updateData.photoURL = photoURL;
        }
        
        await db.collection('users').doc(currentUser.uid).update(updateData);
        
        // Update current user object
        Object.assign(currentUser, updateData);
        updateUserUI();
        
        showNotification('Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

// Handle Profile Photo Preview
function handleProfilePhotoPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profile-avatar').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Create Car Card
function createCarCard(carId, car, isOwner) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cursor = 'pointer';
    
    const imageUrl = car.images && car.images[0] ? car.images[0] : 'https://via.placeholder.com/300x200?text=No+Image';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${car.brand} ${car.model}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px 10px 0 0;">
        <div style="padding: 15px;">
            <h3 style="margin-bottom: 10px;">${car.brand} ${car.model}</h3>
            <p style="color: var(--gray); margin-bottom: 10px;">${car.year} • ${car.mileage?.toLocaleString()} km</p>
            <h4 style="color: var(--primary); margin-bottom: 10px;">R${car.price?.toLocaleString()}</h4>
            <span class="status-badge status-${car.status === 'approved' ? 'active' : car.status === 'pending' ? 'pending' : 'inactive'}">${capitalizeFirst(car.status || 'unknown')}</span>
            ${!isOwner ? `
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-sm btn-primary" style="flex: 1;" onclick="viewCarDetails('${carId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="toggleFavorite('${carId}')">
                        <i class="fas fa-heart${userFavorites.includes(carId) ? '' : '-o'}"></i>
                    </button>
                </div>
            ` : `
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="viewCarDetails('${carId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCar('${carId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `}
        </div>
    `;
    
    return card;
}

// Create Auction Card
function createAuctionCard(auctionId, auction, car) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.position = 'relative';
    
    const imageUrl = car.images && car.images[0] ? car.images[0] : 'https://via.placeholder.com/320x200?text=No+Image';
    const timeLeft = calculateTimeLeft(auction.endTime?.toDate());
    const isEnding = timeLeft.includes('h') || timeLeft.includes('m');
    
    card.innerHTML = `
        <div style="position: absolute; top: 10px; right: 10px; background: ${isEnding ? 'var(--danger)' : 'var(--dark)'}; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
            <i class="fas fa-clock"></i> ${timeLeft}
        </div>
        <img src="${imageUrl}" alt="${car.brand} ${car.model}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px 10px 0 0;">
        <div style="padding: 15px;">
            <h3 style="margin-bottom: 10px;">${car.brand} ${car.model}</h3>
            <p style="color: var(--gray); margin-bottom: 10px;">${car.year} • ${car.mileage?.toLocaleString()} km</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <p style="color: var(--gray); font-size: 0.9rem;">Current Bid</p>
                    <h4 style="color: var(--primary);">R${auction.currentBid?.toLocaleString()}</h4>
                </div>
                <div style="text-align: right;">
                    <p style="color: var(--gray); font-size: 0.9rem;">Bids</p>
                    <h4>${auction.bidCount || 0}</h4>
                </div>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="showBidModal('${auctionId}')">
                <i class="fas fa-gavel"></i> Place Bid
            </button>
        </div>
    `;
    
    return card;
}

// Show Bid Modal
async function showBidModal(auctionId) {
    try {
        const modal = document.getElementById('bid-modal');
        const modalBody = document.getElementById('bid-modal-body');
        
        const auctionDoc = await db.collection('auctions').doc(auctionId).get();
        if (!auctionDoc.exists) {
            showNotification('Auction not found', 'error');
            return;
        }
        
        const auction = auctionDoc.data();
        const carDoc = await db.collection('cars').doc(auction.carId).get();
        const car = carDoc.exists ? carDoc.data() : {};
        
        modalBody.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3>${car.brand} ${car.model} (${car.year})</h3>
                <p style="color: var(--gray);">Current Bid: R${auction.currentBid?.toLocaleString()}</p>
                <p style="color: var(--gray);">Bid Increment: R${auction.bidIncrement?.toLocaleString()}</p>
            </div>
            
            <form id="place-bid-form">
                <div class="form-group">
                    <label for="bid-amount">Your Bid Amount (R)</label>
                    <input type="number" id="bid-amount" class="form-control" 
                           min="${auction.currentBid + auction.bidIncrement}" 
                           value="${auction.currentBid + auction.bidIncrement}" 
                           step="${auction.bidIncrement}" required>
                    <p style="color: var(--gray); font-size: 0.85rem; margin-top: 5px;">
                        Minimum bid: R${(auction.currentBid + auction.bidIncrement).toLocaleString()}
                    </p>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-gavel"></i> Place Bid
                </button>
            </form>
        `;
        
        modal.style.display = 'flex';
        
        // Handle bid form submission
        const bidForm = document.getElementById('place-bid-form');
        bidForm.onsubmit = async (e) => {
            e.preventDefault();
            await placeBid(auctionId, parseFloat(document.getElementById('bid-amount').value));
        };
        
    } catch (error) {
        console.error('Error showing bid modal:', error);
        showNotification('Error loading auction details', 'error');
    }
}

// Place Bid
async function placeBid(auctionId, amount) {
    try {
        const auctionDoc = await db.collection('auctions').doc(auctionId).get();
        if (!auctionDoc.exists) {
            showNotification('Auction not found', 'error');
            return;
        }
        
        const auction = auctionDoc.data();
        
        // Validate bid amount
        if (amount < auction.currentBid + auction.bidIncrement) {
            showNotification(`Bid must be at least R${(auction.currentBid + auction.bidIncrement).toLocaleString()}`, 'error');
            return;
        }
        
        // Create bid document
        const bidData = {
            auctionId: auctionId,
            bidderId: currentUser.uid,
            bidderName: currentUser.name,
            amount: amount,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('bids').add(bidData);
        
        // Update auction with new bid
        await db.collection('auctions').doc(auctionId).update({
            currentBid: amount,
            highestBidderId: currentUser.uid,
            highestBidderName: currentUser.name,
            bidCount: (auction.bidCount || 0) + 1,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Bid placed successfully!', 'success');
        document.getElementById('bid-modal').style.display = 'none';
        
        // Reload relevant data
        loadDashboardData();
        if (document.getElementById('auctions-content').classList.contains('hidden') === false) {
            loadAuctions();
        }
        if (document.getElementById('my-bids-content').classList.contains('hidden') === false) {
            loadMyBids();
        }
        
    } catch (error) {
        console.error('Error placing bid:', error);
        showNotification('Error placing bid: ' + error.message, 'error');
    }
}

// Toggle Favorite
async function toggleFavorite(carId) {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const favorites = userData.favorites || [];
        
        const isFavorite = favorites.includes(carId);
        
        if (isFavorite) {
            // Remove from favorites
            const index = favorites.indexOf(carId);
            favorites.splice(index, 1);
            showNotification('Removed from favorites', 'info');
        } else {
            // Add to favorites
            favorites.push(carId);
            showNotification('Added to favorites', 'success');
        }
        
        await db.collection('users').doc(currentUser.uid).update({
            favorites: favorites,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        userFavorites = favorites;
        
        // Update UI
        loadFavorites();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Error updating favorites', 'error');
    }
}

// Delete Car (Seller only)
async function deleteCar(carId) {
    if (confirm('Are you sure you want to delete this car listing? This action cannot be undone.')) {
        try {
            await db.collection('cars').doc(carId).delete();
            showNotification('Car listing deleted successfully!', 'success');
            loadMyCars();
            loadDashboardData();
        } catch (error) {
            console.error('Error deleting car:', error);
            showNotification('Error deleting car listing', 'error');
        }
    }
}

// View Car Details
function viewCarDetails(carId) {
    showNotification('Car details view coming soon', 'info');
    // TODO: Implement car details modal with full information and image gallery
}

// View Auction Details
function viewAuctionDetails(auctionId) {
    showNotification('Auction details view coming soon', 'info');
    // TODO: Implement auction details modal with bidding history and car details
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

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showNotification(message, type = 'info') {
    // Simple alert for now - can be enhanced with custom notification UI
    alert(message);
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Make functions globally accessible
window.navigateTo = navigateTo;
window.showBidModal = showBidModal;
window.placeBid = placeBid;
window.toggleFavorite = toggleFavorite;
window.deleteCar = deleteCar;
window.viewCarDetails = viewCarDetails;
window.viewAuctionDetails = viewAuctionDetails;

console.log('User dashboard loaded successfully');