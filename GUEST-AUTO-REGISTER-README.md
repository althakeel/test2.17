# Guest Checkout Auto-Registration & Order Linking System

## Overview
This system allows customers to place orders as guests, then automatically creates WordPress accounts for them. When they later sign in with Google, they can see all their past orders - even ones placed as a guest.

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GUEST CHECKOUT FLOW                       │
└─────────────────────────────────────────────────────────────┘

Customer (No Account)
      │
      ├──► Places Order as Guest
      │
      ├──► Order Created in WooCommerce (customer_id = 0)
      │
      ├──► Auto-Registration Triggered 🔥
      │    • Creates WordPress Account (email, name, phone)
      │    • Links Current Order to Account
      │    • Links ALL Past Guest Orders (same email)
      │
      └──► Order Success Page


┌─────────────────────────────────────────────────────────────┐
│                  GOOGLE SIGN-IN FLOW                         │
└─────────────────────────────────────────────────────────────┘

Customer Returns
      │
      ├──► Clicks "Sign in with Google"
      │
      ├──► Firebase Authentication
      │
      ├──► WordPress Backend Check:
      │    • Account Exists? → Update Firebase UID + Link Orders
      │    • New User? → Create Account + Link Guest Orders
      │
      └──► User Profile Shows ALL Orders 🎉
           (Current + Past Guest Orders)


┌─────────────────────────────────────────────────────────────┐
│                    ORDER LINKING LOGIC                       │
└─────────────────────────────────────────────────────────────┘

When?                          What Happens?
────────────────────────────────────────────────────
✅ Guest Checkout             → Auto-create account
                              → Link this order
                              → Link past orders (same email)

✅ Google Sign-In (Existing)  → Update user info
                              → Link guest orders

✅ Google Sign-In (New)       → Create account
                              → Link guest orders
```

## How It Works

### 1. **Guest Checkout Flow**
When a guest customer places an order:
- Order is created normally in WooCommerce
- After order creation, the system automatically calls `/wp-json/custom/v1/guest-auto-register`
- A WordPress account is created using their shipping details (email, name, phone)
- The order is immediately linked to this new account
- **Any past guest orders** with the same email are also linked

### 2. **Google Sign-In Flow**
When a customer signs in with Google:
- Firebase authenticates the user
- Frontend sends user data to `/wp-json/custom/v1/google-login`
- If account exists: Updates Firebase UID and links any guest orders
- If new account: Creates WordPress account and links guest orders
- User can now see all orders (current + past guest orders) in their profile

### 3. **Order Linking Logic**
Orders are automatically linked when:
- ✅ Guest checkout completes → Auto-register + link order
- ✅ Google Sign-In with existing email → Link all guest orders to user
- ✅ New Google Sign-In → Create account + link guest orders

## Files Involved

### WordPress Backend (PHP)
1. **`wordpress-google-login-endpoint.php`**
   - Endpoint: `/wp-json/custom/v1/google-login`
   - Handles Google Sign-In authentication
   - Creates or updates WordPress users
   - Links past guest orders to user account

2. **`wordpress-guest-auto-register-endpoint.php`** ⭐ NEW
   - Endpoint: `/wp-json/custom/v1/guest-auto-register`
   - Auto-creates WordPress account for guest checkout
   - Links current and past orders to the new account
   - Runs silently in background (doesn't interrupt checkout)

### Frontend (React)
1. **`src/components/sub/GoogleSignInButton.jsx`**
   - Handles Firebase Google authentication
   - Sends user data to WordPress backend
   - Shows success message if orders were linked

2. **`src/components/CheckoutRight.jsx`**
   - Handles order placement
   - Calls `autoRegisterGuest()` after order is created
   - Runs in background (doesn't block checkout flow)

## Installation

### Step 1: Add WordPress Endpoints
Add both PHP files to your WordPress theme's `functions.php` or create a custom plugin:

```php
// In your theme's functions.php
require_once get_template_directory() . '/wordpress-google-login-endpoint.php';
require_once get_template_directory() . '/wordpress-guest-auto-register-endpoint.php';
```

### Step 2: Test the Flow

**Test Guest Checkout:**
1. Place an order as a guest (use a test email like `test@example.com`)
2. Check WordPress admin → Users → Should see new user created
3. Check WooCommerce → Orders → Order should be assigned to the new user

**Test Google Sign-In:**
1. Sign in with Google using the same email
2. Check profile/orders page → Should see the guest order linked

## API Endpoints

### `/wp-json/custom/v1/google-login` (POST)
**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "firebase_uid": "abc123...",
  "photo_url": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "user_id": 123,
  "email": "user@example.com",
  "token": "jwt_token_here",
  "linked_orders": 3,
  "message": "User logged in successfully"
}
```

### `/wp-json/custom/v1/guest-auto-register` (POST)
**Request:**
```json
{
  "email": "guest@example.com",
  "first_name": "Guest",
  "last_name": "User",
  "phone_number": "+971501234567",
  "order_id": 456
}
```

**Response:**
```json
{
  "success": true,
  "user_id": 124,
  "email": "guest@example.com",
  "exists": false,
  "linked_past_orders": 2,
  "message": "Guest account created successfully"
}
```

## Benefits

✅ **Seamless Experience**: Guests don't need to register to checkout
✅ **Order History**: All orders are preserved and accessible after sign-in
✅ **No Duplicate Accounts**: System checks for existing emails before creating accounts
✅ **Google Sign-In Ready**: Users can sign in with Google to access their orders
✅ **Automatic Linking**: Past guest orders are automatically linked when they sign in

## Security Notes

- Passwords are randomly generated and secure (20+ characters)
- Users can reset password or use Google Sign-In
- Email validation prevents duplicate accounts
- Guest-registered accounts are marked with `guest_auto_registered` meta
- All guest orders with matching email are linked (not just current order)

## Troubleshooting

**User not seeing orders:**
- Check if order has `customer_id` set in WooCommerce
- Verify email matches exactly between order and user account
- Check WordPress admin → Users → User meta for `guest_auto_registered`

**Duplicate accounts created:**
- Check WordPress logs for errors
- Verify email sanitization is working
- Test with lowercase/uppercase email variations

**Orders not linking:**
- Verify WooCommerce is active and `wc_get_orders()` works
- Check order billing email matches user email exactly
- Look for errors in browser console or WordPress debug log

## Future Enhancements

- [ ] Send welcome email when guest account is created
- [ ] Add notification badge showing linked orders count
- [ ] Create admin dashboard to view guest-registered users
- [ ] Add option to merge multiple accounts with same email
- [ ] Track registration source (guest checkout vs Google Sign-In)
