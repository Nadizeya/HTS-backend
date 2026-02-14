const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/rooms
 * Get all rooms for dropdown - returns all rooms with floor/zone info
 * Query params: floor_id, zone_id, room_type, search (all optional)
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { floor_id, zone_id, room_type, search } = req.query;

    let query = supabase
      .from("rooms")
      .select(
        `
        id,
        name,
        room_type,
        zone:zone_id(
          id,
          name,
          floor:floor_id(id, name, building)
        )
      `,
      )
      .order("name", { ascending: true });

    if (zone_id) {
      query = query.eq("zone_id", zone_id);
    }

    if (room_type) {
      query = query.eq("room_type", room_type);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by floor_id in JS since it's a nested relation
    let filtered = data || [];
    if (floor_id) {
      filtered = filtered.filter((room) => room.zone?.floor?.id === floor_id);
    }

    // Format for dropdown usage
    const formattedData = filtered.map((room) => ({
      id: room.id,
      name: room.name,
      room_type: room.room_type,
      display_name: `${room.name} - ${room.zone?.floor?.name || "Unknown Floor"}`,
      floor: room.zone?.floor?.name || "Unknown",
      floor_id: room.zone?.floor?.id,
      zone: room.zone?.name || "Unknown",
      building: room.zone?.floor?.building || "Unknown",
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rooms/search
 * Search rooms for autocomplete
 * Query params: q (search term), floor_id (optional)
 */
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q, floor_id } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' is required (minimum 1 character)",
      });
    }

    const { data, error } = await supabase
      .from("rooms")
      .select(
        `
        id,
        name,
        room_type,
        zone:zone_id(
          id,
          name,
          floor:floor_id(id, name, building)
        )
      `,
      )
      .ilike("name", `%${q}%`)
      .order("name", { ascending: true })
      .limit(20);

    if (error) throw error;

    let filtered = data || [];
    if (floor_id) {
      filtered = filtered.filter((room) => room.zone?.floor?.id === floor_id);
    }

    const formattedData = filtered.map((room) => ({
      id: room.id,
      name: room.name,
      room_type: room.room_type,
      display_name: `${room.name} - ${room.zone?.floor?.name || "Unknown Floor"}`,
      floor: room.zone?.floor?.name || "Unknown",
      floor_id: room.zone?.floor?.id,
      zone: room.zone?.name || "Unknown",
      building: room.zone?.floor?.building || "Unknown",
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    });
  } catch (error) {
    console.error("Search rooms error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rooms/:id
 * Get room details by ID
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("rooms")
      .select(
        `
        *,
        zone:zone_id(
          id,
          name,
          floor:floor_id(id, name, building)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get room by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
