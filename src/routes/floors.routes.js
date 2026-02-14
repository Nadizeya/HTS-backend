const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/floors
 * Get all floors
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("floors")
      .select("id, name, building")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get floors error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/floors/:id
 * Get floor by ID with zones and rooms
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("floors")
      .select(
        `
        id,
        name,
        building,
        zones:zones(
          id,
          name,
          rooms:rooms(
            id,
            name,
            room_type
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Floor not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get floor by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/floors/:id/equipment
 * Get all equipment on a specific floor
 */
router.get("/:id/equipment", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, status } = req.query;

    let query = supabase
      .from("equipment")
      .select(
        `
        id,
        equipment_code,
        type,
        battery_level,
        status,
        last_seen_at,
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord)
      `,
      )
      .eq("current_floor_id", id);

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
    console.error("Get floor equipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/floors/:id/rooms
 * Get all rooms on a specific floor
 */
router.get("/:id/rooms", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("zones")
      .select(
        `
        id,
        name,
        rooms:rooms(
          id,
          name,
          room_type,
          access_points:access_points(id, name, x_coord, y_coord)
        )
      `,
      )
      .eq("floor_id", id);

    if (error) throw error;

    // Flatten to get all rooms
    const allRooms = (data || []).flatMap((zone) =>
      (zone.rooms || []).map((room) => ({
        ...room,
        zone: { id: zone.id, name: zone.name },
      })),
    );

    res.json({
      success: true,
      data: allRooms,
      count: allRooms.length,
    });
  } catch (error) {
    console.error("Get floor rooms error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/floors/:id/zones
 * Get all zones on a specific floor
 */
router.get("/:id/zones", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("zones")
      .select(
        `
        id,
        name,
        rooms:rooms(id, name, room_type)
      `,
      )
      .eq("floor_id", id);

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get floor zones error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/floors/:id/stats
 * Get statistics for a specific floor (equipment count, active requests, etc.)
 */
router.get("/:id/stats", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get equipment count by type and status
    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("id, type, status")
      .eq("current_floor_id", id);

    if (equipmentError) throw equipmentError;

    // Get room count
    const { data: zones, error: zonesError } = await supabase
      .from("zones")
      .select("id, rooms:rooms(id)")
      .eq("floor_id", id);

    if (zonesError) throw zonesError;

    const roomCount = (zones || []).reduce(
      (sum, zone) => sum + (zone.rooms?.length || 0),
      0,
    );

    const stats = {
      equipment: {
        total: equipment?.length || 0,
        wheelchair:
          equipment?.filter((e) => e.type === "wheelchair").length || 0,
        bed: equipment?.filter((e) => e.type === "bed").length || 0,
        available:
          equipment?.filter((e) => e.status === "available").length || 0,
        in_use: equipment?.filter((e) => e.status === "in_use").length || 0,
        charging: equipment?.filter((e) => e.status === "charging").length || 0,
        maintenance:
          equipment?.filter((e) => e.status === "maintenance").length || 0,
      },
      zones: zones?.length || 0,
      rooms: roomCount,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get floor stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
