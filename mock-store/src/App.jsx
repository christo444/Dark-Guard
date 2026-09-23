import React, { useState } from 'react';
import EcommerceView from './components/views/EcommerceView';
import BookingView from './components/views/BookingView';
import SubscriptionView from './components/views/SubscriptionView';
import AccountView from './components/views/AccountView';
import CheckoutModal from './components/CheckoutModal';
import NewsletterPopup from './components/NewsletterPopup';
import { ShoppingBag, Search, Menu, Package, Plane, CreditCard, User, ShieldAlert } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('ecommerce');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <>
      {/* Top Banner indicating Test Environment */}
      <div style={{ background: '#0f172a', color: 'white', padding: '8px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <ShieldAlert size={16} color="#f59e0b" /> Dark-Guard Test Environment - {activeTab.toUpperCase()} Module
      </div>

      <nav className="navbar">
        <div className="container flex items-center justify-between">
          <div className="nav-logo">
            <span style={{ background: '#2563eb', color: 'white', padding: '4px 8px', borderRadius: '8px' }}>L</span>
            LuxePlatform
          </div>

          <div className="flex items-center gap-4">
            <button className="btn btn-primary" onClick={() => setIsCheckoutOpen(true)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <ShoppingBag size={16} />
              Checkout Test
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: '70px', zIndex: 90 }}>
        <div className="container" style={{ display: 'flex', gap: '32px' }}>
          
          <div 
            onClick={() => setActiveTab('ecommerce')}
            style={{ 
              padding: '16px 0', borderBottom: activeTab === 'ecommerce' ? '2px solid #2563eb' : '2px solid transparent', 
              color: activeTab === 'ecommerce' ? '#2563eb' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
            }}
          >
            <Package size={18} /> E-Commerce
          </div>
          
          <div 
            onClick={() => setActiveTab('booking')}
            style={{ 
              padding: '16px 0', borderBottom: activeTab === 'booking' ? '2px solid #2563eb' : '2px solid transparent', 
              color: activeTab === 'booking' ? '#2563eb' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
            }}
          >
            <Plane size={18} /> Travel & Booking
          </div>
          
          <div 
            onClick={() => setActiveTab('subscription')}
            style={{ 
              padding: '16px 0', borderBottom: activeTab === 'subscription' ? '2px solid #2563eb' : '2px solid transparent', 
              color: activeTab === 'subscription' ? '#2563eb' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
            }}
          >
            <CreditCard size={18} /> SaaS Subscriptions
          </div>

          <div 
            onClick={() => setActiveTab('account')}
            style={{ 
              padding: '16px 0', borderBottom: activeTab === 'account' ? '2px solid #2563eb' : '2px solid transparent', 
              color: activeTab === 'account' ? '#2563eb' : '#64748b', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' 
            }}
          >
            <User size={18} /> Account & Privacy
          </div>

        </div>
      </div>

      <main className="container" style={{ minHeight: '80vh', paddingBottom: '64px' }}>
        
        {activeTab === 'ecommerce' && <EcommerceView openCheckout={() => setIsCheckoutOpen(true)} />}
        {activeTab === 'booking' && <BookingView />}
        {activeTab === 'subscription' && <SubscriptionView />}
        {activeTab === 'account' && <AccountView />}

      </main>

      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '64px 24px' }}>
        <div className="container flex justify-between">
          <div>
            <div className="nav-logo" style={{ color: 'white', marginBottom: '16px' }}>LuxePlatform</div>
            <p style={{ maxWidth: '300px' }}>Comprehensive testing environment for Dark-Guard AI models.</p>
          </div>
        </div>
      </footer>

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      {activeTab === 'ecommerce' && <NewsletterPopup />}
    </>
  );
}

export default App;
