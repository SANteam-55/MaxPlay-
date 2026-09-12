import React, { createContext, useContext, ReactNode } from 'react';
import { COLORS, GRADIENTS, SPACING, RADIUS } from '../utils/colors';

interface ThemeContextType {
  colors: typeof COLORS;
  gradients: typeof GRADIENTS;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: COLORS,
  gradients: GRADIENTS,
  spacing: SPACING,
  radius: RADIUS,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ colors: COLORS, gradients: GRADIENTS, spacing: SPACING, radius: RADIUS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
