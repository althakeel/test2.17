import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { getOrderById } from "../api/woocommerce";
import "../assets/styles/OrderSuccess.css";

const formatPrice = (value) => {
  const amount = Number.parseFloat(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `AED ${safeAmount.toFixed(2)}`;
};

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

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const orderId = queryParams.get("order_id");
  const isCancelled = queryParams.get("cancelled") === "1";

  const [animate, setAnimate] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false - no loading spinner
  const { clearCart } = useCart();
  
  useEffect(() => {
    //Clear cart when success page loads
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        return;
      }
      const data = await getOrderById(orderId);
      setOrder(data);
    }
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      navigate("/", { replace: true });
      return;
    }

    setAnimate(true);

    const handlePopState = () => {
      navigate("/", { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, orderId]);

  const handleTrackOrder = () => {
    if (orderId) navigate(`/track-order?order_id=${orderId}`);
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    alert('Order ID copied to clipboard!');
  };

  const handlePopularSearchClick = (term) => {
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  // Show loader for 2 seconds before showing 'Order not found'
  const [notFoundLoading, setNotFoundLoading] = useState(false);
  useEffect(() => {
    if (!orderId || !order) {
      setNotFoundLoading(true);
      const timer = setTimeout(() => setNotFoundLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [orderId, order]);

  if (!orderId || !order) {
    if (notFoundLoading) {
      return (
        <div className="order-success-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: 'rgba(255,255,255,0.95)', transition: 'background 0.3s' }}>
          <style>{`
            .modern-spinner {
              width: 48px;
              height: 48px;
              border: 5px solid #eee;
              border-top: 5px solid #ff5100;
              border-radius: 50%;
              animation: modern-spin 0.8s linear infinite;
              margin: 0 auto;
            }
            @keyframes modern-spin {
              to { transform: rotate(360deg); }
            }
            .fade-in-loader {
              animation: fadeIn 0.5s;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          <div className="order-success-card fade-in-loader" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderRadius: '16px', padding: '48px 32px', background: '#fff', textAlign: 'center' }}>
            <div className="modern-spinner"></div>
            <div style={{ marginTop: '18px', fontSize: '1.1rem', color: '#ff5100', fontWeight: 500 }}>Loading your order...</div>
          </div>
        </div>
      );
    }
    return (
      <div className="order-success-container">
        <div className="order-success-card">
          <div className="error-message">Order not found.</div>
        </div>
      </div>
    );
  }

  // Show cancellation message if order is cancelled
  if (isCancelled) {
    return (
      <div className="order-success-container">
        <div className="order-success-card">
          {/* Header Section - Cancelled */}
          <div className="order-header">
            <div className="cancel-icon" style={{ 
              fontSize: '4rem', 
              color: '#e74c3c', 
              marginBottom: '1rem' 
            }}>✕</div>
            <h1 className="thank-you-title" style={{ color: '#e74c3c' }}>Order Cancelled</h1>
            <p className="thank-you-subtitle">Your order has been cancelled.</p>
            
            <button className="order-btn" onClick={() => navigate('/orders')}>
              View Orders
            </button>
          </div>

          {/* Order Info Grid */}
          <div className="order-info-grid">
            <div className="info-item">
              <span className="info-label">Order date:</span>
              <span className="info-value">{order?.date_created ? new Date(order.date_created).toLocaleDateString('en-GB') : '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className="info-value" style={{ color: '#e74c3c', fontWeight: 'bold' }}>Cancelled</span>
            </div>
            <div className="info-item">
              <span className="info-label">Payment method:</span>
              <span className="info-value">{order?.payment_method_title || 'COD'}</span>
            </div>
          </div>

          {/* Cancellation Message */}
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fee', 
            borderRadius: '8px', 
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: 0, color: '#c0392b' }}>
              This order has been cancelled. If you have any questions, please contact our support team.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginTop: '20px',
            justifyContent: 'center'
          }}>
            <button 
              className="track-order-btn" 
              onClick={() => navigate('/')}
              style={{ backgroundColor: '#3498db' }}
            >
              Continue Shopping
            </button>
            <button 
              className="track-order-btn" 
              onClick={() => navigate('/contact')}
              style={{ backgroundColor: '#95a5a6' }}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-container">
      <div className="order-success-card">
        {/* Header Section */}
        <div className="order-header">
          <div className="success-icon">✓</div>
          <h1 className="thank-you-title">Thank you</h1>
          <p className="thank-you-subtitle">Thank you. Your order has been received.</p>
          
          <button className="order-btn" onClick={() => navigate('/orders')}>
            Order no.
          </button>
        </div>

        {/* Order Number Section */}
        <div className="order-number-section">
          <h2 className="order-id" onClick={handleCopyOrderId}>
            {order.id}
          </h2>
          <p className="copy-order-text" onClick={handleCopyOrderId}>
            📋 Copy order number
          </p>
        </div>

        {/* Order Details Tabs */}
        <div className="order-tabs">
          <button className="tab-btn active">Order details</button>
        </div>

        {/* Order Info Grid */}
        <div className="order-info-grid">
          <div className="info-item">
            <span className="info-label">Order no.:</span>
            <span className="info-value">{order.id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Order date:</span>
            <span className="info-value">{new Date(order.date_created).toLocaleDateString('en-GB')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total:</span>
            <span className="info-value">{formatPrice(order.total)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Payment method:</span>
            <span className="info-value">{order.payment_method_title || order.payment_method || 'N/A'}</span>
          </div>
        </div>

        {/* Order Summary Section */}
        <div className="order-summary-section">
          <button className="order-summary-btn">Order summary</button>
        </div>

        {/* Products Table */}
        <div className="products-table">
          <div className="table-header">
            <span className="product-header">Product</span>
            <span className="total-header">Total</span>
          </div>
          
          {order.line_items.map((item) => (
            <div key={item.id} className="table-row">
              <div className="product-info">
                <div className="product-image">
                  {item.image?.src ? (
                    <img src={item.image.src} alt={item.name} />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#999'
                    }}>
                      No Image
                    </div>
                  )}
                </div>
                <div className="product-details">
                  <div className="product-name">[{item.product_id}] {item.name}</div>
                  <div className="product-quantity">× {item.quantity}</div>
                </div>
              </div>
              <div className="product-total">{formatPrice(item.total)}</div>
            </div>
          ))}

          {/* Summary Section */}
          <div className="order-summary-details">
            <div className="summary-row">
              <span className="summary-label">Items</span>
              <span className="summary-value">{formatPrice(order.total)}</span>
            </div>
            
            <div className="summary-row">
              <span className="summary-label">Discount</span>
              <span className="summary-value"></span>
            </div>
            
            {/* Shipping & handling removed as requested */}
            
            <div className="summary-row total-row">
              <span className="summary-label">Total</span>
              <span className="summary-value">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Track Order Button */}
        <div className="track-order-section">
          <button className="track-order-btn" onClick={handleTrackOrder}>
            Track Your Order
          </button>
        </div>

        {/* Note for guests */}
        {!user && (
          <div className="guest-note">
            <p>Note: Guests can only track their order. Updates will be sent via WhatsApp.</p>
          </div>
        )}

        {/* Popular Search Terms */}
        <div className="popular-search-section">
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
