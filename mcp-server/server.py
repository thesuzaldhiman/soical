#!/usr/bin/env python3
import sys
import json
import urllib.request
import urllib.parse
import os

APP_URL = os.environ.get("APP_API_URL", "https://game.khabarmonkey.com").rstrip("/")
MCP_SECRET = os.environ.get("MCP_SECRET_KEY", "sap_mcp_live_secret_99x8a7b6c5d4e3")
DEFAULT_USER_EMAIL = os.environ.get("USER_EMAIL", "me.sumitji@gmail.com").strip().lower()

def call_app_api(endpoint, method="GET", body_data=None, email_override=None):
    target_email = (email_override or DEFAULT_USER_EMAIL).strip().lower()
    sep = "&" if "?" in endpoint else "?"
    url = f"{APP_URL}{endpoint}{sep}secret={urllib.parse.quote(MCP_SECRET)}&email={urllib.parse.quote(target_email)}"

    headers = {
        "Content-Type": "application/json",
        "x-mcp-secret": MCP_SECRET,
        "User-Agent": "SocialPosterMCP/1.0"
    }

    data_bytes = None
    if method == "POST":
        payload = {"email": target_email}
        if body_data:
            payload.update(body_data)
        data_bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_body)
            msg = err_json.get("error", f"HTTP {e.code}")
        except Exception:
            msg = f"HTTP {e.code}: {error_body[:200]}"
        raise RuntimeError(f"Social Auto Poster API error ({e.code}): {msg}")
    except Exception as e:
        raise RuntimeError(f"Network error contacting Social Auto Poster ({APP_URL}): {str(e)}")

TOOLS = [
    {
        "name": "list_targets",
        "description": "Lists all connected destinations (WordPress sites, Facebook Pages, Instagram accounts) and configured Page Categories belonging to the connected user account. Shows which pages belong to which category so you can target by Category name, by WordPress only, or by specific page IDs.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": f"User account email (defaults to {DEFAULT_USER_EMAIL}).",
                    "default": DEFAULT_USER_EMAIL,
                },
                "filterMode": {
                    "type": "string",
                    "enum": ["all", "wordpress_only", "social_only"],
                    "description": "Filter destinations by platform type.",
                    "default": "all",
                },
            },
        },
    },
    {
        "name": "schedule_posts",
        "description": "Schedules single or bulk posts across WordPress websites, Facebook Pages, or whole Categories. Supports automated interval spacing (e.g. every 45 mins), start times, rich HTML content for WordPress, featured images, and Facebook first comment links.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": f"User account email (defaults to {DEFAULT_USER_EMAIL}).",
                    "default": DEFAULT_USER_EMAIL,
                },
                "targetMode": {
                    "type": "string",
                    "enum": ["wordpress_only", "social_only", "all"],
                    "description": "Whether to target WordPress sites only, Social media pages only, or all destinations.",
                    "default": "all",
                },
                "targetCategoryNames": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Names of Page Categories to target (e.g. [\"Himachal\", \"Cricket\"]). All pages belonging to these categories will receive the post automatically.",
                },
                "targetPageIds": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Explicit destination page IDs if targeting specific sites or pages directly.",
                },
                "startDate": {
                    "type": "string",
                    "description": "Date to begin scheduling (format: YYYY-MM-DD, e.g. \"2026-11-28\"). Defaults to today.",
                },
                "startTime": {
                    "type": "string",
                    "description": "Time of day to start posting (format: \"HH:mm\" e.g. \"10:00\" or ISO string).",
                },
                "intervalMinutes": {
                    "type": "number",
                    "description": "Minutes between successive posts in the batch (e.g. 45). Automatically spaces out all posts.",
                    "default": 45,
                },
                "jitterMinutes": {
                    "type": "number",
                    "description": "Optional random jitter (+/- minutes) to make publishing cadence look organic.",
                    "default": 5,
                },
                "posts": {
                    "type": "array",
                    "description": "Array of posts to schedule.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string", "description": "Headline / WordPress title / Card title."},
                            "message": {"type": "string", "description": "Social media caption, short description, or news body."},
                            "contentHtml": {"type": "string", "description": "Optional rich HTML content for WordPress blog articles."},
                            "mediaUrl": {"type": "string", "description": "Public URL of image, infographic, or WordPress featured image."},
                            "linkUrl": {"type": "string", "description": "Optional reference link or article URL."},
                            "commentText": {"type": "string", "description": "First comment text (e.g. link in comment)."},
                            "postType": {"type": "string", "enum": ["text", "image", "video", "link"], "description": "Type of post."},
                            "wpCategory": {"type": "string", "description": "WordPress category name."},
                            "wpTags": {"type": "array", "items": {"type": "string"}, "description": "WordPress tags for SEO."},
                        },
                        "required": ["message"],
                    },
                },
                "publishNow": {
                    "type": "boolean",
                    "description": "Set to true to publish live immediately instead of scheduling.",
                    "default": False,
                },
            },
            "required": ["posts"],
        },
    },
    {
        "name": "get_queue_status",
        "description": "Checks current scheduled queue, count of pending dispatches, and next available publishing time slot for the user account.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": f"User account email (defaults to {DEFAULT_USER_EMAIL}).",
                    "default": DEFAULT_USER_EMAIL,
                },
            },
        },
    },
    {
        "name": "publish_instant_post",
        "description": "Publishes a single post live right now across WordPress sites, Facebook Pages, or categories without queuing.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": f"User account email (defaults to {DEFAULT_USER_EMAIL}).", "default": DEFAULT_USER_EMAIL},
                "title": {"type": "string", "description": "Title or headline"},
                "message": {"type": "string", "description": "Post caption or text"},
                "contentHtml": {"type": "string", "description": "Rich HTML body for WordPress"},
                "mediaUrl": {"type": "string", "description": "Image or featured image URL"},
                "commentText": {"type": "string", "description": "First comment text"},
                "targetMode": {"type": "string", "enum": ["wordpress_only", "social_only", "all"], "default": "all"},
                "targetCategoryNames": {"type": "array", "items": {"type": "string"}},
                "targetPageIds": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["message"],
        },
    },
]

def handle_call_tool(params):
    name = params.get("name")
    args = params.get("arguments", {})
    user_email = args.get("email") or DEFAULT_USER_EMAIL

    if name == "list_targets":
        data = call_app_api(f"/api/mcp?action=targets", "GET", email_override=user_email)
        filter_mode = args.get("filterMode", "all")
        wp = data.get("wordpressSites", [])
        social = data.get("socialPages", [])
        if filter_mode == "wordpress_only":
            social = []
        elif filter_mode == "social_only":
            wp = []
        res_data = {
            "userEmail": user_email,
            "summary": f"Account [{user_email}]: Found {len(wp)} WordPress site(s), {len(social)} social page(s), and {len(data.get('categories', []))} category groups.",
            "wordpressSites": wp,
            "socialPages": social,
            "categories": data.get("categories", []),
        }
        return {"content": [{"type": "text", "text": json.dumps(res_data, indent=2)}]}

    elif name == "schedule_posts":
        payload = dict(args)
        payload["email"] = user_email
        data = call_app_api("/api/mcp", "POST", body_data=payload, email_override=user_email)
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}

    elif name == "get_queue_status":
        data = call_app_api(f"/api/mcp?action=queue", "GET", email_override=user_email)
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}

    elif name == "publish_instant_post":
        payload = {
            "action": "schedule",
            "publishNow": True,
            "email": user_email,
            "targetMode": args.get("targetMode", "all"),
            "targetCategoryNames": args.get("targetCategoryNames", []),
            "targetPageIds": args.get("targetPageIds", []),
            "posts": [
                {
                    "title": args.get("title"),
                    "message": args.get("message"),
                    "contentHtml": args.get("contentHtml"),
                    "mediaUrl": args.get("mediaUrl"),
                    "commentText": args.get("commentText"),
                }
            ],
        }
        data = call_app_api("/api/mcp", "POST", body_data=payload, email_override=user_email)
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}

    else:
        raise ValueError(f"Unknown tool: {name}")

def send_response(req_id, result=None, error=None):
    resp = {"jsonrpc": "2.0", "id": req_id}
    if error is not None:
        resp["error"] = error
    else:
        resp["result"] = result
    out = json.dumps(resp)
    sys.stdout.write(out + "\n")
    sys.stdout.flush()

def main():
    sys.stderr.write(f"Social Poster MCP Server (Python stdio) running for user [{DEFAULT_USER_EMAIL}]\n")
    sys.stderr.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception as e:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            send_response(req_id, result={
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "social-poster-mcp",
                    "version": "1.0.0"
                }
            })
        elif method == "notifications/initialized":
            pass
        elif method == "ping":
            send_response(req_id, result={})
        elif method == "tools/list":
            send_response(req_id, result={"tools": TOOLS})
        elif method == "tools/call":
            try:
                res = handle_call_tool(params)
                send_response(req_id, result=res)
            except Exception as e:
                send_response(req_id, result={
                    "isError": True,
                    "content": [{"type": "text", "text": f"Error: {str(e)}"}]
                })
        else:
            if req_id is not None:
                send_response(req_id, error={"code": -32601, "message": f"Method not found: {method}"})

if __name__ == "__main__":
    main()
