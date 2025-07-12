import React from 'react';

const ProfileHeader = ({ user, onProfileUpdate }) => {
    return (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header Background */}
            <div className="bg-[#0E1530] p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                    {/* Profile Image Section - removed upload functionality */}
                    <div className="h-24 w-24 lg:h-32 lg:w-32 rounded-3xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-2xl">
                        {user.profileImage ? (
                            <img
                                src={user.profileImage}
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-white font-bold text-3xl lg:text-4xl">
                                {user.firstname?.[0] || "T"}
                                {user.lastname?.[0] || ""}
                            </span>
                        )}
                    </div>

                    {/* User Info Section */}
                    <div className="flex-1 text-center lg:text-left">
                        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                            {user.firstname} {user.lastname}
                        </h2>
                        <p className="text-gray-200 text-lg mb-4">Technician</p>
                        
                       

                        {/* Action Button */}
                        <button
                            onClick={onProfileUpdate}
                            className="px-6 py-3 bg-white text-[#0E1530] rounded-2xl hover:bg-gray-100 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                        >
                            Update Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Section */}
        
        </div>
    );
};

export default ProfileHeader;