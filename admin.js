
const SUPABASE_URL = "https://gbymbqburckkwihaxzso.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NmpdQiwtE5moynmBiqjmig__oSc_bTF";

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-button");
const statusElement = document.getElementById("status");

function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b42318" : "#287a45";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Memeriksa akun...";
  showStatus("");

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (error) {
      throw error;
    }

    const user = data.user;

    if (user?.app_metadata?.role !== "admin") {
      await client.auth.signOut();

      showStatus(
        "Akun ini tidak memiliki akses admin. Periksa role akun Anda.",
        true
      );
      return;
    }

    showStatus("Login admin berhasil!");

    // Dashboard pengelolaan akan kita buat pada tahap berikutnya.
window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Login error:", error.message);

    showStatus(
      "Login gagal. Periksa email, password, dan status akun Anda.",
      true
    );
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Masuk sebagai Admin";
  }
});
