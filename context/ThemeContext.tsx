import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeSettings } from '../types';

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (settings: ThemeSettings) => void;
  resetTheme: () => void;
}

const defaultTheme: ThemeSettings = {
  headerColor: '#ffffff', // white
  footerColor: '#111827', // gray-900
  headerText: 'CraveWave',
  footerText: '© 2024 CraveWave Technologies Inc.',
  logoUrl: ''
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme);

  const updateTheme = (settings: ThemeSettings) => {
    setTheme({ ...defaultTheme, ...settings });
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
