import Sidebar from "../components/approver/Sidebar";
import Topbar from "../components/approver/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function ApproverLayout({
  children,
}) {
  return (
    <ResponsivePortalLayout
      SidebarComponent={Sidebar}
      TopbarComponent={Topbar}
      portalLabel="Approver Portal"
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default ApproverLayout;