import Sidebar from "../components/guidance/Sidebar";
import Topbar from "../components/guidance/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function GuidanceLayout({
  children,
}) {
  return (
    <ResponsivePortalLayout
      SidebarComponent={Sidebar}
      TopbarComponent={Topbar}
      portalLabel="Guidance Portal"
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default GuidanceLayout;