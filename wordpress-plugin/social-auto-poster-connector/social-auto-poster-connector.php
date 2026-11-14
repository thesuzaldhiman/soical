<?php
/**
 * Plugin Name: Social Auto Poster Connector (Multi-Titles & Instant Dispatch)
 * Plugin URI: https://game.khabarmonkey.com
 * Description: Connects WordPress directly to Social Auto Poster SaaS. Supports Multiple Social Titles per post (1 title per line) and automatically pushes published posts to your Facebook Pages and social channels with unique titles and first-comment links.
 * Version: 1.0.0
 * Author: Suzal Dhiman (Khabar Monkey Media)
 * Author URI: https://game.khabarmonkey.com
 * License: GPL-2.0+
 * Text Domain: social-auto-poster
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('SAP_CONNECTOR_VERSION', '1.0.0');
define('SAP_CONNECTOR_DIR', plugin_dir_path(__FILE__));
define('SAP_CONNECTOR_URL', plugin_dir_url(__FILE__));

class Social_Auto_Poster_Connector {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Admin menu & settings
        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_sap_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_sap_manual_dispatch', array($this, 'ajax_manual_dispatch'));

        // Post editor meta box
        add_action('add_meta_boxes', array($this, 'add_social_titles_meta_box'));
        add_action('save_post', array($this, 'save_social_titles_meta_box'), 10, 2);

        // Instant publish hook
        add_action('transition_post_status', array($this, 'handle_post_transition'), 10, 3);

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
        if (empty($transient->checked)) {
            return $transient;
        }

        $remote = $this->fetch_remote_info();
        if ($remote && version_compare(SAP_CONNECTOR_VERSION, $remote['version'], '<')) {
            $plugin_file = plugin_basename(__FILE__);
            $obj = new stdClass();
            $obj->slug = 'social-auto-poster-connector';
            $obj->plugin = $plugin_file;
            $obj->new_version = $remote['version'];
            $obj->url = isset($remote['homepage']) ? $remote['homepage'] : '';
            $obj->package = isset($remote['package']) ? $remote['package'] : '';
            $obj->tested = isset($remote['tested']) ? $remote['tested'] : '';
            $obj->requires_php = isset($remote['requires_php']) ? $remote['requires_php'] : '';
            $obj->icons = isset($remote['banners']) ? $remote['banners'] : array();
            $obj->banners = isset($remote['banners']) ? $remote['banners'] : array();

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
       2. POST EDITOR META BOX (PER LINE 1 TITLE)
       ========================================================================== */

    public function add_social_titles_meta_box() {
        add_meta_box(
            'sap_social_titles_box',
            '📱 Social Auto Poster — Multi-Page Titles',
            array($this, 'render_social_titles_meta_box'),
            'post',
            'normal',
            'high'
        );
    }

    public function render_social_titles_meta_box($post) {
        wp_nonce_field('sap_save_titles_nonce', 'sap_titles_nonce');
        $saved_titles = get_post_meta($post->ID, '_sap_social_titles', true);
        ?>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; line-height: 1.5;">
                Apne connected Facebook Pages ke liye yahan alag-alag titles daalein. 
                <strong>Har line mein ek title likhein (1 Title Per Line)</strong>.<br>
                <span style="font-size: 12px; color: #64748b;">
                    • Default Post Title ➔ Page A par jayega.<br>
                    • Line 1 Title ➔ Page B par jayega (naya image card banega).<br>
                    • Line 2 Title ➔ Page C par jayega (naya image card banega).<br>
                    • Line 3 Title ➔ Page D par jayega (naya image card banega).
                </span>
            </p>

            <textarea 
                name="sap_social_titles" 
                id="sap_social_titles" 
                rows="5" 
                style="width: 100%; padding: 10px 12px; font-family: monospace; font-size: 13px; line-height: 1.6; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; background: #fafafa;"
                placeholder="Line 1: Himachal Weather Alert: Bhaari barfbari ke baad 3 highway band&#10;Line 2: Kullu-Manali mein mausam ka kehar, pahaadon par safed chaadar&#10;Line 3: Shimla mein record barfbari, sailaniyon ke liye advisory jaari"
            ><?php echo esc_textarea($saved_titles); ?></textarea>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                <div id="sap_titles_counter" style="font-size: 12px; color: #334155; font-weight: 500;">
                    <span id="sap_badge_count" style="display: inline-block; background: #0f172a; color: #fff; padding: 2px 8px; border-radius: 12px; font-weight: 700; margin-right: 4px;">0</span>
                    <span>Extra Titles entered</span>
                </div>

                <?php if ($post->post_status === 'publish') : ?>
                    <button type="button" id="sap_btn_manual_push" class="button button-secondary" style="font-size: 12px; font-weight: 600; border-color: #0284c7; color: #0284c7;">
                        🚀 Re-dispatch to Social Poster Now
                    </button>
                <?php endif; ?>
            </div>

            <div id="sap_titles_preview_chips" style="display: flex; flex-direction: column; gap: 4px; margin-top: 10px;"></div>
            <div id="sap_manual_push_result" style="margin-top: 8px; font-size: 12px; display: none;"></div>
        </div>

        <script>
        (function() {
            function updateTitlesPreview() {
                var textarea = document.getElementById('sap_social_titles');
                var countBadge = document.getElementById('sap_badge_count');
                var chipsContainer = document.getElementById('sap_titles_preview_chips');
                if (!textarea || !countBadge || !chipsContainer) return;

                var raw = textarea.value || '';
                var lines = raw.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

                countBadge.innerText = lines.length;
                chipsContainer.innerHTML = '';

                if (lines.length > 0) {
                    var labels = ['Page B (Extra Title 1)', 'Page C (Extra Title 2)', 'Page D (Extra Title 3)', 'Page E (Extra Title 4)'];
                    lines.forEach(function(line, idx) {
                        var chip = document.createElement('div');
                        chip.style.cssText = 'padding: 4px 8px; background: #f1f5f9; border-left: 3px solid #0284c7; border-radius: 4px; font-size: 11px; color: #1e293b;';
                        var label = labels[idx] || ('Page ' + (idx + 2) + ' Title');
                        chip.innerHTML = '<strong style="color:#0369a1;">' + label + ':</strong> ' + escapeHtml(line);
                        chipsContainer.appendChild(chip);
                    });
                }
            }

            function escapeHtml(text) {
                var div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            document.addEventListener('DOMContentLoaded', function() {
                var textarea = document.getElementById('sap_social_titles');
                if (textarea) {
                    textarea.addEventListener('input', updateTitlesPreview);
                    updateTitlesPreview();
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
                            pushBtn.innerText = '🚀 Re-dispatch to Social Poster Now';
                            if (data.success) {
                                pushRes.style.color = '#065f46';
                                pushRes.innerText = '✅ Dispatched successfully to ' + (data.data.count || 1) + ' social channels!';
                            } else {
                                pushRes.style.color = '#991b1b';
                                pushRes.innerText = '❌ Failed: ' + (data.data.message || 'Error dispatching');
                            }
                        })
                        .catch(function(err) {
                            pushBtn.disabled = false;
                            pushBtn.innerText = '🚀 Re-dispatch to Social Poster Now';
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
    }

    /* ==========================================================================
       3. INSTANT PUBLISH HOOK & DISPATCH
       ========================================================================== */

    public function handle_post_transition($new_status, $old_status, $post) {
        if ($post->post_type !== 'post') {
            return;
        }

        // Only fire when post becomes published
        if ($new_status !== 'publish' || $old_status === 'publish') {
            return;
        }

        $auto_publish = get_option('sap_auto_publish', '1');
        if ($auto_publish !== '1') {
            return;
        }

        $this->dispatch_post_payload($post);
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
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result);
        }
    }

    public function dispatch_post_payload($post, $blocking = false) {
        $webhook_url = get_option('sap_webhook_url', '');
        $secret_key = get_option('sap_secret_key', '');

        if (empty($webhook_url)) {
            return array('success' => false, 'message' => 'Webhook URL is not configured in Social Auto Poster settings.');
        }

        $post_id = $post->ID;
        $main_title = get_the_title($post_id);
        $raw_titles = get_post_meta($post_id, '_sap_social_titles', true);

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

        // Featured Image
        $featured_image = '';
        $thumbnail_id = get_post_thumbnail_id($post_id);
        if ($thumbnail_id) {
            $img_src = wp_get_attachment_image_src($thumbnail_id, 'full');
            if ($img_src && !empty($img_src[0])) {
                $featured_image = $img_src[0];
            }
        }

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
            'social_titles'  => $social_titles,
            'permalink'      => $permalink,
            'image_url'      => $featured_image,
            'featured_image' => $featured_image,
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
            'timeout'     => $blocking ? 15 : 6,
            'blocking'    => $blocking, // Non-blocking during regular publish so editor doesn't wait
            'data_format' => 'body',
        );

        $response = wp_remote_post($target_url, $args);

        if ($blocking) {
            if (is_wp_error($response)) {
                return array('success' => false, 'message' => $response->get_error_message());
            }
            $code = wp_remote_retrieve_response_code($response);
            $resBody = wp_remote_retrieve_body($response);
            $parsed = json_decode($resBody, true);
            if ($code >= 200 && $code < 300) {
                return array('success' => true, 'count' => isset($parsed['dispatchedCount']) ? $parsed['dispatchedCount'] : 1);
            }
            return array('success' => false, 'message' => isset($parsed['error']) ? $parsed['error'] : 'HTTP ' . $code);
        }

        return array('success' => true);
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

                $thumbnail_id = get_post_thumbnail_id($pid);
                $img_url = '';
                if ($thumbnail_id) {
                    $src = wp_get_attachment_image_src($thumbnail_id, 'full');
                    if ($src && !empty($src[0])) $img_url = $src[0];
                }

                $posts_data[] = array(
                    'id'             => $pid,
                    'title'          => get_the_title(),
                    'social_titles'  => $social_titles,
                    'permalink'      => get_permalink(),
                    'featured_image' => $img_url,
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
