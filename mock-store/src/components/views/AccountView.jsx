import React, { useState } from 'react';
import { User, Shield, Bell, Trash2 } from 'lucide-react';

const AccountView = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div style={{ marginTop: '32px', display: 'flex', gap: '32px' }}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: '250px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', alignSelf: 'flex-start' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
            <User size={18} /> Profile Details
          </li>
          <li style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', color: '#2563eb', fontWeight: '600' }}>
            <Shield size={18} /> Privacy & Data
          </li>
          <li style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' }}>
            <Bell size={18} /> Notifications
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <h2 style={{ marginBottom: '24px' }}>Privacy & Data Settings</h2>

        <div style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Email Communication Preferences</h3>
          
          {/* Confusing Toggle (Dark Pattern) */}
          <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <input type="checkbox" id="confusing-toggle" style={{ marginTop: '4px' }} />
              <div>
                <label htmlFor="confusing-toggle" style={{ fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Uncheck this box if you DO NOT wish to NOT receive daily promotional emails from our third-party marketing partners.
                </label>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Leaving this checked means you agree to receive all offers. Unchecking means you agree to opt-in manually.
                </div>
              </div>
            </div>
          </div>

          {/* Benign Checkbox */}
          <div style={{ padding: '24px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <input type="checkbox" id="benign-toggle" defaultChecked style={{ marginTop: '4px' }} />
              <div>
                <label htmlFor="benign-toggle" style={{ fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Send me monthly account summaries.
                </label>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  You can opt out of this at any time.
                </div>
              </div>
            </div>
          </div>
          
          <button className="btn btn-primary" style={{ marginTop: '24px' }}>Save Preferences</button>
        </div>

        {/* Danger Zone */}
        <div style={{ background: '#fef2f2', padding: '32px', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={20} /> Danger Zone
          </h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="btn" style={{ background: 'white', border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </button>
        </div>

      </div>

      {/* Account Deletion Confirmshaming Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '450px', maxWidth: '90%',
            padding: '32px', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
          }}>
            <Trash2 size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: '16px' }}>Are you sure you want to leave us?</h2>
            <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.5' }}>
              We'll be sad to see you go. If you delete your account, you will lose all your progress, rewards, and exclusive discounts forever.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Highlighted option (Keep Account) */}
              <button className="btn btn-primary" style={{ padding: '16px' }} onClick={() => setShowDeleteModal(false)}>
                No, I'll stay! Keep my account safe.
              </button>
              
              {/* Confirmshaming option (Delete) */}
              <button 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' }}
                onClick={() => setShowDeleteModal(false)}
              >
                Yes, delete my account. I hate rewards and don't care about losing my data.
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountView;
