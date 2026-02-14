const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/map
 * Get all equipment with locations for map view
 * Query params: floor_id, type, status
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { floor_id, type, status } = req.query;

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
        assigned_request_id,
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord)
      `,
      )
      .order("equipment_code", { ascending: true });

    if (floor_id) {
      query = query.eq("current_floor_id", floor_id);
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map equipment to include position data
    const equipmentWithPositions = (data || []).map((equipment) => ({
      id: equipment.id,
      equipment_code: equipment.equipment_code,
      type: equipment.type,
      battery_level: equipment.battery_level,
      status: equipment.status,
      last_seen_at: equipment.last_seen_at,
      assigned_request_id: equipment.assigned_request_id,
      position: {
        x: equipment.current_ap?.x_coord || null,
        y: equipment.current_ap?.y_coord || null,
      },
      floor: equipment.current_floor,
      room: equipment.current_room,
      access_point: equipment.current_ap,
    }));

    res.json({
      success: true,
      data: equipmentWithPositions,
      count: equipmentWithPositions.length,
    });
  } catch (error) {
    console.error("Get map equipment error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/map/floor/:floor_id
 * Get equipment on a specific floor with full location data
 */
router.get("/floor/:floor_id", authenticate, async (req, res) => {
  try {
    const { floor_id } = req.params;
    const { type, status } = req.query;

    let equipmentQuery = supabase
      .from("equipment")
      .select(
        `
        id,
        equipment_code,
        type,
        battery_level,
        status,
        last_seen_at,
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord)
      `,
      )
      .eq("current_floor_id", floor_id);

    if (type) {
      equipmentQuery = equipmentQuery.eq("type", type);
    }

    if (status) {
      equipmentQuery = equipmentQuery.eq("status", status);
    }

    const { data: equipment, error: equipmentError } = await equipmentQuery;

    if (equipmentError) throw equipmentError;

    // Get floor details
    const { data: floorData, error: floorError } = await supabase
      .from("floors")
      .select("id, name, building")
      .eq("id", floor_id)
      .single();

    if (floorError) throw floorError;

    // Map equipment with positions
    const equipmentWithPositions = (equipment || []).map((eq) => ({
      id: eq.id,
      equipment_code: eq.equipment_code,
      type: eq.type,
      battery_level: eq.battery_level,
      status: eq.status,
      last_seen_at: eq.last_seen_at,
      position: {
        x: eq.current_ap?.x_coord || null,
        y: eq.current_ap?.y_coord || null,
      },
      room: eq.current_room,
      access_point: eq.current_ap,
    }));

    // Get status breakdown
    const statusBreakdown = {
      available: equipmentWithPositions.filter((e) => e.status === "available")
        .length,
      in_use: equipmentWithPositions.filter((e) => e.status === "in_use")
        .length,
      charging: equipmentWithPositions.filter((e) => e.status === "charging")
        .length,
      maintenance: equipmentWithPositions.filter(
        (e) => e.status === "maintenance",
      ).length,
    };

    res.json({
      success: true,
      data: {
        floor: floorData,
        equipment: equipmentWithPositions,
        count: equipmentWithPositions.length,
        statusBreakdown,
      },
    });
  } catch (error) {
    console.error("Get floor map error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/map/search
 * Search equipment by ID or location for map view
 */
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q, floor_id, type } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query (q) is required",
      });
    }

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
        current_floor:current_floor_id(id, name, building),
        current_room:current_room_id(id, name, room_type),
        current_ap:current_ap_id(id, name, x_coord, y_coord)
      `,
      )
      .or(`equipment_code.ilike.%${q}%,type.ilike.%${q}%`);

    if (floor_id) {
      query = query.eq("current_floor_id", floor_id);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Also search by room name
    const { data: roomResults, error: roomError } = await supabase
      .from("rooms")
      .select(
        `
        id,
        name,
        room_type,
        equipment:equipment(
          id,
          equipment_code,
          type,
          battery_level,
          status,
          last_seen_at,
          current_floor:current_floor_id(id, name, building),
          current_ap:current_ap_id(id, name, x_coord, y_coord)
        )
      `,
      )
      .ilike("name", `%${q}%`);

    if (roomError) throw roomError;

    // Flatten room results to include equipment
    const equipmentFromRooms = (roomResults || []).flatMap((room) =>
      (room.equipment || []).map((eq) => ({
        ...eq,
        current_room: {
          id: room.id,
          name: room.name,
          room_type: room.room_type,
        },
      })),
    );

    // Combine and deduplicate results
    const allResults = [...(data || []), ...equipmentFromRooms];
    const uniqueResults = Array.from(
      new Map(allResults.map((item) => [item.id, item])).values(),
    );

    // Map to position format
    const equipmentWithPositions = uniqueResults.map((eq) => ({
      id: eq.id,
      equipment_code: eq.equipment_code,
      type: eq.type,
      battery_level: eq.battery_level,
      status: eq.status,
      last_seen_at: eq.last_seen_at,
      position: {
        x: eq.current_ap?.x_coord || null,
        y: eq.current_ap?.y_coord || null,
      },
      floor: eq.current_floor,
      room: eq.current_room,
      access_point: eq.current_ap,
    }));

    res.json({
      success: true,
      data: equipmentWithPositions,
      count: equipmentWithPositions.length,
      query: q,
    });
  } catch (error) {
    console.error("Map search error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/map/equipment-count
 * Get equipment count summary by type and status per floor
 */
router.get("/equipment-count", authenticate, async (req, res) => {
  try {
    const { floor_id } = req.query;

    let query = supabase
      .from("equipment")
      .select("id, type, status, current_floor_id");

    if (floor_id) {
      query = query.eq("current_floor_id", floor_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate counts
    const counts = {
      total: data?.length || 0,
      byType: {
        wheelchair: data?.filter((e) => e.type === "wheelchair").length || 0,
        bed: data?.filter((e) => e.type === "bed").length || 0,
      },
      byStatus: {
        available: data?.filter((e) => e.status === "available").length || 0,
        in_use: data?.filter((e) => e.status === "in_use").length || 0,
        charging: data?.filter((e) => e.status === "charging").length || 0,
        maintenance:
          data?.filter((e) => e.status === "maintenance").length || 0,
      },
    };

    res.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    console.error("Get equipment count error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/map/user-location
 * Get current user's location on the map
 */
router.get("/user-location", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // For now, return user's current floor
    // In the future, this could include real-time location tracking
    const userLocation = {
      userId: userId,
      name: req.user.full_name,
      role: req.user.role,
      employeeCode: req.user.employee_code,
      currentFloorId: req.user.current_floor_id,
      status: req.user.current_status,
      // Position would come from real-time tracking system
      position: {
        x: null, // To be implemented with real-time tracking
        y: null,
      },
    };

    res.json({
      success: true,
      data: userLocation,
    });
  } catch (error) {
    console.error("Get user location error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
