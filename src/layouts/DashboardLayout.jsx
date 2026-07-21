import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function DashboardLayout({
  children,
}) {
  return (
    <ResponsivePortalLayout
      SidebarComponent={Sidebar}
      TopbarComponent={Topbar}
      portalLabel="Student Portal"
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default DashboardLayout;