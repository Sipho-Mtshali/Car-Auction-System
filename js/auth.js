// Authentication state management
let currentUser = null;

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Get user data from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userDoc.data()
                };
                
                // Update UI with user info
                updateUserUI();
                
                console.log('User authenticated:', currentUser.email, 'Role:', currentUser.role);
            } else {
                console.error('User document not found');
                handleAuthError();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            handleAuthError();
        }
    } else {
        // No user signed in - redirect to login only if on protected pages
        const currentPath = window.location.pathname;
        const publicPages = ['login.html', 'register.html', 'index.html'];
        const isPublicPage = publicPages.some(page => currentPath.includes(page));
        
        if (!isPublicPage) {
            console.log('Not authenticated, redirecting to login...');
            window.location.href = '../html/login.html';
        }
    }
});

// Update user UI
function updateUserUI() {
    if (currentUser) {
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        const userAvatarEl = document.getElementById('user-avatar');
        
        if (userNameEl) userNameEl.textContent = currentUser.name || 'User';
        if (userRoleEl) userRoleEl.textContent = capitalizeFirst(currentUser.role || 'User');
        if (userAvatarEl) {
            const avatarName = encodeURIComponent(currentUser.name || 'User');
            userAvatarEl.src = `https://ui-avatars.com/api/?name=${avatarName}&background=3a86ff&color=fff`;
        }
    }
}

// Helper function to capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Handle authentication errors
function handleAuthError() {
    alert('Authentication error. Please sign in again.');
    auth.signOut().then(() => {
        window.location.href = '../html/login.html';
    }).catch(error => {
        console.error('Error signing out:', error);
    });
}

// Login User Function
async function loginUser(email, password) {
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    const loginBtn = document.querySelector('#login-form button[type="submit"]');
    
    try {
        console.log('Attempting login for:', email);
        
        // Update button state
        loginBtn.disabled = true;
        if (loginText) loginText.classList.add('hidden');
        if (loginLoading) loginLoading.classList.remove('hidden');
        
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('Firebase auth successful:', user.uid);
        
        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User profile not found. Please contact support.');
        }
        
        const userData = userDoc.data();
        console.log('User data retrieved:', userData.role);
        
        // Show success message
        alert('Login successful! Welcome back, ' + (userData.name || 'User') + '!');
        
        // Redirect based on role
        if (userData.role === 'admin') {
            console.log('Redirecting to admin dashboard...');
            window.location.href = 'admin-dashboard.html';
        } else if (userData.role === 'seller' || userData.role === 'buyer') {
            console.log('Redirecting to user dashboard...');
            window.location.href = 'user-dashboard.html';
        } else {
            throw new Error('Invalid user role: ' + userData.role);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please check your credentials.';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format. Please check your email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection.';
                break;
            default:
                if (error.message) {
                    errorMessage = error.message;
                }
        }
        
        alert(errorMessage);
        
        // Reset button state
        loginBtn.disabled = false;
        if (loginText) loginText.classList.remove('hidden');
        if (loginLoading) loginLoading.classList.add('hidden');
    }
}

// Register User Function
async function registerUser(userData) {
    const registerText = document.getElementById('register-text');
    const registerLoading = document.getElementById('register-loading');
    const registerBtn = document.querySelector('#register-form button[type="submit"]');
    
    try {
        console.log('Starting registration for:', userData.email);
        
        // Update button state
        registerBtn.disabled = true;
        if (registerText) registerText.classList.add('hidden');
        if (registerLoading) registerLoading.classList.remove('hidden');
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        // Validate password strength
        if (userData.password.length < 6) {
            throw new Error('Password must be at least 6 characters long.');
        }
        
        // Create user in Firebase Auth
        console.log('Creating Firebase auth account...');
        const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
        const user = userCredential.user;
        
        console.log('Firebase auth account created:', user.uid);
        
        // Prepare user data for Firestore
        const firestoreData = {
            name: userData.name,
            email: userData.email,
            role: 'buyer', // Fixed - only buyers can register through public registration
            phone: userData.phone,
            address: userData.address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            photoURL: null
        };
        
        console.log('Uploading profile data to Firestore...');
        
        // Handle profile photo upload if provided
        if (userData.photo) {
            try {
                console.log('Uploading profile photo...');
                const photoRef = storage.ref(`profile-photos/${user.uid}/${Date.now()}_${userData.photo.name}`);
                const uploadTask = await photoRef.put(userData.photo);
                const photoURL = await uploadTask.ref.getDownloadURL();
                firestoreData.photoURL = photoURL;
                console.log('Photo uploaded successfully:', photoURL);
            } catch (photoError) {
                console.error('Error uploading photo:', photoError);
                // Continue registration even if photo upload fails
                console.log('Continuing registration without photo...');
            }
        }
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set(firestoreData);
        
        console.log('User profile created successfully in Firestore');
        
        // Update Firebase Auth display name
        try {
            await user.updateProfile({
                displayName: userData.name
            });
            console.log('Firebase Auth profile updated');
        } catch (profileError) {
            console.error('Error updating auth profile:', profileError);
            // Non-critical error, continue
        }
        
        // Show success message
        alert(`🎉 Welcome to CarAuction, ${userData.name}!\n\nYour account has been created successfully. You can now start browsing and bidding on cars!`);
        
        // Redirect to user dashboard
        console.log('Redirecting to user dashboard...');
        window.location.href = 'user-dashboard.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please login instead or use a different email.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use at least 6 characters with a mix of letters and numbers.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format. Please check your email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Registration is currently disabled. Please contact support.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            default:
                if (error.message) {
                    errorMessage = error.message;
                }
        }
        
        alert('❌ Registration Failed\n\n' + errorMessage);
        
        // If user was created in auth but Firestore failed, clean up
        if (auth.currentUser && error.code !== 'auth/email-already-in-use') {
            console.log('Cleaning up failed registration...');
            auth.currentUser.delete().catch(deleteError => {
                console.error('Error cleaning up auth user:', deleteError);
            });
        }
        
        // Reset button state
        registerBtn.disabled = false;
        if (registerText) registerText.classList.remove('hidden');
        if (registerLoading) registerLoading.classList.add('hidden');
    }
}

// Logout handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (confirm('Are you sure you want to logout?')) {
            try {
                await auth.signOut();
                console.log('User logged out successfully');
                window.location.href = '../html/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        }
    });
}

// Forgot Password Handler
const forgotPasswordLink = document.getElementById('forgot-password');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = prompt('Please enter your email address to reset your password:');
        
        if (email) {
            try {
                await auth.sendPasswordResetEmail(email);
                alert('✅ Password reset email sent!\n\nPlease check your inbox and follow the instructions to reset your password.');
            } catch (error) {
                console.error('Password reset error:', error);
                let errorMessage = 'Failed to send password reset email.';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email address.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email format. Please check your email address.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many requests. Please try again later.';
                        break;
                }
                
                alert('❌ ' + errorMessage);
            }
        }
    });
}

// Make functions globally accessible
window.loginUser = loginUser;
window.registerUser = registerUser;

console.log('✅ Authentication module loaded successfully');
console.log('Firebase Auth:', typeof auth !== 'undefined' ? 'Connected' : 'Not connected');
console.log('Firestore:', typeof db !== 'undefined' ? 'Connected' : 'Not connected');
console.log('Storage:', typeof storage !== 'undefined' ? 'Connected' : 'Not connected');