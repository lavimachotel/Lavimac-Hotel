import React, { createContext, useState, useContext, useEffect } from 'react';
import { createGuest, getGuests, updateGuest, deleteGuest as deleteGuestService } from '../services/guestService';
import supabase from '../supabaseClient';
import { useRoomReservation } from './RoomReservationContext';

const GuestContext = createContext();

export const GuestProvider = ({ children }) => {
    const [guestList, setGuestList] = useState([]);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Get the room reservation context to update room status
    const { updateRoomStatus } = useRoomReservation();
    
    // Load guests from Supabase on mount
    useEffect(() => {
        const loadGuests = async () => {
            setLoading(true);
            try {
                const { data, error } = await getGuests();
                if (error) throw error;
                
                // Enhanced: Fetch preferences for each guest if available
                const guestsWithPreferences = await Promise.all((data || []).map(async guest => {
                    try {
                        // Try to fetch preferences from the database if a preferences table exists
                        const { data: preferencesData, error: preferencesError } = await supabase
                            .from('guest_preferences')
                            .select('*')
                            .eq('guest_id', guest.id);
                            
                        if (!preferencesError && preferencesData && preferencesData.length > 0) {
                            return {
                                ...guest,
                                preferences: preferencesData
                            };
                        }
                        
                        // If no preferences or error, add some default preferences for demo purposes
                        // In a real system, you would only use the database values
                        const defaultPreferences = [];
                        
                        // Add some sample preferences based on room type or guest name for demonstration
                        if (guest.room && parseInt(guest.room) % 3 === 0) {
                            defaultPreferences.push({ type: 'Late Check-out', value: 'Requested' });
                        }
                        
                        if (guest.room && parseInt(guest.room) % 4 === 0) {
                            defaultPreferences.push({ type: 'Vegan Meals', value: 'Required' });
                        }
                        
                        if (guest.name && guest.name.toLowerCase().includes('v')) {
                            defaultPreferences.push({ type: 'High Floor', value: 'Preferred' });
                        }
                        
                        if (guest.room && parseInt(guest.room) % 5 === 0) {
                            defaultPreferences.push({ type: 'No Disturbance', value: 'Requested' });
                        }
                        
                        return {
                            ...guest,
                            preferences: defaultPreferences
                        };
                    } catch (err) {
                        console.error('Error fetching preferences for guest:', err);
                        return guest; // Return the guest without preferences
                    }
                }));
                
                setGuestList(guestsWithPreferences || []);
            } catch (error) {
                console.error('Error loading guests:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        
        loadGuests();
        
        // Set up real-time subscription for guests
        const guestsSubscription = supabase
            .channel('guests-channel')
            .on('postgres_changes', { 
                event: '*', // Listen for all changes (INSERT, UPDATE, DELETE)
                schema: 'public', 
                table: 'guests' 
            }, payload => {
                if (payload.eventType === 'INSERT') {
                    // Add default preferences for new guests
                    const newGuest = {
                        ...payload.new,
                        preferences: generateDefaultPreferences(payload.new)
                    };
                    setGuestList(prevList => [...prevList, newGuest]);
                } else if (payload.eventType === 'UPDATE') {
                    setGuestList(prevList => 
                        prevList.map(guest => 
                            guest.id === payload.new.id ? {
                                ...payload.new,
                                // Preserve existing preferences if they exist
                                preferences: guest.preferences || generateDefaultPreferences(payload.new)
                            } : guest
                        )
                    );
                } else if (payload.eventType === 'DELETE') {
                    setGuestList(prevList => 
                        prevList.filter(guest => guest.id !== payload.old.id)
                    );
                }
            })
            .subscribe();
            
        return () => {
            supabase.removeChannel(guestsSubscription);
        };
    }, []);

    // Helper function to generate default preferences for a guest
    const generateDefaultPreferences = (guest) => {
        const defaultPreferences = [];
        
        // Add some sample preferences based on room type or guest name for demonstration
        if (guest.room && parseInt(guest.room) % 3 === 0) {
            defaultPreferences.push({ type: 'Late Check-out', value: 'Requested' });
        }
        
        if (guest.room && parseInt(guest.room) % 4 === 0) {
            defaultPreferences.push({ type: 'Vegan Meals', value: 'Required' });
        }
        
        if (guest.name && guest.name.toLowerCase().includes('v')) {
            defaultPreferences.push({ type: 'High Floor', value: 'Preferred' });
        }
        
        if (guest.room && parseInt(guest.room) % 5 === 0) {
            defaultPreferences.push({ type: 'No Disturbance', value: 'Requested' });
        }
        
        return defaultPreferences;
    };

    const addGuestToList = async (newGuest) => {
        console.log('Starting addGuestToList with data:', newGuest);
        
        // Format data for database
        const guestData = {
            name: newGuest.name,
            email: newGuest.email || null,
            phone: newGuest.phone || null,
            room: newGuest.room,
            // Ensure proper date formatting for ISO string conversion
            check_in: newGuest.checkIn ? new Date(newGuest.checkIn).toISOString() : new Date().toISOString(),
            check_out: newGuest.checkOut ? new Date(newGuest.checkOut).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
            status: 'Checked In',
            first_name: newGuest.firstName || null,
            last_name: newGuest.lastName || null,
            date_of_birth: newGuest.dateOfBirth || null,
            gender: newGuest.gender || null,
            nationality: newGuest.nationality || null,
            region: newGuest.region || null,
            address: newGuest.address || null,
            created_at: new Date().toISOString()
        };
        
        console.log('Formatted guest data for Supabase:', guestData);
        
        try {
            console.log('Calling createGuest service...');
            // Add the guest to Supabase
            const { data, error } = await createGuest(guestData);
            
            if (error) {
                console.error('Error returned from createGuest service:', error);
                throw error;
            }
            
            if (data) {
                console.log('Guest successfully created in database with data:', data);
                // Generate default preferences for the new guest
                const preferences = generateDefaultPreferences({ 
                    ...data, 
                    name: guestData.name, 
                    room: guestData.room 
                });
                
                // Update local state with the new guest - use ISO date objects
                const guestWithId = {
                    ...newGuest,
                    id: data.id,
                    // Properly format dates for the UI
                    checkIn: data.check_in,
                    checkOut: data.check_out,
                    preferences
                };
                
                setGuestList(prevGuestList => [...prevGuestList, guestWithId]);
                
                // Add to recent activity
                addToRecentActivity(`${guestWithId.name} checked into Room ${guestWithId.room}`);
                
                // Update room status to 'Occupied'
                console.log(`Updating room ${newGuest.room} status to Occupied`);
                await updateRoomStatus(newGuest.room, 'Occupied');
                
                console.log('Guest added successfully with ID:', data.id);
                return guestWithId;
            } else {
                console.warn('No data returned from createGuest, but no error either');
            }
        }
        catch (error) {
            console.error('Error in addGuestToList:', error);
            // Fallback to local state if Supabase fails
            const guestWithId = {
                ...newGuest,
                id: Date.now().toString(),
                preferences: generateDefaultPreferences(newGuest)
            };
            
            console.log('Using fallback local state with generated ID:', guestWithId.id);
            setGuestList(prevGuestList => [...prevGuestList, guestWithId]);
            
            // Add to recent activity
            addToRecentActivity(`${guestWithId.name} checked into Room ${guestWithId.room}`);
            
            // Still try to update room status
            try {
                console.log(`Attempting to update room ${newGuest.room} status despite guest creation failure`);
                await updateRoomStatus(newGuest.room, 'Occupied');
            } catch (roomError) {
                console.error('Error updating room status:', roomError);
            }
            
            return guestWithId;
        }
    };

    // Function to add an activity to recent activities in localStorage
    const addToRecentActivity = (activity) => {
        try {
            const recentActivitiesStr = localStorage.getItem('hotelRecentActivities');
            const recentActivities = recentActivitiesStr ? JSON.parse(recentActivitiesStr) : [];
            
            // Add new activity with timestamp
            const newActivity = {
                text: activity,
                timestamp: new Date().toISOString()
            };
            
            // Add to the beginning (most recent first)
            recentActivities.unshift(newActivity);
            
            // Keep only the most recent 20 activities
            const updatedActivities = recentActivities.slice(0, 20);
            
            // Save back to localStorage
            localStorage.setItem('hotelRecentActivities', JSON.stringify(updatedActivities));
        } catch (err) {
            console.error('Error adding to recent activity:', err);
        }
    };

    const viewGuest = (guestId) => {
        const guest = guestList.find(g => g.id === guestId);
        setSelectedGuest(guest);
        return guest;
    };

    const editGuest = async (guestId, updatedData) => {
        try {
            const { data, error } = await updateGuest(guestId, updatedData);
            if (error) throw error;

            // Keep existing preferences if any
            const oldGuest = guestList.find(g => g.id === guestId);
            const updatedGuest = { 
                ...oldGuest, 
                ...updatedData,
                preferences: oldGuest?.preferences || [] 
            };

            setGuestList(prevGuestList => 
                prevGuestList.map(guest => 
                    guest.id === guestId ? updatedGuest : guest
                )
            );

            // Add to recent activity
            addToRecentActivity(`${updatedGuest.name}'s information was updated`);

            if (updatedData.room) {
                if (oldGuest && oldGuest.room !== updatedData.room) {
                    await updateRoomStatus(oldGuest.room, 'Available');
                    await updateRoomStatus(updatedData.room, 'Occupied');
                    
                    // Add to recent activity
                    addToRecentActivity(`${updatedGuest.name} moved from Room ${oldGuest.room} to Room ${updatedData.room}`);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('Error updating guest:', error);
            setGuestList(prevGuestList => 
                prevGuestList.map(guest => 
                    guest.id === guestId ? { ...guest, ...updatedData } : guest
                )
            );
            return { success: false, error };
        }
    };

    const deleteGuest = async (guestId) => {
        try {
            const guest = guestList.find(g => g.id === guestId);
            const roomNumber = guest ? guest.room : null;

            const { error } = await deleteGuestService(guestId);
            if (error) throw error;

            setGuestList(prevGuestList => 
                prevGuestList.filter(guest => guest.id !== guestId)
            );

            // Add to recent activity if we know the guest name
            if (guest) {
                addToRecentActivity(`${guest.name} was removed from the system`);
            }

            if (roomNumber) {
                await updateRoomStatus(roomNumber, 'Available');
                
                // Add to recent activity
                if (guest) {
                    addToRecentActivity(`Room ${roomNumber} is now available after ${guest.name}'s departure`);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('Error deleting guest:', error);
            setGuestList(prevGuestList => 
                prevGuestList.filter(guest => guest.id !== guestId)
            );
            return { success: false, error };
        }
    };

    return (
        <GuestContext.Provider value={{ 
            guestList, 
            addGuestToList, 
            viewGuest, 
            editGuest, 
            deleteGuest,
            selectedGuest,
            setSelectedGuest,
            loading,
            error
        }}>
            {children}
        </GuestContext.Provider>
    );
};

export const useGuests = () => useContext(GuestContext); 