// Form Submission
const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Gather data
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        referrer: document.getElementById('referrer').value,
        country: document.getElementById('country').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value,
        couponCode: document.getElementById('couponCode').value,
        packageType: document.getElementById('packageType').value,
        terms: document.getElementById('terms').checked
    };

    // Basic Client-side Validation (HTML5 'required' handles most empty checks)
    if (formData.password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            alert('Registration successful! Redirecting to login...');
            // Store token if needed, or just redirect
            // localStorage.setItem('token', data.token);
            window.location.href = 'login.html';
        } else {
            // Error
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
});

// Toggle password visibility (if eye icon exists)
const togglePassword = document.querySelector('#toggleEye');
const password = document.querySelector('#password');

if (togglePassword && password) {
    togglePassword.addEventListener('click', function () {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// Add focus effects for inputs
const inputs = document.querySelectorAll('input, select');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', function() {
        this.parentElement.parentElement.classList.remove('focused');
    });
});

// Hamburger menu functionality
const hamburgerMenu = document.getElementById('hamburgerMenu');
const navDropdown = document.getElementById('navDropdown');

if (hamburgerMenu && navDropdown) {
    hamburgerMenu.addEventListener('click', function (e) {
        e.stopPropagation();
        navDropdown.classList.toggle('active');
        const lines = this.querySelectorAll('.hamburger-line');
        const isActive = navDropdown.classList.contains('active');
        lines[0].style.transform = isActive ? 'rotate(45deg) translate(5px, 5px)' : 'none';
        lines[1].style.opacity = isActive ? '0' : '1';
        lines[2].style.transform = isActive ? 'rotate(-45deg) translate(7px, -6px)' : 'none';
    });

    document.addEventListener('click', function (event) {
        if (!navDropdown.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            navDropdown.classList.remove('active');
            const lines = hamburgerMenu.querySelectorAll('.hamburger-line');
            lines[0].style.transform = 'none';
            lines[1].style.opacity = '1';
            lines[2].style.transform = 'none';
        }
    });
}
