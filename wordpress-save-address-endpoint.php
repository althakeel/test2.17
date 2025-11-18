<?php
/**
 * WordPress Custom Endpoint for Saving User Addresses
 * 
 * Allows logged-in users to save their billing and shipping addresses
 * Add this to your theme's functions.php file
 */

// Register custom REST API endpoint
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/save-address', array(
        'methods' => 'POST',
        'callback' => 'handle_save_user_address',
        'permission_callback' => function() {
            return is_user_logged_in(); // Only logged-in users can save addresses
        },
    ));
    
    register_rest_route('custom/v1', '/get-address/(?P<user_id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'handle_get_user_address',
        'permission_callback' => '__return_true',
    ));
});

/**
 * Save user address (billing and shipping)
 */
function handle_save_user_address($request) {
    $params = $request->get_json_params();
    $user_id = get_current_user_id();
    
    if (!$user_id) {
        return new WP_Error('unauthorized', 'User not logged in', array('status' => 401));
    }
    
    // Get address data
    $billing = isset($params['billing']) ? $params['billing'] : array();
    $shipping = isset($params['shipping']) ? $params['shipping'] : array();
    
    // Validate required fields
    if (empty($billing['first_name']) || empty($billing['address_1']) || empty($billing['city'])) {
        return new WP_Error('missing_fields', 'Required fields are missing', array('status' => 400));
    }
    
    // Validate phone number for UAE
    if (!empty($billing['phone'])) {
        $phone = preg_replace('/[^0-9]/', '', $billing['phone']);
        // Check if it's a valid UAE number: starts with 971 or just the mobile number (5xxxxxxxx)
        if (strlen($phone) === 9 && substr($phone, 0, 1) === '5') {
            // Valid 9-digit number starting with 5
            $billing['phone'] = '+971' . $phone;
        } elseif (strlen($phone) === 12 && substr($phone, 0, 3) === '971' && substr($phone, 3, 1) === '5') {
            // Valid with country code 971
            $billing['phone'] = '+' . $phone;
        } else {
            return new WP_Error('invalid_phone', 'Invalid UAE phone number. Must be 9 digits starting with 5', array('status' => 400));
        }
    }
    
    // Save billing address to user meta
    if (!empty($billing)) {
        update_user_meta($user_id, 'billing_first_name', sanitize_text_field($billing['first_name']));
        update_user_meta($user_id, 'billing_last_name', sanitize_text_field($billing['last_name']));
        update_user_meta($user_id, 'billing_address_1', sanitize_text_field($billing['address_1']));
        update_user_meta($user_id, 'billing_address_2', sanitize_text_field($billing['address_2']));
        update_user_meta($user_id, 'billing_city', sanitize_text_field($billing['city']));
        update_user_meta($user_id, 'billing_state', sanitize_text_field($billing['state']));
        update_user_meta($user_id, 'billing_postcode', sanitize_text_field($billing['postcode']));
        update_user_meta($user_id, 'billing_country', sanitize_text_field($billing['country']));
        update_user_meta($user_id, 'billing_phone', sanitize_text_field($billing['phone']));
        update_user_meta($user_id, 'billing_email', sanitize_email($billing['email']));
    }
    
    // Save shipping address to user meta
    if (!empty($shipping)) {
        update_user_meta($user_id, 'shipping_first_name', sanitize_text_field($shipping['first_name']));
        update_user_meta($user_id, 'shipping_last_name', sanitize_text_field($shipping['last_name']));
        update_user_meta($user_id, 'shipping_address_1', sanitize_text_field($shipping['address_1']));
        update_user_meta($user_id, 'shipping_address_2', sanitize_text_field($shipping['address_2']));
        update_user_meta($user_id, 'shipping_city', sanitize_text_field($shipping['city']));
        update_user_meta($user_id, 'shipping_state', sanitize_text_field($shipping['state']));
        update_user_meta($user_id, 'shipping_postcode', sanitize_text_field($shipping['postcode']));
        update_user_meta($user_id, 'shipping_country', sanitize_text_field($shipping['country']));
    }
    
    // Update WooCommerce customer data if WooCommerce is active
    if (class_exists('WC_Customer')) {
        $customer = new WC_Customer($user_id);
        
        if (!empty($billing)) {
            $customer->set_billing_first_name($billing['first_name']);
            $customer->set_billing_last_name($billing['last_name']);
            $customer->set_billing_address_1($billing['address_1']);
            $customer->set_billing_address_2($billing['address_2']);
            $customer->set_billing_city($billing['city']);
            $customer->set_billing_state($billing['state']);
            $customer->set_billing_postcode($billing['postcode']);
            $customer->set_billing_country($billing['country']);
            $customer->set_billing_phone($billing['phone']);
            $customer->set_billing_email($billing['email']);
        }
        
        if (!empty($shipping)) {
            $customer->set_shipping_first_name($shipping['first_name']);
            $customer->set_shipping_last_name($shipping['last_name']);
            $customer->set_shipping_address_1($shipping['address_1']);
            $customer->set_shipping_address_2($shipping['address_2']);
            $customer->set_shipping_city($shipping['city']);
            $customer->set_shipping_state($shipping['state']);
            $customer->set_shipping_postcode($shipping['postcode']);
            $customer->set_shipping_country($shipping['country']);
        }
        
        $customer->save();
    }
    
    return array(
        'success' => true,
        'message' => 'Address saved successfully',
        'user_id' => $user_id
    );
}

/**
 * Get user address (billing and shipping)
 */
function handle_get_user_address($data) {
    $user_id = intval($data['user_id']);
    
    if (!$user_id) {
        return new WP_Error('invalid_user', 'Invalid user ID', array('status' => 400));
    }
    
    // Get billing address
    $billing = array(
        'first_name' => get_user_meta($user_id, 'billing_first_name', true),
        'last_name' => get_user_meta($user_id, 'billing_last_name', true),
        'address_1' => get_user_meta($user_id, 'billing_address_1', true),
        'address_2' => get_user_meta($user_id, 'billing_address_2', true),
        'city' => get_user_meta($user_id, 'billing_city', true),
        'state' => get_user_meta($user_id, 'billing_state', true),
        'postcode' => get_user_meta($user_id, 'billing_postcode', true),
        'country' => get_user_meta($user_id, 'billing_country', true),
        'phone' => get_user_meta($user_id, 'billing_phone', true),
        'email' => get_user_meta($user_id, 'billing_email', true),
        'type' => 'Billing'
    );
    
    // Get shipping address
    $shipping = array(
        'first_name' => get_user_meta($user_id, 'shipping_first_name', true),
        'last_name' => get_user_meta($user_id, 'shipping_last_name', true),
        'address_1' => get_user_meta($user_id, 'shipping_address_1', true),
        'address_2' => get_user_meta($user_id, 'shipping_address_2', true),
        'city' => get_user_meta($user_id, 'shipping_city', true),
        'state' => get_user_meta($user_id, 'shipping_state', true),
        'postcode' => get_user_meta($user_id, 'shipping_postcode', true),
        'country' => get_user_meta($user_id, 'shipping_country', true),
        'type' => 'Shipping'
    );
    
    return array(
        'success' => true,
        'billing' => $billing,
        'shipping' => $shipping
    );
}

// CORS headers for frontend
add_action('init', function () {
    $allowed_origins = [
        'http://localhost:3000',
        'https://store1920.com',
        'https://www.store1920.com',
        'https://store1920-1208.vercel.app',
        'https://store1920-15.vercel.app',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit;
    }
}, 999);

/**
 * Display user addresses in WordPress admin user profile
 */
add_action('show_user_profile', 'display_user_addresses_in_admin');
add_action('edit_user_profile', 'display_user_addresses_in_admin');

function display_user_addresses_in_admin($user) {
    $billing_address = array(
        'First Name' => get_user_meta($user->ID, 'billing_first_name', true),
        'Last Name' => get_user_meta($user->ID, 'billing_last_name', true),
        'Address 1' => get_user_meta($user->ID, 'billing_address_1', true),
        'Address 2' => get_user_meta($user->ID, 'billing_address_2', true),
        'City' => get_user_meta($user->ID, 'billing_city', true),
        'State' => get_user_meta($user->ID, 'billing_state', true),
        'Postcode' => get_user_meta($user->ID, 'billing_postcode', true),
        'Country' => get_user_meta($user->ID, 'billing_country', true),
        'Phone' => get_user_meta($user->ID, 'billing_phone', true),
        'Email' => get_user_meta($user->ID, 'billing_email', true),
    );
    
    $shipping_address = array(
        'First Name' => get_user_meta($user->ID, 'shipping_first_name', true),
        'Last Name' => get_user_meta($user->ID, 'shipping_last_name', true),
        'Address 1' => get_user_meta($user->ID, 'shipping_address_1', true),
        'Address 2' => get_user_meta($user->ID, 'shipping_address_2', true),
        'City' => get_user_meta($user->ID, 'shipping_city', true),
        'State' => get_user_meta($user->ID, 'shipping_state', true),
        'Postcode' => get_user_meta($user->ID, 'shipping_postcode', true),
        'Country' => get_user_meta($user->ID, 'shipping_country', true),
    );
    ?>
    <h3>Saved Addresses</h3>
    <table class="form-table">
        <tr>
            <th colspan="2"><strong>Billing Address</strong></th>
        </tr>
        <?php foreach ($billing_address as $label => $value): ?>
            <?php if (!empty($value)): ?>
                <tr>
                    <th><label><?php echo esc_html($label); ?></label></th>
                    <td><input type="text" value="<?php echo esc_attr($value); ?>" class="regular-text" readonly /></td>
                </tr>
            <?php endif; ?>
        <?php endforeach; ?>
        
        <tr>
            <th colspan="2"><strong>Shipping Address</strong></th>
        </tr>
        <?php foreach ($shipping_address as $label => $value): ?>
            <?php if (!empty($value)): ?>
                <tr>
                    <th><label><?php echo esc_html($label); ?></label></th>
                    <td><input type="text" value="<?php echo esc_attr($value); ?>" class="regular-text" readonly /></td>
                </tr>
            <?php endif; ?>
        <?php endforeach; ?>
    </table>
    <?php
}
