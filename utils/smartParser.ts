
import { UnitType } from '../types';

interface SmartParseResult {
  height?: number;
  width?: number;
  suggestedUnit?: UnitType;
}

export const parseSmartDimensions = (description: string): SmartParseResult => {
  const result: SmartParseResult = {};
  const lower = description.toLowerCase();

  // Regex for patterns like "150mm thick", "200mm deep", "0.15m thick"
  const thicknessRegex = /(\d+(?:\.\d+)?)\s*(mm|millimeter|millimetre|m)\s*(?:thick|deep|depth)/i;
  const widthRegex = /(\d+(?:\.\d+)?)\s*(mm|millimeter|millimetre|m)\s*(?:wide|width)/i;

  const thickMatch = lower.match(thicknessRegex);
  if (thickMatch) {
    let val = parseFloat(thickMatch[1]);
    const unit = thickMatch[2];
    
    // Normalize to meters
    if (unit.startsWith('m') && !unit.startsWith('mm')) {
        // already meters
    } else {
        val = val / 1000;
    }
    
    result.height = parseFloat(val.toFixed(3));
  }

  const widthMatch = lower.match(widthRegex);
  if (widthMatch) {
    let val = parseFloat(widthMatch[1]);
    const unit = widthMatch[2];
    if (!unit.startsWith('m') || unit.startsWith('mm')) {
        val = val / 1000;
    }
    result.width = parseFloat(val.toFixed(3));
  }

  // Unit Heuristics
  // If thickness is stated, usually m2 for slabs/walls unless linear
  if (result.height && (lower.includes('concrete') || lower.includes('screed') || lower.includes('slab') || lower.includes('wall'))) {
     result.suggestedUnit = UnitType.M2;
  }
  
  // If width AND thickness stated, could be linear (m) if it's a beam/column/strip, or m2/m3 depending on rules.
  // Simple heuristic: "width" often implies linear length is the primary measure, so maybe m?
  // But let's stick to the prompt example: "100mm thick concrete" -> m2
  
  return result;
};
