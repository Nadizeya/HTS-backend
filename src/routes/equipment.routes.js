const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/equipment
 * Get all equipment with optional filters
 * Query params: type, status, floor_id
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { type, status, floor_id } = req.query;

    let query = supabase
      .from("equipment")
      .select(
        `
        *,
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord)
      `,
      )
      .order("created_at", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (floor_id) {
      query = query.eq("current_floor_id", floor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get equipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/equipment/nearby
 * Get nearby available equipment based on user's current floor
 * Query params: distance (default: 50 meters, not yet implemented - uses floor for now)
 */
router.get("/nearby", authenticate, async (req, res) => {
  try {
    const userFloorId = req.user.current_floor_id;
    const { type } = req.query;

    if (!userFloorId) {
      return res.status(400).json({
        success: false,
        message: "User has no floor assignment",
      });
    }

    let query = supabase
      .from("equipment")
      .select(
        `
        *,
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord)
      `,
      )
      .eq("status", "available")
      .eq("current_floor_id", userFloorId);

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: {
        count: data?.length || 0,
        equipment: data || [],
        floor_id: userFloorId,
      },
    });
  } catch (error) {
    console.error("Get nearby equipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/equipment/search
 * Search equipment by code, type, or status
 * Query params: q (search query), type, status
 */
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q, type, status } = req.query;

    if (!q && !type && !status) {
      return res.status(400).json({
        success: false,
        message: "Please provide search query (q), type, or status",
      });
    }

    let query = supabase.from("equipment").select(
      `
        *,
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type)
      `,
    );

    if (q) {
      query = query.or(`equipment_code.ilike.%${q}%,type.ilike.%${q}%`);
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Search equipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/equipment/:id
 * Get equipment by ID
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("equipment")
      .select(
        `
        *,
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord),
        assigned_request:assigned_request_id(
          id,
          patient_name,
          priority,
          status,
          pickup_room:pickup_room_id(name),
          destination_room:destination_room_id(name)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get equipment by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/equipment/:id/location-history
 * Get location history for equipment
 */
router.get("/:id/location-history", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from("equipment_location_logs")
      .select(
        `
        *,
        floor:floor_id(id, name, building),
        room:room_id(id, name, room_type),
        ap:ap_id(id, name)
      `,
      )
      .eq("equipment_id", id)
      .order("recorded_at", { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get location history error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/equipment/:id/status
 * Update equipment status
 */
router.put("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["available", "in_use", "charging", "maintenance"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const { data, error } = await supabase
      .from("equipment")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Equipment status updated",
      data,
    });
  } catch (error) {
    console.error("Update equipment status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
