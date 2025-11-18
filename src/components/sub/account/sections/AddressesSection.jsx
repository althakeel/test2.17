import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../contexts/AuthContext';
import '../../../../assets/styles/myaccount/addressesSection.css';

const API_BASE = 'https://db.store1920.com/wp-json/wc/v3';
const CUSTOM_API = 'https://db.store1920.com/wp-json/custom/v1';
const CK = 'ck_e09e8cedfae42e5d0a37728ad6c3a6ce636695dd';
const CS = 'cs_2d41bc796c7d410174729ffbc2c230f27d6a1eda';

const AddressesSection = () => {
  const { user } = useAuth();
  const userId = user?.id; // Get user ID from AuthContext

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    country: '',
    city: '',
    firstName: '',
    lastName: '',
    phone: '',
    isWhatsappSame: 'yes',
    street: '',
    additional: '',
  });
  const [citiesOptions, setCitiesOptions] = useState([]);
  const [countries, setCountries] = useState([]);

  // Fetch countries for dropdown
  useEffect(() => {
    axios
      .get(`${API_BASE}/data/countries`, {
        params: { consumer_key: CK, consumer_secret: CS },
      })
      .then((res) => setCountries(res.data || []))
      .catch(() => setCountries([]));
  }, []);

  // Fetch customer billing address by userId
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch from WooCommerce customer endpoint
    axios
      .get(`${API_BASE}/customers/${userId}`, {
        params: { consumer_key: CK, consumer_secret: CS },
      })
      .then((res) => {
        const customer = res.data;
        console.log('Customer data loaded:', customer);
        
        const addressList = [];
        
        // Add billing address if it exists
        if (customer.billing && customer.billing.address_1) {
          addressList.push({
            ...customer.billing,
            type: 'Billing'
          });
        }
        
        // Add shipping address if it exists and is different from billing
        if (customer.shipping && customer.shipping.address_1) {
          const isDifferent = customer.shipping.address_1 !== customer.billing?.address_1 ||
                             customer.shipping.city !== customer.billing?.city;
          if (isDifferent) {
            addressList.push({
              ...customer.shipping,
              type: 'Shipping'
            });
          } else if (!customer.billing?.address_1) {
            // If no billing address but shipping exists, show shipping
            addressList.push({
              ...customer.shipping,
              type: 'Shipping'
            });
          }
        }
        
        setAddresses(addressList);
      })
      .catch((err) => {
        console.error('Error loading addresses:', err);
        setAddresses([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Update cities list if country is AE
  useEffect(() => {
    if (formData.country === 'AE') {
      setCitiesOptions([
        'Abu Dhabi',
        'Dubai',
        'Sharjah',
        'Ajman',
        'Umm Al Quwain',
        'Ras Al Khaimah',
        'Fujairah',
      ]);
    } else {
      setCitiesOptions([]);
      setFormData((prev) => ({ ...prev, city: '' }));
    }
  }, [formData.country]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validate phone number input in real-time
    if (name === 'phone') {
      // Remove all non-digit characters
      const digitsOnly = value.replace(/[^0-9]/g, '');
      
      // Format as UAE number: allow only digits, max 9 digits
      if (digitsOnly.length <= 9) {
        setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      }
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save new billing address using WooCommerce API
  const handleSave = async () => {
    if (!userId) {
      alert('User not logged in.');
      return;
    }
    
    // Validate phone number before saving
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/[^0-9]/g, '');
      if (phoneDigits.length !== 9) {
        alert('Phone number must be exactly 9 digits.');
        return;
      }
      if (!phoneDigits.startsWith('5')) {
        alert('UAE mobile numbers must start with 5.');
        return;
      }
    }

    setSaving(true);

    const customerData = {
      billing: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address_1: formData.street,
        address_2: formData.additional,
        city: formData.city,
        state: '', 
        postcode: '',
        country: formData.country,
        phone: formData.phone ? `+971${formData.phone}` : '',
        email: user?.email || '',
      },
      shipping: {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address_1: formData.street,
        address_2: formData.additional,
        city: formData.city,
        state: '', 
        postcode: '',
        country: formData.country,
      }
    };

    try {
      console.log('Updating customer address for user ID:', userId);
      console.log('Customer data:', customerData);
      
      // Update customer using WooCommerce API
      const response = await axios.put(
        `${API_BASE}/customers/${userId}`,
        customerData,
        {
          params: { consumer_key: CK, consumer_secret: CS },
        }
      );

      console.log('Update response:', response.data);
      alert('Address saved successfully.');

      // Refresh the addresses list
      const customerRes = await axios.get(`${API_BASE}/customers/${userId}`, {
        params: { consumer_key: CK, consumer_secret: CS },
      });
      
      if (customerRes.data) {
        const customer = customerRes.data;
        const addressList = [];
        
        if (customer.billing?.address_1) {
          addressList.push({
            ...customer.billing,
            type: 'Billing'
          });
        }
        
        if (customer.shipping?.address_1) {
          const isDifferent = customer.shipping.address_1 !== customer.billing?.address_1 ||
                             customer.shipping.city !== customer.billing?.city;
          if (isDifferent) {
            addressList.push({
              ...customer.shipping,
              type: 'Shipping'
            });
          } else if (!customer.billing?.address_1) {
            addressList.push({
              ...customer.shipping,
              type: 'Shipping'
            });
          }
        }
        
        setAddresses(addressList);
      }

      // Reset form and hide
      setFormData({
        country: '',
        city: '',
        firstName: '',
        lastName: '',
        phone: '',
        isWhatsappSame: 'yes',
        street: '',
        additional: '',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Address save error:', error);
      console.error('Error response:', error.response?.data);
      alert(`Failed to save address: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  if (loading) {
    return <p className="loading-text">Loading addresses...</p>;
  }

  return (
    <section className="addresses-section">
      <h2 className="section-title">Shipping Addresses</h2>

      {!addresses.length && !showForm && (
        <div className="no-addresses">
          <p className="no-address-text">You don't have any shipping addresses saved.</p>
          <p className="encryption-note">All data you add will be encrypted.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            Add New Address
          </button>
        </div>
      )}

      {addresses.length > 0 && !showForm && (
        <>
          <div className="address-list">
            {addresses.map((addr, idx) => (
              <div className="address-card" key={idx}>
                {addr.type && <p className="address-type"><strong>{addr.type} Address</strong></p>}
                <p><strong>{addr.first_name} {addr.last_name}</strong></p>
                <p>{addr.address_1}</p>
                {addr.address_2 && <p>{addr.address_2}</p>}
                <p>{addr.city}{addr.state && `, ${addr.state}`}</p>
                <p>{addr.country}</p>
                {addr.phone && <p>Phone: {addr.phone}</p>}
                {addr.email && <p>Email: {addr.email}</p>}
              </div>
            ))}
          </div>
          <button className="btn-primary mt-20" onClick={() => setShowForm(true)}>
            Update Address
          </button>
        </>
      )}

      {showForm && (
        <form
          className="address-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) handleSave();
          }}
        >
          <h3 className="form-title">Add New Address</h3>

          <label className="input-label">
            Country / Region <span className="required">*</span>
            <select name="country" value={formData.country} onChange={handleChange} required>
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="input-label">
            City / Emirate <span className="required">*</span>
            {citiesOptions.length ? (
              <select name="city" value={formData.city} onChange={handleChange} required>
                <option value="">Select City</option>
                {citiesOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                required
              />
            )}
          </label>

          <label className="input-label">
            First Name <span className="required">*</span>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
              required
            />
          </label>

          <label className="input-label">
            Last Name <span className="required">*</span>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
              required
            />
          </label>

          <label className="input-label">
            Phone Number <span className="required">*</span>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666',
                pointerEvents: 'none',
              }}>+971</span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="5xxxxxxxx"
                required
                pattern="5[0-9]{8}"
                maxLength="9"
                style={{ paddingLeft: '50px' }}
                title="Enter 9-digit UAE mobile number starting with 5"
              />
            </div>
            <small className="hint" style={{ color: formData.phone && (formData.phone.length !== 9 || !formData.phone.startsWith('5')) ? '#e74c3c' : '#666' }}>
              {formData.phone && formData.phone.length > 0 ? (
                formData.phone.length !== 9 ? `${formData.phone.length}/9 digits` :
                !formData.phone.startsWith('5') ? 'Must start with 5' :
                '✓ Valid UAE number'
              ) : '9-digit number starting with 5 for UAE'}
            </small>
          </label>

          <fieldset className="whatsapp-fieldset">
            <legend>Is WhatsApp number same as phone?</legend>
            <label>
              <input
                type="radio"
                name="isWhatsappSame"
                value="yes"
                checked={formData.isWhatsappSame === 'yes'}
                onChange={handleChange}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="isWhatsappSame"
                value="no"
                checked={formData.isWhatsappSame === 'no'}
                onChange={handleChange}
              />
              No
            </label>
          </fieldset>

          <label className="input-label">
            Street name / Street number / Landmark <span className="required">*</span>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              placeholder="4A St, Building no, Floor no, Flat no or Landmark"
              required
            />
          </label>

          <label className="input-label">
            Additional / Detailed address (optional)
            <input
              type="text"
              name="additional"
              value={formData.additional}
              onChange={handleChange}
              placeholder="Building no, Floor no, Flat no or Landmark"
            />
          </label>

          <div className="form-buttons">
            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default AddressesSection;
