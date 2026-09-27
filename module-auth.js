/**
 * User Identity and Access Control Module
 */

// 1. Core Workflow: Handle Login and Registration Submissions
function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!email || !password) {
    alert("Please fill in all standard identity fields.");
    return;
  }

  // Attempt login using the global window auth instance
  window.auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      // If sign-in fails because the user does not exist, trigger auto-registration flow
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        registerNewUser(email, password);
      } else {
        alert("Authentication Failed: " + error.message);
      }
    });
}

// 2. Core Workflow: Register New User and Create Unapproved Database Profile
function registerNewUser(email, password) {
  window.auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      // Create user document in Firestore with default unapproved permissions
      return window.db.collection('users').doc(userCredential.user.uid).set({
        email: email,
        approved: false, // Must be verified by the admin
        isAdmin: false,   // Restricts admin dashboard access
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      alert("Registration request submitted successfully! Please notify the group admin to approve your access.");
      window.auth.signOut(); // Keep them logged out until access is granted
    })
    .catch(error => {
      alert("Registration Error: " + error.message);
    });
}

// 3. Central listener monitoring user state transitions
window.auth.onAuthStateChanged(user => {
  const authWrap = document.getElementById('authWrap');
  const appWrap = document.getElementById('appWrap');
  const adminBar = document.getElementById('adminBar');

  if (user) {
    // Read the user record profile from Firestore
    window.db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (doc.exists && doc.data().approved) {
          // Update global app state cache
          window.appState.currentUser = user;
          window.appState.currentUserData = doc.data();

          // Smooth layout transitions
          authWrap.style.display = 'none';
          appWrap.style.display = 'block';

          // Initialize admin console controls if matching administrative flags
          if (doc.data().isAdmin) {
            adminBar.style.display = 'block';
            initializeAdminPanel();
          } else {
            adminBar.style.display = 'none';
          }

          // Trigger real-time scheduling grid initialization hooks
          loadSessionCalendarWorkflow();
        } else {
          // Explicitly block users who exist in Auth but are not approved in Firestore
          window.auth.signOut();
          alert("Access pending. Your account is currently awaiting admin verification.");
        }
      })
      .catch(error => {
        console.error("Firestore security profile read error:", error);
        window.auth.signOut();
      });
  } else {
    // Clear runtime cache and reset view panels back to authentication layouts
    window.appState.currentUser = null;
    window.appState.currentUserData = { isAdmin: false, approved: false };
    authWrap.style.display = 'block';
    appWrap.style.display = 'none';
    adminBar.style.display = 'none';
  }
});

// 4. Admin Feature Hook: Real-Time Listener for Unapproved Applicants
function initializeAdminPanel() {
  const adminBar = document.getElementById('adminBar');
  adminBar.innerHTML = `
    <div>
      <b style="color:var(--brand-accent)">👑 Admin Controls: Group Approvals Panel</b>
      <div id="pendingUsersList" style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
        Scanning for incoming registration queues...
      </div>
    </div>`;

  window.db.collection('users').where('approved', '==', false)
    .onSnapshot(snapshot => {
      const container = document.getElementById('pendingUsersList');
      if (snapshot.empty) {
        container.innerHTML = '<span style="color:var(--color-success); font-size:0.85rem;">✨ No pending requests. Group directory is up to date!</span>';
        return;
      }

      let innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        innerHTML += `
          <div style="display:flex; justify-content:between; align-items:center; background:var(--bg-app); padding:8px 12px; border-radius:var(--radius-md); gap:12px;">
            <span style="flex:1; font-size:0.88rem;">${data.email}</span>
            <button onclick="grantUserAccess('${doc.id}')" style="width:auto; padding:4px 10px; font-size:0.8rem;">Approve</button>
          </div>`;
      });
      container.innerHTML = innerHTML;
    }, error => {
      console.error("Admin approval panel tracking dropped:", error);
    });
}

// 5. Admin Action: Grant Access Privileges
function grantUserAccess(userId) {
  window.db.collection('users').doc(userId).update({
    approved: true
  })
  .then(() => alert("Access granted! The member can now log into the portal."))
  .catch(err => alert("Action rejected: " + err.message));
}