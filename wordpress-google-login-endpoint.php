<?php
/**
 * WordPress Custom Endpoint for Google Login (OPTIMIZED)
 * 
 * Add this code to your theme's functions.php or create a custom plugin
 * This endpoint receives user data from Firebase Google Sign-In and creates/syncs WooCommerce customer
 */

// Register custom REST API endpoint
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
        link_guest_orders_immediately($user_id, $email);
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

// 🔥 IMMEDIATE guest order linking (for instant visibility)
function link_guest_orders_immediately($user_id, $email) {
    // Check if already processed
    $already_linked = get_user_meta($user_id, 'guest_orders_linked', true);
    if ($already_linked) {
        return 0;
    }
    
    // Find guest orders with this email (limited to recent 100 for performance)
    $guest_orders = wc_get_orders(array(
        'billing_email' => $email,
        'customer_id' => 0,
        'limit' => 100,
        'orderby' => 'date',
        'order' => 'DESC'
    ));
    
    $linked_count = 0;
    
    if (!empty($guest_orders)) {
        // Get the most recent order to copy address from
        $latest_order = $guest_orders[0];
        
        // Copy billing address from latest order to user meta (if not already set)
        if (!get_user_meta($user_id, 'billing_address_1', true) && $latest_order->get_billing_address_1()) {
            update_user_meta($user_id, 'billing_first_name', $latest_order->get_billing_first_name());
            update_user_meta($user_id, 'billing_last_name', $latest_order->get_billing_last_name());
            update_user_meta($user_id, 'billing_address_1', $latest_order->get_billing_address_1());
            update_user_meta($user_id, 'billing_address_2', $latest_order->get_billing_address_2());
            update_user_meta($user_id, 'billing_city', $latest_order->get_billing_city());
            update_user_meta($user_id, 'billing_state', $latest_order->get_billing_state());
            update_user_meta($user_id, 'billing_postcode', $latest_order->get_billing_postcode());
            update_user_meta($user_id, 'billing_country', $latest_order->get_billing_country());
            update_user_meta($user_id, 'billing_phone', $latest_order->get_billing_phone());
            update_user_meta($user_id, 'billing_email', $latest_order->get_billing_email());
        }
        
        // Copy shipping address from latest order to user meta (if not already set)
        if (!get_user_meta($user_id, 'shipping_address_1', true) && $latest_order->get_shipping_address_1()) {
            update_user_meta($user_id, 'shipping_first_name', $latest_order->get_shipping_first_name());
            update_user_meta($user_id, 'shipping_last_name', $latest_order->get_shipping_last_name());
            update_user_meta($user_id, 'shipping_address_1', $latest_order->get_shipping_address_1());
            update_user_meta($user_id, 'shipping_address_2', $latest_order->get_shipping_address_2());
            update_user_meta($user_id, 'shipping_city', $latest_order->get_shipping_city());
            update_user_meta($user_id, 'shipping_state', $latest_order->get_shipping_state());
            update_user_meta($user_id, 'shipping_postcode', $latest_order->get_shipping_postcode());
            update_user_meta($user_id, 'shipping_country', $latest_order->get_shipping_country());
            update_user_meta($user_id, 'shipping_phone', $latest_order->get_shipping_phone());
        }
        
        // Link all orders to user account
        foreach ($guest_orders as $order) {
            $order->set_customer_id($user_id);
            $order->save();
            $linked_count++;
        }
    }
    
    // Mark as processed
    update_user_meta($user_id, 'guest_orders_linked', true);
    update_user_meta($user_id, 'guest_orders_count', $linked_count);
    
    return $linked_count;
}

// Background task to link guest orders (runs asynchronously - backup method)
add_action('link_guest_orders_to_user', 'link_guest_orders_to_user_callback', 10, 2);

function link_guest_orders_to_user_callback($user_id, $email) {
    // Check if already processed
    $already_linked = get_user_meta($user_id, 'guest_orders_linked', true);
    if ($already_linked) {
        return;
    }
    
    // Find guest orders with this email
    $guest_orders = wc_get_orders(array(
        'billing_email' => $email,
        'customer_id' => 0,
        'limit' => 100,
        'orderby' => 'date',
        'order' => 'DESC'
    ));
    
    if (!empty($guest_orders)) {
        // Get the most recent order to copy address from
        $latest_order = $guest_orders[0];
        
        // Copy billing address from latest order to user meta (if not already set)
        if (!get_user_meta($user_id, 'billing_address_1', true) && $latest_order->get_billing_address_1()) {
            update_user_meta($user_id, 'billing_first_name', $latest_order->get_billing_first_name());
            update_user_meta($user_id, 'billing_last_name', $latest_order->get_billing_last_name());
            update_user_meta($user_id, 'billing_address_1', $latest_order->get_billing_address_1());
            update_user_meta($user_id, 'billing_address_2', $latest_order->get_billing_address_2());
            update_user_meta($user_id, 'billing_city', $latest_order->get_billing_city());
            update_user_meta($user_id, 'billing_state', $latest_order->get_billing_state());
            update_user_meta($user_id, 'billing_postcode', $latest_order->get_billing_postcode());
            update_user_meta($user_id, 'billing_country', $latest_order->get_billing_country());
            update_user_meta($user_id, 'billing_phone', $latest_order->get_billing_phone());
            update_user_meta($user_id, 'billing_email', $latest_order->get_billing_email());
        }
        
        // Copy shipping address from latest order to user meta (if not already set)
        if (!get_user_meta($user_id, 'shipping_address_1', true) && $latest_order->get_shipping_address_1()) {
            update_user_meta($user_id, 'shipping_first_name', $latest_order->get_shipping_first_name());
            update_user_meta($user_id, 'shipping_last_name', $latest_order->get_shipping_last_name());
            update_user_meta($user_id, 'shipping_address_1', $latest_order->get_shipping_address_1());
            update_user_meta($user_id, 'shipping_address_2', $latest_order->get_shipping_address_2());
            update_user_meta($user_id, 'shipping_city', $latest_order->get_shipping_city());
            update_user_meta($user_id, 'shipping_state', $latest_order->get_shipping_state());
            update_user_meta($user_id, 'shipping_postcode', $latest_order->get_shipping_postcode());
            update_user_meta($user_id, 'shipping_country', $latest_order->get_shipping_country());
            update_user_meta($user_id, 'shipping_phone', $latest_order->get_shipping_phone());
        }
        
        // Link all orders to user account
        foreach ($guest_orders as $order) {
            $order->set_customer_id($user_id);
            $order->save();
        }
    }
    
    // Mark as processed
    update_user_meta($user_id, 'guest_orders_linked', true);
}
