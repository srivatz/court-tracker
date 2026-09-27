/**
 * Core Financial Module: Calculates costs per individual player-visit
 * Independent of user interface templates.
 */
const ExpenseEngine = {

  /**
   * USE CASE 1: Court Cost Distribution
   * Rule: Split the dynamic court fee evenly strictly among players active on that day.
   */
  calculateCourtCostPerPlayer(totalCourtCost, activePlayersCount) {
    if (!activePlayersCount || activePlayersCount === 0) return 0;
    return parseFloat((totalCourtCost / activePlayersCount).toFixed(2));
  },

  /**
   * USE CASE 2: Shuttlecock Distribution
   * Rule: Spread the tube purchases evenly across all historical player-visits 
   * within a specific date timeframe.
   */
  calculateShuttleCostPerVisit(shuttlePurchases, sessionsList) {
    let playerVisitMap = {}; // Maps user accounts to their calculated shares
    
    // Group totals down into global parameters
    sessionsList.forEach(session => {
      const dateKey = session.date;
      const playersOnDay = session.players || [];
      
      // Locate the active shuttlecock purchase covering this session date
      const activePurchase = shuttlePurchases.find(p => dateKey >= p.startDate && dateKey <= p.endDate);
      
      if (activePurchase && playersOnDay.length > 0) {
        // Count total player-visits under this coverage window to establish the unit rate
        const totalVisitsInPeriod = ExpenseEngine.countTotalVisitsInPeriod(sessionsList, activePurchase.startDate, activePurchase.endDate);
        const costPerIndividualVisit = activePurchase.totalCost / totalVisitsInPeriod;

        playersOnDay.forEach(playerId => {
          if (!playerVisitMap[playerId]) playerVisitMap[playerId] = { courtOwed: 0, shuttleOwed: 0, visitsCount: 0 };
          playerVisitMap[playerId].shuttleOwed += costPerIndividualVisit;
          playerVisitMap[playerId].visitsCount += 1;
        });
      }

      // Simultaneously compute individual local day court shares
      if (playersOnDay.length > 0) {
        const individualCourtShare = ExpenseEngine.calculateCourtCostPerPlayer(session.cost, playersOnDay.length);
        playersOnDay.forEach(playerId => {
          if (!playerVisitMap[playerId]) playerVisitMap[playerId] = { courtOwed: 0, shuttleOwed: 0, visitsCount: 0 };
          playerVisitMap[playerId].courtOwed += individualCourtShare;
        });
      }
    });

    return playerVisitMap;
  },

  // Helper function to find total player-visits within an active period
  countTotalVisitsInPeriod(sessionsList, start, end) {
    return sessionsList
      .filter(s => s.date >= start && s.date <= end)
      .reduce((sum, s) => sum + (s.players || []).length, 0);
  }
};