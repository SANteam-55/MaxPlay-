import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RootNavigator } from './navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="h-screen w-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
          <RootNavigator />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

