import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../../../../assets/styles/myaccount/OrderSection.css';
import AllOrders from './sub/Orders';
import ProcessingOrders from './sub/processingorder';
import ShippedOrder from './sub/shippedorder';
import OrderDelivered from './sub/OrderDelivered';
import OrderReturns from './sub/OrderReturns';


const API_BASE_URL = 'https://db.store1920.com/wp-json/wc/v3/orders';
const API_AUTH = {
  username: 'ck_5441db4d77e2a329dc7d96d2db6a8e2d8b63c29f',
  password: 'cs_81384d5f9e75e0ab81d0ea6b0d2029cba2d52b63',
};

const CART_API_URL = 'https://db.store1920.com/wp-json/cocart/v2/cart/add-item';

const OrderSection = ({ userId }) => {
  const [activeStatus, setActiveStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const navigate = useNavigate();

  const orderStatuses = [
    { label: 'All orders', value: '' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'completed' },
    { label: 'Returns', value: 'refunded' },
  ];

  // Fetch orders with React Query (with caching)
  const { data: orders = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['orders', userId, activeStatus],
    queryFn: async () => {
      if (!userId) throw new Error('User not logged in');

      const params = { 
        customer: userId,
        per_page: 10, // Reduced to 10 for much faster loading
        orderby: 'date',
        order: 'desc',
        // Only fetch essential fields to reduce response size
        _fields: 'id,number,status,date_created,total,currency,line_items,billing,shipping,customer_id'
      };

      if (activeStatus && activeStatus !== 'shipped') {
        params.status = activeStatus;
      }

      const response = await axios.get(API_BASE_URL, {
        auth: API_AUTH,
        params,
        timeout: 20000, // Increased to 20 seconds
      });

      let fetchedOrders = response.data || [];

      if (activeStatus === 'shipped') {
        fetchedOrders = fetchedOrders.filter(order => order.status === 'shipped');
      }

      return fetchedOrders;
    },
    enabled: !!userId,
    staleTime: 60000, // Cache for 60 seconds (increased)
    cacheTime: 300000, // Keep in cache for 5 minutes
    retry: 1, // Only retry once
    retryDelay: 2000,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    onError: (err) => {
      console.error('Orders fetch error:', err.message);
    }
  });

  const handleSearch = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    try {
      const orderId = trimmed.replace(/^PO-/, '');
      const response = await axios.get(`${API_BASE_URL}/${orderId}`, {
        auth: API_AUTH,
        timeout: 5000,
      });

      if (response.data.customer_id !== userId) {
        alert('Order not found or access denied.');
        setSearchResults([]);
      } else {
        setSearchResults([response.data]);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      alert(`Search failed: ${message}`);
      setSearchResults([]);
    }
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    setActiveStatus('');
    setSearchResults(null);
  };

  // Use search results if available, otherwise use React Query data
  const displayOrders = searchResults !== null ? searchResults : orders;
  const displayLoading = searchResults === null && loading;
  const displayError = searchResults === null && error;

  const handleViewOrderDetails = (order) => {
    navigate(`/order/${order.id}`);
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setCancellingOrderId(orderId);
    try {
      await axios.put(
        `${API_BASE_URL}/${orderId}`,
        { status: 'cancelled' },
        { auth: API_AUTH }
      );

      alert(`Order #${orderId} has been cancelled.`);
      refetch(); // Refresh orders after cancellation
    } catch (err) {
      alert('Failed to cancel the order. Please try again.');
      console.error(err);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const slugify = text =>
    text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleProductClick = slug => {
    navigate(`/product/${slug}`);
  };

  const isCancelable = status => ['processing', 'on-hold'].includes(status);

  const handleBuyAgain = async items => {
    try {
      for (const item of items) {
        await axios.post(CART_API_URL, {
          id: item.product_id,
          quantity: item.quantity,
        });
      }
      navigate('/checkout');
    } catch (error) {
      alert('Failed to add items to cart.');
      console.error(error);
    }
  };

  const renderOrdersByStatus = () => {
    switch (activeStatus) {
      case 'processing':
        return (
          <ProcessingOrders
            orders={displayOrders}
            cancellingOrderId={cancellingOrderId}
            cancelOrder={cancelOrder}
            handleProductClick={handleProductClick}
            slugify={slugify}
            isCancelable={isCancelable}
          />
        );

      case 'shipped':
        return (
          <ShippedOrder
            orders={displayOrders}
            cancellingOrderId={cancellingOrderId}
            cancelOrder={cancelOrder}
            handleProductClick={handleProductClick}
            slugify={slugify}
            isCancelable={isCancelable}
            onOrdersUpdated={refetch}
          />
        );

      case 'completed':
        return (
          <OrderDelivered
          orders={displayOrders}
          handleProductClick={handleProductClick}
          slugify={slugify}
          viewOrderDetails={handleViewOrderDetails}
        />
        );

      case 'refunded':
        return (
          <OrderReturns
          orders={displayOrders}
          handleProductClick={handleProductClick}
          slugify={slugify}
          isCancelable={isCancelable}
          cancelOrder={cancelOrder}
        />
        );

      default:
        return (
          <AllOrders
            orders={displayOrders}
            cancellingOrderId={cancellingOrderId}
            cancelOrder={cancelOrder}
            handleProductClick={handleProductClick}
            slugify={slugify}
            isCancelable={isCancelable}
            onOrdersUpdated={refetch}
          />
        );
    }
  };

  return (
    <div className="order-section">
      <div className="order-header">
        <h2>Your Orders</h2>
        <div className="order-search">
          <input
            type="text"
            placeholder="Search by Order ID (e.g. PO-12345)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearch}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="scoped-search-icon12"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          {searchTerm && (
            <button className="reset-search" onClick={handleResetSearch}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="order-tabs">
        {orderStatuses.map(({ label, value }) => (
          <button
            key={value || 'all'}
            className={`tab-button ${activeStatus === value ? 'active' : ''}`}
            onClick={() => setActiveStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {displayLoading && (
        <div className="orders-loading">
          <p>Loading your orders...</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            This may take a few seconds
          </p>
        </div>
      )}
      {displayError && (
        <div className="error-message-box" style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <p className="error" style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
            Failed to load orders
          </p>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            {displayError.message?.includes('timeout') 
              ? 'The server is taking too long to respond. Please try again.'
              : displayError.message || 'An error occurred while fetching orders'}
          </p>
          <button 
            onClick={() => refetch()} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!displayLoading && !displayError && displayOrders.length === 0 && <p>No orders found.</p>}
      {!displayLoading && !displayError && displayOrders.length > 0 && renderOrdersByStatus()}
    </div>
  );
};

export default OrderSection;
