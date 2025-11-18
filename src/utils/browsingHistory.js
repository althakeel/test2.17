// Utility functions for tracking browsing history (products viewed and searches)

const HISTORY_KEY = 'browsingHistory';
const MAX_HISTORY_ITEMS = 50;

// Get user ID from localStorage
const getUserId = () => {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return user.id || user.email;
    }
    return null;
  } catch (e) {
    console.error('Error getting user ID:', e);
    return null;
  }
};

// Get browsing history for current user
export const getBrowsingHistory = () => {
  const userId = getUserId();
  if (!userId) return { products: [], searches: [] };

  try {
    const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    return allHistory[userId] || { products: [], searches: [] };
  } catch (e) {
    console.error('Error loading browsing history:', e);
    return { products: [], searches: [] };
  }
};

// Save browsing history for current user
const saveBrowsingHistory = (history) => {
  const userId = getUserId();
  if (!userId) return;

  try {
    const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    allHistory[userId] = history;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  } catch (e) {
    console.error('Error saving browsing history:', e);
  }
};

// Track product view
export const trackProductView = (product) => {
  const userId = getUserId();
  if (!userId || !product) return;

  try {
    const history = getBrowsingHistory();
    
    // Create product entry
    const productEntry = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0]?.src || product.image?.src || '',
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      timestamp: new Date().toISOString(),
      type: 'product'
    };

    // Remove if already exists (to move to top)
    history.products = history.products.filter(p => p.id !== product.id);
    
    // Add to beginning
    history.products.unshift(productEntry);
    
    // Limit to MAX_HISTORY_ITEMS
    if (history.products.length > MAX_HISTORY_ITEMS) {
      history.products = history.products.slice(0, MAX_HISTORY_ITEMS);
    }

    saveBrowsingHistory(history);
  } catch (e) {
    console.error('Error tracking product view:', e);
  }
};

// Track search query
export const trackSearch = (searchQuery) => {
  const userId = getUserId();
  if (!userId || !searchQuery || !searchQuery.trim()) return;

  try {
    const history = getBrowsingHistory();
    
    // Create search entry
    const searchEntry = {
      query: searchQuery.trim(),
      timestamp: new Date().toISOString(),
      type: 'search'
    };

    // Remove if already exists (to move to top)
    history.searches = history.searches.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase());
    
    // Add to beginning
    history.searches.unshift(searchEntry);
    
    // Limit to MAX_HISTORY_ITEMS
    if (history.searches.length > MAX_HISTORY_ITEMS) {
      history.searches = history.searches.slice(0, MAX_HISTORY_ITEMS);
    }

    saveBrowsingHistory(history);
  } catch (e) {
    console.error('Error tracking search:', e);
  }
};

// Clear all browsing history for current user
export const clearBrowsingHistory = () => {
  const userId = getUserId();
  if (!userId) return;

  try {
    const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    delete allHistory[userId];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  } catch (e) {
    console.error('Error clearing browsing history:', e);
  }
};

// Clear only products or searches
export const clearHistoryType = (type) => {
  const userId = getUserId();
  if (!userId) return;

  try {
    const history = getBrowsingHistory();
    if (type === 'products') {
      history.products = [];
    } else if (type === 'searches') {
      history.searches = [];
    }
    saveBrowsingHistory(history);
  } catch (e) {
    console.error('Error clearing history type:', e);
  }
};
