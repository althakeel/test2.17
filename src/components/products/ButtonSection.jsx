import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../assets/styles/ButtonSection.css';
import { useCart } from '../../contexts/CartContext';

export default function ButtonSection({ product, selectedVariation, quantity, isClearance }) {
  const [addedToCart, setAddedToCart] = useState(false);
  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();

  const variation = selectedVariation || product;

  const handleAddToCart = () => {
    const itemId = variation.id;
    const itemPrice = variation.price || product.price;

    const itemToAdd = {
      id: itemId,
      name: product.name,
      quantity: quantity,
      price: itemPrice,
      image: variation.image?.src || product.images?.[0]?.src || '',
      variation: selectedVariation?.attributes || [],
    };

    addToCart(itemToAdd);
    setAddedToCart(true);
    setIsCartOpen(true);

    if (isClearance) {
      navigate('/checkout');
    }
  };

  const handleGoToCart = () => navigate('/cart');
  const handleGoToCheckout = () => navigate('/checkout');

  useEffect(() => {
    setAddedToCart(false);
  }, [quantity, variation?.id]);

  // Tabby Promo Widget
  useEffect(() => {
    const price = variation?.price || product?.price || "0.00";
    console.log('Tabby Promo - Price:', price);
    
    const loadTabbyPromo = () => {
      console.log('Tabby Promo - Loading widget');
      if (window.TabbyPromo) {
        console.log('Tabby Promo - Initializing with config:', {
          selector: '#TabbyPromo',
          currency: 'AED',
          price: String(price),
          publicKey: 'pk_019a4e3b-c868-29ff-1078-04addad77515',
          merchantCode: 'store1920'
        });
        
        new window.TabbyPromo({
          selector: '#TabbyPromo',
          currency: 'AED',
          price: String(price),
          lang: 'en',
          source: 'product',
          publicKey: 'pk_019a4e3b-c868-29ff-1078-04addad77515',
          merchantCode: 'store1920'
        });
      } else {
        console.error('Tabby Promo - window.TabbyPromo not found');
      }
    };

    if (!document.getElementById('tabby-promo-js')) {
      console.log('Tabby Promo - Loading script');
      const script = document.createElement('script');
      script.src = 'https://checkout.tabby.ai/tabby-promo.js';
      script.id = 'tabby-promo-js';
      script.onload = () => {
        console.log('Tabby Promo - Script loaded successfully');
        loadTabbyPromo();
      };
      script.onerror = () => {
        console.error('Tabby Promo - Failed to load script');
      };
      document.body.appendChild(script);
    } else {
      console.log('Tabby Promo - Script already loaded, reinitializing');
      loadTabbyPromo();
    }

    return () => {
      const target = document.querySelector('#TabbyPromo');
      if (target) target.innerHTML = '';
    };
  }, [variation, product]);

  return (
    <>
      {isClearance ? (
        <div className="button-section">
          <button className="buy-now-btn" onClick={handleAddToCart}>
            Buy Now
          </button>
        </div>
      ) : (
        <div className="button-section">
          {!addedToCart ? (
            <button className="add-to-cart-btn" onClick={handleAddToCart}>
              Add to Cart
            </button>
          ) : (
            <>
              <button className="go-to-cart-btn" onClick={handleGoToCart}>
                Go to Cart
              </button>
              <button className="go-to-checkout-btn" onClick={handleGoToCheckout}>
                Go to Checkout
              </button>
            </>
          )}
        </div>
      )}

      {/* Tabby Promo Widget */}
      <div id="TabbyPromo" style={{ marginTop: '15px', marginBottom: '10px' }}></div>
    </>
  );
}