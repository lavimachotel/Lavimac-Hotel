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
                            
                        // If there was an error or no data, don't throw an error - just use default preferences
                        if (preferencesError) {
                            console.warn('Error fetching guest preferences:', preferencesError);
                            // Continue execution - don't throw error
                        } else if (preferencesData && preferencesData.length > 0) {
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
                        // Don't let preference errors stop guest loading - return guest without preferences
                        return {
                            ...guest,
                            preferences: []
                        };
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
        console.log('🔍 GUEST CONTEXT: Setting up subscription...');
        console.log('🔍 GUEST CONTEXT: supabase object:', typeof supabase);
        console.log('🔍 GUEST CONTEXT: supabase.channel:', typeof supabase.channel);
        
        if (typeof supabase.channel !== 'function') {
            console.error('🚨 GUEST CONTEXT: supabase.channel is not a function!', supabase.channel);
            console.error('🚨 GUEST CONTEXT: supabase object keys:', Object.keys(supabase));
            return; // Exit early if channel is not available
        }
        
        console.log('🔍 GUEST CONTEXT: Creating channel...');
        const channel = supabase.channel('guests-channel');
        console.log('🔍 GUEST CONTEXT: Channel created:', typeof channel);
        console.log('🔍 GUEST CONTEXT: Channel.on:', typeof channel.on);
        
        if (typeof channel.on !== 'function') {
            console.error('🚨 GUEST CONTEXT: channel.on is not a function!', channel.on);
            return;
        }
        
        console.log('🔍 GUEST CONTEXT: Setting up .on() listener...');
        const onResult = channel.on('postgres_changes', { 
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
        });
        
        console.log('🔍 GUEST CONTEXT: .on() result:', typeof onResult);
        console.log('🔍 GUEST CONTEXT: .on() result.subscribe:', typeof onResult?.subscribe);
        
        if (typeof onResult?.subscribe !== 'function') {
            console.error('🚨 GUEST CONTEXT: subscribe is not a function!', onResult?.subscribe);
            console.error('🚨 GUEST CONTEXT: onResult object:', onResult);
            return;
        }
        
        console.log('🔍 GUEST CONTEXT: Calling subscribe...');
        const guestsSubscription = onResult.subscribe();
        console.log('🔍 GUEST CONTEXT: Subscription created successfully:', guestsSubscription);
            
        return () => {
            console.log('🔍 GUEST CONTEXT: Cleaning up subscription...');
            if (supabase.removeChannel && guestsSubscription) {
            supabase.removeChannel(guestsSubscription);
            }
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
            check_in: newGuest.checkInDate ? new Date(newGuest.checkInDate).toISOString() : new Date().toISOString(),
            check_out: newGuest.checkOutDate ? new Date(newGuest.checkOutDate).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
            status: newGuest.status || 'Checked In',
            first_name: newGuest.firstName || null,
            last_name: newGuest.lastName || null,
            date_of_birth: newGuest.dateOfBirth ? new Date(newGuest.dateOfBirth).toISOString() : null,
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
                return { success: false, error: error.message || 'Database error', details: error };
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
                return { success: true, data: guestWithId };
            } else {
                console.warn('No data returned from createGuest, but no error either');
                return { success: false, error: 'No data returned from database' };
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
            
            return { success: false, data: guestWithId, error: 'Failed to add guest to database' };
        }
    };

    // Function to add an activity to recent activities
    const addToRecentActivity = (activity) => {
        try {
            console.log('Activity added:', activity);
            // In a full version, this would be saved to the database
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
            // Find the guest to get room number and name
            const guest = guestList.find(g => g.id === guestId);
            if (!guest) {
                return { 
                    success: false, 
                    error: `Guest with ID ${guestId} not found` 
                };
            }

            const roomNumber = guest.room;

            // Remove from local state first for immediate UI update
            setGuestList(prevGuestList => 
                prevGuestList.filter(g => g.id !== guestId)
            );

            // Process database deletion
            try {
                const { error } = await deleteGuestService(guestId);
                if (error) {
                    console.error('Database error deleting guest:', error);
                    
                    // Format the error properly
                    let errorMessage;
                    if (typeof error === 'object') {
                        errorMessage = error.message || JSON.stringify(error);
                    } else {
                        errorMessage = String(error);
                    }
                    
                    throw new Error(`Database error: ${errorMessage}`);
                }
            } catch (dbError) {
                console.error('Error during database deletion:', dbError);
                
                // Add the guest back to the list if database operation failed
                setGuestList(prevList => [...prevList, guest]);
                
                throw dbError; // Re-throw to be caught by outer catch
            }

            // Add to recent activity
            addToRecentActivity(`${guest.name} was removed from the system`);

            // Update room status if applicable
            if (roomNumber) {
                try {
                    await updateRoomStatus(roomNumber, 'Available');
                    addToRecentActivity(`Room ${roomNumber} is now available after ${guest.name}'s departure`);
                } catch (roomError) {
                    console.warn('Failed to update room status, but guest was deleted:', roomError);
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting guest with ID ' + guestId + ':', error);
            
            // Create a user-friendly error message
            let errorMessage;
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object') {
                errorMessage = JSON.stringify(error);
            } else {
                errorMessage = String(error);
            }
            
            return { 
                success: false, 
                error: errorMessage || 'An unknown error occurred'
            };
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