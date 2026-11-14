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
        ?>
        <div class="wrap" style="max-width: 860px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="background: #ffffff; padding: 24px 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
                    <div>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a;">
                            ⚡ Social Auto Poster Connector
                        </h1>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">
                            WordPress ko CreatorFlow Social Auto Poster SaaS se jodein aur automatic multi-title posting karein.
                        </p>
                    </div>
                    <span style="background: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 11px; padding: 4px 10px; border-radius: 9999px;">
                        v<?php echo esc_html(SAP_CONNECTOR_VERSION); ?> Active
                    </span>
                </div>

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
                    <li>Social Auto Poster har Facebook page ke liye alag image banakar publish karega aur first comment mein link add kar dega!</li>
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
       4. REST API VERIFICATION ENDPOINT
       ========================================================================== */

    public function register_rest_routes() {
        register_rest_route('social-poster/v1', '/ping', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'rest_ping_handler'),
            'permission_callback' => '__return_true',
        ));
    }

    public function rest_ping_handler() {
        return rest_ensure_response(array(
            'status'         => 'active',
            'plugin'         => 'Social Auto Poster Connector',
            'version'        => SAP_CONNECTOR_VERSION,
            'site_name'      => get_bloginfo('name'),
            'site_url'       => get_site_url(),
            'configured'     => !empty(get_option('sap_webhook_url')),
            'supports_multi_titles' => true,
        ));
    }
}

// Initialize Plugin
Social_Auto_Poster_Connector::get_instance();
