<?php
/**
 * Plugin Name: Social Auto Poster Connector (Multi-Titles & Instant Dispatch)
 * Plugin URI: https://game.khabarmonkey.com
 * Description: Connects WordPress directly to Social Auto Poster SaaS. Supports Multiple Social Titles per post (1 title per line) and automatically pushes published posts to your Facebook Pages and social channels with unique titles and first-comment links.
 * Version: 1.3.4
 * Author: Suzal Dhiman (Khabar Monkey Media)
 * Author URI: https://game.khabarmonkey.com
 * License: GPL-2.0+
 * Text Domain: social-auto-poster
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('SAP_CONNECTOR_VERSION', '1.3.4');
define('SAP_CONNECTOR_DIR', plugin_dir_path(__FILE__));
define('SAP_CONNECTOR_URL', plugin_dir_url(__FILE__));

class Social_Auto_Poster_Connector {

    private static $instance = null;
    private $pending_dispatch_posts = array();

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Register Post Meta with Gutenberg REST API support
        add_action('init', array($this, 'register_post_metas'));

        // Admin menu & settings
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_sap_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_sap_manual_dispatch', array($this, 'ajax_manual_dispatch'));
        add_action('wp_ajax_sap_get_target_pages', array($this, 'ajax_get_target_pages'));

        // Post editor meta box
        add_action('add_meta_boxes', array($this, 'add_social_titles_meta_box'));
        add_action('save_post', array($this, 'save_social_titles_meta_box'), 10, 2);

        // Instant publish & Auto Engine sync hooks
        add_action('transition_post_status', array($this, 'handle_post_transition'), 10, 3);
        add_action('save_post_post', array($this, 'handle_save_post'), 30, 2);
        add_action('shutdown', array($this, 'handle_shutdown_dispatch'));
        register_shutdown_function(array($this, 'handle_shutdown_dispatch'));

        // REST API verification endpoint
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // One-Click In-Dashboard Auto-Update Engine
        add_filter('pre_set_site_transient_update_plugins', array($this, 'check_plugin_update'));
        add_filter('plugins_api', array($this, 'plugin_popup_details'), 20, 3);
        add_action('wp_ajax_sap_check_update_now', array($this, 'ajax_check_update_now'));
    }

    /* ==========================================================================
       1. ADMIN SETTINGS PAGE
       ========================================================================== */

    public function register_admin_menu() {
        add_options_page(
            'Social Auto Poster Settings',
            'Social Auto Poster',
            'manage_options',
            'social-auto-poster',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('sap_settings_group', 'sap_webhook_url');
        register_setting('sap_settings_group', 'sap_secret_key');
        register_setting('sap_settings_group', 'sap_auto_publish');
        register_setting('sap_settings_group', 'sap_first_comment');
    }

    public function render_settings_page() {
        $webhook_url = get_option('sap_webhook_url', '');
        $secret_key = get_option('sap_secret_key', '');
        $auto_publish = get_option('sap_auto_publish', '1');
        $first_comment = get_option('sap_first_comment', '1');

        $remote_update = $this->fetch_remote_info();
        $has_update = $remote_update && version_compare(SAP_CONNECTOR_VERSION, $remote_update['version'], '<');
        $update_url = wp_nonce_url(
            self_admin_url('update.php?action=upgrade-plugin&plugin=' . urlencode(plugin_basename(__FILE__))),
            'upgrade-plugin_' . plugin_basename(__FILE__)
        );
        ?>
        <div class="wrap" style="max-width: 860px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="background: #ffffff; padding: 24px 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a;">
                            ⚡ Social Auto Poster Connector
                        </h1>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">
                            WordPress ko CreatorFlow Social Auto Poster SaaS se jodein aur automatic multi-title posting karein.
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 11px; padding: 4px 10px; border-radius: 9999px;">
                            v<?php echo esc_html(SAP_CONNECTOR_VERSION); ?> Active
                        </span>
                        <button type="button" id="sap_btn_check_update" class="button button-secondary" style="font-size: 11px; padding: 2px 10px; border-radius: 6px; font-weight: 600;">
                            🔄 Check Updates
                        </button>
                    </div>
                </div>

                <!-- One-Click In-Dashboard Update Banner -->
                <?php if ($has_update) : ?>
                    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px 20px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <div style="font-weight: 700; color: #065f46; font-size: 14px; display: flex; items-center; gap: 6px;">
                                <span>🎉 Naya Version Update Available: v<?php echo esc_html($remote_update['version']); ?></span>
                                <span style="font-size: 11px; background: #059669; color: #fff; padding: 1px 6px; border-radius: 4px;">Latest</span>
                            </div>
                            <p style="margin: 4px 0 0 0; color: #047857; font-size: 12px;">
                                <?php echo esc_html(isset($remote_update['upgrade_notice']) ? $remote_update['upgrade_notice'] : 'Aap bina ZIP upload kiye WordPress ke andar hi 1-click mein update kar sakte hain.'); ?>
                            </p>
                        </div>
                        <a href="<?php echo esc_url($update_url); ?>" class="button button-primary" style="background: #059669; border-color: #059669; font-weight: 700; padding: 6px 18px; border-radius: 8px; font-size: 13px; text-decoration: none;">
                            ⚡ 1-Click Update to v<?php echo esc_html($remote_update['version']); ?> Now
                        </a>
                    </div>
                <?php endif; ?>

                <div id="sap_update_result" style="margin-bottom: 16px; display: none;"></div>

                <form method="post" action="options.php">
                    <?php settings_fields('sap_settings_group'); ?>
                    <?php do_settings_sections('sap_settings_group'); ?>

                    <table class="form-table" role="presentation">
                        <tr>
                            <th scope="row" style="font-weight: 600; color: #334155;">Webhook URL</th>
                            <td>
                                <input type="url" name="sap_webhook_url" id="sap_webhook_url" value="<?php echo esc_attr($webhook_url); ?>" class="regular-text" style="width: 100%; max-width: 550px; padding: 8px 12px; border-radius: 6px; font-family: monospace;" placeholder="https://game.khabarmonkey.com/api/webhook/wordpress" required />
                                <p class="description" style="margin-top: 6px; color: #64748b; font-size: 12px;">
                                    CreatorFlow SaaS dashboard se apna WordPress Webhook URL copy karke yahan daalein.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row" style="font-weight: 600; color: #334155;">Secret API Key</th>
                            <td>
                                <input type="text" name="sap_secret_key" id="sap_secret_key" value="<?php echo esc_attr($secret_key); ?>" class="regular-text" style="width: 100%; max-width: 550px; padding: 8px 12px; border-radius: 6px; font-family: monospace;" placeholder="sap_whsec_..." required />
                                <p class="description" style="margin-top: 6px; color: #64748b; font-size: 12px;">
                                    Aapki secure Webhook Secret Key jo request verify karne ke liye use hogi.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row" style="font-weight: 600; color: #334155;">Auto-Publish</th>
                            <td>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="sap_auto_publish" value="1" <?php checked('1', $auto_publish); ?> />
                                    <span style="color: #1e293b; font-weight: 500;">Jaise hi WordPress par post Publish ho, turant Social Poster ko bhej do</span>
                                </label>
                            </td>
                        </tr>

                        <tr>
                            <th scope="row" style="font-weight: 600; color: #334155;">First Comment Link</th>
                            <td>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="sap_first_comment" value="1" <?php checked('1', $first_comment); ?> />
                                    <span style="color: #1e293b; font-weight: 500;">Facebook Post ke first comment mein article ka direct permalink add karein (High Reach Hack)</span>
                                </label>
                            </td>
                        </tr>
                    </table>

                    <div style="display: flex; align-items: center; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
                        <?php submit_button('Settings Save Karein', 'primary', 'submit', false, array('style' => 'background: #0f172a; border-color: #0f172a; padding: 6px 18px; border-radius: 6px; font-weight: 600;')); ?>

                        <button type="button" id="sap_btn_test_conn" class="button button-secondary" style="padding: 6px 16px; border-radius: 6px; font-weight: 600; border-color: #cbd5e1;">
                            🔄 Test Connection
                        </button>
                    </div>

                    <div id="sap_test_result" style="margin-top: 16px; display: none;"></div>
                </form>
            </div>

            <!-- Instructions Card -->
            <div style="background: #f8fafc; padding: 20px 24px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px;">
                <h3 style="margin-top: 0; font-size: 15px; font-weight: 700; color: #0f172a;">💡 Yeh Plugin Kaise Kaam Karta Hai?</h3>
                <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.8;">
                    <li>Jab aap <strong>Post Editor</strong> mein nayi post likhenge, toh wahan <strong>"Social Multi-Titles"</strong> ka box aayega.</li>
                    <li>Us box mein aap <strong>Per Line 1 Title</strong> likh sakte hain (Line 1 = Page B, Line 2 = Page C, Line 3 = Page D).</li>
                    <li>Jaise hi aap <strong>Publish</strong> dabayenge, yeh plugin featured image, permalink aur sabhi unique titles Social Auto Poster ko instant bhej dega.</li>
                    <li><strong>Direct Updates:</strong> Jab bhi naya feature aayega, aapko nayi ZIP upload nahi karni padegi—yahin se 1-click update ho jayega!</li>
                </ol>
            </div>
        </div>

        <script>
        document.addEventListener('DOMContentLoaded', function() {
            var btn = document.getElementById('sap_btn_test_conn');
            var resultDiv = document.getElementById('sap_test_result');

            if (btn) {
                btn.addEventListener('click', function() {
                    var webhookUrl = document.getElementById('sap_webhook_url').value.trim();
                    var secretKey = document.getElementById('sap_secret_key').value.trim();

                    if (!webhookUrl || !secretKey) {
                        resultDiv.style.display = 'block';
                        resultDiv.innerHTML = '<div style="padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 13px;">Kripya pehle Webhook URL aur Secret Key fill karein.</div>';
                        return;
                    }

                    btn.disabled = true;
                    btn.innerText = 'Testing...';
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = '<div style="padding: 10px 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; color: #0369a1; font-size: 13px;">Social Auto Poster SaaS ko ping bhej rahe hain...</div>';

                    var formData = new FormData();
                    formData.append('action', 'sap_test_connection');
                    formData.append('webhook_url', webhookUrl);
                    formData.append('secret_key', secretKey);
                    formData.append('nonce', '<?php echo esc_js(wp_create_nonce('sap_test_nonce')); ?>');

                    fetch(ajaxurl, {
                        method: 'POST',
                        body: formData
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        btn.disabled = false;
                        btn.innerText = '🔄 Test Connection';
                        if (data.success) {
                            resultDiv.innerHTML = '<div style="padding: 10px 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46; font-size: 13px; font-weight: 600;">' + (data.data.message || '✅ Connection Successful! Social Auto Poster se connection verify ho gaya.') + '</div>';
                        } else {
                            resultDiv.innerHTML = '<div style="padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 13px;">❌ Connection Failed: ' + (data.data.message || 'Server tak connect nahi ho paya.') + '</div>';
                        }
                    })
                    .catch(function(err) {
                        btn.disabled = false;
                        btn.innerText = '🔄 Test Connection';
                        resultDiv.innerHTML = '<div style="padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 13px;">❌ Error: ' + err.message + '</div>';
                    });
                });
            }

            // Check Updates AJAX handler
            var updateBtn = document.getElementById('sap_btn_check_update');
            var updateRes = document.getElementById('sap_update_result');
            if (updateBtn && updateRes) {
                updateBtn.addEventListener('click', function() {
                    updateBtn.disabled = true;
                    updateBtn.innerText = 'Checking...';
                    updateRes.style.display = 'block';
                    updateRes.innerHTML = '<div style="padding: 10px 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; color: #0369a1; font-size: 12px;">Update server se naya version check kar rahe hain...</div>';

                    var fd = new FormData();
                    fd.append('action', 'sap_check_update_now');
                    fd.append('nonce', '<?php echo esc_js(wp_create_nonce('sap_update_nonce')); ?>');

                    fetch(ajaxurl, {
                        method: 'POST',
                        body: fd
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(d) {
                        updateBtn.disabled = false;
                        updateBtn.innerText = '🔄 Check Updates';
                        if (d.success) {
                            if (d.data.has_update) {
                                updateRes.innerHTML = '<div style="padding: 12px 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;"><div><strong>🎉 ' + d.data.message + '</strong><div style="font-size: 11px; color: #047857; margin-top: 2px;">' + (d.data.upgrade_notice || '') + '</div></div><a href="' + d.data.update_url + '" class="button button-primary" style="background:#059669; border-color:#059669; font-weight:700;">⚡ 1-Click Update Now</a></div>';
                            } else {
                                updateRes.innerHTML = '<div style="padding: 10px 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #166534; font-size: 12px; font-weight: 600;">✅ ' + d.data.message + '</div>';
                            }
                        } else {
                            updateRes.innerHTML = '<div style="padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 12px;">❌ ' + (d.data.message || 'Check failed') + '</div>';
                        }
                    })
                    .catch(function(err) {
                        updateBtn.disabled = false;
                        updateBtn.innerText = '🔄 Check Updates';
                        updateRes.innerHTML = '<div style="padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; font-size: 12px;">❌ ' + err.message + '</div>';
                    });
                });
            }
        });
        </script>
        <?php
    }

    public function ajax_test_connection() {
        check_ajax_referer('sap_test_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Unauthorized user.'));
        }

        $webhook_url = isset($_POST['webhook_url']) ? esc_url_raw($_POST['webhook_url']) : '';
        $secret_key = isset($_POST['secret_key']) ? sanitize_text_field($_POST['secret_key']) : '';

        if (empty($webhook_url) || empty($secret_key)) {
            wp_send_json_error(array('message' => 'Webhook URL ya Secret Key missing hai.'));
        }

        // Send test ping to SaaS webhook
        $target_url = $webhook_url;
        if (strpos($target_url, 'secret=') === false) {
            $separator = (strpos($target_url, '?') !== false) ? '&' : '?';
            $target_url .= $separator . 'secret=' . urlencode($secret_key);
        }

        $response = wp_remote_post($target_url, array(
            'timeout'     => 10,
            'headers'     => array(
                'Content-Type' => 'application/json',
                'X-SAP-Secret' => $secret_key,
            ),
            'body'        => wp_json_encode(array(
                'event'     => 'test_connection',
                'action'    => 'test_connection',
                'test'      => true,
                'site_url'  => get_site_url(),
                'site_name' => get_bloginfo('name'),
                'version'   => SAP_CONNECTOR_VERSION,
            )),
            'data_format' => 'body',
        ));

        if (is_wp_error($response)) {
            wp_send_json_error(array('message' => $response->get_error_message()));
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if ($code >= 200 && $code < 300) {
            $msg = isset($data['message']) ? $data['message'] : 'Connection Successful (HTTP ' . $code . ')!';
            wp_send_json_success(array('message' => '✅ ' . $msg));
        } else {
            $errMsg = isset($data['error']) ? $data['error'] : 'HTTP Error ' . $code;
            wp_send_json_error(array('message' => $errMsg));
        }
    }

    /* ==========================================================================
       AUTO-UPDATE ENGINE (ONE-CLICK DIRECT WP DASHBOARD UPDATES)
       ========================================================================== */

    public function get_update_endpoint() {
        $webhook_url = get_option('sap_webhook_url', '');
        if (!empty($webhook_url)) {
            $parsed = parse_url($webhook_url);
            if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                $base = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
                return $base . '/api/wordpress/plugin-update';
            }
        }
        return 'https://game.khabarmonkey.com/api/wordpress/plugin-update';
    }

    public function fetch_remote_info($force = false) {
        $cache_key = 'sap_plugin_update_info';
        if (!$force) {
            $cached = get_transient($cache_key);
            if ($cached !== false && is_array($cached)) {
                return $cached;
            }
        }

        $endpoint = $this->get_update_endpoint();
        $response = wp_remote_get($endpoint, array(
            'timeout' => 8,
            'headers' => array('Accept' => 'application/json'),
        ));

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (!$data || !isset($data['version'])) {
            return false;
        }

        set_transient($cache_key, $data, 6 * HOUR_IN_SECONDS);
        return $data;
    }

    public function check_plugin_update($transient) {
        if (!is_object($transient)) {
            $transient = new stdClass();
        }

        $remote = $this->fetch_remote_info();
        if ($remote && !empty($remote['version']) && version_compare(SAP_CONNECTOR_VERSION, $remote['version'], '<')) {
            $plugin_file = plugin_basename(__FILE__);
            $obj = new stdClass();
            $obj->slug = 'social-auto-poster-connector';
            $obj->plugin = $plugin_file;
            $obj->new_version = $remote['version'];
            $obj->url = isset($remote['homepage']) ? $remote['homepage'] : '';
            $obj->package = !empty($remote['package']) ? $remote['package'] : (isset($remote['download_url']) ? $remote['download_url'] : '');
            $obj->tested = isset($remote['tested']) ? $remote['tested'] : '';
            $obj->requires_php = isset($remote['requires_php']) ? $remote['requires_php'] : '';
            $obj->icons = isset($remote['banners']) ? $remote['banners'] : array();
            $obj->banners = isset($remote['banners']) ? $remote['banners'] : array();

            if (!isset($transient->response) || !is_array($transient->response)) {
                $transient->response = array();
            }
            $transient->response[$plugin_file] = $obj;
        }

        return $transient;
    }

    public function plugin_popup_details($result, $action, $args) {
        if ($action !== 'plugin_information') {
            return $result;
        }

        if (!isset($args->slug) || $args->slug !== 'social-auto-poster-connector') {
            return $result;
        }

        $remote = $this->fetch_remote_info();
        if (!$remote) {
            return $result;
        }

        $res = new stdClass();
        $res->name = $remote['name'];
        $res->slug = $remote['slug'];
        $res->version = $remote['version'];
        $res->tested = isset($remote['tested']) ? $remote['tested'] : '';
        $res->requires = isset($remote['requires']) ? $remote['requires'] : '';
        $res->requires_php = isset($remote['requires_php']) ? $remote['requires_php'] : '';
        $res->author = $remote['author'];
        $res->author_profile = isset($remote['author_profile']) ? $remote['author_profile'] : '';
        $res->download_link = isset($remote['package']) ? $remote['package'] : '';
        $res->trunk = isset($remote['package']) ? $remote['package'] : '';
        $res->last_updated = isset($remote['last_updated']) ? $remote['last_updated'] : '';
        $res->sections = isset($remote['sections']) ? $remote['sections'] : array();
        $res->banners = isset($remote['banners']) ? $remote['banners'] : array();

        return $res;
    }

    public function ajax_check_update_now() {
        check_ajax_referer('sap_update_nonce', 'nonce');
        if (!current_user_can('update_plugins')) {
            wp_send_json_error(array('message' => 'Unauthorized user.'));
        }

        delete_transient('sap_plugin_update_info');
        delete_site_transient('update_plugins');

        $remote = $this->fetch_remote_info(true);
        if (!$remote) {
            wp_send_json_error(array('message' => 'Update server se connect nahi ho paya. Webhook URL check karein.'));
        }

        $has_update = version_compare(SAP_CONNECTOR_VERSION, $remote['version'], '<');
        $update_url = wp_nonce_url(
            self_admin_url('update.php?action=upgrade-plugin&plugin=' . urlencode(plugin_basename(__FILE__))),
            'upgrade-plugin_' . plugin_basename(__FILE__)
        );

        wp_send_json_success(array(
            'has_update'        => $has_update,
            'current_version'   => SAP_CONNECTOR_VERSION,
            'latest_version'    => $remote['version'],
            'upgrade_notice'    => isset($remote['upgrade_notice']) ? $remote['upgrade_notice'] : '',
            'update_url'        => $update_url,
            'message'           => $has_update
                ? 'Naya update v' . $remote['version'] . ' available hai!'
                : 'Aapke paas already latest version (v' . SAP_CONNECTOR_VERSION . ') installed hai.',
        ));
    }

    /* ==========================================================================
       2. POST EDITOR META BOX (PER-PAGE TITLES & SUBTITLES)
       ========================================================================== */

    public function register_post_metas() {
        register_post_meta('post', '_sap_social_titles', array(
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'auth_callback' => function() { return current_user_can('edit_posts'); }
        ));
        register_post_meta('post', '_sap_page_variations', array(
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'auth_callback' => function() { return current_user_can('edit_posts'); }
        ));
    }

    public function ajax_get_target_pages() {
        check_ajax_referer('sap_get_pages_nonce', 'nonce');
        $webhook_url = get_option('sap_webhook_url', '');
        $secret_key = get_option('sap_secret_key', '');
        if (empty($webhook_url)) {
            wp_send_json_error(array('message' => 'Webhook URL not set'));
        }
        $endpoint = add_query_arg(array(
            'action'   => 'get_targets',
            'site_url' => get_site_url(),
            'secret'   => $secret_key,
        ), $webhook_url);

        $res = wp_remote_get($endpoint, array('timeout' => 8));
        if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) {
            wp_send_json_error(array('message' => 'Failed to reach SaaS targets endpoint'));
        }
        $data = json_decode(wp_remote_retrieve_body($res), true);
        wp_send_json_success($data);
    }

    public function add_social_titles_meta_box() {
        add_meta_box(
            'sap_social_titles_box',
            '📱 Social Auto Poster — Multi-Page Titles & Subtitles',
            array($this, 'render_social_titles_meta_box'),
            'post',
            'normal',
            'high'
        );
    }

    public function render_social_titles_meta_box($post) {
        wp_nonce_field('sap_save_titles_nonce', 'sap_titles_nonce');
        $saved_titles = get_post_meta($post->ID, '_sap_social_titles', true);
        $saved_variations = get_post_meta($post->ID, '_sap_page_variations', true);
        $post_title = get_the_title($post->ID);
        ?>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; gap: 8px;">
                <div>
                    <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                        🎯 Facebook Pages Multi-Headline &amp; Subtitle Studio
                    </h4>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">
                        Har destination page ke liye alag Headline aur Subtitle set karein. Har page par unique AI News Card ban kar jayega.
                    </p>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                    <button type="button" id="sap_btn_toggle_mode" class="button" style="font-size: 11px; padding: 3px 10px; border-radius: 6px;">
                        ⚡ Switch to Bulk Textarea Mode
                    </button>
                    <?php if ($post->post_status === 'publish') : ?>
                        <button type="button" id="sap_btn_manual_push" class="button button-primary" style="font-size: 11px; font-weight: 600; background: #0284c7; border-color: #0284c7; padding: 3px 12px; border-radius: 6px;">
                            🚀 Re-dispatch Now
                        </button>
                    <?php endif; ?>
                </div>
            </div>

            <!-- VIEW MODE 1: VISUAL PER-PAGE CARDS (DEFAULT) -->
            <div id="sap_cards_container" style="display: flex; flex-direction: column; gap: 12px;">
                <div id="sap_loading_targets" style="padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 12px; color: #64748b; text-align: center;">
                    ⏳ Connected destination pages load ho rahe hain...
                </div>
            </div>

            <div style="margin-top: 10px;">
                <button type="button" id="sap_btn_add_card" class="button" style="font-size: 12px; padding: 4px 12px; border-radius: 6px; font-weight: 600; border-color: #94a3b8;">
                    ➕ Add Another Page Variation
                </button>
            </div>

            <!-- VIEW MODE 2: FAST BULK TEXTAREA (COLLAPSIBLE / SECONDARY) -->
            <div id="sap_bulk_container" style="display: none; margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <label for="sap_social_titles" style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                    ⚡ Bulk Fast-Paste (Format: <code>Headline | Subtitle</code> per line)
                </label>
                <textarea 
                    name="sap_social_titles" 
                    id="sap_social_titles" 
                    rows="4" 
                    style="width: 100%; padding: 10px 12px; font-family: monospace; font-size: 13px; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; background: #ffffff;"
                    placeholder="Line 1: हिमाचल मौसम अलर्ट | भारी बर्फबारी से 3 नेशनल हाईवे बंद&#10;Line 2: शिमला और मनाली में मौसम का कहर | सैलानियों के लिए एडवाइजरी जारी&#10;Line 3: 24 घंटे में भारी बारिश की चेतावनी | प्रशासन ने जारी किए हेल्पलाइन नंबर"
                ><?php echo esc_textarea($saved_titles); ?></textarea>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                    💡 Tip: Har line mein <code>|</code> pipe lagakar aap Subtitle alag likh sakte hain (Jaise: <code>Headline | Subtitle</code>). Line 1 ➔ Page 1, Line 2 ➔ Page 2, Line 3 ➔ Page 3.
                </p>
            </div>

            <!-- Hidden input holding JSON of structured variations -->
            <input type="hidden" name="sap_page_variations" id="sap_page_variations" value="<?php echo esc_attr($saved_variations); ?>" />

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 8px;">
                <div id="sap_titles_counter" style="font-size: 12px; color: #334155; font-weight: 500;">
                    <span id="sap_badge_count" style="display: inline-block; background: #0f172a; color: #fff; padding: 2px 8px; border-radius: 12px; font-weight: 700; margin-right: 4px;">0</span>
                    <span>Page Variations Configured</span>
                </div>

                <div id="sap_manual_push_result" style="font-size: 12px; display: none;"></div>
            </div>

            <?php
            $last_status = get_post_meta($post->ID, '_sap_last_dispatch_status', true);
            if (!empty($last_status)) :
                $is_success = strpos($last_status, 'success:') === 0;
                $is_skipped = strpos($last_status, 'skipped:') === 0;
                $clean_msg = preg_replace('/^(success|skipped|error):\s*/i', '', $last_status);
                $bg = $is_success ? '#ecfdf5' : ($is_skipped ? '#fefce8' : '#fef2f2');
                $border = $is_success ? '#a7f3d0' : ($is_skipped ? '#fef08a' : '#fecaca');
                $color = $is_success ? '#065f46' : ($is_skipped ? '#854d0e' : '#991b1b');
                $icon = $is_success ? '✅' : ($is_skipped ? '⚠️' : '❌');
            ?>
            <div style="margin-top: 10px; padding: 8px 12px; background: <?php echo $bg; ?>; border: 1px solid <?php echo $border; ?>; border-radius: 6px; font-size: 12px; color: <?php echo $color; ?>; display: flex; align-items: center; gap: 6px;">
                <span><?php echo $icon; ?></span>
                <strong>Social Poster Status:</strong>
                <span><?php echo esc_html($clean_msg); ?></span>
            </div>
            <?php endif; ?>
        </div>

        <script>
        (function() {
            var rawVariations = <?php echo !empty($saved_variations) ? $saved_variations : '[]'; ?>;
            var defaultPostTitle = <?php echo wp_json_encode($post_title); ?>;
            var targetPages = [];
            var isBulkMode = false;

            var cardsContainer = document.getElementById('sap_cards_container');
            var bulkContainer = document.getElementById('sap_bulk_container');
            var hiddenInput = document.getElementById('sap_page_variations');
            var textarea = document.getElementById('sap_social_titles');
            var badgeCount = document.getElementById('sap_badge_count');
            var toggleBtn = document.getElementById('sap_btn_toggle_mode');
            var addCardBtn = document.getElementById('sap_btn_add_card');

            function getPostTitle() {
                var wpTitleEl = document.getElementById('title') || document.querySelector('.editor-post-title__input');
                return (wpTitleEl && (wpTitleEl.value || wpTitleEl.innerText || wpTitleEl.textContent)) || defaultPostTitle || '';
            }

            // Sync from visual cards to hidden JSON and bulk textarea
            function syncFromCards() {
                var cardEls = cardsContainer.querySelectorAll('.sap-card-row');
                var variations = [];
                var lines = [];

                cardEls.forEach(function(el, idx) {
                    var pageId = el.getAttribute('data-page-id') || '';
                    var pageName = el.getAttribute('data-page-name') || ('Page ' + (idx + 1));
                    var titleInput = el.querySelector('.sap-input-title');
                    var subtitleInput = el.querySelector('.sap-input-subtitle');

                    var titleVal = titleInput ? titleInput.value.trim() : '';
                    var subVal = subtitleInput ? subtitleInput.value.trim() : '';

                    if (titleVal || subVal) {
                        variations.push({
                            page_id: pageId,
                            page_name: pageName,
                            title: titleVal,
                            subtitle: subVal
                        });

                        var line = titleVal;
                        if (subVal) {
                            line += ' | ' + subVal;
                        }
                        lines.push(line);
                    }
                });

                if (hiddenInput) {
                    hiddenInput.value = JSON.stringify(variations);
                }
                if (textarea && !isBulkMode) {
                    textarea.value = lines.join('\n');
                }
                if (badgeCount) {
                    badgeCount.innerText = variations.length;
                }
            }

            // Sync from textarea to cards
            function syncFromTextarea() {
                if (!textarea) return;
                var lines = textarea.value.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
                var variations = [];

                lines.forEach(function(line, idx) {
                    var title = line;
                    var subtitle = '';
                    if (line.indexOf('|') !== -1) {
                        var parts = line.split('|');
                        title = parts[0].trim();
                        subtitle = parts.slice(1).join('|').trim();
                    }
                    var pg = targetPages[idx] || {};
                    variations.push({
                        page_id: pg.id || pg.pageId || '',
                        page_name: pg.name || ('Page ' + (idx + 1)),
                        title: title,
                        subtitle: subtitle
                    });
                });

                if (hiddenInput) {
                    hiddenInput.value = JSON.stringify(variations);
                }
                if (badgeCount) {
                    badgeCount.innerText = variations.length;
                }
                renderCards(variations);
            }

            function createCardHtml(variation, index) {
                var pageId = variation.page_id || '';
                var pageName = variation.page_name || ('Page ' + (index + 1));
                var title = variation.title || (index === 0 ? getPostTitle() : '');
                var subtitle = variation.subtitle || '';

                var card = document.createElement('div');
                card.className = 'sap-card-row';
                card.setAttribute('data-page-id', pageId);
                card.setAttribute('data-page-name', pageName);
                card.style.cssText = 'background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);';

                card.innerHTML = 
                    '<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">' +
                        '<div style="display: flex; align-items: center; gap: 8px;">' +
                            '<span style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">' +
                                '🌐 ' + escapeHtml(pageName) +
                            '</span>' +
                            '<span style="font-size: 11px; color: #64748b;">(Page #' + (index + 1) + ')</span>' +
                        '</div>' +
                        (index > 0 ? '<button type="button" class="sap-btn-remove-card button-link-delete" style="font-size: 11px; color: #ef4444; text-decoration: none; cursor: pointer;">✕ Remove</button>' : '') +
                    '</div>' +
                    '<div style="display: flex; flex-direction: column; gap: 6px;">' +
                        '<div>' +
                            '<label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 2px;">Headline (Main Card Title):</label>' +
                            '<input type="text" class="sap-input-title" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" value="' + escapeAttr(title) + '" placeholder="e.g. Himachal News: Bhaari barfbari se raste band" />' +
                        '</div>' +
                        '<div>' +
                            '<label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 2px;">Subtitle / Highlight Line (Optional):</label>' +
                            '<input type="text" class="sap-input-subtitle" style="width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #334155;" value="' + escapeAttr(subtitle) + '" placeholder="e.g. Shimla aur Manali mein record barfbari, advisory jaari" />' +
                        '</div>' +
                    '</div>';

                var titleInput = card.querySelector('.sap-input-title');
                var subtitleInput = card.querySelector('.sap-input-subtitle');
                var removeBtn = card.querySelector('.sap-btn-remove-card');

                if (titleInput) titleInput.addEventListener('input', syncFromCards);
                if (subtitleInput) subtitleInput.addEventListener('input', syncFromCards);
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        card.remove();
                        syncFromCards();
                    });
                }

                return card;
            }

            function renderCards(variationsList) {
                cardsContainer.innerHTML = '';
                var list = variationsList && variationsList.length > 0 ? variationsList : [];

                if (list.length === 0 && targetPages.length > 0) {
                    list = targetPages.map(function(p, i) {
                        return {
                            page_id: p.id || p.pageId,
                            page_name: p.name,
                            title: i === 0 ? getPostTitle() : '',
                            subtitle: ''
                        };
                    });
                } else if (list.length === 0) {
                    list = [
                        { page_id: '', page_name: 'Primary Facebook Page (Default)', title: getPostTitle(), subtitle: '' },
                        { page_id: '', page_name: 'Secondary Facebook Page', title: '', subtitle: '' }
                    ];
                }

                list.forEach(function(v, idx) {
                    cardsContainer.appendChild(createCardHtml(v, idx));
                });
                syncFromCards();
            }

            function escapeHtml(t) {
                var d = document.createElement('div');
                d.textContent = t || '';
                return d.innerHTML;
            }

            function escapeAttr(t) {
                return (t || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            }

            // Fetch live targets from SaaS
            function loadLiveTargets() {
                var fd = new FormData();
                fd.append('action', 'sap_get_target_pages');
                fd.append('nonce', '<?php echo esc_js(wp_create_nonce('sap_get_pages_nonce')); ?>');

                fetch(ajaxurl, {
                    method: 'POST',
                    body: fd
                })
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    if (res.success && res.data && res.data.pages) {
                        targetPages = res.data.pages;
                        if (!rawVariations || rawVariations.length === 0) {
                            renderCards([]);
                        }
                    }
                })
                .catch(function() {
                    // Non-blocking fallback
                });
            }

            document.addEventListener('DOMContentLoaded', function() {
                renderCards(rawVariations);
                loadLiveTargets();

                if (toggleBtn) {
                    toggleBtn.addEventListener('click', function() {
                        isBulkMode = !isBulkMode;
                        if (isBulkMode) {
                            bulkContainer.style.display = 'block';
                            cardsContainer.style.display = 'none';
                            addCardBtn.style.display = 'none';
                            toggleBtn.innerText = '📱 Switch to Visual Cards Mode';
                        } else {
                            bulkContainer.style.display = 'none';
                            cardsContainer.style.display = 'flex';
                            addCardBtn.style.display = 'inline-block';
                            toggleBtn.innerText = '⚡ Switch to Bulk Textarea Mode';
                            syncFromTextarea();
                        }
                    });
                }

                if (addCardBtn) {
                    addCardBtn.addEventListener('click', function() {
                        var currentCount = cardsContainer.querySelectorAll('.sap-card-row').length;
                        var targetPage = targetPages[currentCount] || { name: 'Page ' + (currentCount + 1), id: '' };
                        var newCard = createCardHtml({
                            page_id: targetPage.id || '',
                            page_name: targetPage.name,
                            title: '',
                            subtitle: ''
                        }, currentCount);
                        cardsContainer.appendChild(newCard);
                        syncFromCards();
                    });
                }

                if (textarea) {
                    textarea.addEventListener('input', function() {
                        if (isBulkMode) {
                            var lines = textarea.value.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
                            if (badgeCount) badgeCount.innerText = lines.length;
                        }
                    });
                }

                var pushBtn = document.getElementById('sap_btn_manual_push');
                var pushRes = document.getElementById('sap_manual_push_result');
                if (pushBtn && pushRes) {
                    pushBtn.addEventListener('click', function() {
                        pushBtn.disabled = true;
                        pushBtn.innerText = 'Dispatching...';
                        pushRes.style.display = 'block';
                        pushRes.style.color = '#0369a1';
                        pushRes.innerText = 'Sending post to Social Auto Poster...';

                        var fd = new FormData();
                        fd.append('action', 'sap_manual_dispatch');
                        fd.append('post_id', '<?php echo esc_js($post->ID); ?>');
                        fd.append('nonce', '<?php echo esc_js(wp_create_nonce('sap_manual_nonce')); ?>');

                        fetch(ajaxurl, {
                            method: 'POST',
                            body: fd
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                            pushBtn.disabled = false;
                            pushBtn.innerText = '🚀 Re-dispatch Now';
                            if (data.success) {
                                pushRes.style.color = '#065f46';
                                pushRes.innerText = '✅ Dispatched successfully to social channels!';
                            } else {
                                pushRes.style.color = '#991b1b';
                                pushRes.innerText = '❌ Failed: ' + (data.data.message || 'Error dispatching');
                            }
                        })
                        .catch(function(err) {
                            pushBtn.disabled = false;
                            pushBtn.innerText = '🚀 Re-dispatch Now';
                            pushRes.style.color = '#991b1b';
                            pushRes.innerText = '❌ Error: ' + err.message;
                        });
                    });
                }
            });
        })();
        </script>
        <?php
    }

    public function save_social_titles_meta_box($post_id, $post) {
        if (!isset($_POST['sap_titles_nonce']) || !wp_verify_nonce($_POST['sap_titles_nonce'], 'sap_save_titles_nonce')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        if (isset($_POST['sap_social_titles'])) {
            $sanitized = sanitize_textarea_field($_POST['sap_social_titles']);
            update_post_meta($post_id, '_sap_social_titles', $sanitized);
        }

        if (isset($_POST['sap_page_variations'])) {
            $variations_raw = wp_unslash($_POST['sap_page_variations']);
            update_post_meta($post_id, '_sap_page_variations', $variations_raw);
        }
    }

    /* ==========================================================================
       3. INSTANT PUBLISH HOOK & DISPATCH
       ========================================================================== */

    public function handle_post_transition($new_status, $old_status, $post) {
        if (!is_object($post) || $post->post_type !== 'post') {
            return;
        }

        // Only fire when post becomes published
        if ($new_status !== 'publish') {
            return;
        }

        $auto_publish = get_option('sap_auto_publish', '1');
        if ($auto_publish !== '1') {
            return;
        }

        // Queue post ID for shutdown dispatch (allows Auto Engine, watermarks and SEO to finish saving image & content)
        if ($old_status !== 'publish') {
            $this->pending_dispatch_posts[$post->ID] = true;
        }
    }

    public function handle_save_post($post_id, $post) {
        if (!is_object($post) || $post->post_type !== 'post') {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (wp_is_post_revision($post_id)) {
            return;
        }

        if ($post->post_status !== 'publish') {
            return;
        }

        $auto_publish = get_option('sap_auto_publish', '1');
        if ($auto_publish !== '1') {
            return;
        }

        // Check if recently dispatched within 90 seconds
        $last_dispatched = get_post_meta($post_id, '_sap_dispatched_at', true);
        if ($last_dispatched && (time() - intval($last_dispatched)) < 90) {
            return;
        }

        $this->pending_dispatch_posts[$post_id] = true;
    }

    public function handle_shutdown_dispatch() {
        if (empty($this->pending_dispatch_posts)) {
            return;
        }

        $posts_to_process = array_keys($this->pending_dispatch_posts);
        $this->pending_dispatch_posts = array(); // Clear to prevent recursive loops

        foreach ($posts_to_process as $post_id) {
            // Prevent duplicate dispatch within 90 seconds
            $last_dispatched = get_post_meta($post_id, '_sap_dispatched_at', true);
            if ($last_dispatched && (time() - intval($last_dispatched)) < 90) {
                continue;
            }

            $fresh_post = get_post($post_id);
            if (!$fresh_post || $fresh_post->post_status !== 'publish') {
                continue;
            }

            $result = $this->dispatch_post_payload($fresh_post, true);
            if ($result && !empty($result['success'])) {
                update_post_meta($post_id, '_sap_dispatched_at', time());
            }
        }
    }

    public function ajax_manual_dispatch() {
        check_ajax_referer('sap_manual_nonce', 'nonce');
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;
        if (!$post_id || !current_user_can('edit_post', $post_id)) {
            wp_send_json_error(array('message' => 'Unauthorized or invalid post.'));
        }

        $post = get_post($post_id);
        if (!$post) {
            wp_send_json_error(array('message' => 'Post not found.'));
        }

        $result = $this->dispatch_post_payload($post, true);
        if ($result['success']) {
            update_post_meta($post_id, '_sap_dispatched_at', time());
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function normalize_image_url($url) {
        if (empty($url) || !is_string($url)) return '';
        $clean = trim($url);
        if (strpos($clean, '//') === 0) {
            $clean = 'https:' . $clean;
        } elseif (strpos($clean, '/') === 0) {
            $clean = rtrim(get_site_url(), '/') . $clean;
        }
        return $clean;
    }

    public function is_valid_image_url($url) {
        if (empty($url) || !is_string($url)) return false;
        $clean = $this->normalize_image_url($url);
        $lower = strtolower($clean);
        if (strpos($clean, 'http://') !== 0 && strpos($clean, 'https://') !== 0) return false;
        if (strpos($lower, 'avatar') !== false ||
            strpos($lower, 'gravatar') !== false ||
            strpos($lower, 'editoricon') !== false ||
            strpos($lower, 'emoji') !== false ||
            strpos($lower, 'wp-includes') !== false ||
            strpos($lower, 'favicon') !== false ||
            strpos($lower, 'picsum.photos') !== false ||
            substr($lower, -4) === '.svg') {
            return false;
        }
        return true;
    }

    public function extract_url_from_img_tag($html) {
        if (empty($html) || !is_string($html)) return '';
        // Match src, data-src, data-lazy-src, data-original, data-actualsrc
        if (preg_match_all('/(?:src|data-src|data-lazy-src|data-original|data-actualsrc)=["\']([^"\']+)["\']/i', $html, $matches)) {
            foreach ($matches[1] as $candidate) {
                $cand = $this->normalize_image_url($candidate);
                if ($this->is_valid_image_url($cand)) {
                    return $cand;
                }
            }
        }

        // Also check srcset attribute for high-res responsive images
        if (preg_match('/srcset=["\']([^"\']+)["\']/i', $html, $srcset_m)) {
            $parts = explode(',', $srcset_m[1]);
            foreach ($parts as $part) {
                $token = trim(explode(' ', trim($part))[0]);
                $cand = $this->normalize_image_url($token);
                if ($this->is_valid_image_url($cand)) {
                    return $cand;
                }
            }
        }

        return '';
    }

    /**
     * Unified multi-strategy image extractor.
     * Priority:
     * 1. Standard WordPress featured image (thumbnail)
     * 2. Auto Engine external image post meta (_ae_external_featured_image)
     * 3. Known external featured image plugins post meta (fifu_image_url, featured_image_url, etc.)
     * 4. Top article content image (<figure class="ae-inline-image"><img ...>, Gutenberg wp:image, standard <img>)
     * 5. Attached image media in WordPress library
     */
    public function extract_post_image($post_or_id) {
        $post = is_object($post_or_id) ? $post_or_id : get_post($post_or_id);
        if (!$post) {
            return '';
        }
        $post_id = $post->ID;

        // 1. Standard WordPress Featured Image (Thumbnail)
        $thumbnail_id = get_post_thumbnail_id($post_id);
        if ($thumbnail_id) {
            $img_src = wp_get_attachment_image_src($thumbnail_id, 'full');
            if ($img_src && !empty($img_src[0]) && $this->is_valid_image_url($img_src[0])) {
                return esc_url_raw($this->normalize_image_url($img_src[0]));
            }
        }

        // 2. Auto Engine External Featured Image Meta (_ae_external_featured_image)
        $ae_img = get_post_meta($post_id, '_ae_external_featured_image', true);
        if (!empty($ae_img) && is_string($ae_img) && $this->is_valid_image_url($ae_img)) {
            return esc_url_raw($this->normalize_image_url($ae_img));
        }

        // 3. Known external featured image plugins meta
        $meta_keys = array(
            'featured_image_url',
            '_featured_image_url',
            'fifu_image_url',
            '_knawatfmp_featured_post',
            'kd_featured_image',
            'external_image_url',
        );
        foreach ($meta_keys as $mk) {
            $val = get_post_meta($post_id, $mk, true);
            if (!empty($val) && is_string($val) && $this->is_valid_image_url($val)) {
                return esc_url_raw($this->normalize_image_url($val));
            }
        }

        // 4. Extract first genuine content image from $post->post_content
        // (Supports <figure class="ae-inline-image"><img ...>, Gutenberg blocks, lazyload attributes)
        if (!empty($post->post_content)) {
            $content = $post->post_content;

            // Strategy 4A: Check for <figure class="ae-inline-image"> or any <figure> with <img>
            if (preg_match_all('/<figure[^>]*>([\s\S]*?)<\/figure>/i', $content, $fig_matches)) {
                foreach ($fig_matches[1] as $fig_html) {
                    $cand = $this->extract_url_from_img_tag($fig_html);
                    if (!empty($cand)) {
                        return esc_url_raw($cand);
                    }
                }
            }

            // Strategy 4B: Check all <img> tags in content
            if (preg_match_all('/<img\b[^>]*>/i', $content, $img_tags)) {
                foreach ($img_tags[0] as $tag) {
                    $cand = $this->extract_url_from_img_tag($tag);
                    if (!empty($cand)) {
                        return esc_url_raw($cand);
                    }
                }
            }

            // Strategy 4C: Check Gutenberg block comments <!-- wp:image {"url":"..."} -->
            if (preg_match_all('/<!--\s*wp:image\b[^>]*?(\{[\s\S]*?\})\s*-->/i', $content, $wp_matches)) {
                foreach ($wp_matches[1] as $json_str) {
                    $data = json_decode($json_str, true);
                    if (!empty($data['url']) && $this->is_valid_image_url($data['url'])) {
                        return esc_url_raw($this->normalize_image_url($data['url']));
                    }
                }
            }
        }

        // 5. Check attached media in WordPress Media Library
        $attachments = get_posts(array(
            'post_type'      => 'attachment',
            'post_mime_type' => 'image',
            'posts_per_page' => 1,
            'post_parent'    => $post_id,
            'orderby'        => 'menu_order',
            'order'          => 'ASC',
        ));
        if (!empty($attachments)) {
            $att_src = wp_get_attachment_image_src($attachments[0]->ID, 'full');
            if ($att_src && !empty($att_src[0]) && $this->is_valid_image_url($att_src[0])) {
                return esc_url_raw($this->normalize_image_url($att_src[0]));
            }
        }

        return '';
    }

    public function dispatch_post_payload($post, $blocking = false) {
        $webhook_url = get_option('sap_webhook_url', '');
        $secret_key = get_option('sap_secret_key', '');

        if (empty($webhook_url)) {
            return array('success' => false, 'message' => 'Webhook URL is not configured in Social Auto Poster settings.');
        }

        $post_id = $post->ID;
        $main_title = get_the_title($post_id);

        // 1. Retrieve raw variations and social titles (with $_POST fallback if just published)
        $raw_titles = get_post_meta($post_id, '_sap_social_titles', true);
        if (empty($raw_titles) && isset($_POST['sap_social_titles'])) {
            $raw_titles = sanitize_textarea_field($_POST['sap_social_titles']);
        }

        $raw_variations = get_post_meta($post_id, '_sap_page_variations', true);
        if (empty($raw_variations) && isset($_POST['sap_page_variations'])) {
            $raw_variations = wp_unslash($_POST['sap_page_variations']);
        }

        $parsed_variations = array();
        if (!empty($raw_variations)) {
            $decoded = json_decode($raw_variations, true);
            if (is_array($decoded)) {
                $parsed_variations = $decoded;
            }
        }

        // Parse titles line by line
        $social_titles = array();
        if (!empty($raw_titles)) {
            $lines = explode("\n", str_replace("\r", "", $raw_titles));
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if (!empty($trimmed)) {
                    $social_titles[] = $trimmed;
                }
            }
        }

        // Robust multi-strategy featured image extraction (content, figure, AE meta, thumbnail)
        $featured_image = $this->extract_post_image($post);

        // Categories
        $categories = wp_get_post_categories($post_id, array('fields' => 'names'));

        // Excerpt
        $excerpt = has_excerpt($post_id) ? get_the_excerpt($post_id) : wp_trim_words(strip_shortcodes($post->post_content), 35);

        // Permalink
        $permalink = get_permalink($post_id);

        $payload = array(
            'event'          => 'post_published',
            'post_id'        => $post_id,
            'title'          => $main_title,
            'main_title'     => $main_title,
            'variations'     => $parsed_variations,
            'social_titles'  => $social_titles,
            'permalink'      => $permalink,
            'image_url'      => $featured_image,
            'featured_image' => $featured_image,
            'content_html'   => $post->post_content,
            'excerpt'        => $excerpt,
            'categories'     => $categories,
            'category'       => !empty($categories) ? $categories[0] : 'General',
            'author'         => get_the_author_meta('display_name', $post->post_author),
            'published_at'   => get_the_date('c', $post_id),
            'site_url'       => get_site_url(),
            'site_name'      => get_bloginfo('name'),
        );

        $target_url = $webhook_url;
        if (strpos($target_url, 'secret=') === false && !empty($secret_key)) {
            $separator = (strpos($target_url, '?') !== false) ? '&' : '?';
            $target_url .= $separator . 'secret=' . urlencode($secret_key);
        }

        $args = array(
            'body'        => wp_json_encode($payload),
            'headers'     => array(
                'Content-Type' => 'application/json',
                'X-SAP-Secret' => $secret_key,
            ),
            'timeout'     => 15,
            'blocking'    => true, // Reliably wait for server to ingest & avoid SSL handshake premature cutoff
            'data_format' => 'body',
        );

        $response = wp_remote_post($target_url, $args);

        if (is_wp_error($response)) {
            $err_msg = $response->get_error_message();
            update_post_meta($post_id, '_sap_last_dispatch_status', 'error: ' . $err_msg);
            return array('success' => false, 'message' => $err_msg);
        }

        $code = wp_remote_retrieve_response_code($response);
        $resBody = wp_remote_retrieve_body($response);
        $parsed = json_decode($resBody, true);

        if ($code >= 200 && $code < 300) {
            if (!empty($parsed['skipped'])) {
                $skip_msg = !empty($parsed['message']) ? $parsed['message'] : 'Post category did not match active rule.';
                update_post_meta($post_id, '_sap_last_dispatch_status', 'skipped: ' . $skip_msg);
                return array('success' => true, 'skipped' => true, 'message' => $skip_msg);
            }
            $disp_count = isset($parsed['dispatchedCount']) ? $parsed['dispatchedCount'] : 1;
            $success_msg = !empty($parsed['message']) ? $parsed['message'] : 'Dispatched to ' . $disp_count . ' social pages.';
            update_post_meta($post_id, '_sap_last_dispatch_status', 'success: ' . $success_msg);
            return array('success' => true, 'count' => $disp_count, 'message' => $success_msg);
        }

        $err_msg = isset($parsed['error']) ? $parsed['error'] : 'HTTP ' . $code;
        update_post_meta($post_id, '_sap_last_dispatch_status', 'error: ' . $err_msg);
        return array('success' => false, 'message' => $err_msg);
    }

    /* ==========================================================================
       4. REST API ENDPOINTS (PING, CATEGORIES, FETCH POSTS, PUBLISH TO WP)
       ========================================================================== */

    public function register_rest_routes() {
        // 1. Health check & verification ping
        register_rest_route('social-poster/v1', '/ping', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_ping_handler'),
            'permission_callback' => '__return_true',
        ));

        // 2. Fetch all categories
        register_rest_route('social-poster/v1', '/categories', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_categories_handler'),
            'permission_callback' => '__return_true',
        ));

        // 3. Fetch recent posts with multi-titles
        register_rest_route('social-poster/v1', '/posts', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_posts_handler'),
            'permission_callback' => '__return_true',
        ));

        // 4. Publish post TO WordPress from SaaS
        register_rest_route('social-poster/v1', '/publish', array(
            'methods'             => 'POST',
            'callback'            => array($this, 'rest_publish_handler'),
            'permission_callback' => array($this, 'verify_rest_secret'),
        ));
    }

    public function verify_rest_secret($request) {
        $saved_secret = get_option('sap_secret_key', '');
        if (empty($saved_secret)) {
            return false;
        }

        $header_secret = $request->get_header('x-sap-secret');
        $query_secret = $request->get_param('secret');
        $provided = !empty($header_secret) ? $header_secret : $query_secret;

        return hash_equals($saved_secret, (string)$provided);
    }

    private function get_formatted_categories() {
        $categories_raw = get_categories(array(
            'hide_empty' => false,
            'orderby'    => 'count',
            'order'      => 'DESC',
        ));

        $categories = array();
        foreach ($categories_raw as $cat) {
            $categories[] = array(
                'id'    => (int)$cat->term_id,
                'name'  => $cat->name,
                'slug'  => $cat->slug,
                'count' => (int)$cat->count,
            );
        }
        return $categories;
    }

    public function rest_ping_handler() {
        $categories = $this->get_formatted_categories();
        $published_posts_count = wp_count_posts('post')->publish;

        return rest_ensure_response(array(
            'status'                => 'active',
            'plugin'                => 'Social Auto Poster Connector',
            'version'               => SAP_CONNECTOR_VERSION,
            'site_name'             => get_bloginfo('name'),
            'site_url'              => get_site_url(),
            'configured'            => !empty(get_option('sap_webhook_url')),
            'supports_multi_titles' => true,
            'supports_publishing'   => true,
            'supports_fetching'     => true,
            'categories'            => $categories,
            'total_categories'      => count($categories),
            'published_posts_count' => (int)$published_posts_count,
        ));
    }

    public function rest_categories_handler() {
        $categories = $this->get_formatted_categories();
        return rest_ensure_response(array(
            'success'    => true,
            'count'      => count($categories),
            'categories' => $categories,
        ));
    }

    public function rest_posts_handler($request) {
        $per_page = $request->get_param('per_page') ? intval($request->get_param('per_page')) : 15;
        $category_slug = $request->get_param('category');

        $args = array(
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'posts_per_page' => min(50, max(1, $per_page)),
            'orderby'        => 'date',
            'order'          => 'DESC',
        );

        if (!empty($category_slug)) {
            $args['category_name'] = sanitize_text_field($category_slug);
        }

        $query = new WP_Query($args);
        $posts_data = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $pid = get_the_ID();
                $raw_titles = get_post_meta($pid, '_sap_social_titles', true);
                $social_titles = array();
                if (!empty($raw_titles)) {
                    $lines = explode("\n", str_replace("\r", "", $raw_titles));
                    foreach ($lines as $line) {
                        $trimmed = trim($line);
                        if (!empty($trimmed)) {
                            $social_titles[] = $trimmed;
                        }
                    }
                }

                $img_url = $this->extract_post_image($pid);

                $posts_data[] = array(
                    'id'             => $pid,
                    'title'          => get_the_title(),
                    'social_titles'  => $social_titles,
                    'permalink'      => get_permalink(),
                    'featured_image' => $img_url,
                    'image_url'      => $img_url,
                    'content_html'   => get_the_content(),
                    'categories'     => wp_get_post_categories($pid, array('fields' => 'names')),
                    'excerpt'        => get_the_excerpt(),
                    'published_at'   => get_the_date('c'),
                    'author'         => get_the_author(),
                );
            }
            wp_reset_postdata();
        }

        return rest_ensure_response(array(
            'success' => true,
            'count'   => count($posts_data),
            'posts'   => $posts_data,
        ));
    }

    public function rest_publish_handler($request) {
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = $request->get_params();
        }

        $title = !empty($params['title']) ? sanitize_text_field($params['title']) : '';
        $content = !empty($params['content']) ? wp_kses_post($params['content']) : '';
        $excerpt = !empty($params['excerpt']) ? sanitize_textarea_field($params['excerpt']) : '';
        $status = !empty($params['status']) && in_array($params['status'], array('publish', 'draft')) ? $params['status'] : 'publish';
        $social_titles = !empty($params['social_titles']) && is_array($params['social_titles']) ? $params['social_titles'] : array();

        if (empty($title)) {
            return new WP_Error('missing_title', 'Post title is required', array('status' => 400));
        }

        // Create post
        $post_data = array(
            'post_title'   => $title,
            'post_content' => $content,
            'post_excerpt' => $excerpt,
            'post_status'  => $status,
            'post_type'    => 'post',
        );

        $post_id = wp_insert_post($post_data, true);
        if (is_wp_error($post_id)) {
            return new WP_Error('insert_failed', $post_id->get_error_message(), array('status' => 500));
        }

        // Save multi-titles if provided
        if (!empty($social_titles)) {
            $titles_str = implode("\n", array_map('sanitize_text_field', $social_titles));
            update_post_meta($post_id, '_sap_social_titles', $titles_str);
        }

        // Assign categories
        if (!empty($params['categories']) && is_array($params['categories'])) {
            $cat_ids = array();
            foreach ($params['categories'] as $cat_val) {
                if (is_numeric($cat_val)) {
                    $cat_ids[] = (int)$cat_val;
                } else {
                    $term = get_term_by('name', $cat_val, 'category');
                    if ($term) {
                        $cat_ids[] = $term->term_id;
                    } else {
                        $new_cat = wp_insert_term($cat_val, 'category');
                        if (!is_wp_error($new_cat) && isset($new_cat['term_id'])) {
                            $cat_ids[] = (int)$new_cat['term_id'];
                        }
                    }
                }
            }
            if (!empty($cat_ids)) {
                wp_set_post_categories($post_id, $cat_ids);
            }
        }

        return rest_ensure_response(array(
            'success'   => true,
            'post_id'   => $post_id,
            'permalink' => get_permalink($post_id),
            'status'    => $status,
            'message'   => 'Post created on WordPress successfully!',
        ));
    }
}

// Initialize Plugin
Social_Auto_Poster_Connector::get_instance();
