const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const protect = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

// Routes accessible to all authenticated users
router.get('/', locationController.getAllLocations);
router.get('/assigned/me', locationController.getAssignedLocations); // Must be before /:id to avoid conflicts
router.get('/previous/me', locationController.getPreviousAssignments); // Get previous assignments for technician
router.get('/:id', locationController.getLocationById);

// Building routes (accessible to all authenticated users)
router.get('/:locationId/buildings', locationController.getBuildingsForLocation);

// Routes accessible to admins only
router.post('/', isAdmin, locationController.createLocation);
router.put('/:id', isAdmin, locationController.updateLocation);
router.delete('/:id', isAdmin, locationController.deleteLocation);
router.patch('/:id/toggle-status', isAdmin, locationController.toggleLocationStatus);
router.post('/:locationId/assign-technicians', locationController.assignTechnicians); // Allow both admins and technicians (for self-detachment)

// Building management routes (accessible to admins and location creators)
router.post('/:locationId/buildings', locationController.addBuildingToLocation);
router.put('/:locationId/buildings/:buildingId', locationController.updateBuildingInLocation);
router.delete('/:locationId/buildings/:buildingId', locationController.deleteBuildingFromLocation);

module.exports = router;
