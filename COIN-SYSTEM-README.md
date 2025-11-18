# Store1920 Coin Rewards System

## Overview
Complete coin rewards system for Store1920 e-commerce platform with automatic registration bonuses, purchase rewards, and checkout redemption.

---

## Features

✅ **100 Free Coins** - New user registration bonus  
✅ **5 Coins per 100 AED** - Earn coins on completed orders  
✅ **10 Coins = 1 AED** - Redeem coins at checkout for instant discount  
✅ **Refund Credits** - COD refunds automatically convert to coins  
✅ **REST API Endpoints** - Full API support for frontend integration  
✅ **Admin Dashboard** - View and manage user coins in WordPress admin  

---

## Installation

### 1. Install WordPress Plugin

Upload `wordpress-coin-rewards-plugin.php` to your WordPress installation:

```
/wp-content/plugins/store1920-coin-rewards/wordpress-coin-rewards-plugin.php
```

Or add it to your theme's `functions.php`:

```php
require_once get_template_directory() . '/wordpress-coin-rewards-plugin.php';
```

### 2. Activate Plugin

Go to **WordPress Admin → Plugins** and activate "Store1920 Coin Rewards"

The plugin will automatically create the `wp_user_coins` table with:
- `user_id` (Primary Key)
- `coins` (Integer, default: 0)
- `updated_at` (Timestamp)

---

## How It Works

### 🎉 New User Registration
- Every new user automatically receives **100 coins** upon account creation
- Coins are awarded via `user_register` WordPress hook
- Works with both manual registration and guest auto-registration

### 💰 Order Completion Rewards
- Users earn **5 coins for every 100 AED spent**
- Coins are awarded when order status changes to "Completed"
- Formula: `coins = floor(order_total / 100) * 5`
- Example: 250 AED order = 10 coins

### 🔄 Refund Credits (COD Only)
- COD refunds are converted to coins: **10 coins = 1 AED**
- Example: 50 AED refund = 500 coins
- Coins are automatically added to user account
- Only applies to Cash on Delivery orders

### 🛒 Checkout Redemption
- Minimum redemption: **10 coins**
- Conversion rate: **10 coins = 1 AED discount**
- Users can redeem any amount (multiples of 10)
- Coins are deducted immediately upon redemption
- One redemption per checkout session

---

## API Endpoints

### 1. Get User Coins (Public)
```http
GET /wp-json/custom/v1/coins/{user_id}
```

**Response:**
```json
{
  "coins": 150
}
```

### 2. Get My Coins (Authenticated)
```http
GET /wp-json/custom/v1/my-coins
```

**Headers:**
```
Cookie: wordpress_logged_in_xxxxx
```

**Response:**
```json
{
  "coins": 150
}
```

### 3. Redeem Coins
```http
POST /wp-json/custom/v1/redeem-coins
```

**Request Body:**
```json
{
  "user_id": 123,
  "coins": 50
}
```

**Response (Success):**
```json
{
  "success": true,
  "coins_redeemed": 50,
  "discount_aed": 5.0,
  "new_balance": 100,
  "message": "Successfully redeemed 50 coins for AED 5.0 discount"
}
```

**Response (Error - Insufficient Coins):**
```json
{
  "code": "insufficient_coins",
  "message": "Insufficient coin balance",
  "data": {
    "status": 400
  }
}
```

**Response (Error - Minimum Not Met):**
```json
{
  "code": "minimum_coins",
  "message": "Minimum 10 coins required to redeem",
  "data": {
    "status": 400
  }
}
```

---

## Frontend Integration

### React Component: CoinWidget

Displays user coin balance in navbar/topbar:

```jsx
import CoinWidget from './components/CoinWidget';

<CoinWidget user={user} userId={userId} />
```

**Props:**
- `user` - User object from AuthContext
- `userId` - User ID (optional, falls back to user.id)
- `useMyCoins` - Boolean, if true uses `/my-coins` endpoint

### React Component: CoinBalance (Checkout)

Allows users to redeem coins at checkout:

```jsx
import CoinBalance from './components/sub/account/CoinBalace';

<CoinBalance 
  onCoinRedeem={(data) => {
    console.log('Redeemed:', data.coinsUsed);
    console.log('Discount:', data.discountAED);
    setCoinDiscount(data.discountAED);
  }} 
/>
```

**Callback Data:**
```javascript
{
  coinsUsed: 50,      // Number of coins redeemed
  discountAED: 5.0    // Discount amount in AED
}
```

---

## Admin Features

### User List - Coins Column
Navigate to **Users → All Users** to see coin balance column for each user.

### User Profile - Coin Balance
Edit any user profile to view their current coin balance (read-only field).

### Database Direct Access
Query coin balances directly:

```sql
SELECT user_id, coins, updated_at 
FROM wp_user_coins 
ORDER BY coins DESC 
LIMIT 10;
```

---

## Validation Rules

### Redemption Validation
1. ✅ Minimum 10 coins required
2. ✅ User must have sufficient balance
3. ✅ Only one redemption per checkout session
4. ✅ Coins must be positive integer

### Security
1. ✅ User ID validation
2. ✅ CORS protection (whitelist domains)
3. ✅ SQL injection prevention (prepared statements)
4. ✅ XSS protection (input sanitization)

---

## CORS Configuration

The plugin includes CORS headers for these domains:

```php
$allowed_origins = [
    'http://localhost:3000',
    'https://store1920.com',
    'https://www.store1920.com',
    'https://store1920-1208.vercel.app',
    'https://store1920-15.vercel.app',
];
```

To add more domains, edit `wordpress-coin-rewards-plugin.php` line 230.

---

## Database Schema

### Table: `wp_user_coins`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | BIGINT UNSIGNED | WordPress user ID (Primary Key) |
| `coins` | INT | Current coin balance |
| `updated_at` | DATETIME | Last update timestamp |

### Indexes
- Primary Key: `user_id`
- Auto-update timestamp on coin changes

---

## Testing Checklist

### ✅ Registration Bonus
1. Create new user account
2. Check database: `SELECT coins FROM wp_user_coins WHERE user_id = X`
3. Verify 100 coins awarded

### ✅ Order Completion
1. Place order worth 250 AED
2. Change order status to "Completed"
3. Check user coins increased by 10 (floor(250/100) * 5)

### ✅ Checkout Redemption
1. Navigate to checkout page
2. Enter 50 coins in redemption field
3. Click "Redeem"
4. Verify:
   - Toast shows success message
   - Coin discount appears: -AED 5.00
   - Total price reduced by 5 AED
   - New balance shown in widget

### ✅ Refund Credits (COD)
1. Complete COD order
2. Create refund of 30 AED
3. Check coins increased by 300 (30 * 10)

### ✅ API Endpoints
```bash
# Get coins by user ID
curl https://db.store1920.com/wp-json/custom/v1/coins/123

# Get my coins (authenticated)
curl https://db.store1920.com/wp-json/custom/v1/my-coins \
  -H "Cookie: wordpress_logged_in_xxxxx"

# Redeem coins
curl -X POST https://db.store1920.com/wp-json/custom/v1/redeem-coins \
  -H "Content-Type: application/json" \
  -d '{"user_id": 123, "coins": 50}'
```

---

## Troubleshooting

### Issue: Coins not showing in checkout
**Solution:** 
- Check if user is logged in
- Verify `CoinBalance` component is imported
- Check browser console for API errors

### Issue: Redemption fails
**Solution:**
- Ensure user has minimum 10 coins
- Check user_id is passed correctly
- Verify WordPress REST API is accessible

### Issue: New users not getting 100 coins
**Solution:**
- Check if plugin is activated
- Verify `wp_user_coins` table exists
- Test user_register hook: `do_action('user_register', $user_id)`

### Issue: CORS errors
**Solution:**
- Add your domain to `$allowed_origins` array
- Clear browser cache
- Check WordPress REST API is enabled

---

## File Structure

```
project/
├── wordpress-coin-rewards-plugin.php        # WordPress plugin
├── src/
│   ├── components/
│   │   ├── CoinWidget.jsx                   # Navbar coin display
│   │   └── sub/account/CoinBalace.jsx       # Checkout redemption
│   ├── pages/
│   │   ├── my-coins.jsx                     # Coin balance page
│   │   └── OrderSuccess.jsx                 # Order confirmation
│   └── contexts/
│       └── AuthContext.jsx                   # User authentication
└── COIN-SYSTEM-README.md                    # This file
```

---

## Support

For issues or questions:
- Email: support@store1920.com
- Developer: rohith

---

## Version History

### v1.1 (Current)
- ✅ Added redeem-coins endpoint
- ✅ Fixed order success page (removed # and S prefix)
- ✅ Integrated coin redemption in checkout
- ✅ Added comprehensive documentation

### v1.0
- ✅ Initial release
- ✅ Registration bonus (100 coins)
- ✅ Order completion rewards (5 coins per 100 AED)
- ✅ COD refund credits (10 coins = 1 AED)
- ✅ Admin dashboard integration
- ✅ Basic API endpoints

---

## Future Enhancements

🔜 **Coin Expiry** - Auto-expire coins after 1 year  
🔜 **Referral Bonus** - Earn coins for referring friends  
🔜 **Daily Login Rewards** - 5 coins per day  
🔜 **Review Rewards** - 10 coins per product review  
🔜 **Birthday Bonus** - 50 coins on user's birthday  
🔜 **Tier System** - Bronze/Silver/Gold based on coins earned  

---

**Last Updated:** November 18, 2025  
**Plugin Version:** 1.1  
**WordPress Compatibility:** 5.0+  
**WooCommerce Compatibility:** 3.0+
