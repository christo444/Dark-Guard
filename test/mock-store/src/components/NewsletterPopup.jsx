import React, { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';

const NewsletterPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;
    
    // Show popup after 10 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [isDismissed]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', width: '450px', maxWidth: '90%',
        padding: '40px', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}>
        <div style={{ background: '#eff6ff', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#2563eb' }}>
          <Mail size={32} />
        </div>
        
        <h2 style={{ marginBottom: '12px', fontSize: '1.5rem' }}>Unlock 20% Off Your First Order</h2>
        <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '1rem', lineHeight: '1.5' }}>
          Join our exclusive VIP club today and get instant access to our best deals, secret sales, and premium content!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="email" 
            placeholder="Enter your email address" 
            style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none' }}
          />
          
          <button className="btn btn-accent" style={{ padding: '16px', fontSize: '1.1rem' }} onClick={() => setIsOpen(false)}>
            Yes, Give Me 20% Off!
          </button>
          
          {/* Confirmshaming text */}
          <button 
            style={{ 
              background: 'transparent', border: 'none', color: '#94a3b8', 
              fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', marginTop: '8px' 
            }}
            onClick={() => {
              setIsOpen(false);
              setIsDismissed(true);
            }}
          >
            No thanks, I prefer paying full price and missing out on exclusive deals
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsletterPopup;
