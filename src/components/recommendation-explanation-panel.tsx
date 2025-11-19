import React, { useState, useRef, useEffect, RefObject } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { type MovieMetadata } from '@/data/movie-palettes';
import { ColorProportion } from '@/data/retrieve-palette';

// --- Configuration for Proportional Tile Width ---
const MAX_TILE_WIDTH_PX = 800; 
const MIN_TILE_WIDTH_PX = 20; 

// Define a unified return type
export type MappingResult = {
  score: number, 
  palette1To2: { color: ColorProportion, closestInOtherPalette: any, difference: number, weight?: number }[],
  palette2To1: { color: ColorProportion, closestInOtherPalette: any, difference: number, weight?: number }[],
  totalCost1: number, 
  totalCost2: number, 
};

export interface RecommendationResult {
  movie: MovieMetadata; 
  mapping: MappingResult | null; 
  score: number;
}

export interface RecommendationExplanationPanelProps {
  selectedMovieName: string;
  recommendedMovieName: string;
  recommendedMovieMICD: number;
  explanationDetails?: MappingResult | null;
}

export const RecommendationExplanationPanel: React.FC<RecommendationExplanationPanelProps> = ({
  selectedMovieName,
  recommendedMovieName,
  recommendedMovieMICD,
  explanationDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  // Refs for the two scrollable containers
  const scrollContainerRef1 = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef2 = useRef<HTMLDivElement | null>(null);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  /**
   * Centers the horizontal scrollbar of a referenced DOM element.
   */
  const centerScroll = (ref: RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const { scrollWidth, clientWidth } = ref.current;
      // Calculate the scroll position needed to center the content
      // (Total Content Width - Visible Viewport Width) / 2
      const centerPosition = (scrollWidth - clientWidth) / 2;
      // Set the scroll position
      ref.current.scrollLeft = centerPosition;
    }
  };

  /**
   * Effect to center the scroll position when the panel expands or data changes.
   */
  useEffect(() => {
    // We only try to center the scroll if the panel is currently expanded and the data is available
    if (isExpanded && explanationDetails) {
        // Use a timeout to ensure the DOM has fully rendered the list items 
        // and calculated the correct scrollWidth before attempting to scroll.
        const timer = setTimeout(() => {
            centerScroll(scrollContainerRef1);
            centerScroll(scrollContainerRef2);
        }, 0); 

        return () => clearTimeout(timer);
    }
  }, [isExpanded, explanationDetails]);


  /**
   * Calculates the style for a color tile, scaling the width based on its proportion.
   */
  const getTileStyle = (colorData: ColorProportion, customStyles = {}) => {
    const proportion = colorData.proportion !== undefined && !isNaN(colorData.proportion) ? colorData.proportion : 0;
    const proportionalWidth = proportion * MAX_TILE_WIDTH_PX;
    const finalWidth = Math.max(proportionalWidth, MIN_TILE_WIDTH_PX);

    return {
      width: `${finalWidth}px`,
      height: '40px',
      backgroundColor: `rgb(${colorData.r}, ${colorData.g}, ${colorData.b})`,
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      ...customStyles
    };
  };

  /**
   * Generates the title attribute text for hover.
   */
  const getTitleText = (colorData: ColorProportion) => {
    const proportion = colorData.proportion !== undefined && !isNaN(colorData.proportion) ? colorData.proportion : 0;
    return `Proportion: ${(proportion * 100).toFixed(1)}%`;
  }


  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '16px' }}>
      <Typography variant="body1" gutterBottom>
        The movie <i>{recommendedMovieName}</i> was recommended based on your selection of <i>{selectedMovieName}</i>.
        The similarity score between <i>{selectedMovieName}</i> and <i>{recommendedMovieName}</i> is: <b>{recommendedMovieMICD.toFixed(4)}</b>.
      </Typography>
      <Button 
        onClick={handleToggleExpand} 
        endIcon={<ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />}
      >
        {isExpanded ? 'Hide Explanation' : 'Show Explanation'}
      </Button>

      {explanationDetails && isExpanded && (
        <>
          {/* Mapping 1 to 2 */}
          {explanationDetails.palette1To2 === null || explanationDetails.palette1To2 === undefined ? (
            console.error('palette1To2 is missing in explanationDetails')
          ) : (
            explanationDetails.palette1To2.length > 0 && (
            <>
            <Typography variant="h5" gutterBottom>
              Color Matches (<i>{selectedMovieName}</i> to <i>{recommendedMovieName}</i>):
            </Typography>
            
            {/* WRAPPER FOR HORIZONTAL SCROLLING - Reference 1 */}
            <div ref={scrollContainerRef1} style={{ overflowX: 'auto', paddingBottom: '15px' }}>
                <ul style={{ 
                    listStyleType: 'none', 
                    paddingLeft: 0, 
                    margin: 0,
                    // Ensure the list content is allowed to overflow the viewport
                    minWidth: `${(MAX_TILE_WIDTH_PX * 2) + 100}px` 
                }}>
                  {[...(explanationDetails.palette1To2 || [])]
                    .sort((a, b) => {
                      return b.color.proportion - a.color.proportion;
                    })
                    .map((match, index) => (
                    <li 
                        key={`1to2-${index}`} 
                        // CSS Grid maintains the arrow's center alignment
                        style={{ 
                            marginBottom: '15px', 
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr', 
                            alignItems: 'center', 
                            width: '100%', 
                            padding: 0, 
                        }}
                    >
                        {/* Source Color Tile (Column 1): Anchored to the right edge of its column */}
                        <div
                          style={getTileStyle(match.color, { justifySelf: 'end' })}
                          title={getTitleText(match.color)}
                        ></div>
                        
                        {/* Arrow (Column 2): The fixed center axis */}
                        <div style={{ fontSize: '1.5rem', margin: '0 15px', color: '#333', justifySelf: 'center' }}>
                          &rarr; 
                        </div>
                        
                        {/* Target Color Tile (Column 3): Anchored to the left edge of its column */}
                        <div
                          style={getTileStyle(match.closestInOtherPalette, { justifySelf: 'start' })}
                          title={getTitleText(match.closestInOtherPalette)}
                        ></div>
                    </li>
                  ))}
                </ul>
            </div>
            </>
          )
          )}
          
          <hr style={{ margin: '20px 0', borderTop: '1px solid #e0e0e0' }} /> 
          
          {/* Mapping 2 to 1 */}
          {explanationDetails.palette2To1 === null || explanationDetails.palette2To1 === undefined ? (
            console.error('palette2To1 is missing in explanationDetails')
          ) : (
            explanationDetails.palette2To1.length > 0 && (
              <>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Color Matches (<i>{recommendedMovieName}</i> to <i>{selectedMovieName}</i>):
              </Typography>
              
              {/* WRAPPER FOR HORIZONTAL SCROLLING - Reference 2 */}
              <div ref={scrollContainerRef2} style={{ overflowX: 'auto', paddingBottom: '15px' }}>
                <ul style={{ 
                    listStyleType: 'none', 
                    paddingLeft: 0, 
                    margin: 0,
                    // Ensure the list content is allowed to overflow the viewport
                    minWidth: `${(MAX_TILE_WIDTH_PX * 2) + 100}px` 
                }}>
                  {[...(explanationDetails.palette2To1 || [])] 
                    .sort((a, b) => {
                      return b.color.proportion - a.color.proportion;
                    })
                    .map((match, index) => (
                    <li 
                        key={`2to1-${index}`} 
                        // CSS Grid maintains the arrow's center alignment
                        style={{ 
                            marginBottom: '15px', 
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr', 
                            alignItems: 'center', 
                            width: '100%', 
                            padding: 0, 
                        }}
                    >
                      {/* Source Color Tile (Column 1): Anchored to the right edge of its column */}
                      <div
                        style={getTileStyle(match.color, { justifySelf: 'end' })}
                        title={getTitleText(match.color)}
                      ></div>
                      
                      {/* Arrow (Column 2): The fixed center axis */}
                      <div style={{ fontSize: '1.5rem', margin: '0 15px', color: '#333', justifySelf: 'center' }}>
                        &rarr;
                      </div>
                      
                      {/* Target Color Tile (Column 3): Anchored to the left edge of its column */}
                      <div
                        style={getTileStyle(match.closestInOtherPalette, { justifySelf: 'start' })}
                        title={getTitleText(match.closestInOtherPalette)}
                      ></div>
                  </li>
                  ))}
                </ul>
              </div>
              </>
            )
          )}
        </>
      )}
 </div>
  );
};

export default RecommendationExplanationPanel;