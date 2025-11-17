import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import CustomMap from '../../components/checkoutleft/CustomMap';

const LOCAL_STORAGE_KEY = 'checkoutAddressData';

const UAE_EMIRATES = [
  { code: 'AUH', name: 'Abu Dhabi' },
  { code: 'DXB', name: 'Dubai' },
  { code: 'SHJ', name: 'Sharjah' },
  { code: 'AJM', name: 'Ajman' },
  { code: 'UAQ', name: 'Umm Al Quwain' },
  { code: 'RAK', name: 'Ras Al Khaimah' },
  { code: 'FUJ', name: 'Fujairah' },
];

const UAE_CITIES = {
  ABU: ['Abu Dhabi', 'Al Ain', 'Madinat Zayed', 'Sweihan', 'Liwa Oasis', 'Ruways', 'Ghayathi', 'Jebel Dhanna', 'Al Yahar', 'Al Khazna', 'Al Mahdar', 'Al Falah', 'Al Shuwaib', 'Al Rafaah', 'Al Salamah', 'Al Hayer', 'Al Khari', 'Al Ghashban', 'Al Ghabah', 'Al Fara\'', 'Al Fulayyah', 'Al Awdah', 'Al Ghabam', 'Al Hamraniyah', 'Al Hamriyah', 'Al Haybah', 'Al Hayl', 'Al Hayr', 'Al Hayrah', 'Al Hulaylah', 'Al Jaddah', 'Al Khashfah', 'Al Mahamm', 'Al Masafirah', 'Al Mataf', 'Al Mu\'amurah', 'Al Naslah', 'Al Qir', 'Al Quwayz', 'Al Usayli', 'Khalifa City', 'Shakhbout City', 'Corniche', 'Mussafah', 'Reem Island', 'Yas Island', 'Saadiyat Island'],
  DXB: ['Dubai', 'Deira', 'Bur Dubai', 'Jebel Ali', 'Al Barsha', 'Al Quoz', 'Al Safa', 'Dubai Marina', 'Jumeirah', 'Satwa', 'Al Karama', 'Al Nahda', 'Al Qusais', 'Al Rashidiya', 'Al Jaddaf', 'Al Khawaneej', 'Al Warqa', 'Al Muhaisnah', 'Al Mizhar', 'Al Garhoud', 'Al Satwa', 'Business Bay', 'Mirdif', 'Jumeirah Beach Residences', 'International City', 'Discovery Gardens', 'Dubai Silicon Oasis', 'Dubai Investment Park', 'Dubai Festival City', 'Downtown Dubai', 'Palm Jumeirah', 'Jumeirah Lakes Towers (JLT)', 'DIFC', 'Emirates Towers', 'Trade Centre 2', 'Sheikh Zayed Road', 'Al Sufouh', 'Dubai Sports City', 'Dubai Hills Estate', 'Al Barsha South', 'Dubai Industrial City'],
  SHJ: ['Sharjah', 'Al Dhaid', 'Khor Fakkan', 'Kalba', 'Mleiha', 'Al Hamriyah', 'Al Madam', 'Al Bataeh', 'Al Khan', 'Al Layyah', 'Al Yarmook', 'Industrial Area', 'Sharjah City Center', 'University City', 'Al Nahda'],
  AJM: ['Ajman', 'Masfout', 'Manama', 'Al Jurf', 'Al Rashidiya', 'Al Nuaimia', 'Al Rawda', 'Al Rumailah', 'Al Mowaihat', 'Al Tallah', 'Al Sheikh Maktoum', 'Al Hamidiyah'],
  UAQ: ['Umm Al Quwain', 'Falaj Al Mualla', 'Al Sinniyah', 'Al Rumailah', 'Al Kharran', 'Al Jurf', 'Al Rahbah', 'Al Raas', 'Al Tallah', 'Al Bu Falah', 'Al Qawasim'],
  RAK: ['Ras Al Khaimah', 'Dibba Al-Hisn', 'Khatt', 'Al Jazirah Al Hamra', 'Al Rams', 'Dhayah', 'Ghalilah', 'Al Nakheel', 'Al Hamra Village', 'Al Nakheel Industrial', 'Al Qusaidat', 'Al Maarid', 'Al Hudaibah'],
  FSH: ['Fujairah', 'Dibba Al-Fujairah', 'Khor Fakkan', 'Masafi', 'Bidiyah', 'Dibba Al-Hisn', 'Al Aqah', 'Al Bithnah', 'Al Faseel', 'Al Hala', 'Al Madhah', 'Al Sharqiyah', 'Al Sakamkam', 'Al Twar', 'Al Jurf']
};

const AddressForm = ({ formData, onChange, onSubmit, onClose, saving, error, cartItems }) => {
  const [formErrors, setFormErrors] = useState({});
  const [markerPosition, setMarkerPosition] = useState(null);
  const [mapSelected, setMapSelected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // --- City/Area Google Places Autocomplete ---
  const [cityInput, setCityInput] = useState(formData.shipping.city || '');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  // Fetch Google Places predictions for city/area
  const fetchCitySuggestions = (input) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    setCityLoading(true);
    const service = new window.google.maps.places.AutocompleteService();
    // Changed from ['(regions)'] to ['geocode'] to get ALL locations (cities, areas, neighborhoods, districts, etc.)
    service.getPlacePredictions({ 
      input, 
      types: ['geocode'], 
      componentRestrictions: { country: 'ae' } 
    }, (predictions) => {
      setCitySuggestions(predictions ? predictions.map(p => p.description) : []);
      setCityLoading(false);
    });
  };

  useEffect(() => {
    if (cityInput && cityInput.length > 1) {
      fetchCitySuggestions(cityInput);
    } else {
      setCitySuggestions([]);
    }
  }, [cityInput]);

  useEffect(() => {
    setCityInput(formData.shipping.city || '');
  }, [formData.shipping.city]);

  // --------------------------
  // Load saved address
  // --------------------------
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.shipping) {
          Object.keys(data.shipping).forEach((key) =>
            onChange({ target: { name: key, value: data.shipping[key] } }, 'shipping')
          );
        }
        if (data.saveAsDefault !== undefined) {
          onChange({ target: { name: 'saveAsDefault', value: data.saveAsDefault } });
        }
      } catch (err) {
        console.warn('Failed to parse saved checkout address:', err);
      }
    }
  }, []);

  // --------------------------
  // Validation Logic
  // --------------------------
  const validateField = (name, value) => {
    switch (name) {
      case 'full_name':
      case 'street':
      case 'city':
      case 'state':
        if (!value || value.trim() === '') return 'This field is required';
        break;
      case 'delivery_type':
        if (!value || value.trim() === '') return 'Please select delivery type';
        break;
      case 'phone_number':
        if (!value) return 'Phone number is required';
        // Clean the value first
        const cleanPhone = value.toString().replace(/[^0-9]/g, '');
        // Take last 7 digits if longer
        const last7 = cleanPhone.length > 7 ? cleanPhone.slice(-7) : cleanPhone;
        if (last7.length !== 7) return 'Must be exactly 7 digits';
        break;
      case 'email':
        if (!value || !/\S+@\S+\.\S+/.test(value)) return 'Invalid email';
        break;
      default:
        return '';
    }
    return '';
  };

  const handleFieldChange = (e) => {
    onChange(e, 'shipping');
    const errorMsg = validateField(e.target.name, e.target.value);
    setFormErrors((prev) => ({ ...prev, [e.target.name]: errorMsg }));
  };

  // --------------------------
  // PHONE FIX: reliable update
  // --------------------------
  const handlePhoneChange = (phone) => {
    const normalizedPhone = phone.replace(/\D/g, '');
    onChange({ target: { name: 'phone_number', value: normalizedPhone } }, 'shipping');
    const errorMsg = validateField('phone_number', normalizedPhone);
    setFormErrors((prev) => ({ ...prev, phone_number: errorMsg }));
  };

  // --------------------------
  // Handle Map Selection
  // --------------------------
  const handlePlaceSelected = ({ street, city, state, lat, lng }) => {
    const stateObj = UAE_EMIRATES.find((s) => s.name.toLowerCase() === state?.toLowerCase());
    const stateCode = stateObj ? stateObj.code : '';
    onChange({ target: { name: 'street', value: street } }, 'shipping');
    onChange({ target: { name: 'city', value: city } }, 'shipping');
    onChange({ target: { name: 'state', value: stateCode } }, 'shipping');
    setMarkerPosition({ lat, lng });
    setMapSelected(true);
  };

  // --------------------------
  // --------------------------
  // SAVE ADDRESS (without OTP)
  // --------------------------

  const saveAddress = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double clicks
    setIsSubmitting(true);

    // Clean phone number - extract only the 7-digit part
    let rawPhone = (formData.shipping.phone_number || '').toString().trim();
    
    // Remove any non-numeric characters
    rawPhone = rawPhone.replace(/[^0-9]/g, '');
    
    // If phone has country code or prefix already, extract last 7 digits
    if (rawPhone.length > 7) {
      rawPhone = rawPhone.slice(-7);
    }
    
    const phonePrefix = formData.shipping.phone_prefix || '50';
    
    console.log('Phone validation:', { rawPhone, length: rawPhone.length, prefix: phonePrefix });
    
    // Check if phone_number is exactly 7 digits
    if (!rawPhone || rawPhone.length !== 7) {
      alert('Please enter a valid 7-digit phone number (e.g., 1234567)');
      setFormErrors((prev) => ({ ...prev, phone_number: 'Must be exactly 7 digits' }));
      setIsSubmitting(false);
      return;
    }

    const errors = {};
    const requiredFields = ['full_name', 'email', 'street', 'state', 'city', 'delivery_type'];
    requiredFields.forEach((field) => {
      const errorMsg = validateField(field, formData.shipping[field]);
      if (errorMsg) errors[field] = errorMsg;
    });

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      alert('Please fill all required fields correctly.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Split full name into first and last name for backend
      const fullName = (formData.shipping.full_name || '').trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Update formData with clean phone number (only 7 digits)
      const cleanedFormData = {
        ...formData,
        shipping: {
          ...formData.shipping,
          first_name: firstName,
          last_name: lastName,
          phone_number: rawPhone, // Store only 7 digits
          phone_prefix: phonePrefix
        }
      };

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanedFormData));

      // Compose full phone number for backend: +971 + prefix + 7digits
      const fullPhone = `+971${phonePrefix}${rawPhone}`;

      await fetch('https://db.store1920.com/wp-json/abandoned-checkouts/v1/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping: {
            ...cleanedFormData.shipping,
            phone: fullPhone,
          },
          cart: cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity,
          })),
        }),
      });

      // Submit to checkout with cleaned data
      onSubmit(cleanedFormData);
    } catch (err) {
      console.error('Error saving address:', err);
      alert('Something went wrong while saving your address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: '18px',
          width: '92vw',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'hidden',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 40px #0003',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '22px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#555',
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            gap: 0,
          }}
        >
          <h2 style={{ margin: '16px 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#333', textAlign: 'center' }}>
            Edit Address
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 0,
                width: '100%',
                minHeight: 500,
                padding: '12px 16px 0 16px',
                boxSizing: 'border-box',
              }}
            >
              {/* Map section (left) - Optional helper */}
              <div
                style={{
                  flex: 0.8,
                  minWidth: 0,
                  width: '100%',
                  margin: 0,
                  display: mapSelected ? 'none' : 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '320px',
                    minHeight: 220,
                    maxWidth: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <style>{`
                    @media (min-width: 900px) {
                      .address-map-area {
                        height: 100% !important;
                        min-height: 400px !important;
                        max-height: none !important;
                      }
                      .address-modal-map-container {
                        height: 420px !important;
                      }
                    }
                  `}</style>
                  <div className="address-map-area address-modal-map-container" style={{ width: '100%', height: '100%' }}>
                    <CustomMap initialPosition={markerPosition} onPlaceSelected={handlePlaceSelected} />
                  </div>
                </div>
              </div>
              {/* Form section (right) - visible by default */}
              <div
                style={{
                  flex: 1,
                  width: '100%',
                  background: '#fafbfc',
                  borderRadius: 14,
                  boxShadow: '0 2px 12px #0001',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  maxHeight: '75vh',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  scrollBehavior: 'smooth',
                }}
                className="address-form-scroll"
              >
                <style>{`
                  .address-form-scroll::-webkit-scrollbar {
                    width: 6px;
                  }
                  .address-form-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                  }
                  .address-form-scroll::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 10px;
                  }
                  .address-form-scroll::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                  }
                `}</style>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, color: '#444', fontSize: '1.1rem', letterSpacing: 0.2, flex: 1 }}>SHIPPING ADDRESS</div>
                </div>
                {(
                    <form onSubmit={saveAddress} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Delivery Type Selector at the top of the form */}
              <div style={{ margin: '0 0 18px 0', gridColumn: '1 / -1' }}>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: 8 }}>Delivery Type<span style={{ color: 'red' }}>*</span></div>
                <style>{`
                  @media (max-width: 600px) {
                    .delivery-type-group {
                      flex-direction: column !important;
                      gap: 10px !important;
                    }
                    .delivery-type-radio {
                      width: 100% !important;
                      justify-content: flex-start !important;
                      padding: 12px 10px !important;
                      font-size: 1.08rem !important;
                    }
                  }
                `}</style>
                <div className="delivery-type-group" style={{ display: 'flex', gap: '16px' }}>
                  {['Office', 'Home', 'Apartment'].map((type) => (
                    <label
                      key={type}
                      className="delivery-type-radio"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: formData.shipping.delivery_type === type ? '2px solid #ff5100' : '2px solid #eee',
                        background: formData.shipping.delivery_type === type ? '#fff6f0' : '#fafbfc',
                        borderRadius: 10,
                        padding: '10px 22px',
                        fontWeight: 500,
                        color: formData.shipping.delivery_type === type ? '#ff5100' : '#444',
                        boxShadow: formData.shipping.delivery_type === type ? '0 2px 8px #ff510033' : 'none',
                        transition: 'all 0.2s',
                        fontSize: '1rem',
                        width: 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      <input
                        type="radio"
                        name="delivery_type"
                        value={type}
                        checked={formData.shipping.delivery_type === type}
                        onChange={handleFieldChange}
                        style={{ marginRight: 8, accentColor: '#ff5100', width: 18, height: 18 }}
                      />
                      {type}
                    </label>
                  ))}
                </div>
                {/* Delivery time info below selector */}
                {formData.shipping.delivery_type && (
                  <div style={{ marginTop: 8, color: '#1976d2', fontWeight: 500, fontSize: '1.05rem' }}>
                    {formData.shipping.delivery_type === 'Office' && 'Delivery Time: 9 am to 6 pm'}
                    {formData.shipping.delivery_type === 'Home' && 'Delivery Time: 9 am to 9 pm'}
                    {formData.shipping.delivery_type === 'Apartment' && 'Delivery Time: 9 am to 9 pm'}
                  </div>
                )}
                {formErrors.delivery_type && <div style={{ color: 'red', fontSize: '0.95em', marginTop: 4 }}>{formErrors.delivery_type}</div>}
              </div>

              <label>
                Full Name*
                <input 
                  type="text" 
                  name="full_name" 
                  value={formData.shipping.full_name || ''} 
                  onChange={handleFieldChange}
                  placeholder="Enter your full name"
                  style={{ padding: '10px', fontSize: '1rem', borderRadius: '6px', border: formErrors.full_name ? '2px solid red' : '1px solid #ccc', marginTop: '6px' }}
                />
                {formErrors.full_name && <span style={{ color: 'red', fontSize: '0.9rem', fontWeight: 500 }}>{formErrors.full_name}</span>}
              </label>

              <label>
                Mobile Number*
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', background: '#f7f7f7', fontWeight: 500, fontSize: '1rem', minWidth: 54, textAlign: 'center' }}>+971</span>
                  <select
                    value={formData.shipping.phone_prefix || '50'}
                    onChange={e => onChange({ target: { name: 'phone_prefix', value: e.target.value } }, 'shipping')}
                    style={{ padding: '8px 6px', borderRadius: 6, border: '1px solid #ccc', fontWeight: 500, fontSize: '1rem', width: 60 }}
                  >
                    <option value="50">50</option>
                    <option value="52">52</option>
                    <option value="54">54</option>
                    <option value="55">55</option>
                    <option value="56">56</option>
                    <option value="58">58</option>
                  </select>
                  <input
                    type="text"
                    name="phone_number"
                    value={(() => {
                      // Clean and display only 7 digits
                      let val = (formData.shipping.phone_number || '').toString().replace(/[^0-9]/g, '');
                      if (val.length > 7) val = val.slice(-7); // Take last 7 digits
                      return val.slice(0, 7); // Max 7 digits
                    })()}
                    onChange={e => {
                      // Only allow numbers, max 7 digits
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      val = val.slice(0, 7); // Limit to 7 digits
                      onChange({ target: { name: 'phone_number', value: val } }, 'shipping');
                      // Clear error when user starts typing
                      if (formErrors.phone_number) {
                        setFormErrors((prev) => ({ ...prev, phone_number: '' }));
                      }
                    }}
                    maxLength={7}
                    inputMode="numeric"
                    pattern="[0-9]{7}"
                    style={{ 
                      flex: 1, 
                      padding: '8px 10px', 
                      borderRadius: 6, 
                      border: formErrors.phone_number ? '2px solid red' : '1px solid #ccc', 
                      fontSize: '1rem',
                      outline: formErrors.phone_number ? 'none' : 'auto'
                    }}
                    placeholder="1234567"
                  />
                </div>
                {formErrors.phone_number && <span style={{ color: 'red', fontSize: '0.9rem', fontWeight: 500 }}>{formErrors.phone_number}</span>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500, color: '#444' }}> 
                Email*
                <input type="email" name="email" value={formData.shipping.email} onChange={handleFieldChange} 
                  style={{ marginTop: '6px', padding: '10px', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc' }} />
                {formErrors.email && <span style={{ color: 'red', fontSize: '0.85rem' }}>{formErrors.email}</span>} 
              </label>
                <label>
                Apartment No*
                <input type="text" name="apartment" value={formData.shipping.apartment} onChange={handleFieldChange} />
              </label>

              <label>
              Building Name / Street*
                <input type="text" name="street" value={formData.shipping.street} onChange={handleFieldChange} />
                {formErrors.street && <span style={{ color: 'red' }}>{formErrors.street}</span>}
              </label>

            

              <label>
                Province / Emirates*
                <select name="state" value={formData.shipping.state} onChange={handleFieldChange}>
                  <option value="">Select state</option>
                  {UAE_EMIRATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {formErrors.state && <span style={{ color: 'red' }}>{formErrors.state}</span>}
              </label>

              <label style={{ position: 'relative' }}>
                City / Area*
                <input
                  type="text"
                  name="city"
                  autoComplete="off"
                  value={cityInput}
                  onChange={e => {
                    setCityInput(e.target.value);
                    onChange({ target: { name: 'city', value: e.target.value } }, 'shipping');
                  }}
                  placeholder="Search your city or area..."
                  style={{ padding: '10px', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc', marginTop: 4 }}
                />
                {cityLoading && <div style={{ position: 'absolute', top: '100%', left: 0, color: '#888', fontSize: '0.95em' }}>Loading...</div>}
                {citySuggestions.length > 0 && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '0 0 6px 6px',
                    zIndex: 10,
                    maxHeight: 180,
                    overflowY: 'auto',
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                  }}>
                    {citySuggestions.map((suggestion, idx) => (
                      <li
                        key={suggestion}
                        onClick={() => {
                          setCityInput(suggestion);
                          onChange({ target: { name: 'city', value: suggestion } }, 'shipping');
                          setCitySuggestions([]);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          background: suggestion === cityInput ? '#f0f0f0' : '#fff',
                          borderBottom: idx === citySuggestions.length - 1 ? 'none' : '1px solid #eee',
                        }}
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                )}
                {formErrors.city && <span style={{ color: 'red' }}>{formErrors.city}</span>}
              </label>




              <label>
                Country
                <input type="text" value="United Arab Emirates" readOnly />
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                name="saveAsDefault"
                checked={formData.saveAsDefault || false}
                onChange={(e) => onChange({ target: { name: 'saveAsDefault', value: e.target.checked } })}
              />
              Save this address as default for future orders
            </label>

            {error && <div style={{ color: 'red', fontWeight: 600 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  backgroundColor: '#fff',
                  color: '#1976d2',
                  border: '2px solid #1976d2',
                  padding: '12px 22px',
                  fontSize: '1.1rem',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                GO BACK
              </button>
              <button
                type="submit"
                disabled={isSubmitting || saving}
                style={{
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  padding: '12px 22px',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {isSubmitting ? 'Saving...' : 'SAVE ADDRESS'}
              </button>
            </div>
          </form>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
