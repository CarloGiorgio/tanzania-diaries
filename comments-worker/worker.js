/**
 * Comments backend for the Tanzania Diaries, on a free Cloudflare Worker + D1.
 *
 * Why this exists: GitHub Pages is static, so it can't store or moderate
 * reader comments. This Worker does: anyone can POST a comment (no login),
 * it's saved as "pending", and only Carlo/Andrea (GitHub login) can approve
 * or delete it. The public site only ever sees "approved" comments.
 *
 * Storage: one D1 table (see schema.sql).
 *
 * Config:
 *   - D1 binding named DB          (wrangler.toml)
 *   - MODERATORS var, comma list of GitHub logins allowed to moderate
 *     (default "CarloGiorgio"). Set in wrangler.toml [vars] or as a secret.
 */

const ALLOWED_ORIGIN = "https://carlogiorgio.github.io";

const MAX_NAME = 60;
const MAX_BODY = 2000;

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

// Verify the caller is an allowed moderator. Returns the GitHub login or null.
async function moderator(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^(token|Bearer)\s+/i, "").trim();
  if (!token) return null;

  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "tanzania-diaries-comments",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) return null;
  const user = await res.json();
  const allowed = (env.MODERATORS || "CarloGiorgio")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  if (!user.login || !allowed.includes(user.login.toLowerCase())) return null;
  return user.login;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    // ---- Public: submit a comment -------------------------------------
    if (path === "/api/comments" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ error: "Bad JSON" }, 400);
      }
      const postId = String(data.post_id || "").trim();
      let name = String(data.name || "").trim();
      const body = String(data.body || "").trim();

      if (!postId || postId.length > 200) return json({ error: "Missing post" }, 400);
      if (!body) return json({ error: "Comment is empty" }, 400);
      if (body.length > MAX_BODY) return json({ error: "Comment too long" }, 400);
      if (!name) name = "Anonymous";
      if (name.length > MAX_NAME) name = name.slice(0, MAX_NAME);

      await env.DB.prepare(
        "INSERT INTO comments (post_id, name, body, status, created_at) VALUES (?, ?, ?, 'pending', ?)"
      )
        .bind(postId, name, body, Date.now())
        .run();

      return json({ ok: true, status: "pending" });
    }

    // ---- Public: list approved comments for a post --------------------
    if (path === "/api/comments" && request.method === "GET") {
      const postId = url.searchParams.get("post_id");
      if (!postId) return json({ error: "Missing post" }, 400);
      const { results } = await env.DB.prepare(
        "SELECT id, name, body, created_at FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC"
      )
        .bind(postId)
        .all();
      return json({ comments: results || [] });
    }

    // ---- Moderator: list all pending comments -------------------------
    if (path === "/api/pending" && request.method === "GET") {
      const who = await moderator(request, env);
      if (!who) return json({ error: "Not authorized" }, 401);
      const { results } = await env.DB.prepare(
        "SELECT id, post_id, name, body, created_at FROM comments WHERE status = 'pending' ORDER BY created_at ASC"
      ).all();
      return json({ comments: results || [] });
    }

    // ---- Moderator: approve or delete a comment -----------------------
    if (path === "/api/moderate" && request.method === "POST") {
      const who = await moderator(request, env);
      if (!who) return json({ error: "Not authorized" }, 401);
      let data;
      try {
        data = await request.json();
      } catch {
        return json({ error: "Bad JSON" }, 400);
      }
      const id = parseInt(data.id, 10);
      const action = String(data.action || "");
      if (!id) return json({ error: "Missing id" }, 400);

      if (action === "approve") {
        await env.DB.prepare("UPDATE comments SET status = 'approved' WHERE id = ?")
          .bind(id)
          .run();
      } else if (action === "reject") {
        await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
      } else {
        return json({ error: "Unknown action" }, 400);
      }
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  },
};
