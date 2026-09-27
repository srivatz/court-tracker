/**
 * Independent Calendar and Attendance Management Module
 */
const SessionManager = {
  
  /**
   * Renders the interactive grid where players click dates to toggle availability
   */
  renderInteractiveCalendarGrid(targetContainerId, targetMonth, targetYear, firestoreSessions) {
    const container = document.getElementById(targetContainerId);
    container.innerHTML = ''; // Clear previous views safely
    
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Match against real cloud data records
      const activeSessionData = firestoreSessions.find(s => s.date === dateString);
      const isPlayerAttending = activeSessionData && (activeSessionData.players || []).includes(currentUser.uid);

      const dayNode = document.createElement('div');
      dayNode.className = `calendar-day-node ${activeSessionData ? 'active-session' : ''}`;
      dayNode.innerHTML = `
        <div style="font-weight:700;">${day}</div>
        ${activeSessionData ? `<span class="pill-badge \({isPlayerAttending ? 'status-joined' : 'status-absent'}">\){isPlayerAttending ? '🎟️ Playing' : '✕ Out'}</span>` : ''}
      `;

      // Interactive Click Hook
      dayNode.onclick = () => {
        if (activeSessionData) {
          SessionManager.togglePlayerAvailability(dateString, currentUser.uid);
        } else if (currentUserData.isAdmin) {
          // Admins can activate a raw date into a bookable match day session slot
          SessionManager.adminInitializeSessionSlot(dateString);
        }
      };

      container.appendChild(dayNode);
    }
  },

  /**
   * Workflow: Users check/uncheck their availability status flag on an active date
   */
  togglePlayerAvailability(dateId, userId) {
    const sessionDocRef = db.collection('sessions').doc(dateId);
    
    return db.runTransaction(transaction => {
      return transaction.get(sessionDocRef).then(doc => {
        if (!doc.exists) return;
        
        let currentPlayersList = doc.data().players || [];
        if (currentPlayersList.includes(userId)) {
          currentPlayersList = currentPlayersList.filter(id => id !== userId); // Leave
        } else {
          currentPlayersList.push(userId); // Join
        }
        transaction.update(sessionDocRef, { players: currentPlayersList });
      });
    });
  },

  /**
   * Workflow: Admin updates session parameter costs based on actual courts booked
   */
  adminUpdateSessionCost(dateId, updatedCourtCost) {
    if (!currentUserData.isAdmin) return alert("Operation restricted to administrators.");
    
    return db.collection('sessions').doc(dateId).update({
      cost: parseFloat(updatedCourtCost)
    })
    .then(() => alert("Court expense metrics adjusted systematically!"))
    .catch(err => console.error("Database constraint failed:", err));
  },

  adminInitializeSessionSlot(dateId) {
    const defaultInitialCost = 600; // Default placeholder fee
    db.collection('sessions').doc(dateId).set({
      date: dateId,
      cost: defaultInitialCost,
      players: []
    });
  }
};