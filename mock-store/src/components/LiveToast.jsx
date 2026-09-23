import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

const LiveToast = () => {
  const [visible, setVisible] = useState(false);
  const [toastData, setToastData] = useState(null);

  const fakeEvents = [
    { name: 'Alex from Chicago', action: 'just bought Pulse X Watch!', time: '2 minutes ago' },
    { name: 'Sarah from New York', action: 'added Studio Pro to cart', time: 'Just now' },
    { name: 'Michael from Texas', action: 'saved $45 on Mechanical Keyboard', time: '5 minutes ago' }
  ];

  useEffect(() => {
    // Show a toast every 15 seconds
    const interval = setInterval(() => {
      const randomEvent = fakeEvents[Math.floor(Math.random() * fakeEvents.length)];
      setToastData(randomEvent);
      setVisible(true);

      // Hide after 5 seconds
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  if (!visible || !toastData) return null;

  return (
    <div className="live-toast">
      <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '50%', color: '#d97706' }}>
        <Bell size={24} />
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
          {toastData.name} {toastData.action}
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
          Verified interaction • {toastData.time}
        </div>
      </div>
    </div>
  );
};

export default LiveToast;
