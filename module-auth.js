/**
 * User Identity, Registration, & Multi-Admin Access Control Module
 */

// 1. Handle Login or Registration Submission
function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!email || !password) {
    alert("Please fill in all identity fields.");
    return;
  }

  if (window.authMode === 'login') {
    // Standard Sign In Workflow
    window.auth.signInWithEmailAndPassword(email, password)
      .catch(error => alert("Authentication Failed: " + error.message));
  } else {
    // Registration Workflow: Creates account and safely sets default restrictions
    window.auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        return window.db.collection('users').doc(userCredential.user.uid).set({
          email: email,
          approved: false, // Must be verified by an admin
          isAdmin: false,   // Restricts admin capabilities by default
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        alert("Registration request submitted! Please notify a group admin to approve your account access.");
        window.auth.signOut(); // Keep them logged out until access is granted
        showAuthTab('login');
      })
      .catch(error => alert("Registration Error: " + error.message));
  }
}

// 2. Central Auth Listener Monitoring User State Transitions
window.auth.onAuthStateChanged(user => {
  const authWrap = document.getElementById('authWrap');
  const appWrap = document.getElementById('appWrap');
  const adminBar = document.getElementById('adminBar');

  if (user) {
    // Read the user record profile from Firestore
    window.db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (doc.exists && doc.data().approved === true) {
          // Update global app state cache
          window.appState.currentUser = user;
          window.appState.currentUserData = doc.data();

          // Transition layouts
          authWrap.style.display = 'none';
          appWrap.style.display = 'block';

          // Initialize the Admin approvals panel if user has the admin flag
          if (doc.data().isAdmin === true) {
            adminBar.style.display = 'block';
            initializeAdminPanel();
          } else {
            adminBar.style.display = 'none';
          }

          // Trigger real-time scheduling grid initialization hooks
          if (window.loadSessionCalendarWorkflow) {
            window.loadSessionCalendarWorkflow();
          }
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

// 3. Admin Panel Builder: Fetches all users who need approval or promotion
function initializeAdminPanel() {
  const adminBar = document.getElementById('adminBar');
  adminBar.innerHTML = `
    <div>
      <b style="color:var(--brand-accent); display:block; margin-bottom:10px;">👑 Admin Controls: Group Management</b>
      <div id="pendingUsersList" style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">
        Scanning for incoming registration queues...
      </div>
      <b style="color:var(--text-main); display:block; margin-bottom:10px; font-size:0.85rem; border-top: 1px solid var(--border-subtle); padding-top:10px;">Promote Active Members to Admin</b>
      <div id="approvedUsersList" style="display:flex; flex-direction:column; gap:6px;">
        Loading group directory...
      </div>
    </div>`;

  // Real-Time Stream 1: Unapproved Applicants
  window.db.collection('users').where('approved', '==', false)
    .onSnapshot(snapshot => {
      const container = document.getElementById('pendingUsersList');
      if (snapshot.empty) {
        container.innerHTML = '<span style="color:var(--color-success); font-size:0.8rem;">✨ No pending activation requests.</span>';
        return;
      }

      let innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        innerHTML += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); padding:8px 12px; border-radius:var(--radius-md); gap:12px;">
            <span style="flex:1; font-size:0.85rem;">${data.email}</span>
            <button onclick="grantUserAccess('${doc.id}', true)" style="width:auto; padding:4px 10px; font-size:0.8rem;">Approve Access</button>
          </div>`;
      });
      container.innerHTML = innerHTML;
    });

  // Real-Time Stream 2: Approved Non-Admin Members (For promotion capabilities)
  window.db.collection('users').where('approved', '==', true).where('isAdmin', '==', false)
    .onSnapshot(snapshot => {
      const container = document.getElementById('approvedUsersList');
      if (snapshot.empty) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">No non-admin members available to promote.</span>';
        return;
      }

      let innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        innerHTML += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-app); padding:8px 12px; border-radius:var(--radius-md); gap:12px;">
            <span style="flex:1; font-size:0.85rem;">${data.email}</span>
            <button onclick="promoteToAdmin('${doc.id}')" style="width:auto; padding:4px 10px; font-size:0.8rem; background:var(--text-muted)">Make Admin</button>
          </div>`;
      });
      container.innerHTML = innerHTML;
    });
}

// 4. Admin Feature Hook: Approve Access
function grantUserAccess(userId) {
  window.db.collection('users').doc(userId).update({
    approved: true
  })
  .then(() => alert("Access granted! The member can now log in."))
  .catch(err => alert("Action rejected: " + err.message));
}

// 5. Admin Feature Hook: Promote Member to Admin
function promoteToAdmin(userId) {
  if (!confirm("Are you sure you want to make this user an Admin? They will be able to approve users, create sessions, and promote others.")) return;
  
  window.db.collection('users').doc(userId).update({
    isAdmin: true
  })
  .then(() => alert("User successfully promoted to Admin!"))
  .catch(err => alert("Promotion failed: " + err.message));
}
window.submitAuth = submitAuth;
