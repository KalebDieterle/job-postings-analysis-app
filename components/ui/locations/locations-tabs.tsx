"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, MapIcon, Grid3x3 } from "lucide-react";

interface LocationsTabsProps {
  dashboardContent: React.ReactNode;
  browseContent: React.ReactNode;
  mapContent: React.ReactNode;
}

export function LocationsTabs({
  dashboardContent,
  browseContent,
  mapContent,
}: LocationsTabsProps) {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="mb-6 grid w-full grid-cols-3 md:mb-8 md:max-w-md md:mx-auto">
        <TabsTrigger value="dashboard" className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[11px] md:text-sm">Dashboard</span>
        </TabsTrigger>
        <TabsTrigger value="browse" className="flex items-center gap-2">
          <Grid3x3 className="w-4 h-4" />
          <span className="text-[11px] md:text-sm">Browse</span>
        </TabsTrigger>
        <TabsTrigger value="map" className="flex items-center gap-2">
          <MapIcon className="w-4 h-4" />
          <span className="text-[11px] md:text-sm">Map</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="space-y-6 mt-0">
        {dashboardContent}
      </TabsContent>

      <TabsContent value="browse" className="space-y-6 mt-0">
        {browseContent}
      </TabsContent>

      <TabsContent value="map" className="space-y-6 mt-0">
        {mapContent}
      </TabsContent>
    </Tabs>
  );
}
