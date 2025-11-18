import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

import '../assets/styles/ProductInfo.css';

import OfferBox from './OfferBox';
import ProductBadges from './ProductSellerbadge';
import ProductBadgesseller from './sub/ProductBadges';
import ShareDropdown from './ShareDropdown';
import PriceDisplay from './products/PriceDisplay';
import ProductVariants from './products/ProductVariants';
import ClearanceSaleBox from './products/ClearanceSaleBox';
import QuantitySelector from './products/QuantitySelector';
import ButtonSection from './products/ButtonSection';
import OrderPerks from './products/OrderPerks';
import ProductShortDescription from './products/ProductShortDescription';
import ItemDetailsTable from './products/ItemDetailsTable';
import ProductCardReviews from '../components/temp/productcardreviews';
import MobileStickyCart from '../components/MobileStickyCart';

export default function ProductInfo({ product, variations, selectedVariation, onVariationChange }) {
  const [quantity, setQuantity] = useState(1);
  const [hasItemDetails, setHasItemDetails] = useState(false);

  const navigate = useNavigate();
  const { addToCart, setIsCartOpen } = useCart();

  const isOutOfStock = selectedVariation?.stock_status === 'outofstock';

  // Reset quantity when selected variation changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedVariation]);

  // Tabby Promo Widget initialization
  useEffect(() => {
    const variation = selectedVariation || product;
    const price = variation?.price || product?.price || "0.00";
    
    const loadTabbyPromo = () => {
      if (window.TabbyPromo && typeof window.TabbyPromo === 'function') {
        try {
          new window.TabbyPromo({
            selector: '#TabbyPromo',
            currency: 'AED',
            price: String(price),
            lang: 'en',
            source: 'product',
            publicKey: 'pk_019a4e3b-c868-29ff-1078-04addad77515',
            merchantCode: 'store1920'
          });
        } catch (error) {
          console.error('Tabby Promo initialization error:', error);
        }
      }
    };

    if (!document.getElementById('tabby-promo-js')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.tabby.ai/tabby-promo.js';
      script.id = 'tabby-promo-js';
      script.async = true;
      script.onload = () => setTimeout(loadTabbyPromo, 100);
      document.body.appendChild(script);
    } else {
      setTimeout(loadTabbyPromo, 100);
    }

    return () => {
      const target = document.querySelector('#TabbyPromo');
      if (target) target.innerHTML = '';
    };
  }, [selectedVariation, product]);

  // Extract brand attribute
  const brandAttribute = product.attributes?.find(attr => {
    if (!attr.name) return false;
    const name = attr.name.toLowerCase();
    const slug = (attr.slug || '').toLowerCase();
    return name.includes('brand') || slug.includes('brand');
  });
  const brandOptions = brandAttribute?.options || [];
  const brand = brandOptions.length ? brandOptions[0] : null;

  // Stock quantity calculation
  const rawQty = Number(selectedVariation?.stock_quantity);
  const productQty = Number(product?.stock_quantity);
  const manageStock = selectedVariation?.manage_stock;
  const maxQuantity =
    manageStock && Number.isInteger(rawQty) && rawQty > 0
      ? rawQty
      : Number.isInteger(productQty) && productQty > 0
      ? productQty
      : 99;

  if (!product) return null;

  // Normalize clearance sale values
  const showClearance = product.show_clearance_sale === true || product.show_clearance_sale === 'yes';
  const clearanceEndTime = product.clearance_end_time
    ? product.clearance_end_time.replace(' ', 'T') // Convert "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS"
    : null;

  const handleAddToCart = () => {
    const variation = selectedVariation || product;

    const itemToAdd = {
      id: variation.id,
      name: product.name,
      quantity,
      price: variation.price || product.price,
      image: variation.image?.src || product.images?.[0]?.src || '',
      variation: selectedVariation?.attributes || [],
    };

    addToCart(itemToAdd);
    setIsCartOpen(true);

    if (showClearance) navigate('/checkout');
  };

  const combinedBadges = [
    ...(product.custom_seller_badges || []),
    ...(product.best_seller_recommended_badges || []).map(b => {
      if (b === 'best_seller') return 'best_recommended';
      if (b === 'recommended') return 'best_recommended'; // optional, or create another key
      return b;
    })
  ];
  
  return (
    <section className="pi-product-info">
      <OfferBox />

      <div className="pi-product-title-row">
        <div className="pi-badges-and-title">
      
        <h1 style={{ margin: '5px 0' }}>
            {product.name} <ShareDropdown url={window.location.href} />
          </h1>
          <ProductBadges badges={combinedBadges} />
          <div style={{ display: "flex", justifyContent: "flex-start", gap: "10px" }}>
  <ProductCardReviews 
    productId={product.id}
    soldCount={product.total_sales || 0}
  />
  <ProductBadgesseller />
</div>


          {product.sku && <p className="pi-product-sku">SKU: {product.sku}</p>}
          {brand && <p className="pi-product-brand">Brand: {brand}</p>}
        </div>
      </div>
    

      <PriceDisplay product={product} selectedVariation={selectedVariation} />
      
      {/* Tabby Promo Widget */}
      <div id="TabbyPromo" style={{ margin: '12px 0' }}></div>
      
      <ProductShortDescription shortDescription={product.short_description} />

      {showClearance && clearanceEndTime ? (
        <ClearanceSaleBox endTime={clearanceEndTime} style={{padding: '50px', background:"red"}}>
          <ProductVariants
            variations={variations}
            selectedVariation={selectedVariation}
            onVariationChange={onVariationChange}
          />
          <QuantitySelector
            quantity={quantity}
            setQuantity={setQuantity}
            maxQuantity={maxQuantity}
          />
        </ClearanceSaleBox>
      ) : (
        <>
          <ProductVariants
            variations={variations}
            selectedVariation={selectedVariation}
            onVariationChange={onVariationChange}
            maxQuantity={maxQuantity}
          />
          <QuantitySelector
            quantity={quantity}
            setQuantity={setQuantity}
            maxQuantity={maxQuantity}
          />
        </>
      )}

<MobileStickyCart
  quantity={quantity}
  setQuantity={setQuantity}
  maxQuantity={maxQuantity}
  product={product}
  selectedVariation={selectedVariation}
  showClearance={showClearance}
  handleAddToCart={handleAddToCart}
/>

      <ButtonSection
        product={product}
        selectedVariation={selectedVariation}
        quantity={quantity}
        isClearance={showClearance}
        handleAddToCart={handleAddToCart}
      />

      {hasItemDetails && (
        <ItemDetailsTable
          postId={product.id}
          postType="posts"
          onHasData={(exists) => setHasItemDetails(exists)}
        />
      )}

      <OrderPerks />
    </section>
  );
}
