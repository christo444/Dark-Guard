import React from 'react';
import { Plane, MapPin, Users, Flame, Info } from 'lucide-react';

const BookingView = () => {
  return (
    <div style={{ marginTop: '32px' }}>
      <h1 style={{ marginBottom: '24px' }}>Find your next stay</h1>
      
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '48px', display: 'flex', gap: '16px' }}>
        <input type="text" placeholder="Where are you going?" defaultValue="Paris, France" style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        <input type="date" defaultValue="2026-10-15" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        <input type="date" defaultValue="2026-10-22" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        <button className="btn btn-primary">Search</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
        
        {/* Search Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2>Top Properties in Paris</h2>

          {/* Dark Pattern Hotel */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex' }}>
            <img src="https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=300&q=80" alt="Hotel" style={{ width: '250px', objectFit: 'cover' }} />
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Grand Hotel Le Veau</h3>
                  <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> 1.2km from center
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#ef4444', fontWeight: '700', fontSize: '1.25rem' }}>$249 / night</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>+ taxes & fees</div>
                </div>
              </div>
              
              <div style={{ marginTop: '16px', color: '#ef4444', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={16} /> Only 1 room left at this price on our site
              </div>
              
              <div style={{ marginTop: '8px', color: '#f59e0b', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} /> 38 people are looking at this hotel right now
              </div>

              <div style={{ marginTop: '16px', background: '#fef2f2', padding: '12px', borderRadius: '6px', border: '1px solid #fecaca', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input type="checkbox" defaultChecked id="insurance" style={{ marginTop: '3px' }} />
                <label htmlFor="insurance" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}>
                  Add Trip Protection (Recommended). Includes cancellation coverage for $39.99/person.
                </label>
              </div>

              <button className="btn btn-primary" style={{ marginTop: 'auto', alignSelf: 'flex-end' }}>Book Now</button>
            </div>
          </div>

          {/* Benign Hotel */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex' }}>
            <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&q=80" alt="Hotel" style={{ width: '250px', objectFit: 'cover' }} />
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Boutique Parisien</h3>
                  <div style={{ color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> 3.5km from center
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#0f172a', fontWeight: '700', fontSize: '1.25rem' }}>$185 / night</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Includes all taxes</div>
                </div>
              </div>
              
              <div style={{ marginTop: '16px', color: '#10b981', fontWeight: '500', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={16} /> 12 rooms available
              </div>
              
              <button className="btn btn-secondary" style={{ marginTop: 'auto', alignSelf: 'flex-end' }}>Select Room</button>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div>
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '16px' }}>Flight Deals</h3>
            
            {/* Dark Pattern Flight */}
            <div style={{ marginBottom: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>JFK -&gt; CDG</span>
                <span style={{ color: '#ef4444', fontWeight: '700' }}>$499</span>
              </div>
              <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '600' }}>Fares increasing soon! Book today.</div>
            </div>

            {/* Benign Flight */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>EWR -&gt; ORY</span>
                <span style={{ color: '#0f172a', fontWeight: '700' }}>$550</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Standard Economy Fare</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingView;
