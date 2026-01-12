// Form Submission
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Gather data
    const formData = {
        loginId: document.getElementById('loginId').value,
        password: document.getElementById('password').value
    };

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Login successful!');
            window.location.href = 'dashboard.html'; // Redirect to dashboard
        } else {
            // Error
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// Toggle password visibility
const togglePassword = document.querySelector('#toggleEye');
const password = document.querySelector('#password');

togglePassword.addEventListener('click', function (e) {
    const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    password.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Hamburger menu functionality
const hamburgerMenu = document.getElementById('hamburgerMenu');
const navDropdown = document.getElementById('navDropdown');

hamburgerMenu.addEventListener('click', function(e) {
    e.stopPropagation();
    navDropdown.classList.toggle('active');
    // Animate hamburger lines
    const lines = this.querySelectorAll('.hamburger-line');
    lines[0].style.transform = navDropdown.classList.contains('active') ? 'rotate(45deg) translate(5px, 5px)' : 'none';
    lines[1].style.opacity = navDropdown.classList.contains('active') ? '0' : '1';
    lines[2].style.transform = navDropdown.classList.contains('active') ? 'rotate(-45deg) translate(7px, -6px)' : 'none';
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    if (!navDropdown.contains(event.target) && !hamburgerMenu.contains(event.target)) {
        navDropdown.classList.remove('active');
        const lines = hamburgerMenu.querySelectorAll('.hamburger-line');
        lines[0].style.transform = 'none';
        lines[1].style.opacity = '1';
        lines[2].style.transform = 'none';
    }
});

// Add focus effects for inputs
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', function() {
        this.parentElement.parentElement.classList.remove('focused');
    });
});
