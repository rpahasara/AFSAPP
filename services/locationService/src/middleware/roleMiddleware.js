const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Role middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Authorization error' 
    });
  }
};

module.exports = isAdmin;
