import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../../assets/styles/myaccount/browsingHistorySection.css';
import NoItemImage from '../../../../assets/images/noitem.png';
import { getBrowsingHistory, clearBrowsingHistory, clearHistoryType } from '../../../../utils/browsingHistory';

const BrowsingHistorySection = () => {
  const [history, setHistory] = useState({ products: [], searches: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'searches'
  const navigate = useNavigate();

  useEffect(() => {
    // Load history from localStorage
    try {
      const userHistory = getBrowsingHistory();
      setHistory(userHistory);
    } catch (error) {
      console.error('Error loading browsing history:', error);
      setHistory({ products: [], searches: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all browsing history?')) {
      clearBrowsingHistory();
      setHistory({ products: [], searches: [] });
    }
  };

  const handleClearType = () => {
    if (window.confirm(`Clear all ${activeTab}?`)) {
      clearHistoryType(activeTab);
      setHistory(prev => ({
        ...prev,
        [activeTab]: []
      }));
    }
  };

  const handleProductClick = (slug) => {
    navigate(`/product/${slug}`);
  };

  const handleSearchClick = (query) => {
    navigate(`/?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="browsing-history-container">
      <div className="history-header">
        <div className="header-left">
          <h2 className="history-title">📚 Browsing History</h2>
          <p className="history-subtitle">Your recently viewed products and searches</p>
        </div>
        {(history.products.length > 0 || history.searches.length > 0) && (
          <button onClick={handleClearAll} className="clear-all-btn">
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="history-tabs">
        <button 
          className={`history-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <span className="tab-icon">🛍️</span>
          <span className="tab-label">Products</span>
          <span className="tab-count">{history.products.length}</span>
        </button>
        <button 
          className={`history-tab ${activeTab === 'searches' ? 'active' : ''}`}
          onClick={() => setActiveTab('searches')}
        >
          <span className="tab-icon">🔍</span>
          <span className="tab-label">Searches</span>
          <span className="tab-count">{history.searches.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your history...</p>
        </div>
      ) : (
        <>
          {/* Products Tab */}
          {activeTab === 'products' && (
            <>
              {history.products.length === 0 ? (
                <div className="empty-history-box">
                  <div className="empty-icon">📦</div>
                  <h3 className="empty-title">No Products Viewed Yet</h3>
                  <p className="empty-description">Start exploring our products and they'll appear here!</p>
                  <button className="browse-btn" onClick={() => navigate('/')}>
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  <div className="history-actions">
                    <p className="results-count">{history.products.length} product{history.products.length !== 1 ? 's' : ''} viewed</p>
                    <button onClick={handleClearType} className="clear-type-btn">
                      Clear Products
                    </button>
                  </div>
                  <div className="history-grid">
                    {history.products.map((item, index) => (
                      <div
                        className="history-card"
                        key={`${item.id}-${index}`}
                        onClick={() => handleProductClick(item.slug)}
                      >
                        <div className="card-image-wrapper">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="history-card-img"
                            onError={(e) => (e.target.src = 'https://via.placeholder.com/160?text=No+Image')}
                          />
                          <div className="view-overlay">
                            <span className="view-text">👁️ View</span>
                          </div>
                        </div>
                        <div className="history-info">
                          <h4 className="product-name">{item.name}</h4>
                          <div className="product-price">
                            {item.sale_price ? (
                              <>
                                <span className="sale-price">AED {item.sale_price}</span>
                                <span className="regular-price">AED {item.regular_price}</span>
                              </>
                            ) : (
                              <span className="price">AED {item.price}</span>
                            )}
                          </div>
                          <p className="view-date">
                            🕐 {new Date(item.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Searches Tab */}
          {activeTab === 'searches' && (
            <>
              {history.searches.length === 0 ? (
                <div className="empty-history-box">
                  <div className="empty-icon">🔍</div>
                  <h3 className="empty-title">No Search History</h3>
                  <p className="empty-description">Your search queries will be saved here for easy access.</p>
                  <button className="browse-btn" onClick={() => navigate('/')}>
                    Start Searching
                  </button>
                </div>
              ) : (
                <>
                  <div className="history-actions">
                    <p className="results-count">{history.searches.length} search{history.searches.length !== 1 ? 'es' : ''} saved</p>
                    <button onClick={handleClearType} className="clear-type-btn">
                      Clear Searches
                    </button>
                  </div>
                  <div className="searches-list">
                    {history.searches.map((item, index) => (
                      <div
                        className="search-item"
                        key={`${item.query}-${index}`}
                        onClick={() => handleSearchClick(item.query)}
                      >
                        <div className="search-icon">🔍</div>
                        <div className="search-content">
                          <p className="search-query">{item.query}</p>
                          <p className="search-date">
                            🕐 {new Date(item.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="search-arrow">→</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BrowsingHistorySection;
