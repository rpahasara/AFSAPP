const Location = require('../models/Location');
const PreviousLocationAssignment = require('../models/PreviousLocationAssignment');
const { StatusCodes } = require('http-status-codes');
const axios = require('axios');

// Create a new location
exports.createLocation = async (req, res) => {
  try {
    const { name, latitude, longitude, address, description } = req.body;
    
    console.log('Location creation request received:', req.body);
    console.log('User info:', req.user);
    
    // Basic validation
    if (!name || !latitude || !longitude || !address) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields. Please provide name, coordinates and address.' 
      });
    }
    
    // Create location with user ID from token
    const location = await Location.create({
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address,
      description: description || '',
      createdBy: req.user.userId
    });
    
    res.status(201).json({
      success: true,
      location
    });
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error creating location' 
    });
  }
};

// Get all locations
exports.getAllLocations = async (req, res) => {
  try {
    console.log('Fetching all locations...');
    
    // Get locations without population to avoid User model issues
    const locations = await Location.find()
      .sort({ createdAt: -1 });
    
    console.log(`Found ${locations.length} locations`);
    
    res.json({
      success: true,
      count: locations.length,
      locations
    });
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error fetching locations' 
    });
  }
};

// Get a single location by ID
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
      
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    res.json({
      success: true,
      location
    });
  } catch (err) {
    console.error('Error fetching location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error fetching location' 
    });
  }
};

// Update a location
exports.updateLocation = async (req, res) => {
  try {
    const updates = req.body;
    const locationId = req.params.id;
    
    // Find the location first to check permissions
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    // Only allow the creator or admins to update
    if (location.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this location' 
      });
    }
    
    const updatedLocation = await Location.findByIdAndUpdate(
      locationId,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      location: updatedLocation
    });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error updating location' 
    });
  }
};

// Delete a location
exports.deleteLocation = async (req, res) => {
  try {
    const locationId = req.params.id;
    
    // Find the location first to check permissions
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    // Only allow the creator or admins to delete
    if (location.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this location' 
      });
    }
    
    // Remove this location from all users' assignedLocations arrays - call Auth service
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
      await axios.patch(`${authServiceUrl}/api/auth/remove-location/${locationId}`, {}, {
        headers: {
          'Authorization': req.headers.authorization // Forward the auth token
        }
      });
    } catch (error) {
      console.warn('Failed to update user assignments:', error.message);
      // Continue with location deletion even if user update fails
    }

    await Location.findByIdAndDelete(locationId);
    
    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error deleting location' 
    });
  }
};

// Toggle location active status
exports.toggleLocationStatus = async (req, res) => {
  try {
    const locationId = req.params.id;
    
    // Find the location
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    // Only allow admins to change status
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    // Toggle the status
    location.isActive = !location.isActive;
    await location.save();
    
    res.json({
      success: true,
      message: `Location ${location.isActive ? 'activated' : 'deactivated'} successfully`,
      location
    });
  } catch (err) {
    console.error('Error toggling location status:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error toggling location status' 
    });
  }
};

// Assign technicians to a location
exports.assignTechnicians = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { technicianIds } = req.body;
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;

    if (!locationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Location ID is required' 
      });
    }

    if (!technicianIds || !Array.isArray(technicianIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Technician IDs must be provided as an array' 
      });
    }
    
    // Special case: Allow non-admin technicians to detach themselves from a location
    const isSelfDetachment = !isAdmin && technicianIds.length === 0;

    // Find the location
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }

    // Get currently assigned technicians to identify which ones to remove
    const previouslyAssignedTechs = [...location.assignedTechnicians];
    const techsToRemove = previouslyAssignedTechs.filter(
      techId => !technicianIds.includes(techId.toString())
    );

    // For self-detachment, check if the user is assigned to this location
    if (isSelfDetachment) {
      if (!location.assignedTechnicians.includes(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'You are not assigned to this location' 
        });
      }
      
      // Get assignment date from Auth service to calculate work duration
      let assignedDate = new Date();
      let totalWorkOrders = 0;
      
      try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
        const userResponse = await axios.get(`${authServiceUrl}/api/auth/user/${userId}`, {
          headers: { 'Authorization': req.headers.authorization }
        });
        
        // Try to get work orders count for this location
        try {
          const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:5003';
          const ordersResponse = await axios.get(`${inventoryServiceUrl}/api/workorders/location/${locationId}`, {
            headers: { 'Authorization': req.headers.authorization }
          });
          
          if (ordersResponse.data && ordersResponse.data.workOrders) {
            totalWorkOrders = ordersResponse.data.workOrders.filter(order => 
              order.technicianId === userId
            ).length;
          }
        } catch (orderError) {
          console.warn('Could not fetch work orders count:', orderError.message);
        }
        
      } catch (error) {
        console.warn('Could not fetch user assignment date:', error.message);
      }
      
      // Create previous assignment record
      try {
        const workDuration = Date.now() - assignedDate.getTime();
        
        await PreviousLocationAssignment.create({
          technicianId: userId,
          locationId: location._id,
          locationSnapshot: {
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
            description: location.description || ''
          },
          assignedDate,
          closedDate: new Date(),
          workDuration,
          totalWorkOrders
        });
        
        console.log(`Created previous assignment record for technician ${userId} at location ${locationId}`);
      } catch (assignmentError) {
        console.error('Error creating previous assignment record:', assignmentError);
        // Don't fail the entire operation if this fails
      }
      
      // Remove the user from the location's assigned technicians
      location.assignedTechnicians = location.assignedTechnicians.filter(
        techId => techId.toString() !== userId
      );
    } else {
      // Check permissions for admin operations
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Admin access required' 
        });
      }
      
      // Validate technician assignments via Auth service
      try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
        const response = await axios.post(`${authServiceUrl}/api/auth/validate-technician-assignments`, {
          technicianIds,
          locationId,
          previouslyAssignedTechs
        }, {
          headers: {
            'Authorization': req.headers.authorization // Forward the auth token
          }
        });
        
        if (!response.data.success) {
          return res.status(400).json({
            success: false,
            message: response.data.message
          });
        }
      } catch (error) {
        console.error('Error validating technician assignments:', error.message);
        return res.status(500).json({
          success: false,
          message: 'Error validating technician assignments'
        });
      }
      
      // Update the location's assigned technicians
      location.assignedTechnicians = technicianIds;
    }

    await location.save();

    // Update user assignments via Auth service
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
      await axios.post(`${authServiceUrl}/api/auth/update-location-assignments`, {
        technicianIds: isSelfDetachment ? [] : technicianIds,
        locationId,
        techsToRemove: isSelfDetachment ? [userId] : techsToRemove
      }, {
        headers: {
          'Authorization': req.headers.authorization
        }
      });
    } catch (error) {
      console.warn('Failed to update user location assignments:', error.message);
    }

    // Populate and return the updated location
    const updatedLocation = await Location.findById(locationId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Technicians assigned successfully',
      location: updatedLocation
    });
  } catch (error) {
    console.error('Error in assignTechnicians:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error assigning technicians', 
      error: error.message
    });
  }
};

// Get all locations assigned to the logged-in technician
exports.getAssignedLocations = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find all locations where the user is an assigned technician
    const locations = await Location.find({ assignedTechnicians: userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (err) {
    console.error('Error fetching assigned locations:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error fetching assigned locations' 
    });
  }
};

// Add building to location
exports.addBuildingToLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { name, description } = req.body;
    
    // Basic validation
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Building name is required' 
      });
    }
    
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    // Only allow the creator or admins to add buildings
    if (location.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to modify this location' 
      });
    }
    
    // Check if building name already exists in this location
    const existingBuilding = location.buildings.find(building => 
      building.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingBuilding) {
      return res.status(400).json({ 
        success: false, 
        message: 'Building with this name already exists in this location' 
      });
    }
    
    // Add new building
    location.buildings.push({
      name: name.trim(),
      description: description || ''
    });
    
    await location.save();
    
    // Return the updated location
    const updatedLocation = await Location.findById(locationId);
    
    res.status(201).json({
      success: true,
      message: 'Building added successfully',
      location: updatedLocation
    });
  } catch (err) {
    console.error('Error adding building to location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error adding building to location' 
    });
  }
};

// Update building in location
exports.updateBuildingInLocation = async (req, res) => {
  try {
    const { locationId, buildingId } = req.params;
    const { name, description, isActive } = req.body;
    
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    // Only allow the creator or admins to update buildings
    if (location.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to modify this location' 
      });
    }
    
    const building = location.buildings.id(buildingId);
    if (!building) {
      return res.status(404).json({ 
        success: false, 
        message: 'Building not found' 
      });
    }
    
    // Check if new name conflicts with existing buildings (excluding current building)
    if (name && name !== building.name) {
      const existingBuilding = location.buildings.find(b => 
        b._id.toString() !== buildingId && 
        b.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existingBuilding) {
        return res.status(400).json({ 
          success: false, 
          message: 'Building with this name already exists in this location' 
        });
      }
    }
    
    // Update building properties
    if (name !== undefined) building.name = name.trim();
    if (description !== undefined) building.description = description;
    if (isActive !== undefined) building.isActive = isActive;
    
    await location.save();
    
    // Return the updated location
    const updatedLocation = await Location.findById(locationId);
    
    res.json({
      success: true,
      message: 'Building updated successfully',
      location: updatedLocation
    });
  } catch (err) {
    console.error('Error updating building in location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error updating building in location' 
    });
  }
};

// Delete building from location
exports.deleteBuildingFromLocation = async (req, res) => {
  try {
    const { locationId, buildingId } = req.params;
    
    const location = await Location.findById(locationId);
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    // Only allow the creator or admins to delete buildings
    if (location.createdBy.toString() !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to modify this location' 
      });
    }
    
    const buildingIndex = location.buildings.findIndex(b => b._id.toString() === buildingId);
    if (buildingIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Building not found' 
      });
    }
    
    // Remove the building
    location.buildings.splice(buildingIndex, 1);
    await location.save();
    
    // Return the updated location
    const updatedLocation = await Location.findById(locationId);
    
    res.json({
      success: true,
      message: 'Building deleted successfully',
      location: updatedLocation
    });
  } catch (err) {
    console.error('Error deleting building from location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error deleting building from location' 
    });
  }
};

// Get buildings for a location
exports.getBuildingsForLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    
    const location = await Location.findById(locationId).select('buildings name');
    
    if (!location) {
      return res.status(404).json({ 
        success: false, 
        message: 'Location not found' 
      });
    }
    
    res.json({
      success: true,
      locationName: location.name,
      buildings: location.buildings
    });
  } catch (err) {
    console.error('Error fetching buildings for location:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Error fetching buildings for location' 
    });
  }
};

// Get previous location assignments for the logged-in technician
exports.getPreviousAssignments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get previous assignments for the technician, sorted by closed date (most recent first)
    const previousAssignments = await PreviousLocationAssignment.find({ 
      technicianId: userId 
    })
    .sort({ closedDate: -1 })
    .skip(skip)
    .limit(limit);

    // Get total count for pagination
    const totalCount = await PreviousLocationAssignment.countDocuments({ 
      technicianId: userId 
    });

    // Format the assignments for response
    const formattedAssignments = previousAssignments.map(assignment => ({
      _id: assignment._id,
      locationId: assignment.locationId,
      location: assignment.locationSnapshot,
      assignedDate: assignment.assignedDate,
      closedDate: assignment.closedDate,
      workDuration: assignment.workDuration,
      totalWorkOrders: assignment.totalWorkOrders,
      // Calculate human-readable work duration
      workDurationFormatted: formatDuration(assignment.workDuration)
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Previous assignments retrieved successfully',
      data: formattedAssignments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching previous assignments:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || 'Error fetching previous assignments'
    });
  }
};

// Helper function to format duration in milliseconds to human-readable format
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}
