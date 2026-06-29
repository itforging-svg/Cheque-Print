import React, { useState } from "react";
import { Info, Compass, HelpCircle } from "lucide-react";
import { generateCalibrationPDF } from "../utils/pdfGenerator";
import type { PrinterProfile } from "../utils/pdfGenerator";

interface CalibrationWizardProps {
  profile: PrinterProfile;
  onProfileChange: (newProfile: PrinterProfile) => void;
}

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ profile, onProfileChange }) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSliderChange = (key: "offsetX" | "offsetY", value: number) => {
    onProfileChange({
      ...profile,
      [key]: value
    });
  };

  const handleDropdownChange = (key: "feedOrientation" | "feedAlignment", value: string) => {
    onProfileChange({
      ...profile,
      [key]: value
    });
  };

  const handlePrintTestPage = () => {
    const doc = generateCalibrationPDF(profile);
    doc.save(`calibration_grid_${profile.feedOrientation}_${profile.feedAlignment}.pdf`);
  };

  // Mathematical scaling for A4 simulator
  // A4 ratio: 210 x 297. Let's make the container 210px wide and 297px high for simple 1-to-1 pixel-to-millimeter matching!
  const simWidth = 210;
  const simHeight = 297;

  // Cheque size in mm
  const chWidth = 202;
  const chHeight = 92;

  // Calculate live visual style for simulation rectangle
  const getChequeSimStyles = (): React.CSSProperties => {
    const { feedOrientation, feedAlignment, offsetX, offsetY } = profile;
    
    // Scale offsets to fit simulation scale (1px = 1mm)
    // Constrain offset display so it doesn't fly off screen completely
    const clampedX = Math.max(-25, Math.min(25, offsetX));
    const clampedY = Math.max(-25, Math.min(25, offsetY));

    if (feedOrientation === "landscape") {
      let left = 0;
      if (feedAlignment === "center") {
        left = (simWidth - chWidth) / 2; // 4px
      } else if (feedAlignment === "right") {
        left = simWidth - chWidth; // 8px
      }

      return {
        width: `${chWidth}px`,
        height: `${chHeight}px`,
        left: `${left + clampedX}px`,
        top: `${clampedY}px`,
        transform: "none",
        transformOrigin: "center"
      };
    } else {
      // Portrait alignment: 92mm wide, 202mm tall
      let left = 0;
      if (feedAlignment === "center") {
        left = (simWidth - chHeight) / 2; // 59px
      } else if (feedAlignment === "right") {
        left = simWidth - chHeight; // 118px
      }

      return {
        width: `${chHeight}px`,
        height: `${chWidth}px`,
        left: `${left + clampedX}px`,
        top: `${clampedY}px`,
        writingMode: "vertical-rl",
        textOrientation: "mixed"
      };
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Alignment Settings</h1>
        <p className="page-subtitle">Calibrate custom page feeds and margins to match physical printer paper guides.</p>
      </div>

      <div className="grid-container">
        {/* Controls Panel */}
        <div className="card" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Calibration Controls</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Adjust layout variables to trick your HP LaserJet 1020 into centering printed fields perfectly.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="grid-container" style={{ gap: "1rem" }}>
              <div className="form-group" style={{ gridColumn: "span 6", marginBottom: 0 }}>
                <label htmlFor="feedOrientation">Feed Orientation</label>
                <select
                  id="feedOrientation"
                  className="input-field"
                  value={profile.feedOrientation}
                  onChange={(e) => handleDropdownChange("feedOrientation", e.target.value)}
                >
                  <option value="portrait">Portrait (Short edge first)</option>
                  <option value="landscape">Landscape (Long edge first)</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: "span 6", marginBottom: 0 }}>
                <label htmlFor="feedAlignment">Tray Position</label>
                <select
                  id="feedAlignment"
                  className="input-field"
                  value={profile.feedAlignment}
                  onChange={(e) => handleDropdownChange("feedAlignment", e.target.value)}
                >
                  <option value="left">Left Aligned</option>
                  <option value="center">Center Aligned</option>
                  <option value="right">Right Aligned</option>
                </select>
              </div>
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="offsetX">Horizontal Offset (X-Axis)</label>
                <span className="slider-value">{profile.offsetX > 0 ? `+${profile.offsetX}` : profile.offsetX} mm</span>
              </div>
              <input
                id="offsetX"
                type="range"
                className="range-slider"
                min="-15"
                max="15"
                step="0.5"
                value={profile.offsetX}
                onChange={(e) => handleSliderChange("offsetX", parseFloat(e.target.value))}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>← Shift Left</span>
                <span>Shift Right →</span>
              </p>
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="offsetY">Vertical Offset (Y-Axis)</label>
                <span className="slider-value">{profile.offsetY > 0 ? `+${profile.offsetY}` : profile.offsetY} mm</span>
              </div>
              <input
                id="offsetY"
                type="range"
                className="range-slider"
                min="-15"
                max="15"
                step="0.5"
                value={profile.offsetY}
                onChange={(e) => handleSliderChange("offsetY", parseFloat(e.target.value))}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                <span>↑ Shift Up</span>
                <span>Shift Down →</span>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button 
              className="btn btn-primary" 
              onClick={handlePrintTestPage}
              style={{ flexGrow: 1 }}
            >
              <Compass size={16} />
              Print Calibration Grid
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <HelpCircle size={16} />
              Instructions
            </button>
          </div>

          {showInstructions && (
            <div style={{ backgroundColor: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.85rem", lineHeight: 1.5 }}>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem", color: "var(--primary)" }}>How to calibrate:</h3>
              <ol style={{ paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.4rem", color: "var(--text-secondary)" }}>
                <li>Print the <strong>Calibration Grid</strong> onto an A4 page.</li>
                <li>Align your physical cheque over the printout. Note where the printed boundary lies relative to the cheque edges.</li>
                <li>Use the rulers on the grid page to measure errors in millimeters.</li>
                <li>Adjust sliders: e.g., if print is 2mm too high, set <strong>Y-Axis</strong> to <strong>+2.0mm</strong>.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Visual A4 Simulator Panel */}
        <div className="card" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", width: "100%" }}>A4 Printer Tray Feed Simulation</h2>
          
          <div className="a4-simulator-container" style={{ width: "100%", maxWidth: "340px" }}>
            <div className="a4-sheet" style={{ width: `${simWidth}px`, height: `${simHeight}px` }}>
              {/* Simulated Cheque Rectangle */}
              <div className="a4-cheque-mock" style={getChequeSimStyles()}>
                <span className="a4-cheque-text" style={{ 
                  transform: profile.feedOrientation === "portrait" ? "rotate(90deg)" : "none",
                  whiteSpace: "nowrap" 
                }}>
                  Cheque ({profile.feedOrientation === "portrait" ? "Rotated" : "Normal"})
                </span>
              </div>
            </div>
          </div>

          <div className="alert-box" style={{ marginTop: "1.5rem", marginBottom: 0, width: "100%" }}>
            <Info className="alert-icon" size={20} />
            <div className="alert-message">
              The preview represents the physical <strong>A4 Sheet</strong> feed. The blue block indicates where text is printed. Adjust alignments to match physical tray plastic guides.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
