// src/components/checkout/CheckoutLeft.jsx
import React, { useState, useEffect } from 'react';
import '../assets/styles/checkoutleft.css';
import '../assets/styles/mapviewpopup.css';
import SignInModal from './sub/SignInModal';
import HelpText from './HelpText';
import PaymentMethods from '../components/checkoutleft/PaymentMethods';
import AddressForm from '../components/checkoutleft/AddressForm';
import MapViewPopup from '../components/checkoutleft/MapViewPopup';
import ItemList from './checkoutleft/ItemList';
import ShippingMethods from '../components/checkout/ShippingMethods';
import emptyAddressImg from '../assets/images/adress-not-found.png';
import ProductsUnder20AED from './ProductsUnder20AED';
import { useCart } from '../contexts/CartContext';

const API_BASE = 'https://db.store1920.com/wp-json/custom/v1';

export default function CheckoutLeft({
  countries,
  cartItems,
  subtotal,
  orderId,
  formData,
  setFormData,
  handlePlaceOrder,
  createOrder,
  isPlacingOrder = false
}) {
  const [showForm, setShowForm] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [shippingStates, setShippingStates] = useState([]);
  const [billingStates, setBillingStates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState(null);
  const [addressCoordinates, setAddressCoordinates] = useState(null);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [isGeocodingReady, setIsGeocodingReady] = useState(false);

  const { removeFromCart } = useCart();

  // -------------------------------
  // Ensure Google Maps API is loaded
  // -------------------------------
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps?.Geocoder) {
        setIsGeocodingReady(true);
        return true;
      }
      return false;
    };

    if (!checkGoogleMaps()) {
      const interval = setInterval(() => {
        if (checkGoogleMaps()) {
          clearInterval(interval);
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, []);

  // -------------------------------
  // Geocode address to get coordinates for map
  // -------------------------------
  useEffect(() => {
    if (formData?.shipping?.street && formData?.shipping?.city && isGeocodingReady) {
      const fullAddress = `${formData.shipping.street}, ${formData.shipping.city}, ${formData.shipping.state}, ${formData.shipping.country}`;
      
      try {
        const geocoder = new window.google.maps.Geocoder();
        
        geocoder.geocode({ address: fullAddress }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const location = results[0].geometry.location;
            setAddressCoordinates({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            console.warn('Geocoding failed:', status);
          }
        });
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }
  }, [formData?.shipping?.street, formData?.shipping?.city, isGeocodingReady]);

  // -------------------------------
  // Handle field changes
  // -------------------------------
  const handleFieldChange = (e, section) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      if (section === 'shipping' || section === 'billing') {
        return { ...prev, [section]: { ...prev[section], [name]: value } };
      } else if (type === 'checkbox') {
        return { ...prev, [name]: checked };
      }
      return { ...prev, [name]: value };
    });
  };

  // -------------------------------
  // Remove cart item
  // -------------------------------
  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
  };

  // -------------------------------
  // Delete address
  // -------------------------------
  const handleDeleteAddress = () => {
    const emptyAddress = {
      first_name: '', last_name: '', email: '', street: '', apartment: '',
      city: '', state: '', postal_code: '', country: '', phone_number: ''
    };
    setSelectedShippingMethodId(null);
    setFormData(prev => ({
      ...prev,
      shipping: emptyAddress,
      billing: prev.billingSameAsShipping ? emptyAddress : prev.billing
    }));
  };

  // -------------------------------
  // Listen for external trigger to open address form
  // -------------------------------
  useEffect(() => {
    const handleOpenAddressForm = (event) => {
      const hasAddress = formData?.shipping?.street?.trim();
      const forceOpen = event?.detail?.forceOpen;
      
      // Only open if no address OR if forced (from Change Address button)
      if (!hasAddress || forceOpen) {
        setShowForm(true);
      }
    };

    window.addEventListener('openAddressForm', handleOpenAddressForm);
    return () => window.removeEventListener('openAddressForm', handleOpenAddressForm);
  }, [formData]);

  // -------------------------------
  // Auto-close form if address is loaded while form is open
  // (but NOT if user clicked Change Address)
  // -------------------------------
  useEffect(() => {
    if (showForm && formData?.shipping?.street?.trim()) {
      // Check if form was opened via Change Address button
      const wasManuallyOpened = sessionStorage.getItem('manualAddressEdit');
      if (!wasManuallyOpened) {
        setShowForm(false);
      }
    }
  }, [formData?.shipping?.street, showForm]);

  // -------------------------------
  // Shipping method handling
  // -------------------------------
  useEffect(() => {
    setSelectedShippingMethodId(formData.shippingMethodId || null);
  }, [formData.shippingMethodId]);

  const handleShippingMethodChange = (id) => {
    setFormData(prev => ({ ...prev, shippingMethodId: id }));
  };

  // -------------------------------
  // Toggle address form
  // -------------------------------
  const handleAddAddressClick = () => {
    if (showForm) {
      // Closing form
      setShowForm(false);
      sessionStorage.removeItem('manualAddressEdit');
    } else {
      // Opening form - mark as manual edit
      sessionStorage.setItem('manualAddressEdit', 'true');
      setShowForm(true);
    }
    setSaveSuccess(false);
    setError(null);
  };

  // -------------------------------
  // Select payment
  // -------------------------------
  const handlePaymentSelect = (id, title, logo = null) => {
    setFormData(prev => ({
      ...prev,
      paymentMethod: id,
      paymentMethodTitle: title,
      paymentMethodLogo: logo || null,
    }));
  };

  // -------------------------------
  // Submit address to backend
  // -------------------------------
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const formatAddress = (addr) => {
      // Clean phone number - extract only 7 digits
      let cleanPhone = (addr.phone_number || '').toString().replace(/[^0-9]/g, '');
      if (cleanPhone.length > 7) {
        cleanPhone = cleanPhone.slice(-7);
      }
      
      // Format full phone: +971 + prefix + 7digits
      const prefix = addr.phone_prefix || '50';
      const fullPhone = cleanPhone.length === 7 ? `+971${prefix}${cleanPhone}` : '';

      return {
        first_name: addr.first_name || '',
        last_name: addr.last_name || '',
        email: addr.email || '',
        address_1: addr.street || '',
        address_2: addr.apartment || '',
        city: addr.city || '',
        state: addr.state || '',
        postcode: addr.postal_code || '',
        country: addr.country || '',
        phone: fullPhone
      };
    };

    const payload = {
      shipping: formatAddress(formData.shipping),
      billing: formData.billingSameAsShipping ? formatAddress(formData.shipping) : formatAddress(formData.billing),
      billingSameAsShipping: formData.billingSameAsShipping,
      shippingMethodId: formData.shippingMethodId || null,
      save_as_default: formData.saveAsDefault || false,
    };

    try {
      const res = await fetch(`${API_BASE}/save-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save address');
      await res.json();
      setSaveSuccess(true);
      setShowForm(false);
      sessionStorage.removeItem('manualAddressEdit');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------
  // Check if address is complete
  // -------------------------------
  const isAddressComplete = () => {
    const s = formData?.shipping;
    if (!s?.street) return false;
    
    console.log('📋 Checking address completeness:', {
      phone_prefix: s.phone_prefix,
      phone_number: s.phone_number,
      phone_number_type: typeof s.phone_number,
      full_phone: `+971${s.phone_prefix || ''}${s.phone_number || ''}`
    });
    
    // Check for phone number - should be 7 digits
    const phoneNumber = (s.phone_number || '').toString().replace(/[^0-9]/g, '');
    const hasFullPhone = phoneNumber.length === 7;
    
    console.log('Address complete check:', {
      phone_number: s.phone_number,
      cleaned: phoneNumber,
      length: phoneNumber.length,
      hasFullPhone,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      city: s.city,
      state: s.state
    });
    
    // Check all required fields
    const hasAllFields = s.first_name && s.last_name && s.email && s.city && s.state;
    
    return hasFullPhone && hasAllFields;
  };

  const getMissingFields = () => {
    const missing = [];
    const s = formData?.shipping;
    
    if (!s?.first_name || !s?.last_name) missing.push('Full Name');
    if (!s?.email) missing.push('Email');
    if (!s?.street) missing.push('Street Address');
    if (!s?.city) missing.push('City');
    if (!s?.state) missing.push('State/Emirate');
    
    const phoneNumber = (s?.phone_number || '').toString().replace(/[^0-9]/g, '');
    if (phoneNumber.length !== 7) missing.push('Complete Phone Number (7 digits)');
    
    return missing;
  };

  return (
    <div className="checkout-left">
      {/* Shipping Address Section */}
      <div className="shipping-container">
        <div className="section-block">
          <div className="section-header">
            <h2 className="shippingadress" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Shipping Address</span>
              <button onClick={handleAddAddressClick} className={`btn-add-address1 ${showForm ? 'cancel-btn1' : ''}`}>
                {showForm ? 'Cancel' : formData?.shipping?.street ? 'Change Address' : 'Add New Address'}
              </button>
            </h2>

            {formData?.shipping?.street && !isAddressComplete() && (
              <div 
                className="address-incomplete-alert"
                onClick={handleAddAddressClick}
                style={{ cursor: 'pointer' }}
              >
                <div className="alert-icon">⚠️</div>
                <div className="alert-content">
                  <strong>Incomplete Address Information</strong>
                  <p>Click here to complete the following details:</p>
                  <ul>
                    {getMissingFields().map((field, index) => (
                      <li key={index}>{field}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {formData?.shipping?.street ? (
              <div className="saved-address-container">
                <div 
                  className="saved-address-box saved-address-clickable" 
                  onClick={() => addressCoordinates && setShowMapPopup(true)}
                  style={{ cursor: addressCoordinates ? 'pointer' : 'default' }}
                  title={addressCoordinates ? "Click to view location on map" : "Loading map..."}
                >
                  <div className="saved-address-grid">
                    <div className="saved-address-label">Name</div>
                    <div className="saved-address-colon">:</div>
                    <div className="saved-address-value">
                      {formData.shipping.full_name || `${formData.shipping.first_name || ''} ${formData.shipping.last_name || ''}`.trim()}
                    </div>

                    <div className="saved-address-label">Address</div>
                    <div className="saved-address-colon">:</div>
                    <div className="saved-address-value">
                      {formData.shipping.street}{formData.shipping.apartment ? `, ${formData.shipping.apartment}` : ''}
                    </div>

                    <div className="saved-address-label">City</div>
                    <div className="saved-address-colon">:</div>
                    <div className="saved-address-value">{formData.shipping.city}</div>

                    <div className="saved-address-label">Phone</div>
                    <div className="saved-address-colon">:</div>
                    <div className="saved-address-value">+971{formData.shipping.phone_prefix}{formData.shipping.phone_number}</div>

                    <div className="saved-address-label">State</div>
                    <div className="saved-address-colon">:</div>
                    <div className="saved-address-value">{formData.shipping.state}</div>

                    <div className="saved-address-label">Country</div>
                    <div className="saved-address-colon">:</div>
                    <div className="saved-address-value">United Arab Emirates</div>

                    {formData.shipping.delivery_type && (
                      <>
                        <div className="saved-address-label">Delivery Type</div>
                        <div className="saved-address-colon">:</div>
                        <div className="saved-address-value">
                          <span className="delivery-type-badge">{formData.shipping.delivery_type}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div 
                  className="saved-address-map-preview"
                  onClick={() => addressCoordinates && setShowMapPopup(true)}
                  style={{ cursor: addressCoordinates ? 'pointer' : 'default' }}
                  title="Click to open interactive map"
                >
                  {addressCoordinates ? (
                    <>
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${addressCoordinates.lat},${addressCoordinates.lng}&zoom=15&size=600x300&markers=color:red%7C${addressCoordinates.lat},${addressCoordinates.lng}&key=AIzaSyAO5eU8fxUEYC_tK4HR7b3cNQ1o20uddv0`}
                        alt="Location map"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                      <div className="map-preview-overlay">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="32" height="32">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span>View Full Map</span>
                      </div>
                    </>
                  ) : (
                    <div className="map-loading">
                      <div className="map-loading-spinner"></div>
                      <span>Loading map...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : !showForm && (
              <div style={{ textAlign: 'center', padding: '10px' }}>
                <img src={emptyAddressImg} alt="No address found" style={{ maxWidth: '50px', opacity: 0.6 }} />
                <p style={{ color: '#777', marginTop: '10px' }}>No address added yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Methods */}
      <ShippingMethods
        selectedMethodId={selectedShippingMethodId}
        onSelect={(id) => { setSelectedShippingMethodId(id); handleShippingMethodChange(id); }}
        subtotal={subtotal}
        cartItems={cartItems || []}
      />

      {/* Cart Items */}
      <div className="section-block">
        <ItemList items={cartItems || []} onRemove={handleRemoveItem} />
      </div>

      {/* Payment Methods */}
      <PaymentMethods
        selectedMethod={formData.paymentMethod || 'cod'}
        onMethodSelect={handlePaymentSelect}
        subtotal={subtotal}
        cartItems={cartItems || []}
        orderId={orderId}
        isPlacingOrder={isPlacingOrder}
      />

      {/* Sidebar Help */}
      <div className="desktop-only">
        <HelpText />
        <ProductsUnder20AED />
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onLogin={() => { setShowSignInModal(false); setShowForm(true); setSaveSuccess(false); setError(null); }}
      />

      {/* Address Form */}
      {showForm && (
        <AddressForm
          formData={formData}
          shippingStates={shippingStates}
          billingStates={billingStates}
          countries={countries}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          saving={saving}
          error={error}
          cartItems={cartItems}
          initialCoordinates={addressCoordinates}
        />
      )}

      {/* Success Toast */}
      {saveSuccess && <div className="addrf-toast">✅ Address saved successfully!</div>}

      {/* Map View Popup */}
      {showMapPopup && addressCoordinates && (
        <MapViewPopup
          isOpen={showMapPopup}
          onClose={() => setShowMapPopup(false)}
          coordinates={addressCoordinates}
          address={`${formData.shipping.street}${formData.shipping.apartment ? `, ${formData.shipping.apartment}` : ''}, ${formData.shipping.city}, ${formData.shipping.state}, ${formData.shipping.country}`}
        />
      )}
    </div>
  );
}
