<?php
/**
 * Plugin Name: WP REST API CORS + Reviews (Permanent)
 * Description: Permanent CORS headers for all REST API endpoints and custom reviews endpoint. Supports localhost and production domains.
 * Version: 1.1
 * Author: Rohith
 */

if (!defined('ABSPATH')) exit; // Exit if accessed directly

// --- Allowed Origins ---
function wp_cors_allowed_origins() {
    return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'https://test-pi-roan-20.vercel.app',
        'https://test2-17.vercel.app', 
        'https://test3-mu-gilt.vercel.app',
        'https://store1920.com',
        'http://store1920.com',
        'https://www.store1920.com',
        'http://www.store1920.com', 
        'https://staging.store1920.com',
        'http://staging.store1920.com',
        'https://www.staging.store1920.com',  
        'https://testing.store1920.com',
        'http://testing.store1920.com',
        'https://test.store1920.com',
        'http://test.store1920.com',
    ];
}

// --- Apply CORS headers to all REST API requests ---
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers'); // Remove default WP CORS

    add_filter('rest_pre_serve_request', function($value) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if ($origin && in_array($origin, wp_cors_allowed_origins(), true)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Requested-With");
            header("Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages");
        }

        // Handle preflight OPTIONS requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit();
        }

        return $value;
    }, 999); // High priority
}, 0);

// --- Global OPTIONS handling for non-REST requests ---
add_action('init', function() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($origin && in_array($origin, wp_cors_allowed_origins(), true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Requested-With");
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
}, 999);

// --- Custom REST endpoint for WooCommerce product reviews ---
add_action('rest_api_init', function() {
    register_rest_route('custom-reviews/v1', '/product/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => function($data) {
            $product_id = $data['id'];

            // Fetch approved WooCommerce reviews for this product
            $comments = get_comments([
                'post_id' => $product_id,
                'status'  => 'approve',
                'type'    => 'review',
            ]);

            $reviews = [];
            foreach ($comments as $comment) {
                $reviews[] = [
                    'author'  => $comment->comment_author,
                    'content' => $comment->comment_content,
                    'rating'  => (int) get_comment_meta($comment->comment_ID, 'rating', true),
                    'date'    => $comment->comment_date,
                ];
            }

            return ['reviews' => $reviews];
        },
        'permission_callback' => '__return_true', // No authentication required
    ));
});
