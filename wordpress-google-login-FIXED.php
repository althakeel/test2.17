<?php
/**
 * FIXED Google Login Endpoint - Links guest orders for BOTH new AND existing users
 * Add this to your WordPress functions.php
 */

add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/google-login', array(
        'methods' => 'POST',
        'callback' => 'handle_google_login',
        'permission_callback' => '__return_true',
    ));
});

function handle_google_login($request) {
    $params = $request->get_json_params();
    
    // Get user data from Firebase
    $email = sanitize_email($params['email']);
    $name = sanitize_text_field($params['name']);
    $firebase_uid = sanitize_text_field($params['firebase_uid']);
    $photo_url = esc_url_raw($params['photo_url']);
    
    if (empty($email)) {
        return new WP_Error('missing_email', 'Email is required', array('status' => 400));
    }
    
    // Check if user already exists
    $user = get_user_by('email', $email);
    $is_new_user = false;
    
    if ($user) {
        // Existing user - minimal updates only
        $user_id = $user->ID;
        
        // Only update Firebase UID if missing or changed
        $existing_uid = get_user_meta($user_id, 'firebase_uid', true);
        if (empty($existing_uid) || $existing_uid !== $firebase_uid) {
            update_user_meta($user_id, 'firebase_uid', $firebase_uid);
        }
        
        // Only update photo if provided and different
        if (!empty($photo_url)) {
            $existing_photo = get_user_meta($user_id, 'profile_picture', true);
            if ($existing_photo !== $photo_url) {
                update_user_meta($user_id, 'profile_picture', $photo_url);
            }
        }
        
        // 🔥 FIX: Link guest orders for EXISTING users too!
        // This runs every time they log in (until orders are found and linked)
        $linked_count = link_guest_orders_immediately($user_id, $email);
        
    } else {
        // Create new user
        $is_new_user = true;
        $username = sanitize_user(current(explode('@', $email)));
        
        // Generate unique username if exists
        if (username_exists($username)) {
            $username = $username . '_' . substr(md5($email), 0, 6);
        }
        
        // Create user with random password
        $random_password = wp_generate_password(20, true, true);
        $user_id = wp_create_user($username, $random_password, $email);
        
        if (is_wp_error($user_id)) {
            return new WP_Error('user_creation_failed', $user_id->get_error_message(), array('status' => 500));
        }
        
        // Update user data
        wp_update_user(array(
            'ID' => $user_id,
            'display_name' => $name,
            'first_name' => $name,
            'role' => 'customer'
        ));
        
        // Set meta data
        update_user_meta($user_id, 'firebase_uid', $firebase_uid);
        if (!empty($photo_url)) {
            update_user_meta($user_id, 'profile_picture', $photo_url);
        }
        
        $user = new WP_User($user_id);
        
        // 🔥 Link guest orders immediately (synchronous for instant visibility)
        $linked_count = link_guest_orders_immediately($user_id, $email);
    }
    
    // Generate authentication token
    $token = '';
    if (function_exists('jwt_auth_generate_token')) {
        $token = jwt_auth_generate_token($user);
    } else {
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true);
        $token = 'wordpress_session';
    }
    
    // Get WooCommerce customer ID
    $customer_id = get_user_meta($user_id, '_woocommerce_customer_id', true);
    
    // Get saved addresses from WooCommerce
    $billing_address = array(
        'first_name' => get_user_meta($user_id, 'billing_first_name', true),
        'last_name' => get_user_meta($user_id, 'billing_last_name', true),
        'address_1' => get_user_meta($user_id, 'billing_address_1', true),
        'address_2' => get_user_meta($user_id, 'billing_address_2', true),
        'city' => get_user_meta($user_id, 'billing_city', true),
        'state' => get_user_meta($user_id, 'billing_state', true),
        'postcode' => get_user_meta($user_id, 'billing_postcode', true),
        'country' => get_user_meta($user_id, 'billing_country', true),
        'phone' => get_user_meta($user_id, 'billing_phone', true),
        'email' => get_user_meta($user_id, 'billing_email', true) ?: $email,
    );
    
    $shipping_address = array(
        'first_name' => get_user_meta($user_id, 'shipping_first_name', true),
        'last_name' => get_user_meta($user_id, 'shipping_last_name', true),
        'address_1' => get_user_meta($user_id, 'shipping_address_1', true),
        'address_2' => get_user_meta($user_id, 'shipping_address_2', true),
        'city' => get_user_meta($user_id, 'shipping_city', true),
        'state' => get_user_meta($user_id, 'shipping_state', true),
        'postcode' => get_user_meta($user_id, 'shipping_postcode', true),
        'country' => get_user_meta($user_id, 'shipping_country', true),
        'phone' => get_user_meta($user_id, 'shipping_phone', true) ?: get_user_meta($user_id, 'billing_phone', true),
    );
    
    // Get count of linked guest orders
    $linked_orders_count = get_user_meta($user_id, 'guest_orders_count', true);
    if (!$linked_orders_count) {
        $linked_orders_count = 0;
    }
    
    return array(
        'success' => true,
        'id' => $user_id,
        'user_id' => $user_id,
        'customer_id' => $customer_id,
        'name' => $name,
        'email' => $email,
        'token' => $token,
        'photo' => $photo_url,
        'is_new' => $is_new_user,
        'billing' => $billing_address,
        'shipping' => $shipping_address,
        'linked_orders' => $linked_orders_count,
        'message' => $is_new_user ? 'User created and logged in successfully' : 'User logged in successfully',
    );
}

// 🔥 OPTIMIZED: Guest order linking with performance safeguards
function link_guest_orders_immediately($user_id, $email) {
    // ⚡ SAFEGUARD 1: Check if already processed recently (once per day max)
    $last_check = get_user_meta($user_id, 'guest_orders_last_check', true);
    $current_date = date('Y-m-d');
    
    // If already checked today, skip (prevents repeated queries)
    if ($last_check === $current_date) {
        return (int) get_user_meta($user_id, 'guest_orders_count', true);
    }
    
    // ⚡ SAFEGUARD 2: Rate limiting - prevent spam
    $check_count = (int) get_transient('order_link_check_' . $user_id);
    if ($check_count > 5) {
        // Too many checks in short time, skip
        return (int) get_user_meta($user_id, 'guest_orders_count', true);
    }
    set_transient('order_link_check_' . $user_id, $check_count + 1, HOUR_IN_SECONDS);
    
    // ⚡ OPTIMIZED: Limit to 50 orders (not 100) and get IDs only first
    $guest_orders = wc_get_orders(array(
        'billing_email' => $email,
        'customer_id' => 0,
        'limit' => 50, // Reduced from 100
        'orderby' => 'date',
        'order' => 'DESC',
        'return' => 'ids' // Get IDs first (faster query)
    ));
    
    $linked_count = 0;
    
    if (!empty($guest_orders)) {
        // ⚡ Get only the first order object for address (not all orders)
        $latest_order = wc_get_order($guest_orders[0]);
        
        // Check if user already has addresses
        $has_billing = get_user_meta($user_id, 'billing_address_1', true);
        $has_shipping = get_user_meta($user_id, 'shipping_address_1', true);
        
        // ⚡ OPTIMIZED: Only copy addresses if user has none
        if (!$has_billing && $latest_order && $latest_order->get_billing_address_1()) {
            // Batch update billing address (all at once)
            $billing_meta = array(
                'billing_first_name' => $latest_order->get_billing_first_name(),
                'billing_last_name' => $latest_order->get_billing_last_name(),
                'billing_address_1' => $latest_order->get_billing_address_1(),
                'billing_address_2' => $latest_order->get_billing_address_2(),
                'billing_city' => $latest_order->get_billing_city(),
                'billing_state' => $latest_order->get_billing_state(),
                'billing_postcode' => $latest_order->get_billing_postcode(),
                'billing_country' => $latest_order->get_billing_country(),
                'billing_phone' => $latest_order->get_billing_phone(),
                'billing_email' => $latest_order->get_billing_email(),
            );
            foreach ($billing_meta as $key => $value) {
                if (!empty($value)) update_user_meta($user_id, $key, $value);
            }
        }
        
        if (!$has_shipping && $latest_order && $latest_order->get_shipping_address_1()) {
            // Batch update shipping address
            $shipping_meta = array(
                'shipping_first_name' => $latest_order->get_shipping_first_name(),
                'shipping_last_name' => $latest_order->get_shipping_last_name(),
                'shipping_address_1' => $latest_order->get_shipping_address_1(),
                'shipping_address_2' => $latest_order->get_shipping_address_2(),
                'shipping_city' => $latest_order->get_shipping_city(),
                'shipping_state' => $latest_order->get_shipping_state(),
                'shipping_postcode' => $latest_order->get_shipping_postcode(),
                'shipping_country' => $latest_order->get_shipping_country(),
                'shipping_phone' => $latest_order->get_shipping_phone(),
            );
            foreach ($shipping_meta as $key => $value) {
                if (!empty($value)) update_user_meta($user_id, $key, $value);
            }
        }
        
        // ⚡ SUPER OPTIMIZED: Use direct database query for bulk update (MUCH faster)
        global $wpdb;
        if (count($guest_orders) > 0) {
            $order_ids = implode(',', array_map('intval', $guest_orders));
            
            // Single query to update all orders at once (instead of loop)
            $updated = $wpdb->query(
                $wpdb->prepare(
                    "UPDATE {$wpdb->prefix}wc_orders 
                    SET customer_id = %d 
                    WHERE id IN ($order_ids) AND customer_id = 0",
                    $user_id
                )
            );
            
            $linked_count = $updated ? $updated : count($guest_orders);
            
            // Clear order cache
            foreach ($guest_orders as $order_id) {
                wp_cache_delete('order-' . $order_id, 'orders');
            }
        }
    }
    
    // Mark as checked today
    update_user_meta($user_id, 'guest_orders_last_check', $current_date);
    update_user_meta($user_id, 'guest_orders_count', $linked_count);
    
    // Also set the old flag for compatibility
    if ($linked_count > 0) {
        update_user_meta($user_id, 'guest_orders_linked', true);
    }
    
    return $linked_count;
}

// Background task to link guest orders (runs asynchronously - backup method)
add_action('link_guest_orders_to_user', 'link_guest_orders_to_user_callback', 10, 2);

function link_guest_orders_to_user_callback($user_id, $email) {
    // Use the same function for consistency
    link_guest_orders_immediately($user_id, $email);
}
