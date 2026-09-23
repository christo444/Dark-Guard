import React from 'react';
import ProductCard from '../ProductCard';
import LiveToast from '../LiveToast';
import { ChevronRight } from 'lucide-react';

const products = [
  {
    id: 1,
    name: 'Studio Pro Wireless Headphones',
    category: 'Audio',
    price: 189.99,
    oldPrice: 249.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    type: 'urgency' // Dark Pattern
  },
  {
    id: 2,
    name: 'Pulse X Active Smartwatch',
    category: 'Wearables',
    price: 129.99,
    oldPrice: 179.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
    type: 'social' // Dark Pattern
  },
  {
    id: 3,
    name: 'Tactile RGB Mechanical Keyboard',
    category: 'Gaming',
    price: 89.00,
    image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80',
    type: 'benign' // Normal
  },
  {
    id: 4,
    name: 'UltraWide 34" Curved Monitor',
    category: 'Displays',
    price: 499.00,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80',
    type: 'emi' // Normal, should not be flagged
  },
  {
    id: 5,
    name: 'Ergonomic Mesh Office Chair',
    category: 'Furniture',
    price: 249.99,
    image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=500&q=80',
    type: 'scarcity' // Dark Pattern
  },
  {
    id: 6,
    name: 'Portable SSD 2TB',
    category: 'Storage',
    price: 159.00,
    image: 'https://images.unsplash.com/photo-1563223771-5fe4038fbfc9?w=500&q=80',
    type: 'benign' // Normal
  },
  {
    id: 7,
    name: 'Pro-Vision VR Headset',
    category: 'Gaming',
    price: 399.00,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=500&q=80',
    type: 'sneak' // Dark Pattern: pre-checked warranty
  },
  {
    id: 8,
    name: 'Premium Fitness App Sync Module',
    category: 'Accessories',
    price: 5.00,
    oldPrice: 49.99,
    image: 'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=500&q=80',
    type: 'subscription' // Dark Pattern: hidden subscription
  }
];

const EcommerceView = ({ openCheckout }) => {
  return (
    <>
      <div style={{ background: '#ef4444', color: 'white', padding: '8px 24px', textAlign: 'center', fontSize: '13px', fontWeight: '600' }}>
        Flash Sale! Use code SUMMER26 for 20% off. Offer expires in 04:59
      </div>
      
      <section className="hero">
        <div className="glow"></div>
        <div className="hero-content">
          <div style={{ color: '#60a5fa', fontWeight: '700', marginBottom: '16px', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.9rem' }}>
            New Arrival
          </div>
          <h1 style={{ marginBottom: '24px', lineHeight: '1.2' }}>Experience Sound Without Limits.</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '32px' }}>
            The new Studio Pro Wireless features industry-leading noise cancellation and 40-hour battery life.
          </p>
          <button className="btn btn-accent" onClick={openCheckout}>
            Shop Now <ChevronRight size={18} />
          </button>
        </div>
        <img 
          src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" 
          alt="Headphones" 
          className="hero-image"
        />
      </section>

      <section style={{ marginTop: '64px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
          <h2>Trending Now</h2>
          <a href="#" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>View All</a>
        </div>
        <p style={{ marginBottom: '24px' }}>Hand-picked favorites from our community.</p>
        
        <div className="product-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} type={product.type} />
          ))}
        </div>
      </section>
      <LiveToast />
    </>
  );
};

export default EcommerceView;
