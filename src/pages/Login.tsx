import { useState } from "react";
import { getSupabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/auth";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { session, loading, refreshOfficerRow } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <p>Loading...</p>;
  if (session) return <Navigate to="/" replace />;

  async function submit() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setStatus(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) {
      await refreshOfficerRow();
      setBusy(false);
      return; // session updates via onAuthStateChange, Navigate above takes over
    }

    // Not an existing account with this password -- try creating one. If an
    // account with this email already exists under a different password,
    // this fails too and the error below is shown as-is.
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (signUpError) {
      setStatus(`Couldn't sign in: ${signUpError.message}`);
      return;
    }
    await refreshOfficerRow();
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Sign in</h1>
      <p style={{ color: "var(--slate-500)" }}>
        Use your department email and the program password.
      </p>
      <div className="card">
        <label style={{ display: "block", marginBottom: 12 }}>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@maricopa-az.gov"
            style={{ display: "block", width: "100%", padding: 10, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 4, border: "1px solid var(--line)", borderRadius: 6 }}
          />
        </label>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !email || !password}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
        {status && <p style={{ marginTop: 12, color: "var(--danger-700)" }}>{status}</p>}
      </div>
    </div>
  );
}
