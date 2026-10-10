import { useEffect, useState } from "react";

import { supabase } from "../services/supabase";
import { getOfficeStaffContext } from "../services/officeStaffService";

import OfficeSidebar from "../components/office/Sidebar";
import OfficeTopbar from "../components/office/Topbar";
import FacultySidebar from "../components/approver/Sidebar";
import FacultyTopbar from "../components/approver/Topbar";

import ResponsivePortalLayout from "./ResponsivePortalLayout";

function OfficeStaffLayout({ children }) {
  const [layoutMode, setLayoutMode] = useState("loading");

  useEffect(() => {
    let active = true;

    async function resolveLayout() {
      try {
        // This service verifies the logged-in approver and resolves
        // only active office assignments. Faculty keep their own layout.
        const context = await getOfficeStaffContext();
        if (!active) return;

        const type = String(context?.profile?.approver_type || "")
          .trim()
          .toLowerCase();

        const hasOfficeAssignment = (context?.officeIds || []).length > 0;

        setLayoutMode(
          type === "faculty" && hasOfficeAssignment ? "faculty" : "office"
        );
      } catch (error) {
        console.error("Unable to resolve office layout:", error);
        if (active) setLayoutMode("office");
      }
    }

    resolveLayout();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT" && active) {
          setLayoutMode("office");
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (layoutMode === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-sm font-semibold text-slate-600">
          Loading workspace...
        </div>
      </main>
    );
  }

  const isFaculty = layoutMode === "faculty";

  return (
    <ResponsivePortalLayout
      SidebarComponent={isFaculty ? FacultySidebar : OfficeSidebar}
      TopbarComponent={isFaculty ? FacultyTopbar : OfficeTopbar}
      portalLabel={isFaculty ? "Faculty Portal" : "Office Staff Portal"}
    >
      {children}
    </ResponsivePortalLayout>
  );
}

export default OfficeStaffLayout;
