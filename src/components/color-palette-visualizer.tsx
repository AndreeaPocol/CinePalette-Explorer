import React from 'react';

// Define the new structure for a single color in the palette
export interface ColorProportion {
  r: number; // Red value (0-255)
  g: number; // Green value (0-255)
  b: number; // Blue value (0-255)
  proportion: number; // Value between 0 and 1
}

// Main component props, updated to use the new interface
interface PaletteVisualizerProps {
  palette: ColorProportion[];
}

/**
 * Converts a proportion (0 to 1) to a percentage string (e.g., "15.0%").
 * @param proportion The color's proportion.
 * @returns A formatted percentage string.
 */
const formatProportion = (proportion: number): string => {
  return (proportion * 100).toFixed(1) + '%';
};

/**
 * Converts R, G, B numbers to a full CSS RGB string (e.g., "rgb(255, 99, 97)").
 */
const rgbToCssString = (r: number, g: number, b: number): string => {
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Converts a single color component (0-255) to a two-digit hexadecimal string.
 */
const componentToHex = (c: number): string => {
  const hex = c.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
};

/**
 * Converts R, G, B numbers to a HEX color string (e.g., "#FF6361").
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  // Ensure we use uppercase hex codes, which is standard practice
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`.toUpperCase();
};

/**
 * A responsive component that visualizes a color palette using a horizontal bar
 * where each color block's width is proportional to its weight.
 * * This version is designed for seamless integration: transparent background, 
 * minimal padding, and relying on the parent container's layout.
 */
export const PaletteVisualizer: React.FC<PaletteVisualizerProps> = ({ palette }) => {

  if (!palette || palette.length === 0) {
    // Retain a clean fallback for when no data is provided
    return (
      <div className="p-4 rounded-lg border border-gray-300 text-center text-gray-500 bg-opacity-80 backdrop-blur-sm shadow-sm">
        No color data available to visualize.
      </div>
    );
  }

  // Calculate the total proportion to ensure data is normalized
  // const totalProportion = palette.reduce((sum, color) => sum + color.proportion, 0);

  return (
    // Outer container: Transparent, no shadow, full width (w-full)
    <div className="flex items-center space-x-2 p-2 bg-muted rounded-md shadow-sm bg-transparent">

      {/* === 1. VISUAL BAR REPRESENTATION === */}
      {/* <div 
        className="flex w-full h-8 md:h-10 overflow-hidden rounded-lg shadow-inner border border-gray-300 mb-5"
        role="progressbar"
        aria-label="Color Palette Proportions"
      >
        {palette.map((color, index) => {
          const cssColor = rgbToCssString(color.r, color.g, color.b);
          const hexCode = rgbToHex(color.r, color.g, color.b);
          const widthPercentage = (color.proportion / totalProportion) * 100;
          
          return (
            <div
              key={index}
              style={{ 
                backgroundColor: cssColor, 
                flexBasis: `${widthPercentage}%` 
              }}
              className="relative h-full transition-all duration-500"
              title={`${hexCode} | ${cssColor}: ${formatProportion(color.proportion)}`}
            >
              {widthPercentage > 15 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-white mix-blend-difference opacity-90 p-1">
                      {formatProportion(color.proportion)}
                  </span>
              )}
            </div>
          );
        })}
      </div> */}

      {/* === 2. DETAILED LIST OF COLORS AND PROPORTIONS === */}
      {/* Uses a responsive grid that shrinks naturally */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {palette.map((color, index) => {
          const hexCode = rgbToHex(color.r, color.g, color.b);
          const rgbString = rgbToCssString(color.r, color.g, color.b);

          return (
            <div 
              key={index} 
              className="flex items-center space-x-2 p-2 bg-muted/80 rounded-md border border-gray-200 shadow-sm"
            >
              {/* Color Swatch */}
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-gray-400 shadow-inner flex-shrink-0" 
                style={{ backgroundColor: rgbString }}
                aria-label={`Color swatch for ${hexCode}`}
              ></div>
              
              <div className="flex-1 min-w-0">
                {/* Hex Value */}
                <p className="text-xs font-semibold text-white-900 truncate" title={`Hex: ${hexCode}`}>
                  {hexCode}
                </p>
                
                {/* RGB Value */}
                <p className="text-[10px] text-white-700 truncate leading-tight" title={`RGB: ${rgbString}`}>
                  {rgbString}
                </p>
                
                {/* Proportion */}
                <p className="text-[10px] text-white-600 font-medium mt-0.5">
                  <span className="font-extrabold text-blue-600 mr-1">
                      {formatProportion(color.proportion)}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
};