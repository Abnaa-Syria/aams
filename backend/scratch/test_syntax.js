const ShiftService = require('../src/modules/shifts/service');
console.log('ShiftService loaded successfully:', typeof ShiftService.endShift);

const LeaveRequestService = require('../src/modules/leaveRequests/service');
console.log('LeaveRequestService loaded successfully:', typeof LeaveRequestService.review);

const VehicleService = require('../src/modules/vehicles/service');
console.log('VehicleService loaded successfully:', typeof VehicleService.releaseDriver);

console.log('ALL SYNTAX AND IMPORTS VERIFIED SUCCESSFULLY!');
