console.log("✅ script.js is loaded");

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

function openPopup(id) {
  const popup = document.getElementById(id);
  if (popup) popup.style.display = 'block';
}

function closePopup(id) {
  const popup = document.getElementById(id);
  if (popup) popup.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("🧠 DOM loaded, binding UI...");

  // Load saved dark mode
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
  }

  // 🔁 Toggle dark mode from nav
  document.querySelectorAll('.toggle-dark').forEach(btn =>
    btn.addEventListener('click', toggleDarkMode)
  );

  // 🧭 Navbar: Contact/Register/Login popup triggers
  document.querySelectorAll('a[href="#contact"]').forEach(el =>
    el.addEventListener('click', e => {
      e.preventDefault();
      openPopup('contactForm');
    })
  );

  document.querySelectorAll('a[href="#register"]').forEach(el =>
    el.addEventListener('click', e => {
      e.preventDefault();
      openPopup('registerForm');
    })
  );

  document.querySelectorAll('a[href="#login"]').forEach(el =>
    el.addEventListener('click', e => {
      e.preventDefault();
      openPopup('loginForm');
    })
  );

  // ❌ Close buttons on popups
  document.querySelectorAll('.close').forEach(closeBtn =>
    closeBtn.addEventListener('click', () => {
      const target = closeBtn.getAttribute('data-popup');
      if (target) closePopup(target);
    })
  );

  // 📨 Contact form
  const contactForm = document.getElementById('contactFormDetails');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('contactName').value.trim();
      const company = document.getElementById('contactCompany').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();

      try {
        const res = await fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, company, email, phone })
        });

        const result = await res.json();
        alert(result.message || '✅ Message sent!');
        contactForm.reset();
        closePopup('contactForm');
      } catch (err) {
        alert('❌ Failed to send message');
        console.error(err);
      }
    });
  }

  // 🧑‍ Register form
  const registerForm = document.getElementById('registerFormDetails');
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        country: document.getElementById('country').value.trim(),
        username: document.getElementById('regUsername').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim()
      };

      try {
        const res = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
          alert(result.message || '✅ Registration successful');
          registerForm.reset();
          closePopup('registerForm');
          location.reload();
        } else {
          alert(result.error || '❌ Registration failed');
        }
      } catch (err) {
        console.error("❌ Registration error:", err);
        alert("Server error");
      }
    });
  }

  // 🔐 Login form
  const loginForm = document.getElementById('loginFormDetails');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
        username: document.getElementById('loginUsername').value.trim(),
        password: document.getElementById('loginPassword').value.trim()
      };

      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
          alert(result.message || '✅ Logged in!');
          loginForm.reset();
          closePopup('loginForm');
          location.reload();
        } else {
          alert(result.error || '❌ Login failed');
        }
      } catch (err) {
        console.error("❌ Login error:", err);
        alert("Server error");
      }
    });
  }

  // 🏡 If on homepage, load articles
  if (typeof loadHomepageArticles === 'function') {
    loadHomepageArticles();
  }
});
