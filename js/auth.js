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
                
                console.log('User authenticated:', currentUser.email);
            } else {
                console.error('User document not found');
                handleAuthError();
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            handleAuthError();
        }
    } else {
        // No user signed in - redirect to login
        if (!window.location.pathname.includes('login') && 
            !window.location.pathname.includes('register')) {
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
        if (userRoleEl) userRoleEl.textContent = currentUser.role || 'User';
        if (userAvatarEl) {
            userAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'User')}&background=3a86ff&color=fff`;
        }
    }
}

// Handle authentication errors
function handleAuthError() {
    alert('Authentication error. Please sign in again.');
    auth.signOut().then(() => {
        window.location.href = '../html/login.html';
    });
}

// Logout handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (confirm('Are you sure you want to logout?')) {
            try {
                await auth.signOut();
                window.location.href = '../html/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        }
    });
}

// Login form handler (if on login page)
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.querySelector('#login-form button[type="submit"]');
        
        try {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get user role
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            // Redirect based on role
            if (userData.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please check your credentials.';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format.';
            }
            
            alert(errorMessage);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });
}

// Register form handler (if on register page)
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const role = document.getElementById('role').value;
        const registerBtn = document.querySelector('#register-form button[type="submit"]');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        try {
            registerBtn.disabled = true;
            registerBtn.textContent = 'Creating account...';
            
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
            
            alert('Account created successfully!');
            
            // Redirect based on role
            if (role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use at least 6 characters.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format.';
            }
            
            alert(errorMessage);
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account';
        }
    });
}