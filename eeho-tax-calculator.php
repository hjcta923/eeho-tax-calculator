<?php
/**
 * Plugin Name: EEHO Tax Calculator
 * Description: EEHO TAX 세금 계산기 - AI 절세 분석
 * Version: 4.2.0
 * Author: EEHO TAX
 */
if ( ! defined( 'ABSPATH' ) ) exit;

define( 'EEHO_TAX_VER', '6.2.1' );
define( 'EEHO_TAX_URL', plugin_dir_url( __FILE__ ) );
define( 'EEHO_TAX_DIR', plugin_dir_path( __FILE__ ) );

/* ============ Shortcode ============ */
add_shortcode( 'eeho_calculator', function() {
    ob_start();
    include EEHO_TAX_DIR . 'templates/calculator.php';
    return ob_get_clean();
});

/* ============ Assets ============ */
add_action( 'wp_enqueue_scripts', function() {
    if ( ! is_singular() ) return;
    global $post;
    if ( ! $post || ! has_shortcode( $post->post_content, 'eeho_calculator' ) ) return;

    wp_enqueue_style(
        'eeho-calc-css',
        EEHO_TAX_URL . 'assets/css/calculator.css',
        array(),
        EEHO_TAX_VER
    );

    wp_enqueue_script(
        'eeho-calc-js',
        EEHO_TAX_URL . 'assets/js/calculator.js',
        array( 'jquery' ),
        EEHO_TAX_VER,
        true
    );

    wp_localize_script( 'eeho-calc-js', 'eehoTax', array(
        'ajax'  => admin_url( 'admin-ajax.php' ),
        'nonce' => wp_create_nonce( 'eeho_tax_nonce' ),
        'api'   => get_option( 'eeho_api_url', '' ),
    ));
});

/* ============ AJAX: API Proxy ============ */
add_action( 'wp_ajax_eeho_api_proxy', 'eeho_api_proxy' );
add_action( 'wp_ajax_nopriv_eeho_api_proxy', 'eeho_api_proxy' );

function eeho_api_proxy() {
    check_ajax_referer( 'eeho_tax_nonce', 'nonce' );

    $payload  = stripslashes( $_POST['payload']  ?? '' );
    $endpoint = sanitize_text_field( $_POST['endpoint'] ?? '' );
    $api_base = get_option( 'eeho_api_url', 'https://eeho-ai-api-1070315020839.asia-northeast3.run.app' );

    if ( empty( $payload ) ) {
        wp_send_json_error( '요청 데이터가 비어있습니다.' );
    }

    // 엔드포인트 경로 조합
    // JS에서 '/generate-questions' 또는 '/report' 형태로 전송됨
    $url = $api_base;
    if ( $endpoint ) {
        $url = trailingslashit( $api_base ) . ltrim( $endpoint, '/' );
    }

    // ★ timeout 90초: Gemini 추론 대기 시간 확보
    $response = wp_remote_post( $url, array(
        'timeout' => 90,
        'headers' => array( 'Content-Type' => 'application/json' ),
        'body'    => $payload,
    ));

    if ( is_wp_error( $response ) ) {
        wp_send_json_error( 'API 서버 연결에 실패했습니다: ' . $response->get_error_message() );
    }

    $code = wp_remote_retrieve_response_code( $response );
    $body = wp_remote_retrieve_body( $response );

    if ( $code >= 400 ) {
        wp_send_json_success( array(
            'status'       => 'success',
            'result_type'  => 'REVIEW',
            'details'      => '현재 AI 분석 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
            'risk_warning' => '',
            '_error'       => true,
            '_http_code'   => $code,
        ));
    }

    $data = json_decode( $body, true );
    if ( is_array( $data ) ) {
        wp_send_json_success( $data );
    }
    wp_send_json_success( array( 'result' => $body ) );
}

/* ============ Activation ============ */
register_activation_hook( __FILE__, function() {
    add_option( 'eeho_api_url', 'https://eeho-ai-api-1070315020839.asia-northeast3.run.app' );
});
