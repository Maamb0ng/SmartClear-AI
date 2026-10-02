import Sidebar from "../components/office/Sidebar";
import Topbar from "../components/office/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function OfficeStaffLayout({ children }) {
  return (
    <ResponsivePortalLayout
      SidebarComponent={Sidebar}
      TopbarComponent={Topbar}
      portalLabel="Office Staff Portal"
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default OfficeStaffLayout;