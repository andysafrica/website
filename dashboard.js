document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addArticleForm');
  const titleInput = document.getElementById('newArticleTitle');
  const articleList = document.getElementById('admin-article-list');
  const previewBtn = document.getElementById('previewBtn');
  const previewModal = document.getElementById('previewModal');
  const previewTitle = document.getElementById('previewTitle');
  const previewContent = document.getElementById('previewContent');

  let isEditing = false;
  let editingArticleId = null;

  const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write your article here...',
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: [1, 2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image']
        ],
        handlers: {
          image: function () {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.click();

            input.onchange = async () => {
              const file = input.files[0];
              if (!file) return;

              const formData = new FormData();
              formData.append('image', file);

              try {
                const res = await fetch('/upload-image', {
                  method: 'POST',
                  body: formData
                });

                const data = await res.json();
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', data.url);
              } catch (err) {
                console.error('❌ Toolbar upload error:', err);
                alert('Server error during image upload.');
              }
            };
          }
        }
      }
    }
  });

  // ✅ Handle form submission (create or update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const content = quill.root.innerHTML.trim();

    if (!title || !content) {
      alert('Title and content are required.');
      return;
    }

    const endpoint = isEditing
      ? `/admin/dashboard/update-article/${editingArticleId}`
      : '/admin/dashboard/add-article';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, content })
      });

      const result = await res.json();
      if (res.ok) {
        alert(result.message || 'Success!');
        titleInput.value = '';
        quill.setContents([]);
        isEditing = false;
        editingArticleId = null;
        form.querySelector('button[type="submit"]').textContent = 'Publish Article';
        loadArticles();
      } else {
        alert(result.error || 'Failed to process article');
      }
    } catch (err) {
      console.error('❌ Error publishing/updating article:', err);
      alert('Server error');
    }
  });

  // ✅ Preview button logic
  previewBtn.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const content = quill.root.innerHTML.trim();

    if (!title || !content) {
      alert('Title and content are required for preview.');
      return;
    }

    previewTitle.textContent = title;
    previewContent.innerHTML = content;
    previewModal.style.display = 'block';
  });

  window.closePreview = () => {
    previewModal.style.display = 'none';
  };

  // ✅ Load admin article list
  async function loadArticles() {
    if (!articleList) return;

    try {
      const res = await fetch('/admin/articles', { credentials: 'include' });
      const articles = await res.json();

      if (!Array.isArray(articles) || articles.length === 0) {
        articleList.innerHTML = '<p>No articles found.</p>';
        return;
      }

      articleList.innerHTML = articles.map(article => `
        <div class="article-card">
          <h3>${article.title}</h3>
          <p><em>Published: ${new Date(article.created_at).toLocaleDateString()}</em></p>
          <button onclick="handleEdit(${article.id})">✏️ Edit</button>
          <button onclick="handleDelete(${article.id})">🗑️ Delete</button>
        </div>
      `).join('');
    } catch (err) {
      console.error("❌ Failed to load admin articles:", err);
      articleList.innerHTML = '<p>Error loading articles.</p>';
    }
  }

  // ✅ Edit an article
  window.handleEdit = async (id) => {
    try {
      const res = await fetch(`/articles`);
      const articles = await res.json();
      const article = articles.find(a => a.id === id);
      if (!article) {
        alert('Article not found');
        return;
      }

      titleInput.value = article.title;
      quill.root.innerHTML = article.content;
      isEditing = true;
      editingArticleId = id;
      form.querySelector('button[type="submit"]').textContent = 'Update Article';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("❌ Failed to fetch article for editing:", err);
      alert("Error loading article.");
    }
  };

  // ✅ Delete article
  window.handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this article?")) return;

    try {
      const res = await fetch(`/admin/dashboard/delete-article/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();

      if (res.ok) {
        alert(result.message || 'Article deleted');
        loadArticles();
      } else {
        alert(result.error || 'Failed to delete article');
      }
    } catch (err) {
      console.error("❌ Failed to delete article:", err);
      alert("Server error during delete");
    }
  };

  loadArticles();
});
