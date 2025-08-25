import React, { useState, useEffect, useCallback } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { useTheme } from '../context/ThemeContext';
import { useRoomReservation } from '../context/RoomReservationContext';
import DatePickerWrapper from './ui/DatePickerWrapper';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

const CheckInModal = ({ isOpen, onClose, onAddGuest }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const { rooms } = useRoomReservation();
    
    // Filter available rooms for selection - memoize this calculation
    const availableRooms = React.useMemo(() => 
        rooms.filter(room => room.status === 'Available'), 
        [rooms]
    );
    
    // Initial form state - use as a reference instead of re-creating each time
    const initialFormState = {
        firstName: '',
        lastName: '',
        dateOfBirth: new Date(),
        phone: '',
        email: '',
        nationality: 'Ghana',
        gender: '',
        region: 'Greater Accra',
        address: '',
        room: availableRooms.length > 0 ? availableRooms[0].id : '',
        checkIn: new Date(),
        checkOut: new Date(new Date().setDate(new Date().getDate() + 1)),
    };
    
    const [guestInfo, setGuestInfo] = useState(initialFormState);
    const [errors, setErrors] = useState({});

    // Reset form when modal opens - use useCallback to memoize this function
    useEffect(() => {
        if (isOpen) {
            setGuestInfo({
                ...initialFormState,
                room: availableRooms.length > 0 ? availableRooms[0].id : '',
            });
            setErrors({});
        }
    }, [isOpen, availableRooms]);

    // Memoize these handlers to prevent recreating them on each render
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setGuestInfo(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleDateChange = useCallback((field, date) => {
        setGuestInfo(prev => ({ ...prev, [field]: date }));
    }, []);

    const validate = useCallback(() => {
        const newErrors = {};
        if (!guestInfo.firstName) newErrors.firstName = 'First Name is required';
        if (!guestInfo.lastName) newErrors.lastName = 'Last Name is required';
        if (!guestInfo.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
        if (!guestInfo.phone) newErrors.phone = 'Phone is required';
        if (!guestInfo.email) newErrors.email = 'Email is required';
        if (!guestInfo.nationality) newErrors.nationality = 'Nationality is required';
        if (!guestInfo.region) newErrors.region = 'Region is required';
        if (!guestInfo.address) newErrors.address = 'Address is required';
        if (!guestInfo.room) newErrors.room = 'Room is required';
        if (!guestInfo.checkIn) newErrors.checkIn = 'Check In is required';
        if (!guestInfo.checkOut) newErrors.checkOut = 'Check Out is required';
        return newErrors;
    }, [guestInfo]);

    const handleCompleteCheckIn = useCallback(async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
        } else {
            try {
                // Instead of using toLocaleDateString (which creates locale-specific strings),
                // keep the Date objects for proper database formatting
                const newGuest = {
                    name: `${guestInfo.firstName} ${guestInfo.lastName}`,
                    firstName: guestInfo.firstName,
                    lastName: guestInfo.lastName,
                    dateOfBirth: guestInfo.dateOfBirth,
                    phone: guestInfo.phone,
                    email: guestInfo.email,
                    nationality: guestInfo.nationality,
                    gender: guestInfo.gender,
                    region: guestInfo.region,
                    address: guestInfo.address,
                    room: guestInfo.room,
                    checkIn: guestInfo.checkIn,
                    checkOut: guestInfo.checkOut,
                    status: 'Checked In'
                };
                
                console.log('Submitting guest data:', newGuest);
                await onAddGuest(newGuest);
                onClose(); // Close the modal after adding the guest
            } catch (error) {
                console.error('Error adding guest:', error);
            }
        }
    }, [guestInfo, validate, onAddGuest, onClose]);

    if (!isOpen) return null;

    const regions = [
        'Greater Accra',
        'Savannah',
        'Upper West',
        'Central',
        'Volta',
        'Western North',
        'Ashanti',
        'Bono East',
        'Eastern',
        'Western',
        'Bono',
        'Ahafo',
        'Northern',
        'Upper East',
        'North East',
        'Oti',
    ];

    const nationalities = [
        'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
        'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
        'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic',
        'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
        'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
        'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
        'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
        'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
        'Kenya', 'Kiribati', 'Korea, North', 'Korea, South', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
        'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
        'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
        'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
        'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay',
        'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
        'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
        'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
        'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago',
        'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
        'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-lg transform transition-all duration-300 ease-in-out scale-100 hover:scale-105`}>
                <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4 flex justify-between items-center`}>
                    <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Guest Check-In</h2>
                    <button onClick={onClose} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </div>
                <form className="p-6 space-y-6">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>GUEST INFO</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>First Name</label>
                            <input type="text" name="firstName" value={guestInfo.firstName} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}/>
                            {errors.firstName && <p className="text-red-500 text-xs italic">{errors.firstName}</p>}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Last Name</label>
                            <input type="text" name="lastName" value={guestInfo.lastName} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}/>
                            {errors.lastName && <p className="text-red-500 text-xs italic">{errors.lastName}</p>}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                            <input type="email" name="email" value={guestInfo.email} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}/>
                            {errors.email && <p className="text-red-500 text-xs italic">{errors.email}</p>}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                            <input type="tel" name="phone" value={guestInfo.phone} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}/>
                            {errors.phone && <p className="text-red-500 text-xs italic">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                            <select name="gender" value={guestInfo.gender} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date of Birth</label>
                            <DatePickerWrapper
                                selected={guestInfo.dateOfBirth}
                                onChange={(date) => handleDateChange('dateOfBirth', date)}
                                className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}
                                wrapperClassName="w-full"
                                shouldCloseOnSelect={true}
                                fixedHeight={true}
                                dateFormat="MM/dd/yyyy"
                                isDarkMode={isDarkMode}
                                field="dateOfBirth"
                                error={errors.dateOfBirth}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nationality</label>
                            <select name="nationality" value={guestInfo.nationality} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}>
                                {nationalities.map((nationality, index) => (
                                    <option key={index} value={nationality}>{nationality}</option>
                                ))}
                            </select>
                            {errors.nationality && <p className="text-red-500 text-xs italic">{errors.nationality}</p>}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Region</label>
                            <select name="region" value={guestInfo.region} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}>
                                {regions.map((region, index) => (
                                    <option key={index} value={region}>{region}</option>
                                ))}
                            </select>
                            {errors.region && <p className="text-red-500 text-xs italic">{errors.region}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
                            <input type="text" name="address" value={guestInfo.address} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}/>
                            {errors.address && <p className="text-red-500 text-xs italic">{errors.address}</p>}
                        </div>
                    </div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>BOOKING DETAILS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Room</label>
                            <select name="room" value={guestInfo.room} onChange={handleChange} className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}>
                                <option value="">Select Room</option>
                                {availableRooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                        {room.name || '—'} - {room.type} (₵{room.price})
                                    </option>
                                ))}
                            </select>
                            {errors.room && <p className="text-red-500 text-xs italic">{errors.room}</p>}
                            {availableRooms.length === 0 && <p className="text-yellow-500 text-xs italic">No rooms available currently</p>}
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Check In Date</label>
                            <DatePickerWrapper
                                selected={guestInfo.checkIn}
                                onChange={(date) => handleDateChange('checkIn', date)}
                                className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}
                                wrapperClassName="w-full"
                                shouldCloseOnSelect={true}
                                fixedHeight={true}
                                dateFormat="MM/dd/yyyy"
                                isDarkMode={isDarkMode}
                                field="checkIn"
                                error={errors.checkIn}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Check Out Date</label>
                            <DatePickerWrapper
                                selected={guestInfo.checkOut}
                                onChange={(date) => handleDateChange('checkOut', date)}
                                className={`mt-1 block w-full border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} rounded-md shadow-sm p-2 focus:ring focus:ring-blue-300`}
                                wrapperClassName="w-full"
                                shouldCloseOnSelect={true}
                                fixedHeight={true}
                                dateFormat="MM/dd/yyyy"
                                minDate={new Date(guestInfo.checkIn.getTime() + 86400000)}
                                isDarkMode={isDarkMode}
                                field="checkOut"
                                error={errors.checkOut}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            onClick={handleCompleteCheckIn} 
                            className={`px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white`}
                        >
                            Complete Check-In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckInModal;
