import React, { useState, useEffect } from 'react';
import { ShoppingCart, Flame, Users, CheckCircle } from 'lucide-react';

const ProductCard = ({ product, type }) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    if (type === 'urgency') {
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [type]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="product-card">
      {type === 'scarcity' && <span className="badge badge-danger">Selling Fast!</span>}
      {type === 'urgency' && <span className="badge badge-danger">Flash Sale</span>}

      <div className="product-image-container">
        <img src={product.image} alt={product.name} className="product-image" />
      </div>

      <h3>{product.name}</h3>
      <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}>{product.category}</p>
      
      <div className="product-price-container">
        <span className="product-price">${product.price.toFixed(2)}</span>
        {product.oldPrice && <span className="product-price-old">${product.oldPrice.toFixed(2)}</span>}
      </div>

      {/* Dynamic Texts to test Dark-Guard */}
      {type === 'scarcity' && (
        <div className="scarcity-text">
          <Flame size={16} />
          <span>Hurry! Only 2 items left in stock</span>
        </div>
      )}

      {type === 'urgency' && (
        <div className="scarcity-text">
          <Flame size={16} />
          <span>Offer ends in {formatTime(timeLeft)}</span>
        </div>
      )}

      {type === 'social' && (
        <div className="social-text">
          <Users size={16} />
          <span>24 people are viewing this right now</span>
        </div>
      )}

      {type === 'benign' && (
        <div className="benign-text">
          <CheckCircle size={16} />
          <span>In stock and ready to ship</span>
        </div>
      )}

      {type === 'emi' && (
        <div style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
          <strong>No Cost EMI:</strong> Avail No Cost EMI on select cards
        </div>
      )}

      {type === 'sneak' && (
        <div style={{ fontSize: '0.85rem', marginBottom: '16px', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <input type="checkbox" defaultChecked id={`sneak-${product.id}`} style={{ marginTop: '3px' }} />
          <label htmlFor={`sneak-${product.id}`} style={{ cursor: 'pointer', color: '#0f172a', fontWeight: '600' }}>
            Yes, protect my purchase! Add 2-year premium warranty for only $14.99.
          </label>
        </div>
      )}

      {type === 'subscription' && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px', lineHeight: '1.3' }}>
          By clicking add to cart, you agree to enroll in our VIP membership program. You will be billed $49.99 every month after your 7-day trial ends. To cancel, please call our support hotline during business hours.
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
        <ShoppingCart size={18} />
        Add to cart
      </button>
    </div>
  );
};

export default ProductCard;
