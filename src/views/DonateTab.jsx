import { useState } from 'react';
import { STRINGS } from '../constants/strings';
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
      setStatus({ type: 'error', message: 'Please select a recipient.' });
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
      setStatus({ type: 'error', message: err.message || 'Donation failed. Please try again.' });
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
              placeholder="e.g. 10"
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
            {loading ? 'Sending Points...' : STRINGS.donate.buttonSubmit}
          </button>
        </form>
      </div>

      <style>{`
        .donate-tab {
          width: 100%;
        }

        .donate-container {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .donate-header h3 {
          font-size: 18px;
          margin-bottom: 4px;
        }

        .donate-header .subtitle {
          font-size: 13px;
          color: var(--text-muted);
          text-align: left;
          line-height: 1.5;
        }

        .donate-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .input-group label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-bright);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          justify-content: space-between;
        }

        .balance-hint {
          text-transform: none;
          font-weight: 500;
          color: var(--accent);
        }

        /* Customize native dropdown */
        select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 16px;
          padding-right: 40px;
        }

        select option {
          background: #110e20;
          color: var(--text-bright);
        }

        .status-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          text-align: left;
          border: 1px solid transparent;
        }

        .status-alert.success {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .status-alert.error {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .status-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .status-alert p {
          color: inherit;
          margin: 0;
        }

        .donate-btn {
          width: 100%;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}
