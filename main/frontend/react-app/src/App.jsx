import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import UserAuth from './pages/auth/UserAuth';
import StudentAuth from './pages/auth/StudentAuth';
import TeacherAuth from './pages/auth/TeacherAuth';
import AdminAuth from './pages/auth/AdminAuth';
import UserDashboard from './pages/dashboards/UserDashboard';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import SuperadminDashboard from './pages/dashboards/SuperadminDashboard';
import OrganizationId from './pages/onboarding/OrganizationId';
import OrganizationRole from './pages/onboarding/OrganizationRole';
import UserProfile from './pages/UserProfile';
import GetStarted from './pages/GetStarted';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/user-auth" element={<UserAuth />} />
          <Route path="/student-auth" element={<StudentAuth />} />
          <Route path="/teacher-auth" element={<TeacherAuth />} />
          <Route path="/admin-auth" element={<AdminAuth />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/organization-id" element={<OrganizationId />} />
          <Route path="/organization-role" element={<OrganizationRole />} />

          {/* Protected routes — all redirect to landing on logout */}
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute redirectTo="/">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute redirectTo="/">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute redirectTo="/">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute redirectTo="/">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin"
            element={<SuperadminDashboard />}
          />
          <Route
            path="/user-profile"
            element={
              <ProtectedRoute redirectTo="/">
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
