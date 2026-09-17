import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import StudyMode from "./pages/StudyMode";
import PracticeQuiz from "./pages/PracticeQuiz";
import ExamSimulation from "./pages/ExamSimulation";
import ResultsPage from "./pages/ResultsPage";
import Resources from "./pages/Resources";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import QuestionEditor from "./pages/QuestionEditor";
import AttemptHistory from "./pages/AttemptHistory";
import Login from "./pages/Login";
import MapChartsLanding from "./pages/MapChartsLanding";
import LessonPage from "./pages/LessonPage";
import { AuthProvider, useAuth } from "./lib/auth";
import { isDemoMode } from "./lib/storage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth();
  if (isDemoMode()) return <>{children}</>;
  if (loading) return <p style={{ padding: 24 }}>Loading...</p>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <div>
        <a href="#main-content" className="visually-hidden">
          Skip to main content
        </a>
        <Nav />
        <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/study" element={<RequireAuth><StudyMode /></RequireAuth>} />
            <Route path="/study/map-charts" element={<RequireAuth><MapChartsLanding /></RequireAuth>} />
            <Route path="/study/map-charts/:lessonId" element={<RequireAuth><LessonPage /></RequireAuth>} />
            <Route path="/practice" element={<RequireAuth><PracticeQuiz /></RequireAuth>} />
            <Route path="/simulation" element={<RequireAuth><ExamSimulation /></RequireAuth>} />
            <Route path="/results/:attemptId" element={<RequireAuth><ResultsPage /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><AttemptHistory /></RequireAuth>} />
            <Route path="/resources" element={<RequireAuth><Resources /></RequireAuth>} />
            <Route path="/coordinator" element={<RequireAuth><CoordinatorDashboard /></RequireAuth>} />
            <Route path="/coordinator/questions" element={<RequireAuth><QuestionEditor /></RequireAuth>} />
          </Routes>
        </main>
        <footer style={{ borderTop: "1px solid var(--line)", padding: "20px", textAlign: "center", color: "var(--slate-500)", fontSize: "0.85rem" }}>
          MPD Part 107 Readiness is an internal study tool. It is not affiliated with, endorsed by, or a guarantee of
          results from the Federal Aviation Administration.
        </footer>
      </div>
    </AuthProvider>
  );
}
