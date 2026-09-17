import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { isDemoMode } from "../lib/storage";

const baseLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/study", label: "Study Mode" },
  { to: "/practice", label: "Practice Quiz" },
  { to: "/simulation", label: "Exam Simulation" },
  { to: "/resources", label: "Resources" },
];

export default function Nav() {
  const { session, officerName, officerEmail, officerRole, signOut } = useAuth();
  const demo = isDemoMode();
  // The link is hidden for anyone who isn't a coordinator, but this is a
  // convenience, not the real security boundary -- the actual access
  // control is enforced by CoordinatorDashboard.tsx's own role check plus
  // Supabase RLS (see supabase/policies.sql), which limits what a
  // non-coordinator's queries can return regardless of what's in the nav.
  const links = demo || officerRole === "coordinator" ? [...baseLinks, { to: "/coordinator", label: "Coordinator Dashboard" }] : baseLinks;

  return (
    <header style={{ background: "var(--navy-900)", color: "var(--white)" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <NavLink to="/" style={{ color: "var(--white)", textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "1.15rem" }}>
              MPD Part 107 Readiness
            </span>
          </NavLink>
          <nav aria-label="Primary" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                style={({ isActive }) => ({
                  color: isActive ? "var(--gold-500)" : "var(--navy-100)",
                  textDecoration: "none",
                  padding: "6px 10px",
                  borderRadius: 4,
                  fontSize: "0.92rem",
                  fontWeight: isActive ? 700 : 500,
                })}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {!demo && (
          <div style={{ fontSize: "0.85rem", color: "var(--navy-100)" }}>
            {session ? (
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {officerName ?? officerEmail}
                <button className="btn btn-outline" onClick={signOut} style={{ padding: "4px 10px" }}>
                  Sign out
                </button>
              </span>
            ) : (
              <NavLink to="/login" style={{ color: "var(--gold-500)" }}>
                Sign in
              </NavLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
