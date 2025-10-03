// Authentication state management
let currentUser = null;
let authInitialized = false;

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            console.log('Auth state changed - User found:', user.uid);
            
            // Get user data from Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    ...userDoc.data()
                };
                
                authInitialized = true;
                
                // Update UI with user info
                updateUserUI();
                
                console.log('User authenticated:', currentUser.email, 'Role:', currentUser.role);
                
                // Handle redirects only if we're on login/register pages
                const currentPath = window.location.pathname;
                if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
                    redirectBasedOnRole(currentUser.role);
                }
                
            } else {
                console.error('User document not found');
                await auth.signOut();
                window.location.href = '../html/login.html';
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            await auth.signOut();
            window.location.href = '../html/login.html';
        }
    } else {
        console.log('No user signed in');
        currentUser = null;
        authInitialized = true;
        
        // Only redirect if we're on a protected page
        const currentPath = window.location.pathname;
        const publicPages = ['login.html', 'register.html', 'index.html', 'setup.html'];
        const isPublicPage = publicPages.some(page => currentPath.includes(page));
        
        if (!isPublicPage) {
            console.log('Not authenticated, redirecting to login...');
            window.location.href = '../html/login.html';
        }
    }
});

// Helper function for role-based redirects
function redirectBasedOnRole(role) {
    switch(role) {
        case 'admin':
            window.location.href = 'admin-dashboard.html';
            break;
        case 'seller':
        case 'buyer':
            window.location.href = 'user-dashboard.html';
            break;
        default:
            console.error('Unknown role:', role);
            window.location.href = 'login.html';
    }
}

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
        
        // Wait a moment for auth state to update, then redirect
        setTimeout(() => {
            redirectBasedOnRole(userData.role);
        }, 500);
        
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

// Register User Function - OPTIMIZED VERSION
async function registerUser(userData) {
    const registerText = document.getElementById('register-text');
    const registerLoading = document.getElementById('register-loading');
    const registerBtn = document.querySelector('#register-form button[type="submit"]');
    
    try {
        console.log('Starting registration process...');
        
        // Update button state immediately
        registerBtn.disabled = true;
        if (registerText) registerText.classList.add('hidden');
        if (registerLoading) registerLoading.classList.remove('hidden');
        
        // STEP 1: Create auth account (with timeout)
        console.log('Creating Firebase auth account...');
        const authPromise = auth.createUserWithEmailAndPassword(userData.email, userData.password);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout - please try again')), 15000)
        );
        
        const userCredential = await Promise.race([authPromise, timeoutPromise]);
        const user = userCredential.user;
        console.log('Firebase auth account created:', user.uid);
        
        // STEP 2: Prepare user data
        const firestoreData = {
            name: userData.name,
            email: userData.email,
            role: 'buyer',
            phone: userData.phone,
            address: userData.address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            photoURL: null
        };
        
        // STEP 3: Handle photo upload separately (non-blocking)
        let photoUploadPromise = Promise.resolve(null);
        if (userData.photo) {
            photoUploadPromise = (async () => {
                try {
                    console.log('Starting photo upload...');
                    const photoRef = storage.ref(`profile-photos/${user.uid}/${Date.now()}_${userData.photo.name}`);
                    const uploadTask = await photoRef.put(userData.photo);
                    const photoURL = await uploadTask.ref.getDownloadURL();
                    console.log('Photo uploaded successfully');
                    return photoURL;
                } catch (photoError) {
                    console.warn('Photo upload failed, continuing without photo:', photoError);
                    return null;
                }
            })();
        }
        
        // STEP 4: Create user document immediately
        console.log('Creating user document in Firestore...');
        await db.collection('users').doc(user.uid).set(firestoreData);
        console.log('User document created successfully');
        
        // STEP 5: Wait for photo upload (if any)
        const photoURL = await photoUploadPromise;
        if (photoURL) {
            await db.collection('users').doc(user.uid).update({
                photoURL: photoURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // STEP 6: Update auth profile (non-critical)
        try {
            await user.updateProfile({
                displayName: userData.name
            });
            console.log('Auth profile updated');
        } catch (profileError) {
            console.warn('Auth profile update failed:', profileError);
        }
        
        // SUCCESS
        console.log('Registration completed successfully');
        alert(`🎉 Welcome to CarAuction, ${userData.name}!\\n\\nYour account has been created successfully!`);
        
        // Redirect immediately
        window.location.href = 'user-dashboard.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Clean up on failure
        if (auth.currentUser) {
            try {
                await auth.currentUser.delete();
                console.log('Cleaned up failed registration');
            } catch (deleteError) {
                console.error('Cleanup error:', deleteError);
            }
        }
        
        let errorMessage = 'Registration failed. ';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'This email is already registered. Please login instead.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak. Use at least 6 characters.';
                break;
            case 'auth/network-request-failed':
                errorMessage += 'Network error. Check your internet connection.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage += 'Registration is currently disabled.';
                break;
            default:
                errorMessage += error.message || 'Please try again.';
        }
        
        alert('❌ ' + errorMessage);
        
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
                alert('✅ Password reset email sent!\\n\\nPlease check your inbox and follow the instructions to reset your password.');
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

// Admin User Creation Utility (for initial setup)
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
        
        alert(`✅ Admin user "${name}" created successfully!\\nEmail: ${email}\\nPassword: ${password}`);
        
        return true;
    } catch (error) {
        console.error('Error creating admin:', error);
        alert('❌ Error creating admin: ' + error.message);
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
        
        alert(`✅ Seller user "${name}" created successfully!\\nEmail: ${email}\\nPassword: ${password}`);
        
        return true;
    } catch (error) {
        console.error('Error creating seller:', error);
        alert('❌ Error creating seller: ' + error.message);
        return false;
    }
}

// Make functions globally accessible
window.loginUser = loginUser;
window.registerUser = registerUser;
window.createAdminUser = createAdminUser;
window.createSellerUser = createSellerUser;

console.log('✅ Authentication module loaded successfully');
console.log('Firebase Auth:', typeof auth !== 'undefined' ? 'Connected' : 'Not connected');
console.log('Firestore:', typeof db !== 'undefined' ? 'Connected' : 'Not connected');
console.log('Storage:', typeof storage !== 'undefined' ? 'Connected' : 'Not connected');
console.log('Admin creation: createAdminUser("admin@example.com", "password123", "Admin Name")');
console.log('Seller creation: createSellerUser("seller@example.com", "password123", "Seller Name")');