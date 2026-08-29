const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// PUBLIC ROUTES
// ============================================================

// GET shipment by tracking ID
app.get('/api/shipments/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const { data, error } = await supabasePublic
    .from('shipments')
    .select('*')
    .eq('tracking_id', trackingId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  res.json(data);
});

// ============================================================
// ADMIN ROUTES
// ============================================================

// GET all shipments
app.get('/api/admin/shipments', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CREATE shipment
app.post('/api/admin/shipments', async (req, res) => {
  try {
    const shipment = req.body;
    
    // Validate required fields
    if (!shipment.tracking_id) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }
    
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .insert([shipment])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE shipment
app.put('/api/admin/shipments/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .update(updates)
      .eq('tracking_id', trackingId)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    res.json(data[0]);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE shipment
app.delete('/api/admin/shipments/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    const { error } = await supabaseAdmin
      .from('shipments')
      .delete()
      .eq('tracking_id', trackingId);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SUPPORT MESSAGES ROUTES
// ============================================================

// GET all support messages (admin only)
app.get('/api/admin/support', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST a new support message (from contact form)
app.post('/api/support', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    
    const { data, error } = await supabasePublic
      .from('support_messages')
      .insert([{ name, email, message }])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT reply to a support message (admin)
app.put('/api/admin/support/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .update({ reply, read: true })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data[0]);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a support message (admin)
app.delete('/api/admin/support/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from('support_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexora backend running on port ${PORT}`);
  console.log(`📦 API URL: http://localhost:${PORT}/api`);
});
