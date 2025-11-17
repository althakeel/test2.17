
import axios from "axios";
// ===== Simple In-Memory Cache for Categories and Products =====
const _categoryCache = {};
const _productCache = {};

// Clear cache function (useful for debugging)
export const clearCategoryCache = () => {
  Object.keys(_categoryCache).forEach(key => delete _categoryCache[key]);
  Object.keys(_productCache).forEach(key => delete _productCache[key]);
  console.log('🧹 Cache cleared');
};

export const API_BASE = "https://db.store1920.com/wp-json/wc/v3";
export const CONSUMER_KEY = "ck_8dfeb134379e51fa95e3a22769f67bd6b4f0e507";
export const CONSUMER_SECRET = "cs_2e5da71434cc874771a8ab0ef2dae2ffef3591c0";

const authParams = `consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`;

// ===================== Generic Fetch =====================
export async function fetchAPI(endpoint) {
  try {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${API_BASE}${endpoint}${separator}${authParams}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("fetchAPI error:", error);
    return null;
  }
}

// ===================== Categories =====================
export const getCategoryById = (id) => fetchAPI(`/products/categories/${id}`);
export const getCategoryBySlug = async (slug) => {
  console.log('🔍 getCategoryBySlug called with slug:', slug);
  const url = `/products/categories?slug=${slug}&hide_empty=false`;
  console.log('🌐 API URL:', `${API_BASE}${url}`);
  const result = await fetchAPI(url);
  console.log('📦 getCategoryBySlug raw result:', result);
  console.log('📦 Result is array?:', Array.isArray(result), 'Length:', result?.length);
  if (result && Array.isArray(result) && result.length > 0) {
    console.log('✅ Found category:', result[0].name, 'ID:', result[0].id, 'Slug:', result[0].slug);
  }
  return result;
};
export const getChildCategories = (parentId) => fetchAPI(`/products/categories?parent=${parentId}`);
export const getCategories = async () => {
  console.log('🔍 Fetching all categories...');
  const result = await fetchAPI(`/products/categories?per_page=100&hide_empty=false`);
  console.log('📦 All categories count:', result?.length);
  if (result && result.length > 0) {
    console.log('📋 First 10 category slugs:', result.slice(0, 10).map(c => `"${c.slug}" (${c.name})`).join(', '));
  }
  return result;
};

// ===================== Enhanced Category Fetching by Slug =====================
export const getCategoryBySlugAdvanced = async (slug) => {
  try {
    console.log('🔍 Starting advanced category fetch for slug:', slug);
    
    // 1️⃣ Try standard WooCommerce API first (most reliable)
    console.log('🔄 Trying standard WooCommerce API');
    const standardData = await getCategoryBySlug(slug);
    console.log('🔍 Standard API response for slug', slug, ':', standardData);
    
    if (standardData && Array.isArray(standardData) && standardData.length > 0) {
      console.log('✅ Found category via standard API:', standardData[0]);
      return standardData[0];
    }
    
    // 2️⃣ Try custom Store1920 endpoint as fallback
    try {
      const customUrl = `https://db.store1920.com/wp-json/store1920/v1/category/${slug}`;
      console.log('🌐 Trying custom endpoint:', customUrl);
      
      const response = await axios.get(customUrl);
      console.log('✅ Custom endpoint response:', response.data);
      
      if (response.data && !response.data.code && response.data.id) {
        console.log('✅ Found category via custom endpoint:', response.data);
        return response.data;
      }
    } catch (customError) {
      console.log('❌ Custom endpoint failed:', customError.message);
    }
    
    // 3️⃣ Try to find similar categories by searching all categories
    console.log('� Searching for similar categories...');
    try {
      const allCategories = await getCategories();
      console.log('� All categories count:', allCategories?.length);
      
      if (allCategories && Array.isArray(allCategories)) {
        // First try exact slug match
        let similarCategory = allCategories.find(c => c.slug === slug);
        
        // Then try partial slug match
        if (!similarCategory) {
          similarCategory = allCategories.find(c => 
            c.slug.includes(slug) || 
            slug.includes(c.slug)
          );
        }
        
        // Finally try name match
        if (!similarCategory) {
          const searchName = slug.replace(/-/g, ' ').toLowerCase();
          similarCategory = allCategories.find(c => 
            c.name.toLowerCase().includes(searchName) ||
            searchName.includes(c.name.toLowerCase())
          );
        }
        
        if (similarCategory) {
          console.log('🎯 Found similar category:', similarCategory);
          return similarCategory;
        }
      }
    } catch (searchError) {
      console.log('❌ Could not search for similar categories:', searchError.message);
    }
    
    console.log('❌ No category found for slug:', slug);
    return null;
    
  } catch (error) {
    console.error('❌ Error in getCategoryBySlugAdvanced:', error);
    return null;
  }
};

// ===================== Products =====================
export const getProductsByCategory = (categoryId, page = 1, perPage = 42) =>
  // Remove _fields to allow custom fields like enable_saving_badge
  fetchAPI(`/products?category=${categoryId}&per_page=${perPage}&page=${page}&orderby=date&order=desc`);

// ===================== Enhanced Products by Category Slug =====================
export const getProductsByCategorySlugAdvanced = async (slug, page = 1, perPage = 8) => {
  try {
    console.log('🎯 getProductsByCategorySlugAdvanced called - slug:', slug, 'page:', page);
    
    // Check cache for category (only use cache after initial fetch)
    let category = null;
    
    // Always fetch fresh on page 1 to ensure we have the right category
    if (page === 1) {
      console.log('🔄 Page 1 - fetching fresh category data');
      category = await getCategoryBySlugAdvanced(slug);
      if (category && category.id) {
        _categoryCache[slug] = category;
        console.log('✅ Cached category:', category.name, 'ID:', category.id);
      }
    } else {
      // Use cache for subsequent pages
      category = _categoryCache[slug];
      if (!category) {
        console.log('⚠️ No cached category, fetching fresh');
        category = await getCategoryBySlugAdvanced(slug);
        if (category && category.id) _categoryCache[slug] = category;
      }
    }
    
    if (!category || !category.id) {
      console.log('❌ No category found for slug:', slug);
      return { products: [], category: null, hasMore: false };
    }

    console.log('✅ Using category:', category.name, 'ID:', category.id);

    // Cache key for products
    const cacheKey = `${category.id}_${page}_${perPage}`;
    if (_productCache[cacheKey]) {
      console.log('📦 Using cached products for key:', cacheKey);
      return { products: _productCache[cacheKey], category, hasMore: _productCache[cacheKey].length >= perPage };
    }

    // Fetch products for this category
    console.log('🔍 Fetching products for category ID:', category.id);
    const products = await getProductsByCategory(category.id, page, perPage);
    console.log('📦 Fetched products count:', products?.length);
    
    if (products) _productCache[cacheKey] = products;
    const hasMore = products && products.length >= perPage;
    return {
      products: products || [],
      category: category,
      hasMore: hasMore
    }; 
  } catch (error) {
    console.error('❌ Error in getProductsByCategorySlugAdvanced:', error);
    return { products: [], category: null, hasMore: false };
  }
};

export const getProductsByCategories = (categoryIds = [], page = 1, perPage = 42, order = "desc") => {
  if (!Array.isArray(categoryIds) || !categoryIds.length) return [];
  return fetchAPI(`/products?category=${categoryIds.join(",")}&per_page=12&page=${page}&orderby=date&order=${order}&_fields=id,name,slug,images,price,total_sales,enable_saving_badge,categories`);
};

export const getProductBySlug = async (slug) => {
  const data = await fetchAPI(`/products?slug=${slug}`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

export const getProductById = (id) => fetchAPI(`/products/${id}`);
export const searchProducts = (term) => fetchAPI(`/products?search=${encodeURIComponent(term)}`);
export const getProductsByIds = (ids = []) => {
  if (!Array.isArray(ids) || !ids.length) return [];
  return fetchAPI(`/products?include=${ids.join(",")}`);
};

// ===================== Tags =====================
export const getTagIdsBySlugs = async (slugs = []) => {
  if (!slugs.length) return [];
  const allTags = await fetchAPI("/products/tags?per_page=100");
  if (!allTags || !Array.isArray(allTags)) return [];
  return slugs
    .map((slug) => allTags.find((t) => t.slug.toLowerCase() === slug.toLowerCase())?.id)
    .filter(Boolean);
};

export const getProductsByTagSlugs = async (slugs = [], page = 1, perPage = 42, orderBy = "date", order = "desc") => {
  const tagIds = await getTagIdsBySlugs(slugs);
  if (!tagIds.length) return [];
  const url = `/products?tag=${tagIds.join(",")}&per_page=${perPage}&page=${page}&orderby=${orderBy}&order=${order}&_fields=id,name,slug,images,price,total_sales,enable_saving_badge
`;
  return fetchAPI(url);
};

// ===================== Specific Tag-based Products =====================
export const getNewArrivalsProducts = (page = 1, perPage = 24) => getProductsByTagSlugs(["new-arrivals"], page, perPage);
export const getRatedProducts = (page = 1, perPage = 24) => getProductsByTagSlugs(["rated"], page, perPage, "rating");
export const getFestSaleProducts = (page = 1, perPage = 24) => getProductsByTagSlugs(["fest-sale"], page, perPage);
// Use Woo's supported alias 'popularity' (maps to total_sales)
export const getTopSellingItemsProducts = (page = 1, perPage = 24) =>
  getProductsByTagSlugs(["top-selling"], page, perPage, "popularity");

// Fallback: get popular products irrespective of tag
export const getPopularProducts = (page = 1, perPage = 24) =>
  fetchAPI(`/products?per_page=${perPage}&page=${page}&orderby=popularity&order=desc&_fields=id,name,slug,images,price,total_sales,enable_saving_badge`);

// ===================== Variations =====================
export const getFirstVariation = async (productId) => {
  try {
    const data = await fetchAPI(`/products/${productId}/variations?per_page=1`);
    return data?.[0] || null;
  } catch (err) {
    console.error("getFirstVariation error:", err);
    return null;
  }
};

// ===================== Currency =====================
export const getCurrencySymbol = async () => {
  try {
    const res = await fetch(`${API_BASE}/settings?${authParams}`);
    const data = await res.json();
    return data?.currency_symbol || "AED";
  } catch {
    return "AED";
  }
};

// ===================== Reviews =====================
// export const getProductReviews = (productId, perPage = 20) =>
//   fetchAPI(`/products/${productId}/reviews?per_page=${perPage}`);

// export const addProductReview = async (productId, { review, reviewer, reviewer_email, rating = 5 }) => {
//   try {
//     const res = await fetch(`${API_BASE}/products/${productId}/reviews?${authParams}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ review, reviewer, reviewer_email, rating }),
//     });
//     if (!res.ok) throw new Error(`Failed to submit review: ${res.status}`);
//     return await res.json();
//   } catch {
//     return null;
//   }
// };

// ===================== Other APIs =====================
export const getFastProducts = async (limit = 4) => {
  try {
    const res = await fetch(`https://db.store1920.com/wp-json/custom/v1/fast-products`);
    if (!res.ok) throw new Error("Fast products API error");
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, limit) : [];
  } catch (err) {
    console.error("getFastProducts error:", err);
    return [];
  }
};

export const getPromo = async () => {
  try {
    const res = await fetch(`${API_BASE}/custom/v1/promo`);
    if (!res.ok) throw new Error("Promo API error");
    return await res.json();
  } catch {
    return null;
  }
};

// ===================== Orders =====================
export const getOrderById = async (orderId) => {
  if (!orderId) return null;
  
  try {
    // Fetch the order data
    const order = await fetchAPI(`/orders/${orderId}`);
    if (!order) return null;

    // Enhance line items with product images
    const enhancedLineItems = await Promise.all(
      order.line_items.map(async (item) => {
        try {
          // Fetch product details to get images
          const product = await fetchAPI(`/products/${item.product_id}`);
          return {
            ...item,
            image: product?.images?.[0] || null
          };
        } catch (error) {
          console.error(`Error fetching product ${item.product_id}:`, error);
          return item;
        }
      })
    );

    return {
      ...order,
      line_items: enhancedLineItems
    };
  } catch (error) {
    console.error("getOrderById error:", error);
    return null;
  }
};

export const getOrdersByEmail = (email, perPage = 20) =>
  email ? fetchAPI(`/orders?customer=${email}&per_page=${perPage}&orderby=date&order=desc`) : [];

// ===================== Top Sold Products =====================
export const getTopSoldProducts = async (hours = 24, limit = 5) => {
  // Some WooCommerce installs do not support orderby=total_sales or date_modified_min.
  // We try a compatibility chain: popularity -> rating -> recent.
  const attempts = [
    `${API_BASE}/products?per_page=${limit}&orderby=popularity&order=desc&status=publish&${authParams}`,
    `${API_BASE}/products?per_page=${limit}&orderby=rating&order=desc&status=publish&${authParams}`,
    `${API_BASE}/products?per_page=${limit}&orderby=date&order=desc&status=publish&${authParams}`,
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // Read response text to aid debugging, but keep going to next attempt
        const txt = await res.text().catch(() => '');
        console.warn(`getTopSoldProducts attempt failed: ${url} -> ${res.status} ${txt}`);
        continue;
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data;
    } catch (err) {
      console.warn(`getTopSoldProducts network error for ${url}:`, err?.message || err);
      continue;
    }
  }

  // Final fallback: return empty list
  return [];
};
// ===================== New: Products by Category Slug =====================
export const getProductsByCategorySlug = async (slug, page = 1, perPage = 42, order = "desc") => {
  try {
    // 1️⃣ Get category by slug
    const categories = await getCategoryBySlug(slug);
    if (!categories?.length) return [];

    const parentCategory = categories[0];

    // 2️⃣ Get child categories
    const children = await getChildCategories(parentCategory.id);
    const categoryIds = [parentCategory.id, ...(children?.map(c => c.id) || [])];

    if (!categoryIds.length) return [];

    // 3️⃣ Get products for all category IDs
    const products = await getProductsByCategories(categoryIds, page, perPage, order);
    return products || [];
  } catch (err) {
    console.error("getProductsByCategorySlug error:", err);
    return [];
  }
};

export const getLightProductsByCategories = (categoryIds = [], page = 1, perPage = 42, order = "desc") => {
  if (!Array.isArray(categoryIds) || !categoryIds.length) return [];
  return fetchAPI(
    `/products?category=${categoryIds.join(",")}&per_page=${perPage}&page=${page}&orderby=date&order=${order}&_fields=id,name,slug,price,images`
  );
};
export const getLightProductsByCategorySlug = async (slug, page = 1, perPage = 42, order = "desc") => {
  try {
    // 1️⃣ Get category by slug
    const categories = await getCategoryBySlug(slug);
    if (!categories?.length) return [];

    const parentCategory = categories[0];

    // 2️⃣ Get child categories
    const children = await getChildCategories(parentCategory.id);
    const categoryIds = [parentCategory.id, ...(children?.map(c => c.id) || [])];

    if (!categoryIds.length) return [];

    // 3️⃣ Fetch only lightweight product data
    const products = await getLightProductsByCategories(categoryIds, page, perPage, order);

    // 4️⃣ Limit images to first 2
    return (products || []).map((p) => ({
      ...p,
      images: p.images ? p.images.slice(0, 2) : [],
    }));
  } catch (err) {
    console.error("getLightProductsByCategorySlug error:", err);
    return [];
  }
};