import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import azureOpenAI from '@/services/azureOpenAI';
import Vehicle from '@/models/Vehicle';
import { AuthenticatedRequest, AppError, ApiResponse } from '@/types';

const router = express.Router();

// Simulated Autel OBD diagnostic codes database
const diagnosticCodesDB = new Map([
  ['P0300', { system: 'Engine', category: 'Ignition', description: 'Random/Multiple Cylinder Misfire Detected' }],
  ['P0171', { system: 'Fuel/Air', category: 'Fuel System', description: 'System Too Lean (Bank 1)' }],
  ['P0420', { system: 'Emission', category: 'Catalytic Converter', description: 'Catalyst System Efficiency Below Threshold' }],
  ['P0455', { system: 'Emission', category: 'EVAP', description: 'Evaporative Emission Control System Leak Detected (Large Leak)' }],
  ['P0128', { system: 'Cooling', category: 'Thermostat', description: 'Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)' }],
  ['P0101', { system: 'Air Intake', category: 'Mass Air Flow', description: 'Mass Air Flow Circuit Range/Performance Problem' }],
  ['P0505', { system: 'Idle Control', category: 'IAC', description: 'Idle Control System Malfunction' }],
  ['P0717', { system: 'Transmission', category: 'Speed Sensor', description: 'Input/Turbine Speed Sensor Circuit No Signal' }],
  ['B1318', { system: 'Body', category: 'Airbag', description: 'Battery Voltage Low' }],
  ['U0100', { system: 'Network', category: 'Communication', description: 'Lost Communication With ECM/PCM' }]
]);

// Simulate Autel diagnostic scan
router.post('/scan/:vehicleId', authenticate, authorize('staff', 'admin'), [
  body('equipment').optional().isString().withMessage('Equipment must be a string'),
  body('technician').optional().isString().withMessage('Technician must be a string')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { vehicleId } = req.params;
  const { equipment = 'Autel MaxiSys Ultra', technician } = req.body;

  const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'firstName lastName email phone');
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  // Simulate diagnostic scan - in reality, this would interface with the Autel device
  const detectedCodes = simulateAutelScan(vehicle);

  // Generate explanations for each code using AI
  const codesWithExplanations = await Promise.all(
    detectedCodes.map(async (codeData) => {
      const explanation = await azureOpenAI.generateDiagnosticExplanation(codeData.code, vehicle);
      return {
        ...codeData,
        explanation
      };
    })
  );

  // Create diagnostic session record
  const diagnosticSession = {
    vehicleId,
    equipment,
    technician: technician || req.user?.fullName,
    codes: codesWithExplanations,
    scanDate: new Date(),
    mileage: vehicle.mileage
  };

  // Add to vehicle's diagnostic history
  const diagnosticEntry = {
    date: new Date(),
    codes: detectedCodes.map(code => ({
      code: code.code,
      description: code.description,
      severity: code.severity
    })),
    mileage: vehicle.mileage,
    equipment,
    technician: technician || req.user?.fullName,
    resolved: false,
    notes: `Diagnostic scan completed with ${detectedCodes.length} codes detected`
  };

  vehicle.diagnosticHistory.push(diagnosticEntry);
  await vehicle.save();

  // Emit real-time update
  if ((req as any).io) {
    (req as any).io.to(`user_${vehicle.owner._id}`).emit('diagnostic_completed', {
      vehicleId,
      codesCount: detectedCodes.length,
      diagnosticSession
    });
  }

  const response: ApiResponse = {
    success: true,
    message: `Diagnostic scan completed. ${detectedCodes.length} trouble codes detected.`,
    data: {
      diagnosticSession,
      vehicle: {
        id: vehicle._id,
        displayName: vehicle.displayName,
        vin: vehicle.vin,
        mileage: vehicle.mileage
      }
    }
  };

  res.json(response);
}));

// Get diagnostic explanation for a specific code
router.get('/explain/:code', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { code } = req.params;
  const vehicleId = req.query.vehicleId as string;

  if (!/^[PBU][0-9A-F]{4}$/i.test(code)) {
    throw new AppError('Invalid diagnostic code format', 400);
  }

  let vehicleInfo = {};
  if (vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (vehicle) {
      // Check permissions for customers
      if (req.user?.role === 'customer' && vehicle.owner.toString() !== req.user._id.toString()) {
        throw new AppError('Access denied to this vehicle', 403);
      }
      vehicleInfo = vehicle;
    }
  }

  const explanation = await azureOpenAI.generateDiagnosticExplanation(code.toUpperCase(), vehicleInfo);
  const codeInfo = diagnosticCodesDB.get(code.toUpperCase());

  const response: ApiResponse = {
    success: true,
    message: 'Diagnostic code explanation generated',
    data: {
      code: code.toUpperCase(),
      codeInfo,
      explanation,
      vehicleInfo: vehicleId ? vehicleInfo : undefined
    }
  };

  res.json(response);
}));

// Generate diagnostic report
router.post('/report/:vehicleId', authenticate, authorize('staff', 'admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { vehicleId } = req.params;
  const { includeHistory = false } = req.body;

  const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'firstName lastName email phone');
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  const latestDiagnostic = vehicle.diagnosticHistory[vehicle.diagnosticHistory.length - 1];
  if (!latestDiagnostic) {
    throw new AppError('No diagnostic history found for this vehicle', 404);
  }

  // Generate comprehensive report
  const report = {
    vehicleInfo: {
      vin: vehicle.vin,
      displayName: vehicle.displayName,
      mileage: vehicle.mileage,
      owner: vehicle.owner
    },
    diagnosticDate: latestDiagnostic.date,
    equipment: latestDiagnostic.equipment,
    technician: latestDiagnostic.technician,
    codes: latestDiagnostic.codes,
    summary: await generateDiagnosticSummary(latestDiagnostic.codes),
    recommendations: await generateRecommendations(vehicle, latestDiagnostic.codes),
    estimatedCosts: calculateEstimatedCosts(latestDiagnostic.codes),
    urgencyLevel: calculateOverallUrgency(latestDiagnostic.codes),
    history: includeHistory ? vehicle.diagnosticHistory : undefined,
    generatedBy: req.user?.fullName,
    generatedAt: new Date(),
    reportId: `DR-${Date.now()}-${vehicle.vin.slice(-6)}`
  };

  // In a real implementation, you might save this report to a database or cloud storage
  // For now, we'll just return it

  const response: ApiResponse = {
    success: true,
    message: 'Diagnostic report generated successfully',
    data: { report }
  };

  res.json(response);
}));

// Get vehicle diagnostic history
router.get('/history/:vehicleId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { vehicleId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  // Check permissions for customers
  if (req.user?.role === 'customer' && vehicle.owner.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this vehicle', 403);
  }

  const history = vehicle.diagnosticHistory
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);

  const response: ApiResponse = {
    success: true,
    message: 'Diagnostic history retrieved successfully',
    data: {
      vehicleId,
      vehicleInfo: {
        displayName: vehicle.displayName,
        vin: vehicle.vin
      },
      history
    }
  };

  res.json(response);
}));

// Helper functions

function simulateAutelScan(vehicle: any): Array<{code: string, description: string, severity: string}> {
  // Simulate realistic diagnostic results based on vehicle characteristics
  const possibleCodes = Array.from(diagnosticCodesDB.keys());
  const detectedCodes = [];

  // Higher chance of codes for older/higher mileage vehicles
  const age = new Date().getFullYear() - vehicle.year;
  const mileage = vehicle.mileage || 0;
  
  let codeChance = 0.1; // Base 10% chance
  if (age > 10) codeChance += 0.2;
  if (mileage > 100000) codeChance += 0.3;
  if (mileage > 200000) codeChance += 0.2;

  // Simulate 0-3 codes typically
  const numCodes = Math.random() < codeChance ? Math.floor(Math.random() * 3) + 1 : 0;

  for (let i = 0; i < numCodes; i++) {
    const randomCode = possibleCodes[Math.floor(Math.random() * possibleCodes.length)];
    const codeInfo = diagnosticCodesDB.get(randomCode);
    
    if (codeInfo && !detectedCodes.find(c => c.code === randomCode)) {
      detectedCodes.push({
        code: randomCode,
        description: codeInfo.description,
        severity: calculateSeverity(randomCode, age, mileage)
      });
    }
  }

  return detectedCodes;
}

function calculateSeverity(code: string, vehicleAge: number, mileage: number): string {
  // Critical codes
  if (['P0300', 'U0100', 'B1318'].includes(code)) {
    return 'high';
  }
  
  // Emission-related codes are usually medium priority
  if (code.startsWith('P04') || code.startsWith('P05')) {
    return 'medium';
  }
  
  // Adjust based on vehicle condition
  if (vehicleAge > 15 || mileage > 250000) {
    return 'high';
  } else if (vehicleAge > 10 || mileage > 150000) {
    return 'medium';
  }
  
  return 'low';
}

async function generateDiagnosticSummary(codes: any[]): Promise<string> {
  if (codes.length === 0) {
    return 'No diagnostic trouble codes detected. Vehicle systems are operating normally.';
  }
  
  const criticalCount = codes.filter(c => c.severity === 'critical').length;
  const highCount = codes.filter(c => c.severity === 'high').length;
  const mediumCount = codes.filter(c => c.severity === 'medium').length;
  const lowCount = codes.filter(c => c.severity === 'low').length;

  let summary = `Diagnostic scan detected ${codes.length} trouble code${codes.length > 1 ? 's' : ''}. `;
  
  if (criticalCount > 0) {
    summary += `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} requiring immediate attention. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high priority issue${highCount > 1 ? 's' : ''} should be addressed soon. `;
  }
  if (mediumCount > 0) {
    summary += `${mediumCount} medium priority issue${mediumCount > 1 ? 's' : ''} for monitoring. `;
  }
  if (lowCount > 0) {
    summary += `${lowCount} low priority issue${lowCount > 1 ? 's' : ''} for future consideration.`;
  }

  return summary.trim();
}

async function generateRecommendations(vehicle: any, codes: any[]): Promise<string[]> {
  const recommendations = [];
  
  if (codes.length === 0) {
    recommendations.push('Continue regular maintenance schedule');
    recommendations.push('Schedule next service according to manufacturer recommendations');
    return recommendations;
  }

  const systems = [...new Set(codes.map(c => diagnosticCodesDB.get(c.code)?.system).filter(Boolean))];
  
  systems.forEach(system => {
    switch (system) {
      case 'Engine':
        recommendations.push('Engine diagnostic and repair required');
        break;
      case 'Fuel/Air':
        recommendations.push('Fuel system inspection and cleaning recommended');
        break;
      case 'Emission':
        recommendations.push('Emission system service required for compliance');
        break;
      case 'Transmission':
        recommendations.push('Transmission service and inspection needed');
        break;
      default:
        recommendations.push(`${system} system requires professional attention`);
    }
  });

  // General recommendations
  if (codes.some(c => c.severity === 'high' || c.severity === 'critical')) {
    recommendations.push('Schedule appointment immediately to prevent further damage');
  } else {
    recommendations.push('Schedule service appointment within 1-2 weeks');
  }

  return recommendations;
}

function calculateEstimatedCosts(codes: any[]): { min: number, max: number, currency: string } {
  if (codes.length === 0) {
    return { min: 0, max: 0, currency: 'CAD' };
  }

  // Base diagnostic fee
  let minCost = 150;
  let maxCost = 200;

  // Add estimated repair costs per code
  codes.forEach(code => {
    const codeType = code.code.charAt(0);
    switch (codeType) {
      case 'P': // Powertrain
        minCost += 200;
        maxCost += 800;
        break;
      case 'B': // Body
        minCost += 100;
        maxCost += 400;
        break;
      case 'U': // Network
        minCost += 300;
        maxCost += 1200;
        break;
      default:
        minCost += 150;
        maxCost += 600;
    }
  });

  return { min: minCost, max: maxCost, currency: 'CAD' };
}

function calculateOverallUrgency(codes: any[]): string {
  if (codes.some(c => c.severity === 'critical')) return 'critical';
  if (codes.some(c => c.severity === 'high')) return 'high';
  if (codes.some(c => c.severity === 'medium')) return 'medium';
  return 'low';
}

export default router;