const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/dashboard
 * Get dashboard data for logged-in user
 * Returns: user info, nearby equipment count, active tasks
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userFloorId = req.user.current_floor_id;

    // Get nearby available equipment count (on same floor)
    const { data: nearbyEquipment, error: equipmentError } = await supabase
      .from("equipment")
      .select("id, equipment_code, type, battery_level, status")
      .eq("status", "available")
      .eq("current_floor_id", userFloorId);

    if (equipmentError) throw equipmentError;

    // Get active tasks for the user
    const { data: activeTasks, error: tasksError } = await supabase
      .from("requests")
      .select(
        `
        id,
        patient_name,
        priority,
        equipment_type,
        status,
        notes,
        created_at,
        pickup_room:pickup_room_id(id, name, room_type),
        destination_room:destination_room_id(id, name, room_type),
        assigned_user:assigned_to(id, employee_code, full_name)
      `,
      )
      .or(
        `requested_by.eq.${userId},assigned_to.eq.${userId}`,
      )
      .in("status", ["pending", "queued", "assigned", "in_progress"])
      .order("created_at", { ascending: false });

    if (tasksError) throw tasksError;

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.full_name,
          employeeCode: req.user.employee_code,
          role: req.user.role,
          status: req.user.current_status,
          phone: req.user.phone,
        },
        nearbyEquipment: {
          count: nearbyEquipment?.length || 0,
          equipment: nearbyEquipment || [],
        },
        activeTasks: activeTasks || [],
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/dashboard/stats
 * Get user statistics
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get request statistics
    const { data: stats, error } = await supabase
      .from("requests")
      .select("status")
      .eq("assigned_to", userId);

    if (error) throw error;

    const completed = stats.filter((r) => r.status === "completed").length;
    const inProgress = stats.filter((r) => r.status === "in_progress").length;
    const pending = stats.filter((r) =>
      ["pending", "queued", "assigned"].includes(r.status)
    ).length;

    res.json({
      success: true,
      data: {
        totalRequests: stats.length,
        completed,
        inProgress,
        pending,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
