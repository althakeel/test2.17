<?php
/**
 * WordPress Custom Endpoint for Guest Checkout Auto-Registration
 * 
 * When a guest places an order, this endpoint automatically creates a WordPress account
 * so they can sign in later with Google to see their orders
 */

// Register custom REST API endpoint
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/guest-auto-register', array(
        'methods' => 'POST',
        'callback' => 'handle_guest_auto_register',
        'permission_callback' => '__return_true',
    ));
});

function handle_guest_auto_register($request) {
    $params = $request->get_json_params();
    
    // Get customer data from checkout
    $email = sanitize_email($params['email']);
    $first_name = sanitize_text_field($params['first_name']);
    $last_name = sanitize_text_field($params['last_name']);
    $phone = sanitize_text_field($params['phone_number']);
    $order_id = isset($params['order_id']) ? intval($params['order_id']) : 0;
    
    if (empty($email)) {
        return new WP_Error('missing_email', 'Email is required', array('status' => 400));
    }
    
    // Check if user already exists (cached)
    $user = get_user_by('email', $email);
    
    if ($user) {
        // User already exists, just link order
        $user_id = $user->ID;
        
        // Link this order to the existing user if order_id provided
        if ($order_id > 0) {
            $order = wc_get_order($order_id);
            if ($order && $order->get_customer_id() == 0) {
                $order->set_customer_id($user_id);
                $order->save();
            }
        }
        
        return array(
            'success' => true,
            'user_id' => $user_id,
            'email' => $email,
            'exists' => true,
            'message' => 'User already exists, order linked'
        );
    }
    
    // Create new user account automatically
    $username = sanitize_user(current(explode('@', $email)));
    
    // Generate unique username if exists
    $base_username = $username;
    $counter = 1;
    while (username_exists($username)) {
        $username = $base_username . $counter;
        $counter++;
    }
    
    // Create user with random password
    $random_password = wp_generate_password(20, true, true);
    
    $user_id = wp_create_user($username, $random_password, $email);
    
    if (is_wp_error($user_id)) {
        return new WP_Error('user_creation_failed', $user_id->get_error_message(), array('status' => 500));
    }
    
    // Update user data in one call
    $display_name = trim($first_name . ' ' . $last_name);
    if (empty($display_name)) {
        $display_name = $username;
    }
    
    wp_update_user(array(
        'ID' => $user_id,
        'display_name' => $display_name,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'role' => 'customer'
    ));
    
    // Batch update meta data
    if (!empty($phone)) {
        update_user_meta($user_id, 'billing_phone', $phone);
    }
    update_user_meta($user_id, 'guest_auto_registered', true);
    update_user_meta($user_id, 'registration_date', current_time('mysql'));
    
    $user = new WP_User($user_id);
    
    // Link current order
    if ($order_id > 0) {
        $order = wc_get_order($order_id);
        if ($order) {
            $order->set_customer_id($user_id);
            $order->save();
        }
    }
    
    // 🔥 OPTIMIZED: Batch link past orders using direct SQL
    $linked_count = 0;
    
    // Only link recent orders (last 50) for performance
    $past_orders = wc_get_orders(array(
        'billing_email' => $email,
        'customer_id' => 0,
        'limit' => 50,
        'orderby' => 'date',
        'order' => 'DESC',
        'return' => 'ids',
        'exclude' => array($order_id) // Exclude current order
    ));
    
    if (!empty($past_orders)) {
        global $wpdb;
        $order_ids = implode(',', array_map('intval', $past_orders));
        
        // Batch update post_author
        $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->prefix}posts 
            SET post_author = %d 
            WHERE ID IN ($order_ids)",
            $user_id
        ));
        
        // Batch update _customer_user meta
        $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->prefix}postmeta 
            SET meta_value = %d 
            WHERE post_id IN ($order_ids) 
            AND meta_key = '_customer_user'",
            $user_id
        ));
        
        $linked_count = count($past_orders);
    }
    
    // Optional: Send welcome email (disabled by default for performance)
    // wp_new_user_notification($user_id, null, 'user');
    
    return array(
        'success' => true,
        'user_id' => $user_id,
        'email' => $email,
        'exists' => false,
        'linked_past_orders' => $linked_count,
        'message' => 'Guest account created successfully. You can now sign in with Google to view your orders.'
    );
}
