import React from 'react';
import Typography from '@mui/material/Typography'; // Assuming Typography from Material UI is still desired

interface RecommendationExplanationPanelProps {
  selectedMovieName: string;
  recommendedMovieName: string;
  recommendedMovieMICD: number;
  explanationDetails?: {
    totalPixels1: number;
    totalPixels2: number;
    palette1To2?: {
      color: { r: number; g: number; b: number, count: number };
      closestInOtherPalette: { r: number; g: number; b: number, count: number };
      deltaE: number;
      weightedCost: number;
    }[];
    palette2To1: {
      color: { r: number; g: number; b: number, count: number };
      closestInOtherPalette: { r: number; g: number; b: number, count: number };
      deltaE: number;
      weightedCost: number;
    }[];
    totalCost1: number, 
    totalCost2: number
  };
}

const RecommendationExplanationPanel: React.FC<RecommendationExplanationPanelProps> = ({
  selectedMovieName,
  recommendedMovieName,
  recommendedMovieMICD,
  explanationDetails,
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '16px' }}>
      <Typography variant="body1" gutterBottom>
        The movie <i>{recommendedMovieName}</i> was recommended based on your selection of <i>{selectedMovieName}</i>.
        The recommendation is based on the Minimum Color Difference (MICD) model between the two movies.
        The MICD between <i>{selectedMovieName}</i> and <i>{recommendedMovieName}</i> is: <b>{recommendedMovieMICD.toFixed(4)}</b>.
      </Typography>

      {explanationDetails && (
        <>
          {explanationDetails.palette1To2 === null || explanationDetails.palette1To2 === undefined ? (
            console.error('palette1To2 is missing in explanationDetails')
          ) : (
            explanationDetails.palette1To2.length > 0 && (
            <>
            <Typography variant="h5" gutterBottom>
              Color Matches (<i>{selectedMovieName}</i> to <i>{recommendedMovieName}</i>):
            </Typography>
            <ul>
              {[...(explanationDetails.palette1To2 || [])] // Create a copy to avoid modifying the original array
                .sort((a, b) => {
                  // Sort by the weight of the first color in descending order
                  return b.color.count - a.color.count;
                })
                .map((match, index) => (
                <li key={`1to2-${index}`} style={{ marginBottom: '15px' }}> {/* Added bottom margin */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'normal', justifyContent: 'center' }}> {/* Added justifyContent: 'center' */}
                    <div
                      style={{
                        width: '40px', // Larger tile size
                        height: '40px', // Larger tile size
                        backgroundColor: `rgb(${match.color.r}, ${match.color.g}, ${match.color.b})`,
                      }}
                      title={`Weight: ${((match.color.count / (explanationDetails.totalPixels1 || 1)) * 100).toFixed(1)}%`} // Hover text for color weight
                    ></div>
                    <div>
                      &rarr; {/* Right arrow */}
                    </div>
                    <div
                      style={{
                        width: '40px', // Larger tile size
                        height: '40px', // Larger tile size
                        backgroundColor: `rgb(${match.closestInOtherPalette.r}, ${match.closestInOtherPalette.g}, ${match.closestInOtherPalette.b})`,
                      }}
                      title={`Weight: ${((match.closestInOtherPalette.count / (explanationDetails.totalPixels2 || 1)) * 100).toFixed(1)}%`} // Hover text for color weight
                    ></div>
                   </div>
                  DeltaE: {match.deltaE.toFixed(2)}, Weighted Cost: {match.weightedCost.toFixed(4)}
                </li>
              ))}
            </ul>
              <Typography variant="h6">
                The total weighted cost for this color mapping is: {explanationDetails.totalCost1.toFixed(4)}.
              </Typography>
            </>
          )
          )}

          {explanationDetails.palette2To1 === null || explanationDetails.palette2To1 === undefined ? (
            console.error('palette2To1 is missing in explanationDetails')
          ) : (
            explanationDetails.palette2To1.length > 0 && (
              <>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Color Matches (<i>{recommendedMovieName}</i> to <i>{selectedMovieName}</i>):
              </Typography>
              <ul>
                {[...(explanationDetails.palette2To1 || [])] // Create a copy to avoid modifying the original array
                  .sort((a, b) => {
                    // Sort by the weight of the first color in descending order
                    return b.color.count - a.color.count;
                  })
                  .map((match, index) => (
                  <li key={`2to1-${index}`} style={{ marginBottom: '15px' }}> {/* Added bottom margin */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'normal', justifyContent: 'center'}}>
                      <div // Changed to match the structure of 1To2 for consistency
                        style={{
                          width: '40px', // Larger tile size
                          height: '40px', // Larger tile size
                          backgroundColor: `rgb(${match.color.r}, ${match.color.g}, ${match.color.b})`,
                        }}
                        title={`Weight: ${((match.color.count / (explanationDetails.totalPixels2 || 1)) * 100).toFixed(1)}%`} // Hover text for color weight
                      ></div>
                     <div>
                        &rarr; {/* Right arrow */}{' '}
                      </div>

                      <div
                        style={{width: '40px', // Larger tile size
                          height: '40px', // Larger tile size
                          backgroundColor: `rgb(${match.closestInOtherPalette.r}, ${match.closestInOtherPalette.g}, ${match.closestInOtherPalette.b})`,
                        }}
                        title={`Weight: ${((match.closestInOtherPalette.count / (explanationDetails.totalPixels1 || 1)) * 100).toFixed(1)}%`} // Hover text for color weight
                      ></div>
                   </div>
                  DeltaE: {match.deltaE.toFixed(2)}, Weighted Cost: {match.weightedCost.toFixed(4)}
                </li>
                ))}
              </ul>
              <Typography variant="h6">
                The total weighted cost for this color mapping is: {explanationDetails.totalCost2.toFixed(4)}.
              </Typography>
              </>
            )
          )}
        </>
      )}
 </div>
  );
};

export default RecommendationExplanationPanel;