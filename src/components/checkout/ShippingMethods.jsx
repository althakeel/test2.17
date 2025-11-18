import React, { useEffect, useState } from 'react';
import '../../assets/styles/checkout/ShippingMethods.css';

// Safely import staticProducts with fallback
let staticProducts = [];
try {
  const staticProductsModule = require('../../data/staticProducts');
  staticProducts = staticProductsModule.default || staticProductsModule || [];
} catch (error) {
  console.warn('Could not load static products data:', error);
  staticProducts = [];
}

const ShippingMethods = ({ selectedMethodId, onSelect, cartItems = [] }) => {
  // Detect if cart has only static products
  let staticProductIds = [];
  try {
    staticProductIds = staticProducts.flatMap(product => {
      // Get bundle IDs
      const bundleIds = product.bundles ? product.bundles.map(b => b.id) : [];
      // Get main product ID
      const mainId = product.id;
      // Get variation IDs if they exist
      const variationIds = product.variations ? product.variations.map(v => v.id) : [];
      
      return [mainId, ...bundleIds, ...variationIds].filter(Boolean);
    });
  } catch (error) {
    console.error('Error loading static product IDs:', error);
    staticProductIds = [];
  }

  console.log('🔍 Static Product IDs:', staticProductIds);
  console.log('🛒 Cart Items:', cartItems.map(item => ({ id: item.id, name: item.name })));

  const hasOnlyStaticProducts =
    cartItems.length > 0 &&
    staticProductIds.length > 0 &&
    cartItems.every(item => {
      const isStatic = staticProductIds.includes(item.id);
      console.log(`Item ${item.id} (${item.name}) is static:`, isStatic);
      return isStatic;
    });

  console.log('✅ Has Only Static Products:', hasOnlyStaticProducts);

  // Set delivery time based on product type - recalculate on every render
  const deliveryTime = hasOnlyStaticProducts 
    ? 'Delivered within 2–5 business days'
    : 'Delivered within 8–12 business days';

  console.log('📦 Delivery Time:', deliveryTime);

  // Create methods dynamically based on current cart
  const methods = [
    {
      id: 'free_shipping',
      title: 'Free Shipping',
      description: deliveryTime,
      cost: 0,
      eligible: true,
    },
  ];

  // Auto-select Free Shipping by default
  useEffect(() => {
    if (methods.length > 0 && !selectedMethodId) {
      onSelect(methods[0].id);
    }
  }, [methods, selectedMethodId, onSelect]);

  return (
    <div className="shipping-container-full">
      <h3 className="shipping-title-full">Choose Shipping Method</h3>
      <form>
        {methods.map(method => {
          const isSelected = selectedMethodId === method.id;
          const price = method.cost > 0 ? `AED ${method.cost.toFixed(2)}` : 'Free';

          return (
            <label
              key={method.id}
              className={`shipping-full-card ${isSelected ? 'shipping-full-selected' : ''} ${
                method.eligible === false ? 'shipping-disabled' : ''
              }`}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={method.id}
                checked={isSelected}
                onChange={() => method.eligible !== false && onSelect(method.id)}
                className="shipping-full-radio"
                disabled={method.eligible === false}
              />
              <div className="shipping-full-content">
                <div className="shipping-full-text">
                  <span className="shipping-full-title">{method.title}</span>
                  <div className="shipping-full-desc">{method.description}</div>
                </div>
                <span className="shipping-full-price">{price}</span>
              </div>
            </label>
          );
        })}
      </form>
    </div>
  );
};

export default ShippingMethods;
