<?php
/**
 * Plugin Name: Simple Register (No OTP)
 * Plugin URI: https://store1920.com
 * Description: Registration endpoint without OTP verification for Store1920
 * Version: 1.0.0
 * Author: Store1920
 * Author URI: https://store1920.com
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/register-no-otp', array(
        'methods' => 'POST',
        'callback' => 'handle_simple_register',
        'permission_callback' => '__return_true',
    ));
});

function handle_simple_register($request) {
    $params = $request->get_json_params();
    
    // Get registration data
    $name = sanitize_text_field($params['name']);
    $email = sanitize_email($params['email']);
    $password = $params['password']; // Don't sanitize password
    $phone = sanitize_text_field($params['phone']);
    
    // Validation
    if (empty($email)) {
        return new WP_Error('missing_email', 'Email is required', array('status' => 400));
    }
    
    if (empty($password)) {
        return new WP_Error('missing_password', 'Password is required', array('status' => 400));
    }
    
    if (!is_email($email)) {
        return new WP_Error('invalid_email', 'Invalid email format', array('status' => 400));
    }
    
    // Check if email already exists
    if (email_exists($email)) {
        return new WP_Error('email_exists', 'An account with this email already exists', array('status' => 400));
    }
    
    // Create username from email
    $username = sanitize_user(current(explode('@', $email)));
    
    // Make username unique if it exists
    $base_username = $username;
    $counter = 1;
    while (username_exists($username)) {
        $username = $base_username . $counter;
        $counter++;
    }
    
    // Create the user
    $user_id = wp_create_user($username, $password, $email);
    
    if (is_wp_error($user_id)) {
        return new WP_Error('registration_failed', $user_id->get_error_message(), array('status' => 500));
    }
    
    // Parse name into first and last
    $name_parts = explode(' ', trim($name), 2);
    $first_name = $name_parts[0];
    $last_name = isset($name_parts[1]) ? $name_parts[1] : '';
    
    // Update user data
    wp_update_user(array(
        'ID' => $user_id,
        'display_name' => $name,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'role' => 'customer'
    ));
    
    // Add phone number to user meta
    if (!empty($phone)) {
        update_user_meta($user_id, 'billing_phone', $phone);
        update_user_meta($user_id, 'shipping_phone', $phone);
    }
    
    // Add billing/shipping info
    update_user_meta($user_id, 'billing_first_name', $first_name);
    update_user_meta($user_id, 'billing_last_name', $last_name);
    update_user_meta($user_id, 'billing_email', $email);
    
    update_user_meta($user_id, 'shipping_first_name', $first_name);
    update_user_meta($user_id, 'shipping_last_name', $last_name);
    
    // Mark as registered (not guest)
    update_user_meta($user_id, 'registration_date', current_time('mysql'));
    update_user_meta($user_id, 'registration_method', 'form');
    
    // Return success response
    return array(
        'success' => true,
        'message' => 'Registration successful',
        'user_id' => $user_id,
        'id' => $user_id,
        'email' => $email,
        'name' => $name,
        'username' => $username
    );
}

// =====================================================
// CUSTOM LOGIN ENDPOINT (BYPASS OTP)
// =====================================================
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/login-no-otp', array(
        'methods' => 'POST',
        'callback' => 'handle_simple_login',
        'permission_callback' => '__return_true',
    ));
});

function handle_simple_login($request) {
    $params = $request->get_json_params();
    
    $username = sanitize_text_field($params['username']); // Can be email or username
    $password = $params['password'];
    
    if (empty($username) || empty($password)) {
        return new WP_Error('missing_credentials', 'Username and password are required', array('status' => 400));
    }
    
    // Try to authenticate
    $user = wp_authenticate($username, $password);
    
    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Invalid username or password', array('status' => 401));
    }
    
    // Generate JWT token manually
    require_once ABSPATH . 'wp-includes/class-phpass.php';
    
    $secret_key = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : 'your-secret-key';
    $issued_at = time();
    $not_before = $issued_at;
    $expire = $issued_at + (DAY_IN_SECONDS * 7); // 7 days
    
    $token_data = array(
        'iss' => get_bloginfo('url'),
        'iat' => $issued_at,
        'nbf' => $not_before,
        'exp' => $expire,
        'data' => array(
            'user' => array(
                'id' => $user->ID
            )
        )
    );
    
    // Simple JWT creation (or use existing JWT plugin if available)
    $token = base64_encode(json_encode($token_data));
    
    // Get user data
    $user_data = array(
        'token' => $token,
        'user_id' => $user->ID,
        'id' => $user->ID,
        'user_email' => $user->user_email,
        'user_nicename' => $user->user_nicename,
        'user_display_name' => $user->display_name,
    );
    
    return new WP_REST_Response($user_data, 200);
}
