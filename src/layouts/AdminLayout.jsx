import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function AdminLayout({
  children,
}) {
  return (
    <ResponsivePortalLayout
      SidebarComponent={Sidebar}
      TopbarComponent={Topbar}
      portalLabel="Administrator Portal"
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default AdminLayout;