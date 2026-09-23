import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

const CheckoutModal = ({ isOpen, onClose }) => {
  const [selectedProtection, setSelectedProtection] = useState('premium');
  
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '500px', maxWidth: '90%',
        padding: '32px', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '8px' }}>Protect Your Purchase</h2>
        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '0.95rem' }}>
          85% of customers choose to protect their electronics. Don't risk expensive repairs!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          
          {/* Expensive Option - Highlighted (Misdirection) */}
          <div 
            onClick={() => setSelectedProtection('premium')}
            style={{ 
              border: selectedProtection === 'premium' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: selectedProtection === 'premium' ? '#eff6ff' : 'white',
              padding: '16px', borderRadius: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s'
            }}
          >
            <input type="radio" checked={selectedProtection === 'premium'} readOnly style={{ marginTop: '4px' }} />
            <div>
              <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Premium 3-Year Protection <span className="badge badge-danger" style={{ position: 'static' }}>Recommended</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Covers accidental damage, spills, and drops.</div>
              <div style={{ fontWeight: '600', color: '#2563eb', marginTop: '8px' }}>+$89.99</div>
            </div>
          </div>

          {/* Cheap/Free Option - Grayed out (Misdirection) */}
          <div 
            onClick={() => setSelectedProtection('none')}
            style={{ 
              border: selectedProtection === 'none' ? '2px solid #94a3b8' : '1px solid #e2e8f0',
              opacity: 0.6,
              padding: '16px', borderRadius: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.2s'
            }}
          >
            <input type="radio" checked={selectedProtection === 'none'} readOnly style={{ marginTop: '4px' }} />
            <div>
              <div style={{ fontWeight: '600', color: '#64748b' }}>No thanks, I'll take the risk</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Only standard 30-day warranty.</div>
            </div>
          </div>

        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} onClick={onClose}>
          <ShieldCheck size={20} />
          Continue to Secure Checkout
        </button>
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
          By continuing, you agree to our terms and conditions. A $4.99 processing fee will be added to your order.
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
