<?php
/**
 * WordPress Custom Endpoint for Google Login
 * 
 * Add this code to your theme's functions.php or create a custom plugin
 * This endpoint receives user data from Firebase Google Sign-In and creates/syncs WooCommerce customer
 */

// Register custom REST API endpoint
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/google-login', array(
        'methods' => 'POST',
        'callback' => 'handle_google_login',
        'permission_callback' => '__return_true', // Allow public access
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
    
    if ($user) {
        // User exists - update Firebase UID if needed
        $user_id = $user->ID;
        update_user_meta($user_id, 'firebase_uid', $firebase_uid);
        if ($photo_url) {
            update_user_meta($user_id, 'profile_picture', $photo_url);
        }
    } else {
        // Create new user
        $username = sanitize_user(current(explode('@', $email)));
        
        // Generate unique username if exists
        $base_username = $username;
        $counter = 1;
        while (username_exists($username)) {
            $username = $base_username . $counter;
            $counter++;
        }
        
        // Create user with random password (they'll use Google Sign-In)
        $random_password = wp_generate_password(20, true, true);
        
        $user_id = wp_create_user($username, $random_password, $email);
        
        if (is_wp_error($user_id)) {
            return new WP_Error('user_creation_failed', $user_id->get_error_message(), array('status' => 500));
        }
        
        // Update user meta
        wp_update_user(array(
            'ID' => $user_id,
            'display_name' => $name,
            'first_name' => $name,
        ));
        
        update_user_meta($user_id, 'firebase_uid', $firebase_uid);
        if ($photo_url) {
            update_user_meta($user_id, 'profile_picture', $photo_url);
        }
        
        // Make them a customer role
        $user = new WP_User($user_id);
        $user->set_role('customer');
    }
    
    // Generate JWT token (requires JWT Authentication plugin)
    // Install: https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
    $token = '';
    if (function_exists('jwt_auth_generate_token')) {
        $token = jwt_auth_generate_token($user);
    } else {
        // Fallback: use WordPress auth cookie
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true);
        $token = 'wordpress_session'; // You should implement proper JWT
    }
    
    // Get WooCommerce customer ID if exists
    $customer_id = get_user_meta($user_id, '_woocommerce_customer_id', true);
    
    // 🔥 LINK PAST GUEST ORDERS TO THIS USER
    // Find all orders with this email that have no user_id assigned
    $guest_orders = wc_get_orders(array(
        'billing_email' => $email,
        'customer_id' => 0, // Only guest orders
        'limit' => -1,
        'return' => 'ids'
    ));
    
    $linked_count = 0;
    if (!empty($guest_orders)) {
        foreach ($guest_orders as $order_id) {
            $order = wc_get_order($order_id);
            if ($order) {
                $order->set_customer_id($user_id);
                $order->save();
                $linked_count++;
            }
        }
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
        'linked_orders' => $linked_count,
        'message' => $user ? 'User logged in successfully' : 'User created and logged in successfully',
    );
}
