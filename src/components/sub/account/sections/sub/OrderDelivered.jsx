import React, { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { useCart } from '../../../../../contexts/CartContext';
import 'react-toastify/dist/ReactToastify.css';
import { generateInvoicePDF } from '../../../../../utils/generateInvoice';
import { useNavigate } from 'react-router-dom';

import axios from 'axios';

const returnReasons = [
  'Wrong item delivered',
  'Item damaged or defective',
  'Quality not as expected',
  'Received late',
  'Item not as described',
  'Size or color mismatch',
  'Product missing accessories',
  'Better price available elsewhere',
  'Changed mind / No longer needed',
  'Duplicate order',
  'Other',
];

const OrderDelivered = ({ orders, handleProductClick, slugify, viewOrderDetails }) => {
    const [submittedRequests, setSubmittedRequests] = useState({});

    // Fetch submitted requests for current user by email
    React.useEffect(() => {
      const fetchRequests = async () => {
        try {
          // Get user email from first delivered order
          const userEmail = orders?.find(o => o.status === 'completed')?.billing?.email;
          if (!userEmail) return;
          const res = await axios.get(`https://db.store1920.com/wp-json/custom/v1/list-return-requests?email=${encodeURIComponent(userEmail)}`);
          if (res.data && res.data.requests) {
            // Map requests by orderId (as string) for quick lookup
            const map = {};
            res.data.requests.forEach((req) => {
              if (req.order_id) map[String(req.order_id)] = req;
            });
            setSubmittedRequests(map);
          }
        } catch (err) {
          // Ignore errors for now
        }
      };
      fetchRequests();
    }, [orders]);
  const { addToCart } = useCart();
  const [buyingAgainOrderId, setBuyingAgainOrderId] = useState(null);
  const [returningOrder, setReturningOrder] = useState(null);
  const [returnType, setReturnType] = useState('Return');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [images, setImages] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const navigate = useNavigate();


  const deliveredOrders = orders.filter((order) => order.status === 'completed');
  if (!deliveredOrders.length) return <p>No delivered orders found.</p>;

  const handleBuyAgain = async (lineItems, orderId) => {
    try {
      setBuyingAgainOrderId(orderId);
      for (const item of lineItems) {
        addToCart({
          id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          image: item.image?.src,
        }, false);
      }
      toast.success('Items added to cart!');
    } catch {
      toast.error('Failed to add items to cart');
    } finally {
      setBuyingAgainOrderId(null);
    }
  };

  const submitReturnRequest = async () => {
      // After successful submission, save request state for this order
    if (!reason) return toast.error('Please enter a reason');
    setSubmittingReturn(true);
    // Convert images to base64
    const getBase64Images = async (files) => {
      if (!files || files.length === 0) return [];
      const promises = files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }));
      return Promise.all(promises);
    };

    try {
      const base64Images = await getBase64Images(images);
      const payload = {
        trackingNumber: returningOrder.tracking_number || returningOrder.id,
        orderId: returningOrder.id,
        type: returnType,
        reason,
        comments,
        images: base64Images,
        customerName: returningOrder.billing?.first_name ? `${returningOrder.billing.first_name} ${returningOrder.billing.last_name}` : '',
        customerEmail: returningOrder.billing?.email || '',
        customerPhone: returningOrder.billing?.phone || '',
      };
      await axios.post('https://db.store1920.com/wp-json/custom/v1/submit-return-replacement', payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Return request submitted!');
      setSubmittedRequests((prev) => ({
        ...prev,
        [returningOrder.id]: {
          type: returnType,
          reason,
          comments,
          images,
        },
      }));
      setReturningOrder(null);
      setReturnType('Return');
      setReason('');
      setComments('');
      setImages([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="order-list">
      <ToastContainer position="bottom-center" autoClose={2000} hideProgressBar />

      {deliveredOrders.map((order) => (
        <div key={order.id} className="order-card-simple">
          {/* Header */}
          <div className="order-header-simple">
            <div>
              <strong>Order ID:</strong> {order.id} | <strong>Date:</strong>{' '}
              {new Date(order.date_created).toLocaleDateString()} | <strong>Email:</strong> {order.billing.email}
            </div>
          </div>

          {/* Products */}
          <div
            className="order-items-grid-simple"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: 12,
            }}
          >
            {order.line_items.map((item) => (
              <div
                key={item.id}
                className="order-product-simple"
                onClick={() => handleProductClick(slugify(item.name))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleProductClick(slugify(item.name)); }}
                style={{
                  width: 140,
                  padding: 8,
                  border: '1px solid #eee',
                  borderRadius: 6,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#fafafa',
                }}
              >
                <img
                  src={item.image?.src || 'https://via.placeholder.com/100'}
                  alt="Product"
                  style={{ width: '100%', height: 100, objectFit: 'contain', marginBottom: 6 }}
                />
                <div style={{ color: '#FF8C00', fontWeight: 'bold' }}>
                  {order.currency} {item.price}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="order-summary-simple" style={{ marginTop: 12 }}>
            <div>{order.line_items.length} item{order.line_items.length > 1 ? 's' : ''}</div>
            {/* <div>
              Order Time:{' '}
              {new Intl.DateTimeFormat('en-GB', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false, timeZone: 'Asia/Dubai',
              }).format(new Date(order.date_created))}
            </div> */}
            {/* <div>Payment method: {order.payment_method_title || order.payment_method}</div> */}
          </div>

          {/* Actions */}
          <div className="order-actions-simple" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <button
              className="btn-outline"
              onClick={() => generateInvoicePDF(order)}
            >
              Download Invoice
            </button>
            {(() => {
              const hasRequest = submittedRequests[String(order.id)];
              if (hasRequest) {
                return null;
              }
              return (
                <button
                  className="btn-outline"
                  style={{ position: 'relative', paddingRight: 16 }}
                  onClick={() => setReturningOrder(order)}
                >
                  Return / Replacement
                </button>
              );
            })()}
          </div>
          {/* Show submitted request details if exists */}
          {submittedRequests[String(order.id)] && (
            <div style={{ background: '#fff3cd', borderRadius: 8, padding: 16, margin: '16px 0', border: '1px solid #ffeeba' }}>
              <div style={{ fontWeight: 600, color: '#856404', marginBottom: 8 }}>Return/Replacement Request Submitted</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <img src={order.line_items[0]?.image?.src || 'https://via.placeholder.com/100'} alt={order.line_items[0]?.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
                <div>
                  <div style={{ fontWeight: 500 }}>{order.line_items[0]?.name}</div>
                  <div style={{ color: '#FF8C00', fontWeight: 600 }}>{order.currency} {order.line_items[0]?.price}</div>
                </div>
              </div>
              <div><strong>Type:</strong> {submittedRequests[String(order.id)].request_type || submittedRequests[String(order.id)].type}</div>
              <div><strong>Reason:</strong> {submittedRequests[String(order.id)].reason}</div>
              {submittedRequests[String(order.id)].comments && <div><strong>Comments:</strong> {submittedRequests[String(order.id)].comments}</div>}
              {/* If backend returns images, show them */}
              {submittedRequests[String(order.id)].images && Array.isArray(submittedRequests[String(order.id)].images) && submittedRequests[String(order.id)].images.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Images:</strong>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {submittedRequests[String(order.id)].images.map((img, idx) => (
                      <img key={idx} src={typeof img === 'string' ? img : ''} alt={`Request ${idx + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Return Popup */}
      {returningOrder && (
        <div className="return-modal-overlay" style={{position: 'fixed',top: 0, left: 0,width: '100%', height: '100%',backgroundColor: 'rgba(0,0,0,0.5)',display: 'flex', alignItems: 'center', justifyContent: 'center',zIndex: 9999}}>
          <div style={{background: '#fff',padding: 32,borderRadius: 16,width: 420,maxWidth: '95%',boxShadow: '0 8px 32px rgba(0,0,0,0.12)',display: 'flex',flexDirection: 'column',alignItems: 'center'}}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 18, color: '#FF8C00', textAlign: 'center' }}>
              Return / Replacement Request
            </div>
            <div style={{ width: '100%', marginBottom: 18 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>Type</label>
                <select
                  value={returnType}
                  onChange={e => setReturnType(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                >
                  <option value="Return">Return</option>
                  <option value="Replacement">Replacement</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>Reason</label>
                <input
                  type="text"
                  placeholder="Reason (e.g. Damaged, Wrong item)"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>Comments</label>
                <textarea
                  placeholder="Additional comments (optional)"
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                  rows={2}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>Upload Images (optional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => setImages(Array.from(e.target.files))}
                  style={{ marginBottom: 4 }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', width: '100%' }}>
              <button
                className="btn-outline"
                onClick={() => {
                  setReturningOrder(null);
                  setReturnType('Return');
                  setReason('');
                  setComments('');
                  setImages([]);
                }}
                disabled={submittingReturn}
                style={{ minWidth: 120 }}
              >
                Cancel
              </button>
              <button
                className="btn-secondary"
                onClick={submitReturnRequest}
                disabled={submittingReturn}
                style={{ minWidth: 140 }}
              >
                {submittingReturn ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDelivered;
