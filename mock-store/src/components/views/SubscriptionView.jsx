import React from 'react';
import { Check, X } from 'lucide-react';

const SubscriptionView = () => {
  return (
    <div style={{ marginTop: '32px', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '16px' }}>Choose your plan</h1>
      <p style={{ color: '#64748b', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px' }}>
        Unlock the full potential of your team with our premium features. No hidden fees, we promise!
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'end' }}>
        
        {/* Free Tier (Misdirection / Grayed Out) */}
        <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'left', opacity: 0.7 }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Basic</h3>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>$0 <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/mo</span></div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>For individuals just getting started.</p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> 1 User</li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem', color: '#94a3b8' }}><X size={16} /> No Analytics</li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem', color: '#94a3b8' }}><X size={16} /> Community Support Only</li>
          </ul>
          
          <button className="btn btn-secondary" style={{ width: '100%' }}>Select Basic</button>
        </div>

        {/* Pro Tier (Misdirection / Highlighted / Hidden Fees / Roach Motel) */}
        <div style={{ background: 'white', padding: '40px 32px', borderRadius: '16px', border: '2px solid #2563eb', textAlign: 'left', position: 'relative', boxShadow: '0 24px 48px rgba(37,99,235,0.1)' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#2563eb', color: 'white', padding: '4px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
            MOST POPULAR
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#2563eb' }}>Pro <span className="badge badge-danger" style={{ position: 'relative', top: '-2px', marginLeft: '8px' }}>Limited Time</span></h3>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px' }}>$19 <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/mo</span></div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>For growing teams that need more power.</p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> 10 Users</li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> Advanced Analytics</li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> 24/7 Priority Support</li>
          </ul>
          
          <button className="btn btn-primary" style={{ width: '100%' }}>Start 7-Day Free Trial</button>
          
          <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
            * After your 7-day free trial, you will automatically be billed $199 annually. A mandatory $49 setup fee applies today. To cancel your subscription and avoid charges, please mail a written letter of cancellation to our headquarters in Antarctica at least 30 days prior to renewal.
          </div>
        </div>

        {/* Enterprise Tier (Benign / Clear) */}
        <div style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Enterprise</h3>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>$99 <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/mo</span></div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Full featured for large organizations.</p>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> Unlimited Users</li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> Custom Integrations</li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}><Check size={16} color="#10b981" /> Dedicated Account Manager</li>
          </ul>
          
          <button className="btn btn-secondary" style={{ width: '100%' }}>Contact Sales</button>
          <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4', textAlign: 'center' }}>
            Cancel anytime online with 1 click.
          </div>
        </div>

      </div>
    </div>
  );
};

export default SubscriptionView;
