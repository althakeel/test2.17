import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import CustomMap from '../../components/checkoutleft/CustomMap';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const LOCAL_STORAGE_KEY = 'checkoutAddressData';
const API_BASE = 'https://db.store1920.com/wp-json/wc/v3';
const CK = 'ck_e09e8cedfae42e5d0a37728ad6c3a6ce636695dd';
const CS = 'cs_2d41bc796c7d410174729ffbc2c230f27d6a1eda';

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

const AddressForm = ({ formData, onChange, onSubmit, onClose, saving, error, cartItems, initialCoordinates }) => {
  const { user } = useAuth();
  const [formErrors, setFormErrors] = useState({});
  const [markerPosition, setMarkerPosition] = useState(initialCoordinates || null);
  const [mapSelected, setMapSelected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingSavedAddresses, setLoadingSavedAddresses] = useState(false);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  // Debug: Log formData when component loads
  useEffect(() => {
    console.log('📝 AddressForm loaded with formData:', {
      phone_prefix: formData?.shipping?.phone_prefix,
      phone_number: formData?.shipping?.phone_number,
      full_phone: `+971${formData?.shipping?.phone_prefix || ''}${formData?.shipping?.phone_number || ''}`,
      all_shipping: formData?.shipping
    });
  }, []);

  // Update marker position when initialCoordinates change
  useEffect(() => {
    if (initialCoordinates) {
      setMarkerPosition(initialCoordinates);
    }
  }, [initialCoordinates]);


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

  // Only set cityInput on initial load, not on every formData change
  useEffect(() => {
    if (!cityInput && formData.shipping.city) {
      setCityInput(formData.shipping.city);
    }
  }, []);

  // --------------------------
  // Load saved address
  // --------------------------
  useEffect(() => {
    // Fetch saved addresses from WooCommerce if user is logged in
    if (user?.id) {
      setLoadingSavedAddresses(true);
      axios
        .get(`${API_BASE}/customers/${user.id}`, {
          params: { consumer_key: CK, consumer_secret: CS },
        })
        .then((res) => {
          const customer = res.data;
          const addresses = [];
          
          if (customer.billing && customer.billing.address_1) {
            addresses.push({
              type: 'Billing',
              ...customer.billing,
            });
          }
          
          if (customer.shipping && customer.shipping.address_1) {
            const isDifferent = customer.shipping.address_1 !== customer.billing?.address_1;
            if (isDifferent || !customer.billing?.address_1) {
              addresses.push({
                type: 'Shipping',
                ...customer.shipping,
              });
            }
          }
          
          setSavedAddresses(addresses);
        })
        .catch((err) => {
          console.error('Error loading saved addresses:', err);
        })
        .finally(() => {
          setLoadingSavedAddresses(false);
        });
    }
    
    // Load from localStorage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.shipping) {
          Object.keys(data.shipping).forEach((key) => {
            // Always keep phone_number field empty on load
            if (key === 'phone_number') {
              onChange({ target: { name: key, value: '' } }, 'shipping');
            } else {
              onChange({ target: { name: key, value: data.shipping[key] } }, 'shipping');
            }
          });
        }
        if (data.saveAsDefault !== undefined) {
          onChange({ target: { name: 'saveAsDefault', value: data.saveAsDefault } });
        }
      } catch (err) {
        console.warn('Failed to parse saved checkout address:', err);
      }
    }
  }, [user]);

  // Handler to use saved address
  const handleUseSavedAddress = (address) => {
    // Parse phone number to extract just the 7-digit part
    const parsePhone = (phoneStr) => {
      if (!phoneStr) return '';
      const cleaned = phoneStr.replace(/^\+?971/, '').replace(/[^0-9]/g, '');
      return cleaned.slice(0, 7); // Get first 7 digits after country code
    };

    // Map saved address to form format
    const addressData = {
      full_name: `${address.first_name || ''} ${address.last_name || ''}`.trim(),
      street: address.address_1 || '',
      apartment: address.address_2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postcode || '',
      country: address.country || 'AE',
      phone_number: parsePhone(address.phone),
      email: address.email || formData.shipping.email,
    };

    // Update each field
    Object.keys(addressData).forEach((key) => {
      onChange({ target: { name: key, value: addressData[key] } }, 'shipping');
    });

    setShowSavedAddresses(false);
  };

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
  const handlePlaceSelected = ({ street, city, state, country, lat, lng }) => {
    console.log('Address from map:', { street, city, state, country, lat, lng });
    
    // Find state code from state name
    let stateCode = '';
    if (state) {
      const stateObj = UAE_EMIRATES.find((s) => 
        s.name.toLowerCase() === state.toLowerCase() || 
        s.code.toLowerCase() === state.toLowerCase()
      );
      stateCode = stateObj ? stateObj.code : 'DXB'; // Default to Dubai if not found
    }
    
    // Update all form fields and clear errors
    if (street) {
      onChange({ target: { name: 'street', value: street } }, 'shipping');
      setFormErrors((prev) => ({ ...prev, street: '' }));
    }
    if (city) {
      onChange({ target: { name: 'city', value: city } }, 'shipping');
      setCityInput(city); // Update city input for autocomplete
      setFormErrors((prev) => ({ ...prev, city: '' }));
    }
    if (stateCode) {
      onChange({ target: { name: 'state', value: stateCode } }, 'shipping');
      setFormErrors((prev) => ({ ...prev, state: '' }));
    }
    
    setMarkerPosition({ lat, lng });
    setMapSelected(true);
    
    // Show success message
    console.log('Form updated with address - street:', street, 'city:', city, 'state:', stateCode);
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
    
    // The phone_number field should only contain the 7-digit number
    // The prefix is stored separately in phone_prefix
    // Just ensure it's exactly 7 digits
    if (rawPhone.length > 7) {
      rawPhone = rawPhone.slice(-7); // Take last 7 digits if somehow longer
    }
    
    const phonePrefix = formData.shipping.phone_prefix || '50';
    
    console.log('Phone validation:', { rawPhone, length: rawPhone.length, prefix: phonePrefix, fullNumber: `+971${phonePrefix}${rawPhone}` });
    
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

      // Save to abandoned cart
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

      // Always save to WooCommerce if user is logged in
      if (user?.id) {
        try {
          await axios.put(
            `${API_BASE}/customers/${user.id}`,
            {
              billing: {
                first_name: firstName,
                last_name: lastName,
                address_1: cleanedFormData.shipping.street || '',
                address_2: cleanedFormData.shipping.apartment || '',
                city: cleanedFormData.shipping.city || '',
                state: cleanedFormData.shipping.state || '',
                postcode: cleanedFormData.shipping.postal_code || '',
                country: cleanedFormData.shipping.country || 'AE',
                phone: fullPhone,
                email: cleanedFormData.shipping.email || user.email || '',
              },
              shipping: {
                first_name: firstName,
                last_name: lastName,
                address_1: cleanedFormData.shipping.street || '',
                address_2: cleanedFormData.shipping.apartment || '',
                city: cleanedFormData.shipping.city || '',
                state: cleanedFormData.shipping.state || '',
                postcode: cleanedFormData.shipping.postal_code || '',
                country: cleanedFormData.shipping.country || 'AE',
                phone: fullPhone,
              }
            },
            {
              params: { consumer_key: CK, consumer_secret: CS },
            }
          );
          console.log('Address and phone number saved to account successfully');
        } catch (saveError) {
          console.error('Error saving address to account:', saveError);
          // Don't block checkout if saving to account fails
        }
      }

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
        padding: '12px',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .address-modal-wrapper {
            width: 98vw !important;
            max-width: 100% !important;
            max-height: 96vh !important;
            border-radius: 12px !important;
          }
          .address-modal-title {
            font-size: 1.2rem !important;
            margin: 10px 0 8px 0 !important;
          }
          .address-form-container {
            padding: 16px 14px !important;
            border-radius: 12px 12px 0 0 !important;
          }
          .address-form-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .address-modal-buttons {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .address-modal-buttons button {
            width: 100% !important;
            padding: 14px 18px !important;
          }
          .address-close-btn {
            top: 10px !important;
            right: 12px !important;
            font-size: 20px !important;
          }
        }
      `}</style>
      <div
        className="address-modal-wrapper"
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
          className="address-close-btn"
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
            zIndex: 10,
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
            overflow: 'hidden',
          }}
        >
          <h2 className="address-modal-title" style={{ margin: '16px 0 12px 0', fontSize: '1.5rem', fontWeight: 700, color: '#333', textAlign: 'center' }}>
            Edit Address
          </h2>
          
          {/* Map Section - Top */}
          <div
            style={{
              width: '100%',
              padding: '0 16px',
              boxSizing: 'border-box',
              marginBottom: 16,
            }}
          >
            <div style={{ width: '100%' }}>
              <CustomMap initialPosition={markerPosition} onPlaceSelected={handlePlaceSelected} />
            </div>
          </div>

          {/* Form Section - Bottom with Scroll */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              width: '100%',
              flex: 1,
              overflow: 'hidden',
            }}
          >
            <div
              className="address-form-scroll address-form-container"
              style={{
                width: '100%',
                background: '#fafbfc',
                borderRadius: '14px 14px 0 0',
                boxShadow: '0 -2px 12px #0001',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                  scrollBehavior: 'smooth',
                }}
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
                  .address-form-grid label {
                    display: flex;
                    flex-direction: column;
                    font-weight: 500;
                    color: #444;
                    font-size: 0.95rem;
                  }
                  .address-form-grid input,
                  .address-form-grid select {
                    margin-top: 6px;
                    padding: 10px;
                    font-size: 1rem;
                    border-radius: 6px;
                    border: 1px solid #ccc;
                    outline: none;
                    transition: border 0.2s;
                  }
                  .address-form-grid input:focus,
                  .address-form-grid select:focus {
                    border-color: #1976d2;
                  }
                  @media (max-width: 768px) {
                    .address-form-grid label {
                      font-size: 0.9rem;
                    }
                    .address-form-grid input,
                    .address-form-grid select {
                      padding: 10px 8px;
                      font-size: 0.95rem;
                    }
                  }
                `}</style>
                {/* Mobile Number field before SHIPPING ADDRESS - will be removed */}
                <div style={{ display: 'none' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500, color: '#444', fontSize: '0.95rem' }}>
                    Mobile Number*
                    <style>{`
                      .mobile-number-top-container {
                        display: flex;
                        gap: 5px;
                        align-items: stretch;
                        margin-top: 6px;
                      }
                      .mobile-number-top-container > * {
                        box-sizing: border-box;
                      }
                      @media (max-width: 768px) {
                        .mobile-number-top-container {
                          gap: 4px;
                        }
                      }
                    `}</style>
                    <div className="mobile-number-top-container">
                      <span style={{ width: '55px', flexShrink: 0, padding: '10px 6px', borderRadius: 6, border: '1px solid #ccc', background: '#f7f7f7', fontWeight: 500, fontSize: '0.95rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+971</span>
                      <select
                        value={formData.shipping.phone_prefix || '50'}
                        onChange={e => onChange({ target: { name: 'phone_prefix', value: e.target.value } }, 'shipping')}
                        style={{ width: '60px', flexShrink: 0, padding: '10px 6px', borderRadius: 6, border: '1px solid #ccc', fontWeight: 500, fontSize: '0.95rem', background: '#fff' }}>
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
                          let val = (formData.shipping.phone_number || '').toString().replace(/[^0-9]/g, '');
                          if (val.length > 7) val = val.slice(-7);
                          return val.slice(0, 7);
                        })()}
                        onChange={e => {
                          let val = e.target.value.replace(/[^0-9]/g, '');
                          val = val.slice(0, 7);
                          onChange({ target: { name: 'phone_number', value: val } }, 'shipping');
                          if (formErrors.phone_number) {
                            setFormErrors((prev) => ({ ...prev, phone_number: '' }));
                          }
                        }}
                        maxLength={7}
                        inputMode="numeric"
                        pattern="[0-9]{7}"
                        style={{ 
                          flex: 1,
                          minWidth: 0,
                          padding: '10px', 
                          borderRadius: 6, 
                          border: formErrors.phone_number ? '2px solid red' : '1px solid #ccc', 
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                        placeholder="1234567"
                      />
                    </div>
                    {formErrors.phone_number && <span style={{ color: 'red', fontSize: '0.9rem', fontWeight: 500, marginTop: 4 }}>{formErrors.phone_number}</span>}
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, color: '#444', fontSize: '1.1rem', letterSpacing: 0.2, flex: 1 }}>SHIPPING ADDRESS</div>
                </div>
                {(
                    <form onSubmit={saveAddress} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="address-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Delivery Type Selector at the top of the form */}
              <div style={{ margin: '0 0 18px 0', gridColumn: '1 / -1' }}>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: 8 }}>Delivery Type<span style={{ color: 'red' }}>*</span></div>
                <style>{`
                  @media (max-width: 768px) {
                    .delivery-type-group {
                      display: grid !important;
                      grid-template-columns: repeat(3, 1fr) !important;
                      gap: 8px !important;
                    }
                    .delivery-type-radio {
                      justify-content: center !important;
                      padding: 10px 6px !important;
                      font-size: 0.9rem !important;
                    }
                  }
                `}</style>
                <div className="delivery-type-group" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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

              <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500, color: '#444', fontSize: '0.95rem' }}>
                Mobile Number*
                <div style={{ display: 'flex', gap: '5px', marginTop: '6px', width: '100%' }}>
                  <div style={{ 
                    width: '55px',
                    minWidth: '55px',
                    flexShrink: 0,
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #ccc', 
                    background: '#f7f7f7', 
                    fontWeight: 500, 
                    fontSize: '1rem', 
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}>
                    +971
                  </div>
                  <select
                    value={formData.shipping.phone_prefix || '50'}
                    onChange={e => onChange({ target: { name: 'phone_prefix', value: e.target.value } }, 'shipping')}
                    style={{ 
                      width: '60px',
                      minWidth: '60px',
                      flexShrink: 0,
                      padding: '10px 5px', 
                      borderRadius: '6px', 
                      border: '1px solid #ccc', 
                      fontWeight: 500, 
                      fontSize: '1rem', 
                      background: '#fff',
                      boxSizing: 'border-box'
                    }}>
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
                      let val = (formData.shipping.phone_number || '').toString().replace(/[^0-9]/g, '');
                      if (val.length > 7) val = val.slice(-7);
                      return val.slice(0, 7);
                    })()}
                    onChange={e => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      val = val.slice(0, 7);
                      onChange({ target: { name: 'phone_number', value: val } }, 'shipping');
                      // Clear error if we now have exactly 7 digits
                      if (val.length === 7 && formErrors.phone_number) {
                        setFormErrors((prev) => ({ ...prev, phone_number: '' }));
                      } else if (val.length !== 7 && !formErrors.phone_number) {
                        // Only show error on blur, not while typing
                      }
                    }}
                    onBlur={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length !== 7 && val.length > 0) {
                        setFormErrors((prev) => ({ ...prev, phone_number: 'Must be exactly 7 digits' }));
                      }
                    }}
                    maxLength={7}
                    inputMode="numeric"
                    pattern="[0-9]{7}"
                    style={{ 
                      flex: 1,
                      minWidth: 0,
                      width: '100%',
                      padding: '10px', 
                      borderRadius: '6px', 
                      border: formErrors.phone_number ? '2px solid red' : '1px solid #ccc', 
                      fontSize: '1rem',
                      outline: 'none',
                      boxSizing: 'border-box'
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
                    const newValue = e.target.value;
                    setCityInput(newValue);
                    onChange({ target: { name: 'city', value: newValue } }, 'shipping');
                    // Clear error when typing
                    if (formErrors.city) {
                      setFormErrors((prev) => ({ ...prev, city: '' }));
                    }
                  }}
                  placeholder="Search your city or area..."
                  style={{ padding: '10px', fontSize: '1rem', borderRadius: '6px', border: formErrors.city ? '2px solid red' : '1px solid #ccc', marginTop: 4 }}
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

            <div className="address-modal-buttons" style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: 8 }}>
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
  );
};

export default AddressForm;
