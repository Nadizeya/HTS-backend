const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/rooms
 * Get all rooms with optional filters
 * Query params: floor_id, zone_id, room_type, search
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { floor_id, zone_id, room_type, search } = req.query;

    let query = supabase
      .from("rooms")
      .select(
        `
        *,
        zone:zone_id(
          id,
          name,
          floor:floor_id(id, name, building, level)
        )
      `
      )
      .order("name", { ascending: true });

    if (floor_id) {
      query = query.eq("zone.floor_id", floor_id);
    }

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

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
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
 * Search rooms for autocomplete (optimized for New Request screen location fields)
 * Query params: q (search term), floor_id (optional filter)
 * Returns simplified room data with floor and zone info
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
          floor:floor_id(id, name, building, level)
        )
      `
      )
      .ilike("name", `%${q}%`)
      .order("name", { ascending: true })
      .limit(20); // Limit for autocomplete performance

    if (floor_id) {
      query = query.eq("zone.floor_id", floor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Format response for autocomplete dropdown
    const formattedData = (data || []).map((room) => ({
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
 * GET /api/rooms/nearby
 * Get rooms on the same floor as the current user
 * Returns rooms sorted by proximity (if user location is available)
 */
router.get("/nearby", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current floor
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("current_floor_id")
      .eq("id", userId)
      .single();

    if (userError) throw userError;

    if (!userData?.current_floor_id) {
      return res.status(400).json({
        success: false,
        message: "User location not available. Please update your location first.",
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
          floor:floor_id(id, name, building, level)
        )
      `
      )
      .eq("zone.floor_id", userData.current_floor_id)
      .order("name", { ascending: true });

    if (error) throw error;

    // Format response
    const formattedData = (data || []).map((room) => ({
      id: room.id,
      name: room.name,
      room_type: room.room_type,
      display_name: `${room.name} - ${room.zone?.name || "Unknown Zone"}`,
      floor: room.zone?.floor?.name || "Unknown",
      zone: room.zone?.name || "Unknown",
    }));

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
    });
  } catch (error) {
    console.error("Get nearby rooms error:", error);
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
          floor:floor_id(id, name, building, level)
        ),
        access_points:access_points(id, name, x_coord, y_coord),
        current_equipment:equipment!current_room_id(id, equipment_code, type, status, battery_level)
      `
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

/**
 * GET /api/rooms/by-type/:room_type
 * Get rooms by type (ward, icu, er, or, radiology, lab, storage, pharmacy, other)
 */
router.get("/by-type/:room_type", authenticate, async (req, res) => {
  try {
    const { room_type } = req.params;

    const validTypes = [
      "ward",
      "icu",
      "er",
      "or",
      "radiology",
      "lab",
      "storage",
      "pharmacy",
      "other",
    ];

    if (!validTypes.includes(room_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid room type. Must be one of: ${validTypes.join(", ")}`,
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
          floor:floor_id(id, name, building, level)
        )
      `
      )
      .eq("room_type", room_type)
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get rooms by type error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
