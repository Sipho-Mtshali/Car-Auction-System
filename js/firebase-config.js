// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCnG_t_jo5ZECaj_nsbv5JCu9-NFj9ya7A",
    authDomain: "carauctionsystem-dedf2.firebaseapp.com",
    projectId: "carauctionsystem-dedf2",
    storageBucket: "carauctionsystem-dedf2.firebasestorage.app",
    messagingSenderId: "813451529099",
    appId: "1:813451529099:web:7574c139dbb1512415fd8e",
    measurementId: "G-QJF3MRKWWG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Initialize Analytics (optional)
// const analytics = firebase.analytics();