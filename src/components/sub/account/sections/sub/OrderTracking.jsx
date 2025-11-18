// OrderTracking.jsx
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { FaCheckCircle } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import "../../../../../assets/styles/myaccount/OrderTracking.css";

/**
 * Props:
 *  - order : object (from WooCommerce REST) expected shape (examples):
 *    order.id
 *    order.status (main order status)
 *    order.tracking_info = { status: "Ordered", history: [{status, date, time}], agent_phone }
 *    order.shipping = { name, phone, address_1, address_2, city, state, country }
 *    order.billing = { email } OR order.customer_email
 *    order.items = [{ image, name }]
 *
 *  - onBack (optional)
 *
 * Note: Replace the 'simulateApproval' function call with your WP REST API call to perform "speed up shipment" request.
 */

// Dynamic order steps based on your statuses
const ORDER_STEPS = [
  { key: "pending", label: "Pending" },       // Order received, awaiting payment
  { key: "on-hold", label: "On Hold" },       // Awaiting manual payment or verification
  { key: "processing", label: "Processing" }, // Payment received, preparing order
  { key: "completed", label: "Delivered" },   // Order fulfilled and delivered
  { key: "cancelled", label: "Cancelled" },   // Order cancelled
  { key: "refunded", label: "Refunded" },     // Order refunded
];


// Find current step index from order status
const getCurrentStepIndex = (status) => {
  const normalizedStatus = (status || "").toLowerCase();
  const idx = ORDER_STEPS.findIndex((step) => step.key === normalizedStatus);
  return idx >= 0 ? idx : 0; // fallback to 0 if unknown status
};

export default function OrderTracking({ order = {}, onBack }) {
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [speedModalOpen, setSpeedModalOpen] = useState(false);
  const [speedRequestState, setSpeedRequestState] = useState("idle"); // idle | pending | approved | error
  const [speedMessage, setSpeedMessage] = useState("");
  const [guaranteeModalOpen, setGuaranteeModalOpen] = useState(false);
  const [c3xTrackingData, setC3xTrackingData] = useState(null);
  const [c3xLogs, setC3xLogs] = useState([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  const trackingInfo = order.tracking_info || {};
  const history = trackingInfo.history || [];
  // Use main order.status, fallback to trackingInfo.status or 'processing'
  const currentStatus = (order.status || trackingInfo.status || "processing").toLowerCase();
  const currentStep = getCurrentStepIndex(currentStatus);

  const email = order.billing?.email || order.customer_email || order.email || "Not available";

  // Fetch C3X tracking data when component mounts
  useEffect(() => {
    const fetchC3XTracking = async () => {
      if (!order.id) return;
      
      setLoadingTracking(true);
      try {
        const response = await fetch(
          "https://db.store1920.com/wp-json/custom/v1/track-c3x-reference",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ TrackingAWB: order.id.toString() }),
          }
        );

        if (!response.ok) throw new Error("C3X API error");
        const data = await response.json();

        if (data?.AirwayBillTrackList?.length) {
          const trackingData = data.AirwayBillTrackList[0];
          if (trackingData.AirWayBillNo) {
            setC3xTrackingData(trackingData);
            setC3xLogs(trackingData.TrackingLogDetails || []);
          }
        }
      } catch (err) {
        console.error("C3X Tracking Error:", err);
      } finally {
        setLoadingTracking(false);
      }
    };

    fetchC3XTracking();
  }, [order.id]);

  // Simulate admin approval. Replace with a real endpoint call.
  const simulateApproval = async (orderId) => {
    setSpeedRequestState("pending");
    setSpeedMessage("Request sent. Waiting for admin approval...");
    try {
      await new Promise((res) => setTimeout(res, 2000));
      await new Promise((res) => setTimeout(res, 1500));
      setSpeedRequestState("approved");
      setSpeedMessage(
        "We have received your request to speed up shipment and will arrange shipment for you as soon as possible. You will receive AED20.00 credit within 48 hours if delivered after the guaranteed date."
      );
    } catch (err) {
      setSpeedRequestState("error");
      setSpeedMessage("Something went wrong. Please try again later.");
    }
  };

  const handleSpeedUpClick = () => {
    setSpeedRequestState("idle");
    setSpeedMessage("");
    setSpeedModalOpen(true);
  };

  const confirmSpeedUp = async () => {
    await simulateApproval(order.id);
  };

  return (
    <div className="ot-root">
      {onBack && (
        <div
          onClick={onBack}
          style={{
            cursor: "pointer",
            color: "rgba(139, 139, 139, 1)",
            userSelect: "none",
            fontSize: "0.9rem",
            marginBottom: ".5rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            fontWeight: "600",
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onBack();
          }}
        >
          <span style={{ fontWeight: "bold" }}>order</span> / <span style={{ color: "#000" }}>order tracking</span>
        </div>
      )}

      <div className="ot-card">
        <div
          className="ot-guarantee"
          id="guaranteeBar"
          onClick={() => setGuaranteeModalOpen(true)}
          style={{ cursor: "pointer" }}
        >
          <div className="ot-guarantee-inner">
            <span>AED20.00 Credit for delay</span>
            <span className="ot-sep">|</span>
            <span>Return if item damaged</span>
            <span className="ot-sep">|</span>
            <span>15-day no update refund</span>
            <span className="ot-sep">|</span>
            <span>40-day no delivery refund</span>
          </div>
        </div>
        {guaranteeModalOpen && (
          <div
            className="ot-modal-backdrop"
            id="guaranteeModal"
            onClick={(e) => {
              if (e.target.id === "guaranteeModal") setGuaranteeModalOpen(false);
            }}
          >
            <div className="ot-modal ot-modal-large">
              <button
                className="ot-modal-close"
                id="closeGuarantee"
                onClick={() => setGuaranteeModalOpen(false)}
              >
                &times;
              </button>
              <h2 className="ot-modal-title">Delivery Guarantee</h2>

              <div className="ot-guarantee-content">
                <div className="ot-guarantee-section">
                  <h3>AED20.00 Credit for Delay</h3>
                  <p>
                    If any item(s) in your order arrive after <strong> 12 -15 days</strong>, we
                    will issue you a AED20.00 credit within 48 hours.
                  </p>
                  <p className="ot-note">Some exceptions apply. See our policy page for details.</p>
                </div>

                <div className="ot-guarantee-section">
                  <h3>Return if Item Damaged</h3>
                  <p>
                    If you receive your package and find that some items are lost or
                    damaged in transit, you can easily apply for a full refund for those
                    items.
                  </p>
                </div>

                <div className="ot-guarantee-section">
                  <h3>15-Day No Update Refund</h3>
                  <p>
                    If your package has no tracking updates for over 15 days without being
                    delivered, you can apply for a free reshipment or refund. If it arrives
                    later, you can keep it for free.
                  </p>
                </div>

                <div className="ot-guarantee-section">
                  <h3>40-Day No Delivery Refund</h3>
                  <p>
                    If your package isn't delivered within 40 days after shipment, you can
                    apply for a free reshipment or a full refund. If it arrives later, you
                    can keep it for free.
                  </p>
                </div>
              </div>

              <div className="ot-modal-footer">
                For full details, please refer to our <a href="#">policy page</a>.
              </div>
            </div>
          </div>
        )}

        <div className="ot-header">
          <div className="ot-header-left">
            <h2>{c3xTrackingData?.CurrentStatus || "Gathering items"}</h2>
            <p className="ot-sub">
              {c3xTrackingData ? 
                `Reference: ${c3xTrackingData.Reference || order.id}` : 
                "80.0% of orders typically ship out within 2 days"}
            </p>
            <button className="ot-link-btn" onClick={() => setTrackingModalOpen(true)}>
              View tracking status
            </button>
          </div>

          <div className="ot-header-right">
            <button
              className="ot-pill"
              onClick={() => setUpdatesModalOpen(true)}
              aria-label="Get updates"
            >
              Get updates
            </button>
            <button className="ot-pill" onClick={handleSpeedUpClick} aria-label="Speed up shipment">
              Speed up shipment
            </button>
          </div>
        </div>

        {/* Progress area */}
        <div className="ot-progress">
          <div className="ot-progress-line" aria-hidden="true"></div>

           {ORDER_STEPS.map((step, idx) => {
      const active = idx <= currentStep;
      return (
        <div className="ot-step" key={step.key}>
          <div className={`ot-step-circle ${active ? "active" : ""}`}>
            {active ? <FaCheckCircle size={12} /> : ""}
          </div>
          <div className="ot-step-label">{step.label}</div>
        </div>
      );
    })}
        </div>

        {/* Address & Delivery */}
        <div className="ot-address-wrap">
          <div className="ot-address">
            <div className="ot-address-title">
              <h4>Shipping address</h4>
              {/* <a className="ot-change-link" href="#" onClick={(e) => e.preventDefault()}>
                Change
              </a> */}
            </div>
            <div className="ot-address-note">It can't be changed after shipment</div>
            <div className="ot-address-value">
              {order.shipping?.fullName || order.shipping?.name || "Name missing"}
              {order.shipping?.phone ? ` ${order.shipping.phone},` : ","}{" "}
              {order.shipping?.address_1 || ""} {order.shipping?.address_2 || ""}{" "}
              {order.shipping?.city ? `, ${order.shipping.city}` : ""}{" "}
              {order.shipping?.state ? `, ${order.shipping.state}` : ""}{" "}
              {order.shipping?.country ? `, ${order.shipping.country}` : ""}
            </div>
          </div>

          <div className="ot-delivery">
            <div className="ot-delivery-title">Delivery:</div>
            <div className="ot-delivery-value">4-7 business days </div>
          </div>
        </div>

        {/* Order items row */}
        <div className="ot-items-row">
          <div className="ot-order-id">Order ID: {order.id}</div>
          <div className="ot-thumbs">
            {(order.items || []).map((it, i) => (
              <img
                key={i}
                src={it.image || it.thumbnail || ""}
                alt={it.name || "item"}
                className="ot-thumb-img"
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* --- TRACKING MODAL --- */}
{trackingModalOpen && (
  <div className="ot-modal-backdrop" onClick={() => setTrackingModalOpen(false)}>
    <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
      <button className="ot-modal-close" onClick={() => setTrackingModalOpen(false)}>
        <IoClose size={20} />
      </button>
      <h3 className="ot-modal-title">Tracking status</h3>

      {loadingTracking && (
        <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
          Loading tracking information...
        </div>
      )}

      {!loadingTracking && c3xLogs.length > 0 && (
        <div className="ot-timeline">
          {c3xLogs.map((log, i) => {
            const isLatest = i === 0; // First item is latest in C3X response
            return (
              <div key={i} className="ot-timeline-item" style={{ marginBottom: "1rem" }}>
                <div
                  className={`ot-dot ${isLatest ? "green" : ""}`}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: isLatest ? "#4caf50" : "#ccc",
                    display: "inline-block",
                    marginRight: 8,
                    marginTop: 4,
                  }}
                />
                <div className="ot-timeline-content" style={{ display: "inline-block", verticalAlign: "top" }}>
                  <div
                    className={`ot-timeline-status ${isLatest ? "green-text" : ""}`}
                    style={{
                      fontWeight: "600",
                      fontSize: "1rem",
                      color: isLatest ? "#4caf50" : "#555",
                    }}
                  >
                    {log.Remarks || log.Activity || "Status update"}
                  </div>
                  <div
                    className="ot-timeline-date"
                    style={{ fontSize: "0.85rem", color: "#888", marginTop: 2 }}
                  >
                    {log.StatusDate || log.Date ? 
                      dayjs(log.StatusDate || log.Date).format("D MMMM YYYY, HH:mm") : 
                      "Date not available"}
                  </div>
                  {log.Location && (
                    <div style={{ fontSize: "0.85rem", color: "#888", marginTop: 2 }}>
                      📍 {log.Location}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loadingTracking && c3xLogs.length === 0 && (
        <div className="ot-timeline">
          {(Array.isArray(order.notes) && order.notes.length > 0
            ? [...order.notes].reverse() // reverse to show oldest first
            : [{ content: trackingInfo.status || "Order submitted", date_created: new Date().toISOString() }]
          ).map((note, i, arr) => {
            const isLatest = i === arr.length - 1; // last item in reversed array is latest
            return (
              <div key={note.id || i} className="ot-timeline-item" style={{ marginBottom: "1rem" }}>
                <div
                  className={`ot-dot ${isLatest ? "green" : ""}`}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: isLatest ? "#4caf50" : "#ccc",
                    display: "inline-block",
                    marginRight: 8,
                    marginTop: 4,
                  }}
                />
                <div className="ot-timeline-content" style={{ display: "inline-block", verticalAlign: "top" }}>
                  <div
                    className={`ot-timeline-status ${isLatest ? "green-text" : ""}`}
                    style={{
                      fontWeight: "600",
                      fontSize: "1rem",
                      color: isLatest ? "#4caf50" : "#555",
                    }}
                  >
                    {note.content}
                  </div>
                  <div
                    className="ot-timeline-date"
                    style={{ fontSize: "0.85rem", color: "#888", marginTop: 2 }}
                  >
                    {dayjs(note.date_created).format("D MMMM YYYY, HH:mm")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="ot-modal-footer"
        style={{ marginTop: 20, fontSize: "0.75rem", color: "#555", textAlign: "center" }}
      >
        Times are shown in the local timezone
      </div>
    </div>
  </div>
)}

      {/* --- UPDATES MODAL --- */}
      {updatesModalOpen && (
        <div className="ot-modal-backdrop" onClick={() => setUpdatesModalOpen(false)}>
          <div className="ot-modal ot-modal-small" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <button 
              className="ot-modal-close" 
              onClick={() => setUpdatesModalOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
            
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '16px',
              paddingRight: '30px',
            }}>
              Get the latest shipment updates
            </h3>

            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.6',
                marginBottom: '12px',
              }}>
                We'll send you shipment updates via email for this order.
              </p>

              <div style={{
                background: '#f8f9fa',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}>
                <label style={{
                  fontSize: '13px',
                  color: '#444',
                  fontWeight: '500',
                }}>
                  Email address: <span style={{ color: '#ff5100', fontWeight: '600' }}>{email}</span>
                </label>
              </div>

              <div style={{
                fontSize: '13px',
                color: '#444',
                fontWeight: '500',
                marginBottom: '8px',
              }}>
                Updates may include:
              </div>
              
              <ol style={{
                paddingLeft: '20px',
                margin: 0,
              }}>
                {['Tracking updates', 'Delivery problems', 'Delivery updates', 'Package delivered', 'Package ready for pickup'].map((item, idx) => (
                  <li key={idx} style={{
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '2',
                    paddingLeft: '4px',
                  }}>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px',
              marginTop: '24px',
            }}>
              <button 
                onClick={() => setUpdatesModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#fff',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#bbb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Here you would call an endpoint to subscribe the email for updates.
                  // For now just show confirmation and close.
                  // e.g. POST /wp-json/custom/v1/subscribe-updates { orderId, email }
                  setUpdatesModalOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#ff5100',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e64800';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 81, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ff5100';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SPEED UP SHIPMENT MODAL --- */}
      {speedModalOpen && (
        <div className="ot-modal-backdrop" onClick={() => setSpeedModalOpen(false)}>
          <div className="ot-modal ot-modal-small" onClick={(e) => e.stopPropagation()}>
            <button className="ot-modal-close" onClick={() => setSpeedModalOpen(false)}>
              <IoClose size={20} />
            </button>

            {speedRequestState === "idle" && (
              <>
                <h3 className="ot-modal-title">Speed up shipment</h3>
                <div className="ot-speed-body">
                  <p>
                    We can try to speed up your shipment. We'll request the warehouse/admin to prioritize this order.
                  </p>
                  <p className="ot-note">
                    If the admin approves, we will arrange shipment and you may receive AED20.00 credit if delivery is late.
                  </p>
                </div>
                <div className="ot-modal-actions">
                  <button className="ot-btn ot-btn-secondary" onClick={() => setSpeedModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="ot-btn ot-btn-primary"
                    onClick={() => {
                      confirmSpeedUp();
                    }}
                  >
                    Request speed up
                  </button>
                </div>
              </>
            )}

            {speedRequestState === "pending" && (
              <>
                <h3 className="ot-modal-title">Requesting approval</h3>
                <div className="ot-speed-body">
                  <p>Request is sent to admin. Please wait while we process your request...</p>
                </div>
                <div className="ot-modal-actions">
                  <button className="ot-btn ot-btn-secondary" onClick={() => setSpeedModalOpen(false)}>
                    Close
                  </button>
                </div>
              </>
            )}

            {speedRequestState === "approved" && (
              <>
                <h3 className="ot-modal-title">Successfully sped up</h3>
                <div className="ot-speed-body">
                  <p>
                    We have received your request to speed up shipment and will arrange shipment for you as soon as possible. Please wait patiently.
                  </p>
                  <p>Get a AED20.00 credit within 48 hours if delivered after the guaranteed date.</p>
                  <p>
                    If you want to receive more information for this order, we highly recommend you subscribe to get the shipment updates.
                  </p>
                </div>
                <div className="ot-modal-actions">
                  <button
                    className="ot-btn ot-btn-secondary"
                    onClick={() => {
                      setSpeedModalOpen(false);
                      setSpeedRequestState("idle");
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {speedRequestState === "error" && (
              <>
                <h3 className="ot-modal-title">Request failed</h3>
                <div className="ot-speed-body">
                  <p>Something went wrong. Please try again later.</p>
                </div>
                <div className="ot-modal-actions">
                  <button className="ot-btn ot-btn-secondary" onClick={() => setSpeedModalOpen(false)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
