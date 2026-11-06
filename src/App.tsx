import { LoginPage } from "@/pages/LoginPage";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { TeacherDashboard } from "@/pages/TeacherDashboard";
import { StudentDashboard } from "@/pages/StudentDashboard";
import { SessionProvider, useSession } from "@/lib/session";

function AppRoutes() {
  const { session } = useSession();

  if (!session) return <LoginPage />;
  if (session.role === "admin") return <AdminDashboard session={session} />;
  if (session.role === "teacher") return <TeacherDashboard session={session} />;
  return <StudentDashboard session={session} />;
}

function App() {
  return (
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  );
}

export default App;
