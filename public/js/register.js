async function validateCouponCode() {
    const couponInput = document.getElementById('couponCode');
    const packageTypeInput = document.getElementById('packageType');
    const packageDisplayInput = document.getElementById('packageDisplay');
    const statusEl = document.getElementById('couponStatus');

    if (!couponInput) return false;

    const raw = couponInput.value.trim();

    if (!raw) {
        if (packageTypeInput) packageTypeInput.value = '';
        if (packageDisplayInput) packageDisplayInput.value = '';
        if (statusEl) {
            statusEl.textContent = 'Enter your coupon to validate your plan.';
        }
        return false;
    }

    try {
        if (statusEl) {
            statusEl.textContent = 'Checking coupon...';
        }

        const response = await fetch('/api/auth/coupon/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ couponCode: raw })
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 200 && data && data.valid) {
            const planName = data.planName || data.packageType || '';
            const amount = typeof data.amount === 'number' ? data.amount : null;

            if (packageTypeInput) {
                packageTypeInput.value = data.packageType || data.planName || '';
            }

            if (packageDisplayInput) {
                if (planName && amount != null) {
                    packageDisplayInput.value = planName + ' (₦' + Number(amount).toLocaleString('en-NG') + ')';
                } else {
                    packageDisplayInput.value = planName || '';
                }
            }

            if (statusEl) {
                statusEl.textContent = 'Coupon valid. Plan applied: ' + (planName || '');
            }

            return true;
        }

        if (packageTypeInput) packageTypeInput.value = '';
        if (packageDisplayInput) packageDisplayInput.value = '';
        if (statusEl) {
            statusEl.textContent = (data && data.message) || 'Invalid or used coupon code.';
        }

        return false;
    } catch (error) {
        console.error('Error validating coupon:', error);
        if (statusEl) {
            statusEl.textContent = 'Unable to verify coupon right now.';
        }
        return false;
    }
}

let successRedirectTimer = null;

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    const countdownEl = document.getElementById('modalCountdown');
    const goToLoginBtn = document.getElementById('goToLoginBtn');

    if (!modal || !countdownEl || !goToLoginBtn) {
        window.location.href = 'login.html';
        return;
    }

    modal.style.display = 'flex';

    let remaining = 5;
    countdownEl.textContent = String(remaining);

    if (successRedirectTimer) {
        clearInterval(successRedirectTimer);
    }

    successRedirectTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(successRedirectTimer);
            successRedirectTimer = null;
            window.location.href = 'login.html';
            return;
        }
        countdownEl.textContent = String(remaining);
    }, 1000);

    goToLoginBtn.onclick = () => {
        if (successRedirectTimer) {
            clearInterval(successRedirectTimer);
            successRedirectTimer = null;
        }
        window.location.href = 'login.html';
    };
}

// Form Submission
const registerForm = document.getElementById('registerForm');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    const couponValid = await validateCouponCode();
    const couponCodeValue = document.getElementById('couponCode').value.trim();
    const packageTypeValue = document.getElementById('packageType').value;

    if (!couponCodeValue || !packageTypeValue || !couponValid) {
        alert('Please enter a valid coupon code to continue.');
        return;
    }
    
    // Gather data
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        referrer: document.getElementById('referrer').value,
        country: document.getElementById('country').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value,
        couponCode: couponCodeValue,
        packageType: packageTypeValue,
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
            showSuccessModal();
        } else {
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
        if (this.parentElement && this.parentElement.parentElement) {
            this.parentElement.parentElement.classList.add('focused');
        }
    });
    input.addEventListener('blur', function() {
        if (this.parentElement && this.parentElement.parentElement) {
            this.parentElement.parentElement.classList.remove('focused');
        }
    });
});

const couponInput = document.getElementById('couponCode');
if (couponInput) {
    couponInput.addEventListener('blur', () => {
        validateCouponCode();
    });
}

const couponCheckBtn = document.getElementById('couponCheckBtn');
if (couponCheckBtn) {
    couponCheckBtn.addEventListener('click', () => {
        validateCouponCode();
    });
}

(function prefillReferrerFromQuery() {
    try {
        const params = new URLSearchParams(window.location.search || '');
        const ref = params.get('ref');
        const refInput = document.getElementById('referrer');
        if (ref && refInput && !refInput.value) {
            refInput.value = ref;
        }
    } catch (e) {}
})();

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
