const cfg = window.FOTOKU_CONFIG;
const supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
const form = document.getElementById("login-form");
const message = document.getElementById("message");
const signupToggle = document.getElementById("signup-toggle");
let signupMode = false;

signupToggle.addEventListener("click", () => {
  signupMode = !signupMode;
  form.querySelector("button[type=submit]").textContent = signupMode ? "Buat Akun" : "Masuk ke Dashboard ↗";
  signupToggle.textContent = signupMode ? "Kembali ke masuk" : "Daftar";
  message.textContent = signupMode ? "Daftar menggunakan email dan kata sandi." : "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  message.className = "message";
  message.textContent = signupMode ? "Membuat akun…" : "Memeriksa akun…";
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const result = signupMode
      ? await supabaseClient.auth.signUp({ email, password })
      : await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (signupMode && !result.data.session) {
      message.textContent = "Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.";
      return;
    }
    window.location.href = "dashboard.html";
  } catch (error) {
    message.className = "message error";
    message.textContent = error.message || "Tidak dapat memproses akun.";
  } finally {
    button.disabled = false;
  }
});