const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase clients
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
// ADMIN ROUTES (use service role)
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
  const shipment = req.body;
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .insert([shipment])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

// UPDATE shipment
app.put('/api/admin/shipments/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const updates = req.body;
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .update(updates)
    .eq('tracking_id', trackingId)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// DELETE shipment
app.delete('/api/admin/shipments/:trackingId', async (req, res) => {
  const { trackingId } = req.params;
  const { error } = await supabaseAdmin
    .from('shipments')
    .delete()
    .eq('tracking_id', trackingId);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nexora backend running on port ${PORT}`);
});
// ---------- Support Messages (Admin) ----------
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
  const { name, email, message } = req.body;
  const { data, error } = await supabasePublic
    .from('support_messages')
    .insert([{ name, email, message }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data[0]);
});

// PUT reply to a support message (admin)
app.put('/api/admin/support/:id', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .update({ reply, read: true })
    .eq('id', id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// DELETE a support message (admin)
app.delete('/api/admin/support/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin
    .from('support_messages')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});
