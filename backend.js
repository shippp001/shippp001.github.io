const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking environment variables:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase connected');

// ============================================================
// ROOT ROUTE
// ============================================================
app.get('/', (req, res) => {
  res.json({
    name: 'Nexora Shipping API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      shipments: '/api/shipments/:trackingId',
      admin: '/api/admin/shipments',
      support: '/api/support'
    }
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Nexora Shipping API is running',
    timestamp: new Date().toISOString(),
    supabase: supabaseUrl ? 'connected' : 'disconnected'
  });
});

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET shipment by tracking ID (public)
app.get('/api/shipments/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    console.log('🔍 Fetching shipment:', trackingId);
    
    if (!trackingId) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }

    const { data, error } = await supabasePublic
      .from('shipments')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Shipment not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    console.log('✅ Shipment found:', data.tracking_id);
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST a new support message (public)
app.post('/api/support', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    console.log('📩 New support message from:', name);
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const { data, error } = await supabasePublic
      .from('support_messages')
      .insert([{ 
        name: name.trim(), 
        email: email.trim(), 
        message: message.trim(),
        read: false
      }])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Support message saved');
    res.status(201).json({ 
      success: true, 
      message: 'Your message has been sent!',
      data: data[0]
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// GET all shipments (admin)
app.get('/api/admin/shipments', async (req, res) => {
  try {
    console.log('📦 Fetching all shipments (admin)');
    
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Shipments loaded:', data ? data.length : 0);
    res.json(data || []);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE a new shipment (admin)
app.post('/api/admin/shipments', async (req, res) => {
  try {
    const shipment = req.body;
    
    console.log('📦 Creating shipment:', shipment.tracking_id);
    
    if (!shipment.tracking_id) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }
    
    if (!shipment.origin || !shipment.destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    // Check if tracking ID already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('shipments')
      .select('tracking_id')
      .eq('tracking_id', shipment.tracking_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Tracking ID already exists' });
    }

    const shipmentData = {
      tracking_id: shipment.tracking_id,
      origin: shipment.origin || '—',
      destination: shipment.destination || '—',
      status: shipment.status || 'In Transit',
      estimated_delivery: shipment.estimated_delivery || '—',
      type: shipment.type || 'Air Freight',
      weight: shipment.weight || '—',
      packages: shipment.packages || 1,
      method: shipment.method || '—',
      recipient: shipment.recipient || '—',
      delivery_method: shipment.delivery_method || '—',
      current_location: shipment.current_location || '—',
      update_text: shipment.update_text || 'Shipment is in transit.',
      update_date: shipment.update_date || new Date().toLocaleDateString(),
      update_time: shipment.update_time || new Date().toLocaleTimeString(),
      timeline: shipment.timeline || [],
      packages_info: shipment.packages_info || []
    };

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .insert([shipmentData])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Shipment created:', shipmentData.tracking_id);
    res.status(201).json({ 
      success: true, 
      message: 'Shipment created successfully!',
      data: data[0]
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE a shipment (admin)
app.put('/api/admin/shipments/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const updates = req.body;
    
    console.log('📦 Updating shipment:', trackingId);
    
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('shipments')
      .select('tracking_id')
      .eq('tracking_id', trackingId)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    delete updates.tracking_id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .update(updates)
      .eq('tracking_id', trackingId)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Shipment updated:', trackingId);
    res.json({ 
      success: true, 
      message: 'Shipment updated successfully!',
      data: data[0]
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a shipment (admin)
app.delete('/api/admin/shipments/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    console.log('🗑️ Deleting shipment:', trackingId);
    
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('shipments')
      .select('tracking_id')
      .eq('tracking_id', trackingId)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const { error } = await supabaseAdmin
      .from('shipments')
      .delete()
      .eq('tracking_id', trackingId);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Shipment deleted:', trackingId);
    res.json({ 
      success: true, 
      message: `Shipment ${trackingId} deleted successfully!`
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET all support messages (admin)
app.get('/api/admin/support', async (req, res) => {
  try {
    console.log('📩 Fetching support messages (admin)');
    
    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Support messages loaded:', data ? data.length : 0);
    res.json(data || []);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reply to a support message (admin)
app.put('/api/admin/support/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    
    console.log('💬 Replying to support message:', id);
    
    if (!reply || reply.trim() === '') {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('support_messages')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .update({ 
        reply: reply.trim(), 
        read: true
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Reply sent to message:', id);
    res.json({ 
      success: true, 
      message: 'Reply sent successfully!',
      data: data[0]
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE a support message (admin)
app.delete('/api/admin/support/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Deleting support message:', id);
    
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('support_messages')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { error } = await supabaseAdmin
      .from('support_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Support message deleted:', id);
    res.json({ 
      success: true, 
      message: 'Message deleted successfully!'
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// CATCH-ALL 404 ROUTE
// ============================================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    available: {
      health: '/api/health',
      shipments: '/api/shipments/:trackingId',
      admin: '/api/admin/shipments',
      support: '/api/support'
    }
  });
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nexora Shipping API running on port ${PORT}`);
  console.log(`📦 API URL: http://localhost:${PORT}/api`);
  console.log(`✅ Ready to accept requests`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
