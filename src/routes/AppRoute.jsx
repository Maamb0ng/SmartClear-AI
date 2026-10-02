import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";

// ============================================================
// LANDING
// ============================================================

import Landing from "../Landing";

// ============================================================
// AUTHENTICATION
// ============================================================

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// ============================================================
// STUDENT
// ============================================================

import StudentDashboard from "../pages/student/StudentDashboard";
import RequestClearance from "../pages/student/RequestClearance";
import ClearanceStatus from "../pages/student/ClearanceStatus";
import Assistant from "../pages/student/Assistant";
import StudentNotifications from "../pages/student/Notifications";
import StudentProfile from "../pages/student/Profile";

// ============================================================
// APPROVER / FACULTY
// ============================================================

import ApproverDashboard from "../pages/approver/ApproverDashboard";
import PendingRequests from "../pages/approver/PendingRequests";
import ApprovedRequests from "../pages/approver/ApprovedRequests";
import RejectedRequests from "../pages/approver/RejectedRequests";
import StudentDetails from "../pages/approver/StudentDetails";
import ApproverNotifications from "../pages/approver/Notifications";
import ApproverProfile from "../pages/approver/Profile";

// ============================================================
// TREASURER
// ============================================================

import TreasurerDashboard from "../pages/treasurer/TreasurerDashboard";
import TreasurerReadyForEnrollment from "../pages/treasurer/ReadyForEnrollment";
import TreasurerNotifications from "../pages/treasurer/Notifications";
import TreasurerProfile from "../pages/treasurer/Profile";
import TreasurerScheduleBatches from "../pages/treasurer/ScheduleBatches";
import TreasurerStudentReview from "../pages/treasurer/StudentReview";
import TreasurerReviewedStudents from "../pages/treasurer/ReviewedStudents";

// ============================================================
// GUIDANCE
// ============================================================

import GuidanceDashboard from "../pages/guidance/GuidanceDashboard";
import GuidancePendingStudents from "../pages/guidance/PendingStudents";
import GuidanceRequirements from "../pages/guidance/Requirements";
import GuidanceClearedStudents from "../pages/guidance/ClearedStudents";
import GuidanceReturnedStudents from "../pages/guidance/ReturnedStudents";
import GuidanceStudentDetails from "../pages/guidance/StudentDetails";
import GuidanceNotifications from "../pages/guidance/Notifications";
import GuidanceProfile from "../pages/guidance/Profile";

// ============================================================
// OFFICE STAFF
// ============================================================

import OfficeDashboard from "../pages/office/OfficeDashboard";
import OfficeScheduleBatches from "../pages/office/ScheduleBatches";
import OfficeStudentQueue from "../pages/office/StudentQueue";
import OfficeStudentDetails from "../pages/office/StudentDetails";
import OfficeRequirements from "../pages/office/Requirements";
import OfficeReviewedStudents from "../pages/office/ReviewedStudents";
import OfficeNotifications from "../pages/office/Notifications";
import OfficeProfile from "../pages/office/Profile";

// ============================================================
// ADMINISTRATOR
// ============================================================

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
        {/* ======================================================
            PUBLIC ROUTES
        ====================================================== */}

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

        {/* ======================================================
            STUDENT ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["Student"]}
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
            element={
              <StudentNotifications />
            }
          />

          <Route
            path="/student/profile"
            element={<StudentProfile />}
          />
        </Route>

        {/* ======================================================
            REGULAR APPROVER / FACULTY ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["Approver"]}
              portal="approver"
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
            path="/approver/notifications"
            element={
              <ApproverNotifications />
            }
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

        {/* ======================================================
            TREASURER ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["Approver"]}
              portal="treasurer"
            />
          }
        >
          <Route
            path="/treasurer/dashboard"
            element={<TreasurerDashboard />}
          />

          <Route
            path="/treasurer/schedule"
            element={
              <TreasurerScheduleBatches />
            }
          />

          <Route
            path="/treasurer/review"
            element={
              <TreasurerStudentReview />
            }
          />

          <Route
            path="/treasurer/reviewed"
            element={
              <TreasurerReviewedStudents />
            }
          />

          <Route
            path="/treasurer/ready-for-enrollment"
            element={
              <TreasurerReadyForEnrollment />
            }
          />

          <Route
            path="/treasurer/notifications"
            element={
              <TreasurerNotifications />
            }
          />

          <Route
            path="/treasurer/profile"
            element={<TreasurerProfile />}
          />
        </Route>

        {/* ======================================================
            GUIDANCE ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["Approver"]}
              portal="guidance"
            />
          }
        >
          <Route
            path="/guidance/dashboard"
            element={<GuidanceDashboard />}
          />

          <Route
            path="/guidance/pending"
            element={
              <GuidancePendingStudents />
            }
          />

          <Route
            path="/guidance/requirements"
            element={
              <GuidanceRequirements />
            }
          />

          <Route
            path="/guidance/cleared"
            element={
              <GuidanceClearedStudents />
            }
          />

          <Route
            path="/guidance/returned"
            element={
              <GuidanceReturnedStudents />
            }
          />

          <Route
            path="/guidance/student/:stepId"
            element={
              <GuidanceStudentDetails />
            }
          />

          <Route
            path="/guidance/notifications"
            element={
              <GuidanceNotifications />
            }
          />

          <Route
            path="/guidance/profile"
            element={<GuidanceProfile />}
          />
        </Route>

        {/* ======================================================
            OFFICE STAFF ROUTES
        ====================================================== */}

        <Route
          element={
            <ProtectedRoute
              allowedRoles={["Approver"]}
              portal="office"
            />
          }
        >
          <Route
            path="/office/dashboard"
            element={<OfficeDashboard />}
          />

          <Route
            path="/office/schedule"
            element={
              <OfficeScheduleBatches />
            }
          />

          <Route
            path="/office/students"
            element={<OfficeStudentQueue />}
          />

          <Route
            path="/office/student/:id"
            element={<OfficeStudentDetails />}
          />

          <Route
            path="/office/requirements"
            element={<OfficeRequirements />}
          />

          <Route
            path="/office/reviewed"
            element={
              <OfficeReviewedStudents />
            }
          />

          <Route
            path="/office/notifications"
            element={
              <OfficeNotifications />
            }
          />

          <Route
            path="/office/profile"
            element={<OfficeProfile />}
          />
        </Route>

        {/* ======================================================
            ADMINISTRATOR ROUTES
        ====================================================== */}

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
            element={
              <ClassAssignmentManagement />
            }
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

        {/* ======================================================
            UNKNOWN ROUTE
        ====================================================== */}

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