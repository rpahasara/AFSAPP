import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get token and add Authorization header
const authHeader = () => {
  let token = localStorage.getItem("token") || sessionStorage.getItem("token");
  token = token?.replace(/^"|"$/g, ''); // Remove surrounding quotes
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Create a new work order
export const createWorkOrder = async (orderData) => {
  try {
    console.log('Creating work order with data:', orderData); // Debug log
    
    // Always let the backend generate the uniqueId in the required format (0001, 0002, etc.)
    delete orderData.uniqueId; // Remove any client-side uniqueId to ensure backend generates it
    
    // Create a FormData object for file uploads
    const formData = new FormData();
      // Add all regular fields to formData
    Object.keys(orderData).forEach(key => {
      if (key !== 'pictures') {
        // Handle arrays and booleans
        if (Array.isArray(orderData[key])) {
          orderData[key].forEach((item) => formData.append(key, item));
        } else if (typeof orderData[key] === 'boolean') {
          formData.append(key, orderData[key].toString());
        } else if (orderData[key] !== null && orderData[key] !== undefined) {
          formData.append(key, orderData[key]);
        }
      }
    });    // Add pictures if they exist (for file uploads, use "images" as field name for multer)
    if (orderData.pictures && orderData.pictures.length > 0) {
      // Only send up to 5 images
      const limitedPictures = orderData.pictures.slice(0, 5);
      const existingImagePaths = [];
      
      limitedPictures.forEach((image) => {
        if (image instanceof File) {
          formData.append('images', image);
        } else if (typeof image === 'string') {
          // Handle both local uploads (/uploads/) and Azure blob URLs
          existingImagePaths.push(image);
        }
      });
      
      // Always send the current list of images to keep
      formData.set('pictures', JSON.stringify(existingImagePaths));
    } else {
      formData.set('pictures', JSON.stringify([]));
    }
    
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data', // Important for file uploads
      },
    });
    
    console.log('Create work order response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error('Error creating work order:', error.response || error); // Debug log
    throw new Error(error.response?.data?.message || 'Failed to create work order');
  }
};

// Get all work orders
export const getWorkOrders = async () => {
  try {
    const response = await api.get('/', {
      headers: authHeader(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch work orders');
  }
};

export const getWorkOrdersByUserId = async (userId) => {
  if (!userId) {
    console.error('Cannot fetch work orders: User ID is undefined');
    return []; // Return empty array instead of throwing to avoid crashes
  }
  
  try {
    console.log('Fetching work orders for user ID:', userId);
    const response = await api.get(`/user/${userId}`, {
      headers: authHeader(),
    });
    console.log('Get work orders by user response:', response.data);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching user work orders:', error.response || error);
    return []; // Return empty array instead of throwing to avoid crashes
  }
};

// Get a single work order by ID
export const getWorkOrderById = async (id) => {
  try {
    const response = await api.get(`/${id}`, {
      headers: authHeader(),
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update a work order
export const updateWorkOrder = async (id, orderData) => {
  try {
    console.log('Updating work order with data:', orderData); // Debug log
    
    // Ensure uniqueId is preserved during update (don't overwrite the formatted ID)
    if (!orderData.uniqueId && id) {
      // Attempt to fetch the existing order to get its uniqueId
      try {
        const existingOrder = await getWorkOrderById(id);
        if (existingOrder && existingOrder.uniqueId) {
          orderData.uniqueId = existingOrder.uniqueId;
        }
      } catch (fetchError) {
        console.warn('Could not fetch existing order for uniqueId preservation:', fetchError);
      }
    }

    const formData = new FormData();
    // Add all regular fields to formData
    Object.keys(orderData).forEach(key => {
      if (key !== 'pictures') {
        // Handle arrays and booleans
        if (Array.isArray(orderData[key])) {
          orderData[key].forEach((item) => {
            if (item !== null && item !== undefined) {
              formData.append(key, item);
            }
          });
        } else if (typeof orderData[key] === 'boolean') {
          formData.append(key, orderData[key].toString());
        } else if (orderData[key] !== null && orderData[key] !== undefined) {
          formData.append(key, orderData[key]);
        }
      }
    });

    // Handle pictures - increased limit to 5 for Azure storage
    if (orderData.pictures && orderData.pictures.length > 0) {
      const limitedPictures = orderData.pictures.slice(0, 5);
      const existingImagePaths = [];
      
      limitedPictures.forEach((image, idx) => {
        // Debug: log type of each image
        console.log(`Picture[${idx}] type:`, typeof image, image instanceof File ? 'File' : '');
        if (image instanceof File) {
          formData.append('images', image);
        } else if (typeof image === 'string') {
          // Handle both local uploads (/uploads/) and Azure blob URLs
          existingImagePaths.push(image);
        }
      });
      
      formData.set('pictures', JSON.stringify(existingImagePaths));
    } else {
      formData.set('pictures', JSON.stringify([]));
    }

    // Debug: log FormData content
    // (for debugging only, remove in production)
    for (let pair of formData.entries()) {
      console.log(pair[0]+ ':', pair[1]);
    }

    const response = await axios.put(`${API_URL}/${id}`, formData, {
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Update work order response:', response.data); // Debug log
    return response.data;
  } catch (error) {
    console.error('Error updating work order:', error.response || error); // Debug log
    throw new Error(error.response?.data?.message || 'Failed to update work order');
  }
};

// Delete a work order
export const deleteWorkOrder = async (id) => {
  try {
    const response = await api.delete(`/${id}`, {
      headers: authHeader(),
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete work order');
  }
};

// Search work orders
export const searchWorkOrders = async (searchParams) => {
  try {
    // Clean up empty search params
    const cleanParams = {};
    Object.keys(searchParams).forEach(key => {
      if (searchParams[key] && searchParams[key].trim() !== '') {
        cleanParams[key] = searchParams[key];
      }
    });
    
    // Ensure dateOfSurvey is sent as YYYY-MM-DD if present
    const params = { ...searchParams };
    if (params.dateOfSurvey) {
      // Only keep the date part (not time)
      params.dateOfSurvey = params.dateOfSurvey.slice(0, 10);
    }

    const response = await api.get('/search', {
      params,
      headers: authHeader()
    });
    return response.data;
  } catch (error) {
    console.error('Error searching work orders:', error.response || error);
    throw new Error(error.response?.data?.message || 'Failed to search work orders');
  }
};
