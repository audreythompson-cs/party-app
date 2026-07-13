import { useState } from 'react';
import { STRINGS } from '../constants/strings';
import '../styles/views/DonateTab.css';
import { donatePoints } from '../firebase/db';

export default function DonateTab({ profile, leaderboard }) {
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Filter out the current user from potential recipients
  const recipients = leaderboard.filter(player => player.uid !== profile.uid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientId) {
      setStatus({ type: 'error', message: STRINGS.donate.errorNoRecipient });
      return;
    }
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setStatus({ type: 'error', message: STRINGS.donate.errorAmount });
      return;
    }
    if ((profile.points ?? 0) < parsedAmount) {
      setStatus({ type: 'error', message: STRINGS.donate.errorInsufficient });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const recipientName = leaderboard.find(p => p.uid === recipientId)?.name || 'Guest';
      await donatePoints(profile.uid, profile.name, recipientId, parsedAmount);
      
      setStatus({ 
        type: 'success', 
        message: STRINGS.donate.successMsg.replace('{amount}', parsedAmount).replace('{name}', recipientName)
      });
      setAmount('');
      setRecipientId('');
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: err.message || STRINGS.donate.donationFailed });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donate-tab animate-fade-in">
      <div className="glass-panel donate-container">
        <div className="donate-header">
          <h3>{STRINGS.donate.title}</h3>
          <p className="subtitle">{STRINGS.donate.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="donate-form">
          {/* Recipient Dropdown */}
          <div className="input-group">
            <label htmlFor="recipient">{STRINGS.donate.recipientLabel}</label>
            <select
              id="recipient"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              disabled={loading}
            >
              <option value="">{STRINGS.donate.recipientPlaceholder}</option>
              {recipients.map((player) => (
                <option key={player.uid} value={player.uid}>
                  {player.name} ({player.points ?? 0} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="input-group">
            <label htmlFor="amount">
              {STRINGS.donate.amountLabel}{' '}
              <span className="balance-hint">(Balance: {profile.points ?? 0} pts)</span>
            </label>
            <input
              type="number"
              id="amount"
              min="1"
              max={profile.points ?? 0}
              placeholder={STRINGS.donate.amountPlaceholder}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading || (profile.points ?? 0) <= 0}
            />
          </div>

          {/* Status Message */}
          {status.message && (
            <div className={`status-alert ${status.type} animate-scale-up`}>
              <span className="status-icon">
                {status.type === 'success' ? '✅' : '⚠️'}
              </span>
              <p>{status.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary donate-btn animate-glow"
            disabled={loading || !recipientId || !amount || (profile.points ?? 0) < parseInt(amount, 10)}
          >
            {loading ? STRINGS.donate.buttonSubmitSending : STRINGS.donate.buttonSubmit}
          </button>
        </form>
      </div>


    </div>
  );
}
