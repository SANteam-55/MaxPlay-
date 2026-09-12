import React from 'react';
import { TriangleAlert } from 'lucide-react';

export const MaintenanceScreen = ({ appName = 'MaxPlay' }) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#0A0A0A] p-6 text-center text-white">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
        <TriangleAlert className="h-10 w-10 text-red-500" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">We'll be right back</h1>
      <p className="text-sm text-gray-400 max-w-[280px]">
        {appName} is currently undergoing scheduled maintenance. Please check back later.
      </p>
    </div>
  );
};
