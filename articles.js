// ✅ articles.js (fully formatted and working)

document.addEventListener('DOMContentLoaded', () => {
  loadArticlesWithComments();
});

async function loadArticlesWithComments() {
  const container = document.getElementById('all-articles');
  const hash = window.location.hash;
  const articleId = hash.startsWith('#article-') ? hash.replace('#article-', '') : null;

  try {
    const res = await fetch('/articles');
    const articles = await res.json();

    if (!Array.isArray(articles) || articles.length === 0) {
      container.innerHTML = '<p>No articles available.</p>';
      return;
    }

    container.innerHTML = articles
      .map((article) => {
        const isSingle = articleId && article.id.toString() === articleId;
        return `
          <article id="article-${article.id}" class="article-block">
            <h3>${article.title}</h3>
            <p><em>${new Date(article.created_at).toLocaleDateString()}</em></p>
            <div class="article-content">${article.content}</div>
            <div class="comments collapsed" id="comments-${article.id}">
              <button class="toggle-comments" onclick="toggleComments(${article.id})">💬 Show Comments</button>
              <div class="comment-list"></div>
              <div class="comment-form"></div>
            </div>
            ${isSingle ? '<hr>' : '<br>'}
          </article>
        `;
      })
      .join('');

    articles.forEach((article) => {
      loadComments(article.id);
    });
  } catch (err) {
    console.error('❌ Failed to load articles:', err);
    container.innerHTML = '<p>Error loading articles.</p>';
  }
}

async function toggleComments(articleId) {
  const wrapper = document.getElementById(`comments-${articleId}`);
  wrapper.classList.toggle('collapsed');
  const button = wrapper.querySelector('.toggle-comments');
  button.textContent = wrapper.classList.contains('collapsed')
    ? '💬 Show Comments'
    : '🔽 Hide Comments';
}

async function loadComments(articleId) {
  const wrapper = document.getElementById(`comments-${articleId}`);
  const thread = wrapper.querySelector('.comment-list');
  const formArea = wrapper.querySelector('.comment-form');

  try {
    const sessionRes = await fetch('/check-session', { credentials: 'include' });
    const sessionData = await sessionRes.json();
    const user = sessionData.username || null;

    const res = await fetch(`/comments/${articleId}`);
    const comments = await res.json();

    if (!Array.isArray(comments) || comments.length === 0) {
      thread.innerHTML = '<p class="no-comments">No comments yet.</p>';
    } else {
      const commentTree = buildCommentTree(comments);
      thread.innerHTML = renderCommentTree(commentTree, user);
    }

    formArea.innerHTML = user
      ? `
        <textarea id="comment-text-${articleId}" placeholder="Add a comment..."></textarea>
        <button onclick="submitComment(${articleId})">Post Comment</button>
      `
      : `<p class="login-warning">🔒 <a href="#" onclick="openLoginForm()">Login</a> to comment.</p>`;
  } catch (err) {
    console.error('❌ Error loading comments:', err);
    thread.innerHTML = '<p>Error loading comments.</p>';
  }
}

function buildCommentTree(comments) {
  const map = {};
  const tree = [];

  comments.forEach((c) => {
    c.replies = [];
    map[c.id] = c;
  });

  comments.forEach((c) => {
    if (c.parent_id) {
      if (map[c.parent_id]) {
        map[c.parent_id].replies.push(c);
      }
    } else {
      tree.push(c);
    }
  });

  return tree;
}

function renderCommentTree(nodes, currentUser, level = 0) {
  if (!Array.isArray(nodes)) return '';

  return nodes
    .map((comment) => {
      const avatar = `<div class="avatar">${(comment.username || '?')[0].toUpperCase()}</div>`;
      return `
        <div class="comment-item level-${level}">
          <div class="comment-bubble">
            ${avatar}<div><strong>${comment.username || 'Unknown'}:</strong> ${comment.comment}</div>
          </div>
          <button class="reply-btn" onclick="startReply(${comment.id}, ${comment.article_id})">↪ Reply</button>
          ${comment.replies?.length ? renderCommentTree(comment.replies, currentUser, level + 1) : ''}
        </div>
      `;
    })
    .join('');
}

function startReply(parentId, articleId) {
  const replyBox = document.createElement('div');
  replyBox.className = 'reply-box';
  replyBox.innerHTML = `
    <textarea placeholder="Write your reply..."></textarea>
    <button onclick="submitReply(${articleId}, ${parentId}, this)">Post Reply</button>
  `;

  const parentEl = document.querySelector(`.reply-btn[onclick*="${parentId},"]`).parentNode;
  if (!parentEl.querySelector('.reply-box')) {
    parentEl.appendChild(replyBox);
  }
}

async function submitReply(articleId, parentId, btn) {
  const textarea = btn.previousElementSibling;
  const text = textarea.value.trim();
  if (!text) return alert('Reply cannot be empty.');

  try {
    const res = await fetch(`/comment/${articleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ comment: text, parent_id: parentId })
    });

    const result = await res.json();
    if (res.ok) {
      loadComments(articleId);
    } else {
      alert(result.error || 'Failed to post reply.');
    }
  } catch (err) {
    console.error('❌ Reply post failed:', err);
    alert('Error posting reply.');
  }
}

async function submitComment(articleId) {
  const textarea = document.getElementById(`comment-text-${articleId}`);
  const text = textarea.value.trim();
  if (!text) return alert('Please enter a comment.');

  try {
    const res = await fetch(`/comment/${articleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ comment: text })
    });

    const result = await res.json();
    if (res.ok) {
      textarea.value = '';
      loadComments(articleId);
    } else {
      alert(result.error || 'Failed to post comment.');
    }
  } catch (err) {
    console.error('❌ Comment post failed:', err);
    alert('Error posting comment.');
  }
}
