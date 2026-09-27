/**
 * Global Application Configuration & Firebase Initialization
 */

// 1. Core Firebase SDK Config Object (Keep your real credentials intact here)
const firebaseConfig = {
    apiKey: "AIzaSyBD8vvKknAVR9ohdRwfaApxQEe1wgh5bf4",
    authDomain: "badminton-booking-b2c4d.firebaseapp.com",
    projectId: "badminton-booking-b2c4d",
    storageBucket: "badminton-booking-b2c4d.firebasestorage.app",
    messagingSenderId: "127883683538",
    appId: "1:127883683538:web:54d610d66536bed3e46f0b"
  };

// 2. Initialize the global Firebase Instance
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 3. Bind global variables to the window object to make them accessible across modules
window.db = firebase.firestore();
window.auth = firebase.auth();

// 4. Global State Cache tracking the active session data
window.appState = {
  currentUser: null,
  currentUserData: {
    isAdmin: false,
    approved: false
  },
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear()
};

console.log("⚡ Firebase infrastructure modules successfully initialized.");
