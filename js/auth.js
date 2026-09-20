document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('auth-overlay');
    const input = document.getElementById('auth-password');
    const btn = document.getElementById('auth-btn');
    const errorMsg = document.getElementById('auth-error');

    // Simple obfuscation of 'Toma7493' to prevent immediate casual reading
    const CORRECT_HASH = 'VG9tYTc0OTM='; 

    function attemptLogin() {
        if (btoa(input.value) === CORRECT_HASH) {
            sessionStorage.setItem('is_authenticated', 'true');
            overlay.style.display = 'none';
            if (typeof initApp === 'function') {
                initApp();
            }
        } else {
            errorMsg.style.display = 'block';
        }
    }

    if (sessionStorage.getItem('is_authenticated') === 'true') {
        overlay.style.display = 'none';
        if (typeof initApp === 'function') {
            initApp();
        }
    } else {
        overlay.style.display = 'flex';
        btn.addEventListener('click', attemptLogin);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }
});
