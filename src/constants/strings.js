// Centralized User-Facing Copy
export const STRINGS = {
  appName: 'PartyTime',
  login: {
    title: 'Welcome!',
    subtitle: 'Scan the QR code and enter the party passcode to join',
    passcodeLabel: 'Passcode',
    passcodePlaceholder: 'Passcode',
    buttonSubmit: 'Submit',
    errorInvalid: 'Oops! That passcode doesn\'t match. Ask the host!'
  },
  onboarding: {
    title: 'Let\'s get set up!',
    subtitle: 'Take a selfie to generate your cartoon avatar! (Optional - only the avatar will be saved)',
    nameLabel: 'Name',
    namePlaceholder: 'Name',
    teamLabel: 'Select Your Table / Team',
    photoLabel: 'Take a Selfie',
    photoButton: 'Open Camera',
    photoRetake: 'Retake Photo',
    buttonSubmit: 'Ready!',
    errorNameRequired: 'Name is required.',
    errorPhotoRequired: 'Please create your avatar.',
    errorSubmitFailed: 'Failed to create profile. Please try again.'
  },
  dashboard: {
    welcome: 'Hey, {name}!',
    pointsTitle: 'Your Points',
    rankTitle: 'Leaderboard Rank',
    historyTitle: 'Recent Point History',
    noHistory: 'No points earned yet. Go complete some goals!',
    rankDisplay: '#{rank} of {total}'
  },
  leaderboard: {
    title: 'Leaderboard',
    subtitle: 'Score points to climb the ladder!',
    noPlayers: 'Waiting for guests to join...'
  },
  goals: {
    title: 'Goals',
    subtitle: 'Complete these challenges during the party to earn points.',
    claimButton: 'Claim Points',
    pendingStatus: 'Awaiting Host Approval...',
    completedStatus: 'Completed (+{points} pts)',
    noGoals: 'No goals available yet.'
  },
  donate: {
    title: 'Donate Points',
    subtitle: 'Feeling generous? Transfer some of your hard-earned points to another guest!',
    recipientLabel: 'Send to:',
    recipientPlaceholder: 'Select a guest...',
    amountLabel: 'Amount (points)',
    buttonSubmit: 'Send Points',
    successMsg: 'Successfully sent {amount} points to {name}!',
    errorSelf: 'You cannot send points to yourself.',
    errorInsufficient: 'Insufficient points balance.',
    errorAmount: 'Please enter a valid positive amount.'
  },
  tv: {
    title: 'GRADUATION PARTY 2026',
    joinText: 'JOIN THE PARTY!',
    scanQr: 'Scan the QR code to sign up, see your rank, and send points!',
    rankHeader: 'RANK',
    playerHeader: 'PLAYER',
    scoreHeader: 'SCORE'
  },
  admin: {
    gateTitle: 'Host Center',
    gateSubtitle: 'Hello Audrey',
    gatePlaceholder: 'Passcode',
    gateButton: 'Submit',
    gateError: 'Invalid Admin Passcode.',
    headerTitle: 'Lisa & Audrey\'s Grad Party!',
    headerLock: 'Lock Dashboard',
    queueTitle: 'Approval Queue ({count} pending)',
    queueEmpty: 'No pending goal approvals.',
    queueApproveBtn: 'Approve ✓',
    builderTitle: 'Goal Template Builder',
    builderTitlePlaceholder: 'Goal Title',
    builderDescPlaceholder: 'Description',
    builderPointsPlaceholder: 'Points Reward',
    builderAddBtn: 'Add Goal',
    builderError: 'Title and Points are required.',
    builderErrorFailed: 'Failed to create goal template.',
    templatesTitle: 'Current Templates',
    playersTitle: 'Player List & Adjustments',
    playersEmpty: 'No players registered yet.',
    adjustCustomPointsPlaceholder: 'Amt (+/-)',
    adjustCustomDescPlaceholder: 'Reason',
    adjustCustomApplyBtn: 'Apply',
    adjustErrorAmount: 'Please enter a valid number.',
    adjustErrorFailed: 'Failed to adjust points: '
  }
};
