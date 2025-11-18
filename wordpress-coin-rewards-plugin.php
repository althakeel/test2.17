<?php
/**
 * Plugin Name: Store1920 Coin Rewards
 * Description: Adds coin-based rewards: 100 coins on registration, 5 coins per 100 AED spent, and REST API access to coin balance.
 * Version: 1.1
 * Author: rohith
 */

if (!defined('ABSPATH')) exit;

/**
 * Plugin Activation: Create user_coins table
 */
register_activation_hook(__FILE__, 'store1920_coin_rewards_activate');
function store1920_coin_rewards_activate() {
    global $wpdb;
    $table = $wpdb->prefix . 'user_coins';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table (
        user_id BIGINT UNSIGNED NOT NULL,
        coins INT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

/**
 * Add 100 welcome coins on user registration
 */
add_action('user_register', 'store1920_add_welcome_coins');
function store1920_add_welcome_coins($user_id) {
    global $wpdb;
    $table = $wpdb->prefix . 'user_coins';

    // Insert initial coins or ignore if exists
    $wpdb->query($wpdb->prepare(
        "INSERT INTO $table (user_id, coins) VALUES (%d, %d) ON DUPLICATE KEY UPDATE user_id=user_id",
        $user_id, 100
    ));
}

/**
 * Award coins on completed order (5 coins per 100 AED)
 */
add_action('woocommerce_order_status_completed', 'store1920_award_order_coins');
function store1920_award_order_coins($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;

    $user_id = $order->get_user_id();
    if (!$user_id) return;

    $order_total = $order->get_total();
    $coins_to_add = floor($order_total / 100) * 5;

    if ($coins_to_add > 0) {
        global $wpdb;
        $table = $wpdb->prefix . 'user_coins';

        $wpdb->query($wpdb->prepare(
            "INSERT INTO $table (user_id, coins) VALUES (%d, %d)
             ON DUPLICATE KEY UPDATE coins = coins + %d, updated_at = NOW()",
            $user_id, $coins_to_add, $coins_to_add
        ));
    }
}

/**
 * Register REST API endpoints
 */
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/coins/(?P<user_id>\d+)', [
        'methods'  => 'GET',
        'callback' => 'store1920_api_get_user_coins',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('custom/v1', '/my-coins', [
        'methods'  => 'GET',
        'callback' => 'store1920_api_get_current_user_coins',
        'permission_callback' => function () {
            return is_user_logged_in();
        },
    ]);

    // 🔥 NEW: Redeem coins endpoint
    register_rest_route('custom/v1', '/redeem-coins', [
        'methods'  => 'POST',
        'callback' => 'store1920_api_redeem_coins',
        'permission_callback' => '__return_true', // Allow any user
    ]);
});

/**
 * Get coins by user ID (for admin or public APIs)
 */
function store1920_api_get_user_coins($data) {
    $user_id = intval($data['user_id']);
    return ['coins' => store1920_get_user_coin_balance($user_id)];
}

/**
 * Get coins for current logged-in user
 */
function store1920_api_get_current_user_coins() {
    $user_id = get_current_user_id();
    return ['coins' => store1920_get_user_coin_balance($user_id)];
}

/**
 * 🔥 NEW: Redeem coins endpoint
 * Converts coins to AED discount (10 coins = 1 AED)
 */
function store1920_api_redeem_coins($request) {
    $params = $request->get_json_params();
    $coins_to_redeem = isset($params['coins']) ? intval($params['coins']) : 0;
    $user_id = isset($params['user_id']) ? intval($params['user_id']) : 0;

    // Validate user ID
    if (!$user_id || $user_id <= 0) {
        return new WP_Error('invalid_user', 'Valid user ID is required', ['status' => 400]);
    }

    // Validate coins
    if ($coins_to_redeem <= 0) {
        return new WP_Error('invalid_coins', 'Coins must be greater than 0', ['status' => 400]);
    }

    // Minimum 10 coins required
    if ($coins_to_redeem < 10) {
        return new WP_Error('minimum_coins', 'Minimum 10 coins required to redeem', ['status' => 400]);
    }

    global $wpdb;
    $table = $wpdb->prefix . 'user_coins';

    // Get current balance
    $current_balance = store1920_get_user_coin_balance($user_id);

    // Check if user has enough coins
    if ($current_balance < $coins_to_redeem) {
        return new WP_Error('insufficient_coins', 'Insufficient coin balance', ['status' => 400]);
    }

    // Deduct coins
    $wpdb->query($wpdb->prepare(
        "UPDATE $table SET coins = coins - %d, updated_at = NOW() WHERE user_id = %d",
        $coins_to_redeem, $user_id
    ));

    // Get new balance
    $new_balance = store1920_get_user_coin_balance($user_id);

    // Calculate discount in AED (10 coins = 1 AED)
    $discount_aed = $coins_to_redeem / 10;

    return [
        'success' => true,
        'coins_redeemed' => $coins_to_redeem,
        'discount_aed' => $discount_aed,
        'new_balance' => $new_balance,
        'message' => "Successfully redeemed $coins_to_redeem coins for AED $discount_aed discount"
    ];
}

/**
 * Helper: Get user coin balance
 */
function store1920_get_user_coin_balance($user_id) {
    global $wpdb;
    $table = $wpdb->prefix . 'user_coins';

    $coins = $wpdb->get_var($wpdb->prepare(
        "SELECT coins FROM $table WHERE user_id = %d",
        $user_id
    ));

    return intval($coins);
}


// Add a new column "Coins" to the Users list table
add_filter('manage_users_columns', 'store1920_add_coins_column');
function store1920_add_coins_column($columns) {
    $columns['coins'] = 'Coins';
    return $columns;
}

// Fill the coins column with user coin balance
add_action('manage_users_custom_column', 'store1920_show_coins_column_content', 10, 3);
function store1920_show_coins_column_content($value, $column_name, $user_id) {
    if ($column_name === 'coins') {
        return store1920_get_user_coin_balance($user_id);
    }
    return $value;
}


// Display coin balance on user profile page (readonly)
add_action('show_user_profile', 'store1920_show_coin_balance_on_profile');
add_action('edit_user_profile', 'store1920_show_coin_balance_on_profile');

function store1920_show_coin_balance_on_profile($user) {
    $coins = store1920_get_user_coin_balance($user->ID);
    ?>
    <h3>Coin Rewards</h3>
    <table class="form-table">
        <tr>
            <th><label for="coins">Coins</label></th>
            <td>
                <input type="text" name="coins" id="coins" value="<?php echo esc_attr($coins); ?>" readonly class="regular-text" />
                <p class="description">User's current coin balance. (10 coins = 1 AED discount)</p>
            </td>
        </tr>
    </table>
    <?php
}


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
        header("Access-Control-Allow-Origin: $origin"); // exact origin required for credentials
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce");
    }

    // Handle preflight OPTIONS requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit;
    }
}, 999);


add_action('woocommerce_order_refunded', 'store1920_add_coins_on_refund', 10, 2);
function store1920_add_coins_on_refund($order_id, $refund_id) {
    $order = wc_get_order($order_id);
    if (!$order) return;

    // Only for COD orders
    if ($order->get_payment_method() !== 'cod') return;

    $user_id = $order->get_user_id();
    if (!$user_id) return;

    // Get refund object
    $refund = wc_get_order($refund_id);
    if (!$refund) return;

    // Refunded amount in AED
    $refunded_amount = floatval($refund->get_total());
    if ($refunded_amount <= 0) return;

    // Convert to coins (10 coins = 1 AED)
    $coins_to_add = intval($refunded_amount * 10);

    if ($coins_to_add > 0) {
        global $wpdb;
        $table = $wpdb->prefix . 'user_coins';

        $wpdb->query($wpdb->prepare(
            "INSERT INTO $table (user_id, coins) VALUES (%d, %d)
             ON DUPLICATE KEY UPDATE coins = coins + %d, updated_at = NOW()",
            $user_id, $coins_to_add, $coins_to_add
        ));

        // Optional: Log it
        error_log("Added $coins_to_add coins to user $user_id for refunded order $order_id");
    }
}
