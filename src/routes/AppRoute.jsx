import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";

// Landing
import Landing from "../Landing";

// Authentication
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// Student
import StudentDashboard from "../pages/student/StudentDashboard";
import RequestClearance from "../pages/student/RequestClearance";
import ClearanceStatus from "../pages/student/ClearanceStatus";
import Assistant from "../pages/student/Assistant";
import StudentNotifications from "../pages/student/Notifications";
import StudentProfile from "../pages/student/Profile";

// Approver
import ApproverDashboard from "../pages/approver/ApproverDashboard";
import PendingRequests from "../pages/approver/PendingRequests";
import ApprovedRequests from "../pages/approver/ApprovedRequests";
import RejectedRequests from "../pages/approver/RejectedRequests";
import ReadyForEnrollment from "../pages/approver/ReadyForEnrollment";
import StudentDetails from "../pages/approver/StudentDetails";
import ApproverNotifications from "../pages/approver/Notifications";
import ApproverProfile from "../pages/approver/Profile";

// Administrator
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import OfficeManagement from "../pages/admin/OfficeManagement";
import ClearanceManagement from "../pages/admin/ClearanceManagement";
import Reports from "../pages/admin/Reports";
import AISettings from "../pages/admin/AISettings";
import SystemSettings from "../pages/admin/SystemSettings";
import AdminNotifications from "../pages/admin/Notifications";
import AdminProfile from "../pages/admin/Profiles";
import ApproverManagement from "../pages/admin/ApproverManagement";
import SubjectManagement from "../pages/admin/SubjectManagement";
import StudentManagement from "../pages/admin/StudentManagement";
import ClassAssignmentManagement from "../pages/admin/ClassAssignmentManagement";
import BlockManagement from "../pages/admin/BlockManagement";
import CourseManagement from "../pages/admin/CourseManagement";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}

        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* Student-only pages */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "Student",
              ]}
            />
          }
        >
          <Route
            path="/student/dashboard"
            element={<StudentDashboard />}
          />

          <Route
            path="/student/request-clearance"
            element={<RequestClearance />}
          />

          <Route
            path="/student/clearance-status"
            element={<ClearanceStatus />}
          />

          <Route
            path="/student/assistant"
            element={<Assistant />}
          />

          <Route
            path="/student/notifications"
            element={<StudentNotifications />}
          />

          <Route
            path="/student/profile"
            element={<StudentProfile />}
          />
        </Route>

        {/* Approver-only pages */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "Approver",
              ]}
            />
          }
        >
          <Route
            path="/approver/dashboard"
            element={<ApproverDashboard />}
          />

          <Route
            path="/approver/pending"
            element={<PendingRequests />}
          />

          <Route
            path="/approver/approved"
            element={<ApprovedRequests />}
          />

          <Route
            path="/approver/rejected"
            element={<RejectedRequests />}
          />

          <Route
            path="/approver/ready-for-enrollment"
            element={<ReadyForEnrollment />}
          />

          <Route
            path="/approver/notifications"
            element={<ApproverNotifications />}
          />

          <Route
            path="/approver/profile"
            element={<ApproverProfile />}
          />

          <Route
            path="/approver/student-details"
            element={<StudentDetails />}
          />
        </Route>

        {/* Administrator-only pages */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "Administrator",
                "Admin",
              ]}
            />
          }
        >
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/courses"
            element={<CourseManagement />}
          />

          <Route
            path="/admin/blocks"
            element={<BlockManagement />}
          />

          <Route
            path="/admin/class-assignments"
            element={<ClassAssignmentManagement />}
          />

          <Route
            path="/admin/users"
            element={<UserManagement />}
          />

          <Route
            path="/admin/offices"
            element={<OfficeManagement />}
          />

          <Route
            path="/admin/subjects"
            element={<SubjectManagement />}
          />

          <Route
            path="/admin/students"
            element={<StudentManagement />}
          />

          <Route
            path="/admin/clearances"
            element={<ClearanceManagement />}
          />

          <Route
            path="/admin/reports"
            element={<Reports />}
          />

          <Route
            path="/admin/ai-settings"
            element={<AISettings />}
          />

          <Route
            path="/admin/system-settings"
            element={<SystemSettings />}
          />

          <Route
            path="/admin/notifications"
            element={<AdminNotifications />}
          />

          <Route
            path="/admin/profile"
            element={<AdminProfile />}
          />

          <Route
            path="/admin/approver-management"
            element={<ApproverManagement />}
          />
        </Route>

        {/* Unknown URL */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;