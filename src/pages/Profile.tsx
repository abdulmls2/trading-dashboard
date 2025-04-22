import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useEffectiveUserId } from '../lib/api';

interface ProfileData {
  full_name: string;
  username: string;
  level: number | null;
}

export default function Profile() {
  const { user, isAdmin, effectiveUser } = useAuth();
  const effectiveUserId = useEffectiveUserId(); // Get the effective user ID (impersonated user or actual user)
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    username: '',
    level: null,
  });

  const fetchProfile = useCallback(async () => {
    if (!effectiveUserId) return;

    try {
      setLoading(true);
      console.log(`Profile: Fetching profile for user ID ${effectiveUserId}`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, level')
        .eq('user_id', effectiveUserId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        console.log(`Profile: Data loaded for user ${effectiveUserId}`, data);
        setProfileData({
          full_name: data.full_name || '',
          username: data.username || '',
          level: data.level,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({
        type: 'error',
        text: 'Error loading profile data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: name === 'level' ? (value ? parseInt(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveUserId || !isEditing) return;

    try {
      setLoading(true);
      setMessage(null);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          username: profileData.username,
          level: profileData.level,
          updated_at: new Date(),
        })
        .eq('user_id', effectiveUserId);

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text: 'Profile updated successfully!',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: 'Error updating profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only allow editing for own profile, not when impersonating
  const isImpersonating = effectiveUser?.user_id !== user?.id;
  const canEdit = !isImpersonating;

  return (
    <div>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-md rounded-lg border border-gray-200">
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Profile Settings
                {isImpersonating && isAdmin && (
                  <span className="ml-2 text-xs text-indigo-600">
                    (View Only - You are impersonating this user)
                  </span>
                )}
              </h3>
            </div>
            <div className="px-6 py-5">
              {message && (
                <div 
                  className={`mb-6 p-4 rounded-md ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}
              <form onSubmit={handleSubmit} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="mt-1">
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        value={profileData.full_name}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md bg-gray-50 p-2"
                        placeholder="Enter your full name"
                        disabled={!isEditing || !canEdit}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Discord Username
                    </label>
                    <div className="mt-1">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={profileData.username}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md bg-gray-50 p-2"
                        placeholder="Enter your username"
                        disabled={!isEditing || !canEdit}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Level
                    </label>
                    <div className="mt-1">
                      <select
                        id="level"
                        name="level"
                        value={profileData.level || ''}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md bg-gray-50 p-2"
                        disabled={!isEditing || !canEdit}
                      >
                        <option value="">Select your level</option>
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-5 border-t border-gray-200">
                    {!isEditing && canEdit ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(true);
                          setMessage(null);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Modify
                      </button>
                    ) : (
                      <>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditing(false);
                                fetchProfile(); // Reset form data
                                setMessage(null);
                              }}
                              className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                loading ? 'opacity-70 cursor-not-allowed' : ''
                              }`}
                            >
                              {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 