// FIXED VERSION - Replace getCategoryBySlugAdvanced function

export const getCategoryBySlugAdvanced = async (slug) => {
  try {
    console.log('=== Starting category fetch for slug:', slug, '===');
    
    // PRIORITY 1: Fetch ALL categories and search locally (MOST RELIABLE)
    console.log('Step 1: Fetching all categories for local search...');
    try {
      const allCategories = await getCategories();
      console.log('Total categories fetched:', allCategories?.length);
      
      if (allCategories && Array.isArray(allCategories) && allCategories.length > 0) {
        console.log('Sample slugs:', allCategories.slice(0, 5).map(c => c.slug).join(', '));
        
        // Try exact slug match
        let matchedCategory = allCategories.find(c => c.slug === slug);
        
        if (matchedCategory) {
          console.log('SUCCESS - Exact match found!');
          console.log('Category:', matchedCategory.name);
          console.log('ID:', matchedCategory.id);
          console.log('Slug:', matchedCategory.slug);
          return matchedCategory;
        }
        
        console.log('No exact match for "' + slug + '", trying partial match...');
        
        // Try partial slug match
        matchedCategory = allCategories.find(c => 
          c.slug.includes(slug) || slug.includes(c.slug)
        );
        
        if (matchedCategory) {
          console.log('SUCCESS - Partial match found:', matchedCategory.name, 'ID:', matchedCategory.id);
          return matchedCategory;
        }
        
        console.log('No partial match, trying name match...');
        
        // Try name match
        const searchName = slug.replace(/-/g, ' ').toLowerCase();
        matchedCategory = allCategories.find(c => 
          c.name.toLowerCase().includes(searchName) ||
          searchName.includes(c.name.toLowerCase())
        );
        
        if (matchedCategory) {
          console.log('SUCCESS - Name match found:', matchedCategory.name, 'ID:', matchedCategory.id);
          return matchedCategory;
        }
        
        console.log('ERROR: No category found for slug:', slug);
        console.log('Available slugs include:', allCategories.slice(0, 20).map(c => c.slug).join(', '));
      }
    } catch (searchError) {
      console.error('Error in local category search:', searchError.message);
    }
    
    console.log('=== No category found ===');
    return null;
    
  } catch (error) {
    console.error('FATAL ERROR in getCategoryBySlugAdvanced:', error);
    return null;
  }
};
