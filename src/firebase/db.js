import { 
  db 
} from './config';
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Verifies the entry passcode against the system configuration doc.
 * @param {string} passcode 
 * @returns {Promise<boolean>}
 */
export async function verifyPasscode(passcode) {
  try {
    const configDoc = await getDoc(doc(db, 'config', 'system'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      // Case-insensitive comparison, trimmed
      return data.passcode?.trim().toLowerCase() === passcode.trim().toLowerCase();
    }
    // Fallback: If no config exists, allow a default passcode 'GRAD2026'
    return passcode.trim().toUpperCase() === 'GRAD2026';
  } catch (error) {
    console.error('Error verifying passcode:', error);
    throw new Error('Unable to verify the passcode right now.', { cause: error });
  }
}

/**
 * Creates the user profile document in Firestore.
 */
export async function createUserProfile(userId, name, team, photoUrl, sideQuest = '') {
  const userRef = doc(db, 'users', userId);
  const profile = {
    uid: userId,
    name: name.trim(),
    team: team || 'blue',
    photoUrl: photoUrl || '',
    sideQuest: sideQuest || '',
    points: 0,
    isAdmin: false,
    createdAt: serverTimestamp()
  };
  await setDoc(userRef, profile);
  return profile;
}

/**
 * Admin updates a user's secret side quest description.
 */
export async function updateUserSideQuest(userId, sideQuest) {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { sideQuest: sideQuest.trim() }, { merge: true });
}

/**
 * Listens to a single user's profile in real-time.
 */
export function onUserProfileChange(userId, callback) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to user profile:', error);
  });
}

/**
 * Listens to the leaderboard (all users sorted by points desc, then name).
 */
export function onLeaderboardChange(callback) {
  const usersRef = collection(db, 'users');
  // Query all users directly; sort in memory to handle missing fields and avoid indexing rules
  const q = query(usersRef);
  
  return onSnapshot(q, (snapshot) => {
    const players = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.isAdmin) {
        players.push({ uid: doc.id, ...data });
      }
    });
    // Sort entirely in memory (handles missing/null points safely as 0)
    players.sort((a, b) => {
      const ptsA = typeof a.points === 'number' ? a.points : 0;
      const ptsB = typeof b.points === 'number' ? b.points : 0;
      if (ptsB !== ptsA) {
        return ptsB - ptsA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
    callback(players);
  }, (error) => {
    console.error('Error listening to leaderboard:', error);
  });
}

/**
 * Transactional point transfer from one guest to another.
 * Prevents double-spending, negative balances, and race conditions.
 */
export async function donatePoints(senderId, senderName, receiverId, amount) {
  if (senderId === receiverId) {
    throw new Error('You cannot send points to yourself.');
  }
  
  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Please enter a valid positive amount.');
  }

  const senderDocRef = doc(db, 'users', senderId);
  const receiverDocRef = doc(db, 'users', receiverId);
  const historyColRef = collection(db, 'pointHistory');

  await runTransaction(db, async (transaction) => {
    // Read sender profile
    const senderSnapshot = await transaction.get(senderDocRef);
    if (!senderSnapshot.exists()) {
      throw new Error('Sender profile does not exist.');
    }
    const senderData = senderSnapshot.data();
    const currentSenderPoints = senderData.points || 0;

    // Check balance
    if (currentSenderPoints < parsedAmount) {
      throw new Error('Insufficient points balance.');
    }

    // Read receiver profile
    const receiverSnapshot = await transaction.get(receiverDocRef);
    if (!receiverSnapshot.exists()) {
      throw new Error('Recipient profile does not exist.');
    }
    const receiverData = receiverSnapshot.data();
    const currentReceiverPoints = receiverData.points || 0;

    // Perform updates
    transaction.update(senderDocRef, { points: currentSenderPoints - parsedAmount });
    transaction.update(receiverDocRef, { points: currentReceiverPoints + parsedAmount });

    // Generate transaction records
    const newLogRef = doc(historyColRef);
    transaction.set(newLogRef, {
      id: newLogRef.id,
      userId: receiverId,
      amount: parsedAmount,
      description: `Received donation from ${senderName}`,
      type: 'donation',
      timestamp: serverTimestamp(),
      senderId: senderId,
      senderName: senderName
    });

    const senderLogRef = doc(historyColRef);
    transaction.set(senderLogRef, {
      id: senderLogRef.id,
      userId: senderId,
      amount: -parsedAmount,
      description: `Donated to ${receiverData.name}`,
      type: 'donation',
      timestamp: serverTimestamp(),
      recipientId: receiverId,
      recipientName: receiverData.name
    });
  });
}

/**
 * Listens to point history logs for a specific user in real-time.
 */
export function onPointHistoryChange(userId, callback) {
  const historyRef = collection(db, 'pointHistory');
  // Filter by userId only; sort in memory to avoid composite indexes
  const q = query(historyRef, where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const history = [];
    snapshot.forEach((doc) => {
      history.push(doc.data());
    });
    // Sort in memory by timestamp descending
    history.sort((a, b) => {
      const tA = a.timestamp?.seconds || 0;
      const tB = b.timestamp?.seconds || 0;
      return tB - tA;
    });
    callback(history);
  }, (error) => {
    console.error('Error listening to point history:', error);
  });
}

/**
 * Listens to all goals configured in the database.
 */
export function onGoalsChange(callback) {
  const goalsRef = collection(db, 'goals');
  const q = query(goalsRef, orderBy('points', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const goals = [];
    snapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() });
    });
    callback(goals);
  }, (error) => {
    console.error('Error listening to goals:', error);
  });
}

/**
 * Listens to a user's completed or pending goals.
 */
export function onUserGoalsChange(userId, callback) {
  const userGoalsRef = collection(db, 'userGoals');
  const q = query(userGoalsRef, where('userId', '==', userId));
  
  return onSnapshot(q, (snapshot) => {
    const records = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      records[data.goalId] = data;
    });
    callback(records);
  }, (error) => {
    console.error('Error listening to user goals:', error);
  });
}

/**
 * Listens to all userGoals records (for Admin queue).
 */
export function onAllUserGoalsChange(callback) {
  const userGoalsRef = collection(db, 'userGoals');
  // Filter by status only; sort in memory to avoid composite indexes
  const q = query(userGoalsRef, where('status', '==', 'pending'));
  
  return onSnapshot(q, (snapshot) => {
    const requests = [];
    snapshot.forEach((doc) => {
      requests.push(doc.data());
    });
    // Sort in memory by submittedAt descending
    requests.sort((a, b) => {
      const tA = a.submittedAt?.seconds || 0;
      const tB = b.submittedAt?.seconds || 0;
      return tB - tA;
    });
    callback(requests);
  }, (error) => {
    console.error('Error listening to all user goals:', error);
  });
}

/**
 * Submits a claim request for a goal.
 */
export async function claimGoal(userId, userName, goalId, goalTitle, points, isRepeatable = false) {
  const recordId = isRepeatable ? `${userId}_${goalId}_${Date.now()}` : `${userId}_${goalId}`;
  const userGoalRef = doc(db, 'userGoals', recordId);
  const userDocRef = doc(db, 'users', userId);
  const historyColRef = collection(db, 'pointHistory');
  const parsedPoints = parseInt(points, 10);

  await runTransaction(db, async (transaction) => {
    // 1. Read user profile
    const userSnapshot = await transaction.get(userDocRef);
    if (!userSnapshot.exists()) {
      throw new Error('User profile does not exist.');
    }
    
    // 2. Prevent double-claiming (only for single use goals)
    if (!isRepeatable) {
      const goalSnapshot = await transaction.get(userGoalRef);
      if (goalSnapshot.exists() && goalSnapshot.data().status === 'completed') {
        throw new Error('Side quest already completed.');
      }
    }

    const userData = userSnapshot.data();
    const currentPoints = userData.points || 0;

    // 3. Mark goal as completed
    transaction.set(userGoalRef, {
      id: recordId,
      userId,
      userName,
      goalId,
      goalTitle,
      points: parsedPoints,
      status: 'completed',
      submittedAt: serverTimestamp(),
      completedAt: serverTimestamp()
    });

    // 4. Update user points
    transaction.update(userDocRef, {
      points: currentPoints + parsedPoints
    });

    // 5. Write to pointHistory
    const newLogRef = doc(historyColRef);
    transaction.set(newLogRef, {
      id: newLogRef.id,
      userId: userId,
      amount: parsedPoints,
      description: `Completed Side Quest: ${goalTitle}`,
      type: 'earn',
      timestamp: serverTimestamp()
    });
  });
}

/**
 * Admin approves a pending goal request.
 * Runs in a transaction to award points and update request state.
 */
export async function approveGoalRequest(userGoalId) {
  const userGoalRef = doc(db, 'userGoals', userGoalId);
  const historyColRef = collection(db, 'pointHistory');

  await runTransaction(db, async (transaction) => {
    // Read goal request
    const requestSnapshot = await transaction.get(userGoalRef);
    if (!requestSnapshot.exists()) {
      throw new Error('Goal request does not exist.');
    }
    const requestData = requestSnapshot.data();
    
    if (requestData.status !== 'pending') {
      throw new Error('Goal request is not pending.');
    }

    const { userId, points, goalTitle } = requestData;
    const userDocRef = doc(db, 'users', userId);

    // Read user profile
    const userSnapshot = await transaction.get(userDocRef);
    if (!userSnapshot.exists()) {
      throw new Error('User profile does not exist.');
    }
    const userData = userSnapshot.data();
    const currentPoints = userData.points || 0;

    // Perform updates
    transaction.update(userGoalRef, {
      status: 'completed',
      completedAt: serverTimestamp()
    });
    transaction.update(userDocRef, {
      points: currentPoints + points
    });

    // Write to history
    const newLogRef = doc(historyColRef);
    transaction.set(newLogRef, {
      id: newLogRef.id,
      userId: userId,
      amount: points,
      description: `Completed Side Quest: ${goalTitle}`,
      type: 'earn',
      timestamp: serverTimestamp()
    });
  });
}

/**
 * Admin directly adjusts points for a player.
 */
export async function adjustPointsAdmin(userId, amount, description) {
  const userDocRef = doc(db, 'users', userId);
  const historyColRef = collection(db, 'pointHistory');
  const parsedAmount = parseInt(amount, 10);

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userDocRef);
    if (!userSnapshot.exists()) {
      throw new Error('User profile does not exist.');
    }
    const userData = userSnapshot.data();
    const currentPoints = userData.points || 0;

    // Ensure balance does not drop below 0
    const newPoints = Math.max(0, currentPoints + parsedAmount);

    transaction.update(userDocRef, { points: newPoints });

    const newLogRef = doc(historyColRef);
    transaction.set(newLogRef, {
      id: newLogRef.id,
      userId: userId,
      amount: parsedAmount,
      description: description || 'Admin Point Adjustment',
      type: 'admin',
      timestamp: serverTimestamp()
    });
  });
}

/**
 * Admin creates or updates a global goal template.
 */
export async function setGoalTemplate(goalId, title, description, points) {
  const ref = doc(db, 'goals', goalId);
  await setDoc(ref, {
    id: goalId,
    title: title.trim(),
    description: description.trim(),
    points: parseInt(points, 10)
  }, { merge: true });
}

/**
 * Admin deletes a goal template.
 */
export async function deleteGoalTemplate(goalId) {
  const ref = doc(db, 'goals', goalId);
  await deleteDoc(ref); // Make sure deleteDoc is imported if needed, or implement manually
}
// Deletion handled by top imports

/**
 * Admin creates or updates a Jeopardy category with clues.
 */
export async function addJeopardyCategory(id, name, clues) {
  const ref = doc(db, 'jeopardy', id);
  await setDoc(ref, {
    id,
    name: name.trim(),
    clues,
    createdAt: serverTimestamp()
  }, { merge: true });
}

/**
 * Admin deletes a Jeopardy category.
 */
export async function deleteJeopardyCategory(id) {
  const ref = doc(db, 'jeopardy', id);
  await deleteDoc(ref);
}

/**
 * Listens to all Jeopardy categories sorted by creation time.
 */
export function onJeopardyCategoriesChange(callback) {
  const collRef = collection(db, 'jeopardy');
  const q = query(collRef);
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push(doc.data());
    });
    // Sort in memory by createdAt to avoid composite indexes
    list.sort((a, b) => {
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tA - tB;
    });
    callback(list);
  }, (error) => {
    console.error('Error listening to jeopardy categories:', error);
  });
}

/**
 * Listens to the global game state document.
 */
export function listenToGameState(callback) {
  const ref = doc(db, 'config', 'gameState');
  return onSnapshot(ref, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback({ activeGame: null });
    }
  }, (error) => {
    console.error('Error listening to game state:', error);
  });
}

/**
 * Updates the global game state document.
 */
export async function updateGameState(updates) {
  const ref = doc(db, 'config', 'gameState');
  await setDoc(ref, updates, { merge: true });
}

/**
 * Transaction-safe registration for a player buzzing in.
 * Only allows a buzz if no player has buzzed in yet and buzzer is open.
 */
export async function registerBuzz(playerId, playerName, clientTimestamp) {
  const ref = doc(db, 'config', 'gameState');
  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) {
        throw new Error('Game state does not exist.');
      }
      const data = snap.data();
      const currentJeopardy = data.jeopardy || {};
      const failedPlayers = currentJeopardy.failedPlayers || [];

      // Verify there is an active clue on the server
      if (!currentJeopardy.activeClue) {
        return false; // Cannot buzz if no clue is active
      }
      
      // Check if player is locked out due to incorrect answer
      if (failedPlayers.includes(playerId)) {
        return false;
      }
      
      const currentBuzzedId = currentJeopardy.buzzedPlayerId;
      const currentTimestamp = currentJeopardy.buzzedTimestamp || Infinity;
      
      // Check if nobody has buzzed, OR this player buzzed EARLIER in real-life (client timestamp)
      if (!currentBuzzedId || clientTimestamp < currentTimestamp) {
        transaction.update(ref, {
          'jeopardy.buzzedPlayerId': playerId,
          'jeopardy.buzzedPlayerName': playerName,
          'jeopardy.buzzedTimestamp': clientTimestamp,
          'jeopardy.buzzerLocked': true
        });
        return true; // We won or stole the buzz
      }
      return false; // Too slow
    });
  } catch (error) {
    console.error('Error during buzz transaction:', error);
    return false;
  }
}

/**
 * Listens to the teams collection in Firestore.
 */
export function onTeamsChange(callback) {
  const collRef = collection(db, 'teams');
  return onSnapshot(collRef, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    callback(list);
  }, (error) => {
    console.error('Error listening to teams:', error);
  });
}

/**
 * Creates or updates a team.
 */
export async function saveTeam(teamId, teamData) {
  const ref = doc(db, 'teams', teamId);
  await setDoc(ref, teamData, { merge: true });
}

/**
 * Deletes a team.
 */
export async function deleteTeam(teamId) {
  const ref = doc(db, 'teams', teamId);
  await deleteDoc(ref);
}

/**
 * Creates a placeholder player in users collection.
 */
export async function createPlaceholderPlayer(name, team) {
  const slug = name.trim().replace(/\s+/g, '_').toLowerCase();
  const placeholderId = `pre_${slug}_${Date.now()}`;
  const userRef = doc(db, 'users', placeholderId);
  
  await setDoc(userRef, {
    uid: placeholderId,
    name: name.trim(),
    team: team || '',
    points: 0,
    isPlaceholder: true,
    createdAt: serverTimestamp()
  });
  return placeholderId;
}

/**
 * Deletes a player (admin only).
 */
export async function deletePlayerAdmin(userId) {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}

/**
 * Updates a player's team.
 */
export async function updatePlayerTeam(userId, teamId) {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { team: teamId }, { merge: true });
}

/**
 * Saves or updates a goal/side quest template in Firestore.
 */
export async function saveGoalTemplate(goalId, { title, description, points, assignedTo = [], isRepeatable = false }) {
  const ref = doc(db, 'goals', goalId);
  await setDoc(ref, {
    id: goalId,
    title: title.trim(),
    description: description.trim(),
    points: parseInt(points, 10) || 0,
    assignedTo: assignedTo,
    isRepeatable: isRepeatable
  }, { merge: true });
}

/**
 * Claims a placeholder player for the current authenticated user and remaps their quests.
 */
export async function claimPlaceholderPlayer(currentUser, placeholderId, name, team) {
  const userRef = doc(db, 'users', currentUser.uid);
  const placeholderRef = doc(db, 'users', placeholderId);
  
  await runTransaction(db, async (transaction) => {
    // 1. Create the new user profile
    transaction.set(userRef, {
      uid: currentUser.uid,
      name: name.trim(),
      team: team || '',
      photoUrl: '',
      points: 0,
      isAdmin: false,
      createdAt: serverTimestamp()
    });
    
    // 2. Delete the placeholder
    transaction.delete(placeholderRef);
  });

  // 3. Remap all goals assigned to the placeholder to the real uid
  try {
    const goalsRef = collection(db, 'goals');
    const q = query(goalsRef, where('assignedTo', 'array-contains', placeholderId));
    const snapshot = await getDocs(q);
    const batchPromises = [];
    
    snapshot.forEach(goalDoc => {
      const data = goalDoc.data();
      const updatedAssigned = (data.assignedTo || []).map(uid => uid === placeholderId ? currentUser.uid : uid);
      batchPromises.push(setDoc(doc(db, 'goals', goalDoc.id), { assignedTo: updatedAssigned }, { merge: true }));
    });
    
    await Promise.all(batchPromises);
  } catch (err) {
    console.error('Error remapping guest quests during onboarding claim:', err);
  }
}

/**
 * Listens to all completed userGoals.
 */
export function onAllCompletedGoals(callback) {
  const ref = collection(db, 'userGoals');
  const q = query(ref, where('status', '==', 'completed'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((doc) => {
      list.push(doc.data());
    });
    callback(list);
  }, (error) => {
    console.error('Error listening to all completed goals:', error);
  });
}

/**
 * Bootstraps the admin profile in the users collection.
 */
export async function bootstrapAdmin(uid) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid: uid,
    name: 'Host',
    team: 'blue',
    points: 0,
    isAdmin: true,
    createdAt: serverTimestamp()
  }, { merge: true });
}
