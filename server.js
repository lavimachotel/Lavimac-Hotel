const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Nhyiraba Hotel Management System API',
        version: '1.0.0',
        endpoints: {
            rooms: '/api/rooms',
            reservations: '/api/reservations'
        }
    });
});

// ==================== ROOMS API ENDPOINTS ====================

// GET all rooms with optional filters
app.get('/api/rooms', async (req, res) => {
    try {
        const { status, type, min_price, max_price } = req.query;

        let query = supabase
            .from('rooms')
            .select('*');

        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);
        if (min_price) query = query.gte('price', parseFloat(min_price));
        if (max_price) query = query.lte('price', parseFloat(max_price));

        const { data, error } = await query.order('room_number', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// GET room by ID
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Room not found' 
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// PUT update room
app.put('/api/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        delete updateData.id;
        delete updateData.created_at;

        const { data, error } = await supabase
            .from('rooms')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Room updated successfully',
            data: data
        });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==================== RESERVATIONS API ENDPOINTS ====================

// GET all reservations
app.get('/api/reservations', async (req, res) => {
    try {
        const { status, room_id } = req.query;

        let query = supabase
            .from('reservations')
            .select('*');

        if (status) query = query.eq('status', status);
        if (room_id) query = query.eq('room_id', room_id);

        const { data, error } = await query.order('check_in_date', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Nhyiraba Hotel API Server running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
