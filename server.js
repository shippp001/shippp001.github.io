// server.js - Express backend for Render deployment
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('.'))

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

// ============================================================
// API ROUTES
// ============================================================

// GET all shipments
app.get('/api/shipments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) throw error
        res.json({ success: true, data })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

// GET single shipment by tracking ID
app.get('/api/shipments/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params
        const { data, error } = await supabase
            .from('shipments')
            .select('*')
            .eq('tracking_id', trackingId)
            .single()
        
        if (error) throw error
        res.json({ success: true, data })
    } catch (error) {
        res.status(404).json({ success: false, error: 'Shipment not found' })
    }
})

// POST create new shipment
app.post('/api/shipments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('shipments')
            .insert([req.body])
            .select()
            .single()
        
        if (error) throw error
        res.json({ success: true, data })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

// PUT update shipment
app.put('/api/shipments/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params
        const { data, error } = await supabase
            .from('shipments')
            .update(req.body)
            .eq('tracking_id', trackingId)
            .select()
            .single()
        
        if (error) throw error
        res.json({ success: true, data })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

// DELETE shipment
app.delete('/api/shipments/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params
        const { error } = await supabase
            .from('shipments')
            .delete()
            .eq('tracking_id', trackingId)
        
        if (error) throw error
        res.json({ success: true })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
})

app.listen(PORT, () => {
    console.log(`✅ Nexora Shipping API running on port ${PORT}`)
})