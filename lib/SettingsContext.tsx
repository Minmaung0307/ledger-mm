// lib/SettingsContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext<any>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');

  // Theme နဲ့ Font ကို html tag မှာ ကပ်ပေးမယ့် Logic
  useEffect(() => {
    const root = window.document.documentElement;
    // Dark mode class
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    // Font size class
    root.classList.remove('text-scale-small', 'text-scale-medium', 'text-scale-large');
    root.classList.add(`text-scale-${fontSize}`);
  }, [theme, fontSize]);

  return (
    <SettingsContext.Provider value={{ theme, setTheme, fontSize, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(SettingsContext);