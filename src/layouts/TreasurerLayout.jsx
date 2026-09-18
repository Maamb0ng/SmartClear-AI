import Sidebar from "../components/treasurer/Sidebar";
import Topbar from "../components/treasurer/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function TreasurerLayout({ children }) {
  return (
    <ResponsivePortalLayout
      SidebarComponent={Sidebar}
      TopbarComponent={Topbar}
      portalLabel="Treasurer Portal"
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default TreasurerLayout;