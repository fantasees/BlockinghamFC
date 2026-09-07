/**
 * Blockingham FC — Cloudflare Worker
 * ------------------------------------------------------------
 * Single-file Worker. Paste this whole file into the Cloudflare
 * dashboard's Worker "Edit code" editor — no build step needed.
 *
 * Required bindings (set these up in the dashboard under
 * Settings -> Variables and Bindings, AFTER you deploy this code):
 *   - KV Namespace  : POSTS      (create one, bind it as "POSTS")
 *   - R2 Bucket     : IMAGES     (create one, bind it as "IMAGES")
 *   - Env variable  : ADMIN_PASSWORD   (set to whatever you like — treat as secret)
 *   - Env variable  : WHATSAPP_LINK    (e.g. https://whatsapp.com/channel/xxxxx)
 *
 * See README.md for step-by-step click-by-click setup (no CLI needed).
 */

const SITE_NAME = "Blockingham FC";
const STADIUM_NAME = "Blockingham Park Stadium";
const CLUB_IMAGE =
  "https://raw.githubusercontent.com/fantasees/BlockinghamFC/refs/heads/main/IMG_4466.jpeg";
const COOKIE_NAME = "bfc_admin";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/" && request.method === "GET") return homePage(env);
      if (path === "/about" && request.method === "GET") return aboutPage(env);

      if (path === "/admin" && request.method === "GET") return adminPage(request, env);
      if (path === "/admin/login" && request.method === "POST") return handleLogin(request, env);
      if (path === "/admin/logout" && request.method === "GET") return handleLogout();

      if (path === "/api/posts" && request.method === "POST") return createPost(request, env);
      if (path.startsWith("/api/posts/") && request.method === "DELETE")
        return deletePost(request, env, path);

      if (path === "/api/upload" && request.method === "POST") return uploadImage(request, env);
      if (path.startsWith("/images/") && request.method === "GET")
        return serveImage(request, env, path);

      return notFound();
    } catch (err) {
      return new Response("Something went wrong: " + err.message, { status: 500 });
    }
  },
};

/* ---------------------------------------------------------------- */
/* Shared layout                                                     */
/* ---------------------------------------------------------------- */

function layout({ title, activePage, body, env }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bfc-red: #e02424;
    --bfc-red-dark: #a10f0f;
    --bfc-accent: #ff3b3b;
    --bfc-bg: #0c0c0d;
    --bfc-card: #17171a;
    --bfc-card-border: #262629;
    --bfc-text: #f2f2f2;
    --bfc-muted: #8c8c92;
    --radius: 14px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bfc-bg);
    color: var(--bfc-text);
  }
  header.site-header {
    background: #000;
    color: #fff;
    padding: 18px 16px;
    border-bottom: 2px solid var(--bfc-red);
  }
  .header-inner {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-inner img.badge {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    object-fit: cover;
    border: 2px solid var(--bfc-red);
    flex-shrink: 0;
  }
  .header-titles h1 {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.2;
    letter-spacing: 0.02em;
  }
  .header-titles p {
    margin: 2px 0 0;
    font-size: 0.8rem;
    color: #b3b3b8;
  }
  nav.site-nav {
    max-width: 640px;
    margin: 10px auto 0;
    display: flex;
    gap: 16px;
    font-size: 0.9rem;
  }
  nav.site-nav a {
    color: #dcdce0;
    text-decoration: none;
    padding: 4px 2px;
    border-bottom: 2px solid transparent;
    opacity: 0.85;
  }
  nav.site-nav a.active {
    border-bottom-color: var(--bfc-red);
    color: #fff;
    opacity: 1;
    font-weight: 600;
  }
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 16px 12px 40px;
  }
  footer.site-footer {
    text-align: center;
    padding: 24px 16px 40px;
    color: var(--bfc-muted);
    font-size: 0.8rem;
    border-top: 1px solid var(--bfc-card-border);
  }
  footer.site-footer .wink {
    margin-top: 6px;
    font-style: italic;
    opacity: 0.75;
  }
  .btn {
    display: inline-block;
    background: var(--bfc-red);
    color: #fff;
    padding: 10px 18px;
    border-radius: 999px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    border: none;
    cursor: pointer;
  }
  .btn.gold {
    background: var(--bfc-accent);
    color: #0c0c0d;
  }
  .btn.danger {
    background: #7a1414;
  }
  .btn.small {
    padding: 6px 12px;
    font-size: 0.8rem;
  }
</style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <img class="badge" src="${CLUB_IMAGE}" alt="${escapeHtml(SITE_NAME)} badge" />
      <div class="header-titles">
        <h1>${escapeHtml(SITE_NAME)}</h1>
        <p>${escapeHtml(STADIUM_NAME)}</p>
      </div>
    </div>
    <nav class="site-nav">
      <a href="/" class="${activePage === "home" ? "active" : ""}">Home</a>
      <a href="/about" class="${activePage === "about" ? "active" : ""}">About</a>
    </nav>
  </header>
  <main>
    ${body}
  </main>
  <footer class="site-footer">
    <div>${escapeHtml(SITE_NAME)} · ${escapeHtml(STADIUM_NAME)}</div>
    <div class="wink">this may or may not be Minecraft…..</div>
  </footer>
</body>
</html>`;
}

function html(str, status = 200) {
  return new Response(str, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

function notFound() {
  return new Response("Not found", { status: 404 });
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(ts) {
  const d = new Date(Number(ts));
  return d.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractYoutubeId(url = "") {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

/* ---------------------------------------------------------------- */
/* Home page — WhatsApp-channel style feed                           */
/* ---------------------------------------------------------------- */

async function getAllPosts(env) {
  const list = await env.POSTS.list({ prefix: "post:" });
  const keys = list.keys.map((k) => k.name).sort().reverse(); // newest first (timestamp in key)
  const values = await Promise.all(keys.map((k) => env.POSTS.get(k)));
  return values.filter(Boolean).map((v) => JSON.parse(v));
}

async function homePage(env) {
  const posts = await getAllPosts(env);

  const feedCss = `
  <style>
    .feed-post {
      background: var(--bfc-card);
      border-radius: var(--radius);
      padding: 14px 14px 12px;
      margin-bottom: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      border: 1px solid var(--bfc-card-border);
    }
    .feed-post .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .feed-post .meta img {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      object-fit: cover;
    }
    .feed-post .meta .name {
      font-weight: 600;
      font-size: 0.85rem;
    }
    .feed-post .meta .time {
      font-size: 0.72rem;
      color: var(--bfc-muted);
      margin-left: auto;
    }
    .feed-post h2 {
      font-size: 1.05rem;
      margin: 0 0 6px;
    }
    .feed-post p {
      margin: 0 0 8px;
      font-size: 0.92rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .feed-post img.post-image {
      width: 100%;
      border-radius: 10px;
      display: block;
      margin-top: 6px;
    }
    .feed-post video.post-video {
      width: 100%;
      border-radius: 10px;
      display: block;
      margin-top: 6px;
      background: #000;
    }
    .feed-post .yt-wrap {
      position: relative;
      width: 100%;
      padding-top: 56.25%; /* 16:9 */
      margin-top: 6px;
      border-radius: 10px;
      overflow: hidden;
      background: #000;
    }
    .feed-post .yt-wrap iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
    .empty-state {
      text-align: center;
      color: var(--bfc-muted);
      padding: 40px 12px;
      font-size: 0.9rem;
    }
  </style>`;

  const postsHtml = posts.length
    ? posts
        .map((p) => {
          const ytId = p.youtube ? extractYoutubeId(p.youtube) : null;
          return `
    <article class="feed-post">
      <div class="meta">
        <img src="${CLUB_IMAGE}" alt="" />
        <span class="name">${escapeHtml(SITE_NAME)}</span>
        <span class="time">${formatDate(p.date)}</span>
      </div>
      ${p.title ? `<h2>${escapeHtml(p.title)}</h2>` : ""}
      ${p.text ? `<p>${escapeHtml(p.text)}</p>` : ""}
      ${p.image ? `<img class="post-image" src="${escapeHtml(p.image)}" alt="" />` : ""}
      ${
        p.video
          ? `<video class="post-video" src="${escapeHtml(p.video)}" controls playsinline></video>`
          : ""
      }
      ${
        ytId
          ? `<div class="yt-wrap"><iframe src="https://www.youtube.com/embed/${ytId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
          : ""
      }
    </article>`;
        })
        .join("")
    : `<div class="empty-state">No updates posted yet — check back soon.</div>`;

  const body = feedCss + postsHtml;
  return html(layout({ title: SITE_NAME, activePage: "home", body, env }));
}

/* ---------------------------------------------------------------- */
/* About page                                                        */
/* ---------------------------------------------------------------- */

async function aboutPage(env) {
  const waLink = env.WHATSAPP_LINK || "#";
  const body = `
  <style>
    .about-card {
      background: var(--bfc-card);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      border: 1px solid var(--bfc-card-border);
    }
    .about-card img {
      width: 100%;
      max-width: 260px;
      display: block;
      margin: 0 auto 16px;
      border-radius: 12px;
    }
    .about-card h2 { margin-top: 0; }
    .about-card p { line-height: 1.5; }
    .join-wrap { text-align: center; margin-top: 20px; }
  </style>
  <div class="about-card">
    <img src="${CLUB_IMAGE}" alt="${escapeHtml(SITE_NAME)}" />
    <h2>About ${escapeHtml(SITE_NAME)}</h2>
    <p>
      ${escapeHtml(SITE_NAME)} plays out of ${escapeHtml(STADIUM_NAME)}. This site is the
      home for match updates, news and everything else going on with the club —
      posted here first, same as our WhatsApp channel.
    </p>
    <p>Want updates the moment they drop? Join the WhatsApp channel below.</p>
    <div class="join-wrap">
      <a class="btn gold" href="${escapeHtml(waLink)}" target="_blank" rel="noopener">
        Join our WhatsApp Channel
      </a>
    </div>
  </div>`;
  return html(layout({ title: `About — ${SITE_NAME}`, activePage: "about", body, env }));
}

/* ---------------------------------------------------------------- */
/* Auth helpers                                                       */
/* ---------------------------------------------------------------- */

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function isAuthed(request, env) {
  const val = getCookie(request, COOKIE_NAME);
  return !!env.ADMIN_PASSWORD && val === env.ADMIN_PASSWORD;
}

function handleLogout() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0`,
    },
  });
}

async function handleLogin(request, env) {
  const form = await request.formData();
  const password = form.get("password") || "";
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return html(
      layout({
        title: "Admin login",
        activePage: "",
        body: `<p style="color:#ff6b6b;">Wrong password. <a href="/admin">Try again</a>.</p>`,
        env,
      }),
      401
    );
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(
        password
      )}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax`,
    },
  });
}

/* ---------------------------------------------------------------- */
/* Admin page                                                         */
/* ---------------------------------------------------------------- */

async function adminPage(request, env) {
  if (!isAuthed(request, env)) {
    const body = `
    <style>
      .login-card {
        background: var(--bfc-card);
        border-radius: var(--radius);
        padding: 24px;
        max-width: 320px;
        margin: 40px auto;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      border: 1px solid var(--bfc-card-border);
      }
      .login-card input {
        width: 100%;
        padding: 10px;
        margin: 10px 0 16px;
        border-radius: 8px;
        border: 1px solid var(--bfc-card-border);
      background: #0c0c0d;
      color: var(--bfc-text);
        font-size: 1rem;
      }
    </style>
    <div class="login-card">
      <h2 style="margin-top:0;">Admin login</h2>
      <form method="POST" action="/admin/login">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required />
        <button class="btn" type="submit">Log in</button>
      </form>
    </div>`;
    return html(layout({ title: "Admin login", activePage: "", body, env }));
  }

  const posts = await getAllPosts(env);

  const body = `
  <style>
    .admin-card {
      background: var(--bfc-card);
      border-radius: var(--radius);
      padding: 18px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      border: 1px solid var(--bfc-card-border);
    }
    .admin-card h2 { margin-top: 0; font-size: 1.1rem; }
    .admin-card label {
      display: block;
      font-size: 0.82rem;
      font-weight: 600;
      margin: 10px 0 4px;
    }
    .admin-card input[type="text"],
    .admin-card textarea {
      width: 100%;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--bfc-card-border);
      background: #0c0c0d;
      color: var(--bfc-text);
      font-size: 0.95rem;
      font-family: inherit;
    }
    .admin-card textarea { min-height: 100px; resize: vertical; }
    .admin-card input[type="file"] { margin-top: 4px; }
    .admin-actions { margin-top: 14px; display: flex; gap: 10px; align-items: center; }
    #upload-status { font-size: 0.8rem; color: var(--bfc-muted); }
    .existing-post {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--bfc-card-border);
    }
    .existing-post:last-child { border-bottom: none; }
    .existing-post .ep-title { font-weight: 600; font-size: 0.9rem; }
    .existing-post .ep-date { font-size: 0.75rem; color: var(--bfc-muted); }
    .top-bar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; }
  </style>

  <div class="top-bar">
    <h2 style="margin:0;">Admin</h2>
    <a href="/admin/logout" class="btn small danger">Log out</a>
  </div>

  <div class="admin-card">
    <h2>New post</h2>
    <p style="color:var(--bfc-muted); font-size:0.8rem; margin-top:-4px;">
      All fields are optional, but at least one of Title, Body, or Image/YouTube must be filled in.
    </p>
    <form id="post-form">
      <label for="title">Title (optional)</label>
      <input type="text" id="title" name="title" />

      <label for="text">Body / text (optional)</label>
      <textarea id="text" name="text"></textarea>

      <label for="image">Image (optional)</label>
      <input type="file" id="image" name="image" accept="image/*" />

      <label for="youtube">YouTube link (optional)</label>
      <input type="text" id="youtube" name="youtube" placeholder="https://youtube.com/watch?v=..." />
      <div id="upload-status"></div>

      <div class="admin-actions">
        <button class="btn" type="submit">Publish</button>
      </div>
    </form>
  </div>

  <div class="admin-card">
    <h2>Existing posts</h2>
    <div id="existing-list">
      ${
        posts.length
          ? posts
              .map(
                (p) => `
        <div class="existing-post" data-id="${escapeHtml(p.id)}">
          <div>
            <div class="ep-title">${escapeHtml(p.title || p.youtube || "(image/video post)")}</div>
            <div class="ep-date">${formatDate(p.date)}</div>
          </div>
          <button class="btn small danger delete-btn" data-id="${escapeHtml(p.id)}">Delete</button>
        </div>`
              )
              .join("")
          : `<p style="color:var(--bfc-muted); font-size:0.9rem;">No posts yet.</p>`
      }
    </div>
  </div>

  <script>
    const uploadStatus = document.getElementById('upload-status');
    const form = document.getElementById('post-form');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('title').value.trim();
      const text = document.getElementById('text').value.trim();
      const youtube = document.getElementById('youtube').value.trim();
      const imageFile = document.getElementById('image').files[0];

      if (!title && !text && !imageFile && !youtube) {
        uploadStatus.textContent = 'Fill in at least one of Title, Body, or Image/YouTube.';
        return;
      }

      let imageUrl = '';

      if (imageFile) {
        uploadStatus.textContent = 'Uploading image...';
        const fd = new FormData();
        fd.append('file', imageFile);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          uploadStatus.textContent = 'Image upload failed.';
          return;
        }
        const data = await res.json();
        imageUrl = data.url;
      }

      uploadStatus.textContent = 'Publishing post...';

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text, image: imageUrl, youtube }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        uploadStatus.textContent = data.error || 'Failed to publish post.';
      }
    });

    document.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this post?')) return;
        const id = btn.getAttribute('data-id');
        const res = await fetch('/api/posts/' + encodeURIComponent(id), { method: 'DELETE' });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to delete.');
        }
      });
    });
  </script>`;

  return html(layout({ title: "Admin — " + SITE_NAME, activePage: "", body, env }));
}

/* ---------------------------------------------------------------- */
/* API: posts                                                         */
/* ---------------------------------------------------------------- */

async function createPost(request, env) {
  if (!isAuthed(request, env)) return new Response("Unauthorized", { status: 401 });

  const data = await request.json();
  const title = (data.title || "").toString().trim();
  const text = (data.text || "").toString().trim();
  const image = (data.image || "").toString().trim();
  const video = (data.video || "").toString().trim();
  const youtube = (data.youtube || "").toString().trim();

  if (!title && !text && !image && !video && !youtube) {
    return new Response(
      JSON.stringify({ error: "Fill in at least one of title, body, or image/YouTube" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const ts = Date.now();
  const id = String(ts);
  const post = { id, title, text, image, video, youtube, date: ts };
  await env.POSTS.put(`post:${ts}`, JSON.stringify(post));
  await env.POSTS.put(`post:${ts}`, JSON.stringify(post));

  return new Response(JSON.stringify({ ok: true, post }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

async function deletePost(request, env, path) {
  if (!isAuthed(request, env)) return new Response("Unauthorized", { status: 401 });

  const id = decodeURIComponent(path.split("/").pop());
  await env.POSTS.delete(`post:${id}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

/* ---------------------------------------------------------------- */
/* API: media upload / serve (R2) — handles both images and video    */
/* ---------------------------------------------------------------- */

async function uploadImage(request, env) {
  if (!isAuthed(request, env)) return new Response("Unauthorized", { status: 401 });

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    // Usually means the upload exceeded Cloudflare's request body limit (100MB on Free/Pro).
    return new Response(JSON.stringify({ error: "File too large or upload failed" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Accept "file" (new) but fall back to "image" for backwards compatibility.
  const file = form.get("file") || form.get("image");
  if (!file || typeof file === "string") {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isVideo = (file.type || "").startsWith("video/");
  const folder = isVideo ? "vid" : "img";
  const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg") },
  });

  return new Response(JSON.stringify({ ok: true, url: `/images/${key}` }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

async function serveImage(request, env, path) {
  const key = decodeURIComponent(path.replace("/images/", ""));
  const obj = await env.IMAGES.get(key);
  if (!obj) return notFound();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Accept-Ranges", "bytes"); // lets video seeking/scrubbing work properly

  return new Response(obj.body, { headers });
}
