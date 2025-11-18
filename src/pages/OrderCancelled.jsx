import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../assets/styles/OrderSuccess.css";

const popularSearchTerms = [
  "Mosquito killer machine",
  "Electric mosquito killer",
  "Installment mobile phones",
  "Hair curling iron",
  "Portable Screen",
  "Oral irrigator",
  "Water Flosser",
  "Water tooth flosser",
  "Toothbrush",
  "Oral",
  "Electric toothbrush",
  "Bluetooth headphones",
  "Wireless earphones",
  "Travel kit",
  "Coffee bean grinder",
  "Treadmill",
  "Coffee maker machine",
  "Coffee grinder",
  "Home projector",
  "Candle Machines",
  "Gym equipment",
];

export default function OrderCancelled() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const status = queryParams.get("status") || "cancelled"; // cancelled, declined, failed

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const handlePopularSearchClick = (term) => {
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  // Different messages based on status
  const getStatusConfig = () => {
    switch (status) {
      case "declined":
        return {
          icon: "✕",
          color: "#e74c3c",
          title: "Payment Declined",
          subtitle: "Your payment was declined. Please try again with a different payment method.",
        };
      case "failed":
        return {
          icon: "⚠",
          color: "#f39c12",
          title: "Order Failed",
          subtitle: "We couldn't process your order. Please try again.",
        };
      default: // cancelled
        return {
          icon: "✕",
          color: "#e74c3c",
          title: "Order Cancelled",
          subtitle: "Your order has been cancelled.",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="order-success-container">
      <div className={`order-success-card ${animate ? 'animate' : ''}`}>
        {/* Header Section */}
        <div className="order-header">
          <div 
            className="cancel-icon" 
            style={{ 
              fontSize: '4rem', 
              color: statusConfig.color, 
              marginBottom: '1rem',
              animation: animate ? 'fadeIn 0.5s ease-in' : 'none'
            }}
          >
            {statusConfig.icon}
          </div>
          <h1 
            className="thank-you-title" 
            style={{ color: statusConfig.color }}
          >
            {statusConfig.title}
          </h1>
          <p className="thank-you-subtitle">{statusConfig.subtitle}</p>
        </div>

        {/* Message Section */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: status === "failed" ? '#fff3cd' : '#fee', 
          borderRadius: '8px', 
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <p style={{ 
            margin: 0, 
            color: status === "failed" ? '#856404' : '#c0392b',
            fontSize: '15px',
            lineHeight: '1.6'
          }}>
            {status === "declined" && "Your payment was not approved. Please check your payment details and try again or use a different payment method."}
            {status === "failed" && "Something went wrong while processing your order. Please try placing your order again."}
            {status === "cancelled" && "This order has been cancelled. If you have any questions, please contact our support team."}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          marginTop: '30px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            className="track-order-btn" 
            onClick={() => navigate('/cart')}
            style={{ 
              backgroundColor: '#3498db',
              minWidth: '150px'
            }}
          >
            View Cart
          </button>
          <button 
            className="track-order-btn" 
            onClick={() => navigate('/')}
            style={{ 
              backgroundColor: '#27ae60',
              minWidth: '150px'
            }}
          >
            Continue Shopping
          </button>
          <button 
            className="track-order-btn" 
            onClick={() => navigate('/contact')}
            style={{ 
              backgroundColor: '#95a5a6',
              minWidth: '150px'
            }}
          >
            Contact Support
          </button>
        </div>

        {/* Help Section */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            marginBottom: '10px',
            color: '#2c3e50'
          }}>
            Need Help?
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#7f8c8d',
            marginBottom: '15px'
          }}>
            Our customer support team is here to assist you.
          </p>
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            fontSize: '14px'
          }}>
            <a 
              href="/support" 
              style={{ 
                color: '#3498db', 
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              📧 Support Center
            </a>
            <a 
              href="tel:+971XXXXXXXX" 
              style={{ 
                color: '#3498db', 
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              📞 Call Us
            </a>
            <a 
              href="https://wa.me/971XXXXXXXX" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                color: '#25d366', 
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              💬 WhatsApp
            </a>
          </div>
        </div>

        {/* Popular Search Terms */}
        <div className="popular-search-section" style={{ marginTop: '40px' }}>
          <h3>Most popular search words</h3>
          <div className="search-tags">
            {popularSearchTerms.map((term) => (
              <button
                key={term}
                type="button"
                className="search-tag"
                onClick={() => handlePopularSearchClick(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
