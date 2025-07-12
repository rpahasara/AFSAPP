const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../model/User');

// Register
exports.register = async (req, res) => {
  const {
    firstname,
    lastname,
    email,
    password,
    confirmPassword,
    phone,
    userType,
    isAdmin
  } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords Or Email do not match' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstname,
      lastname,
      email,
      password: hashed,
      confirmPassword: hashed,
      phone,
      userType,
      isAdmin,
      isActive: false // User is inactive until admin approval
    });

    res.status(201).json({ message: 'Registration successful. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }    // Import token generator and generate tokens
    const jwt = require('jsonwebtoken');
    
    // Generate access token
    const accessToken = jwt.sign(
      { 
        userId: user._id, 
        isAdmin: user.isAdmin, 
        userType: user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // short-lived token
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // longer-lived refresh token
    );

    // Set refresh token in a secure, httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send the response with tokens and user info
    res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        isAdmin: user.isAdmin,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -confirmPassword');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -confirmPassword');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update own profile
exports.updateSelf = async (req, res) => {
  try {
    const updates = req.body;
    
    // Handle profile image upload
    if (req.file) {
      updates.profileImage = `/uploads/${req.file.filename}`;
    }

    if (updates.password) {
      if (updates.password !== updates.confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      const hashed = await bcrypt.hash(updates.password, 10);
      updates.password = hashed;
      updates.confirmPassword = hashed;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true
    }).select('-password -confirmPassword');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: err.message || 'Error updating profile' });
  }
};

// Admin updates user by ID
exports.updateUserById = async (req, res) => {
  try {
    const updates = req.body;

    if (updates.password) {
      if (updates.password !== updates.confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      const hashed = await bcrypt.hash(updates.password, 10);
      updates.password = hashed;
      updates.confirmPassword = hashed;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true
    }).select('-password -confirmPassword');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete user by ID (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new user (admin only)
exports.createUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    userType,
    isActive,
    phone
  } = req.body;

  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstname: firstName,
      lastname: lastName,
      email,
      password: hashed,
      confirmPassword: hashed,
      phone: phone || '', // Make phone optional
      userType: userType || 'user',
      isActive: isActive !== undefined ? isActive : true,
      isAdmin: userType === 'admin'
    });

    const createdUser = await User.findById(user._id).select('-password -confirmPassword');
    res.status(201).json(createdUser);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: err.message || 'Error creating user' });
  }
};

// Admin approves user by ID
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password -confirmPassword');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User approved successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Validate technician assignments
exports.validateTechnicianAssignments = async (req, res) => {
  try {
    const { technicianIds, locationId, previouslyAssignedTechs } = req.body;

    if (!technicianIds || !Array.isArray(technicianIds)) {
      return res.status(400).json({
        success: false,
        message: 'Technician IDs must be provided as an array'
      });
    }

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'Location ID is required'
      });
    }

    // Check if all technician IDs exist and are active technicians
    const technicians = await User.find({
      _id: { $in: technicianIds },
      userType: 'user',
      isActive: true
    });

    if (technicians.length !== technicianIds.length) {
      const foundIds = technicians.map(tech => tech._id.toString());
      const invalidIds = technicianIds.filter(id => !foundIds.includes(id));
      
      return res.status(400).json({
        success: false,
        message: `Invalid or inactive technician IDs: ${invalidIds.join(', ')}`
      });
    }

    res.json({
      success: true,
      message: 'Technician assignments validated successfully'
    });
  } catch (error) {
    console.error('Error validating technician assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating technician assignments'
    });
  }
};

// Update location assignments for users
exports.updateLocationAssignments = async (req, res) => {
  try {
    const { technicianIds, locationId, techsToRemove } = req.body;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'Location ID is required'
      });
    }

    // Add location to new technicians
    if (technicianIds && technicianIds.length > 0) {
      await User.updateMany(
        { _id: { $in: technicianIds } },
        { $addToSet: { assignedLocations: locationId } }
      );
    }

    // Remove location from technicians that are no longer assigned
    if (techsToRemove && techsToRemove.length > 0) {
      await User.updateMany(
        { _id: { $in: techsToRemove } },
        { $pull: { assignedLocations: locationId } }
      );
    }

    res.json({
      success: true,
      message: 'Location assignments updated successfully'
    });
  } catch (error) {
    console.error('Error updating location assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location assignments'
    });
  }
};

// Remove location from all users (used when location is deleted)
exports.removeLocationFromUsers = async (req, res) => {
  try {
    const { locationId } = req.params;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'Location ID is required'
      });
    }

    // Remove the location from all users' assignedLocations arrays
    await User.updateMany(
      { assignedLocations: locationId },
      { $pull: { assignedLocations: locationId } }
    );

    res.json({
      success: true,
      message: 'Location removed from all users successfully'
    });
  } catch (error) {
    console.error('Error removing location from users:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing location from users'
    });
  }
};


