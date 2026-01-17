import React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Sidebar = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
};

export default Sidebar;
