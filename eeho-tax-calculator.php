<?php
/**
 * Plugin Name: EEHO Tax Calculator
 * Description: EEHO TAX 세금 계산기 - AI 절세 분석!
 * Version: 4.3.0
 * Author: EEHO TAX
 */
if ( ! defined( 'ABSPATH' ) ) exit;
define( 'EEHO_TAX_VER', '6.3.0' );
define( 'EEHO_TAX_URL', plugin_dir_url( __FILE__ ) );
define( 'EEHO_TAX_DIR', plugin_dir_path( __FILE__ ) );

add_shortcode( 'eeho_calculator', function() {
    ob_start();
    include EEHO_TAX_DIR . 'templates/calculator.php';
    return ob_get_clean();
});

add_action( 'wp_enqueue_scripts', function() {
    if ( ! is_singular() ) return;
    global $post;
    if ( ! $post || ! has_shortcode( $post->post_content, 'eeho_calculator' ) ) return;
    wp_enqueue_style( 'eeho-calc-css', EEHO_TAX_URL . 'assets/css/calculator.css', array(), EEHO_TAX_VER );
    wp_enqueue_script( 'eeho-calc-js', EEHO_TAX_URL . 'assets/js/calculator.js', array( 'jquery' ), EEHO_TAX_VER, true );
    wp_localize_script( 'eeho-calc-js', 'eehoTax', array(
        'ajax'  => admin_url( 'admin-ajax.php' ),
        'nonce' => wp_create_nonce( 'eeho_tax_nonce' ),
        'api'   => get_option( 'eeho_api_url', '' ),
    ));
});

// API 프록시
add_action( 'wp_ajax_eeho_api_proxy',        'eeho_api_proxy' );
add_action( 'wp_ajax_nopriv_eeho_api_proxy', 'eeho_api_proxy' );
function eeho_api_proxy() {
    check_ajax_referer( 'eeho_tax_nonce', 'nonce' );
    $payload  = stripslashes( $_POST['payload']  ?? '' );
    $endpoint = sanitize_text_field( $_POST['endpoint'] ?? '/generate-questions' );
    $api_base = get_option( 'eeho_api_url', 'https://eeho-ai-api-1070315020839.asia-northeast3.run.app' );
    if ( empty( $payload ) ) { wp_send_json_error( '요청 데이터가 비어있습니다.' ); }
    $allowed = array( '/generate-questions', '/confirm', '/report', '/' );
    if ( ! in_array( $endpoint, $allowed, true ) ) { wp_send_json_error( '허용되지 않은 엔드포인트.' ); }
    $url      = rtrim( $api_base, '/' ) . $endpoint;
    $response = wp_remote_post( $url, array(
        'timeout' => 90,
        'headers' => array( 'Content-Type' => 'application/json' ),
        'body'    => $payload,
    ));
    if ( is_wp_error( $response ) ) { wp_send_json_error( 'API 연결 실패: ' . $response->get_error_message() ); }
    $code = wp_remote_retrieve_response_code( $response );
    $body = wp_remote_retrieve_body( $response );
    if ( $code >= 400 ) {
        wp_send_json_success( array(
            'status' => 'success', 'result_type' => 'REVIEW', 'applicable_law' => '',
            'details' => 'AI 분석 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
            'risk_warning' => '', '_error' => true, '_http_code' => $code,
        ));
    }
    $data = json_decode( $body, true );
    if ( is_array( $data ) ) { wp_send_json_success( $data ); }
    wp_send_json_success( array( 'raw' => $body ) );
}

// RLHF 데이터 저장
add_action( 'wp_ajax_eeho_save_rlhf',        'eeho_save_rlhf' );
add_action( 'wp_ajax_nopriv_eeho_save_rlhf', 'eeho_save_rlhf' );
function eeho_save_rlhf() {
    check_ajax_referer( 'eeho_tax_nonce', 'nonce' );
    global $wpdb;
    $table            = $wpdb->prefix . 'eeho_rlhf';
    $session_id       = sanitize_text_field( $_POST['session_id']       ?? '' );
    $original_context = sanitize_textarea_field( $_POST['original_context'] ?? '' );
    $supplement_text  = sanitize_textarea_field( $_POST['supplement_text']  ?? '' );
    $fact_summary     = sanitize_textarea_field( $_POST['fact_summary']     ?? '' );
    $checklist_raw    = $_POST['checklist_answers'] ?? '[]';
    $checklist_dec    = json_decode( stripslashes( $checklist_raw ), true );
    $checklist_json   = is_array( $checklist_dec ) ? json_encode( $checklist_dec, JSON_UNESCAPED_UNICODE ) : '[]';
    if ( empty( $supplement_text ) ) { wp_send_json_error( '보완 내용이 비어있습니다.' ); }
    $inserted = $wpdb->insert( $table, array(
        'session_id'        => $session_id,
        'original_context'  => $original_context,
        'supplement_text'   => $supplement_text,
        'fact_summary'      => $fact_summary,
        'checklist_answers' => $checklist_json,
        'created_at'        => current_time( 'mysql' ),
    ), array( '%s', '%s', '%s', '%s', '%s', '%s' ) );
    if ( false === $inserted ) { wp_send_json_error( 'DB 저장 실패.' ); }
    wp_send_json_success( array( 'saved' => true, 'id' => $wpdb->insert_id ) );
}

// 활성화 훅: DB 테이블 생성
register_activation_hook( __FILE__, 'eeho_activate' );
function eeho_activate() {
    global $wpdb;
    $table   = $wpdb->prefix . 'eeho_rlhf';
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id                bigint(20)   NOT NULL AUTO_INCREMENT,
        session_id        varchar(100) NOT NULL DEFAULT '',
        original_context  longtext,
        supplement_text   longtext     NOT NULL,
        fact_summary      longtext,
        checklist_answers longtext,
        created_at        datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY session_id (session_id),
        KEY created_at (created_at)
    ) {$charset};";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
    add_option( 'eeho_api_url', 'https://eeho-ai-api-1070315020839.asia-northeast3.run.app' );
}

// 관리자 메뉴: RLHF 데이터 조회
add_action( 'admin_menu', function() {
    add_menu_page( 'EEHO AI 관리', 'EEHO AI', 'manage_options', 'eeho-admin', 'eeho_admin_page', 'dashicons-analytics', 30 );
    add_submenu_page( 'eeho-admin', '보완 데이터 (RLHF)', '보완 데이터', 'manage_options', 'eeho-rlhf', 'eeho_rlhf_page' );
});
function eeho_admin_page() {
    global $wpdb;
    $count = $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}eeho_rlhf" );
    echo '<div class="wrap"><h1>EEHO AI 관리</h1><p>수집된 보완 데이터(RLHF): <strong>' . intval($count) . '건</strong></p>';
    echo '<p><a href="' . admin_url('admin.php?page=eeho-rlhf') . '" class="button button-primary">보완 데이터 보기</a></p></div>';
}
function eeho_rlhf_page() {
    global $wpdb;
    $table = $wpdb->prefix . 'eeho_rlhf';
    $rows  = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 50" );
    echo '<div class="wrap"><h1>보완 데이터 (RLHF)</h1>';
    echo '<p>최근 50건 · 총 ' . $wpdb->get_var("SELECT COUNT(*) FROM {$table}") . '건</p>';
    if ( empty($rows) ) { echo '<p>수집된 데이터가 없습니다.</p></div>'; return; }
    echo '<table class="widefat striped"><thead><tr><th>ID</th><th>세션ID</th><th>원본 기술</th><th>보완 내용</th><th>등록일</th></tr></thead><tbody>';
    foreach ( $rows as $row ) {
        echo '<tr><td>' . esc_html($row->id) . '</td>';
        echo '<td style="font-size:11px">' . esc_html(substr($row->session_id,0,20)) . '</td>';
        echo '<td>' . esc_html(mb_substr($row->original_context,0,60)) . '...</td>';
        echo '<td><strong>' . esc_html(mb_substr($row->supplement_text,0,100)) . '</strong></td>';
        echo '<td>' . esc_html($row->created_at) . '</td></tr>';
    }
    echo '</tbody></table></div>';
}
