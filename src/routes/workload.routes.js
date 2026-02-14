const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/workload
 * Get workload overview stats (top summary cards)
 * Returns: Total Tasks, Completed, Avg Time, Efficiency %
 */
router.get("/", authenticate, async (req, res) => {
  try {
    // Get all requests
    const { data: allRequests, error: reqError } = await supabase
      .from("requests")
      .select("id, status, created_at, completed_at");

    if (reqError) throw reqError;

    const requests = allRequests || [];
    const totalTasks = requests.length;
    const completed = requests.filter((r) => r.status === "completed").length;

    // Calculate average completion time (in minutes)
    const completedWithTime = requests.filter(
      (r) => r.status === "completed" && r.completed_at && r.created_at,
    );

    let avgTimeMinutes = 0;
    if (completedWithTime.length > 0) {
      const totalMinutes = completedWithTime.reduce((sum, r) => {
        const start = new Date(r.created_at);
        const end = new Date(r.completed_at);
        return sum + (end - start) / (1000 * 60);
      }, 0);
      avgTimeMinutes = Math.round(totalMinutes / completedWithTime.length);
    }

    // Efficiency = completed / (completed + cancelled) * 100
    const cancelled = requests.filter((r) => r.status === "cancelled").length;
    const efficiency =
      completed + cancelled > 0
        ? Math.round((completed / (completed + cancelled)) * 100)
        : 100;

    res.json({
      success: true,
      data: {
        total_tasks: totalTasks,
        completed,
        avg_time_minutes: avgTimeMinutes,
        efficiency,
      },
    });
  } catch (error) {
    console.error("Get workload stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/workload/staff
 * Get staff members list with performance metrics
 * Query params: role (porter/nurse/admin), status (available/busy/offline)
 */
router.get("/staff", authenticate, async (req, res) => {
  try {
    const { role, status } = req.query;

    // Get all staff (exclude password_hash)
    let userQuery = supabase
      .from("users")
      .select(
        "id, employee_code, full_name, role, phone, current_status, current_floor_id, active_request_count, created_at",
      )
      .order("full_name", { ascending: true });

    if (role && role !== "all") {
      userQuery = userQuery.eq("role", role);
    }

    if (status && status !== "all") {
      userQuery = userQuery.eq("current_status", status);
    }

    const { data: users, error: userError } = await userQuery;

    if (userError) throw userError;

    // Get all requests to calculate per-staff metrics
    const { data: allRequests, error: reqError } = await supabase
      .from("requests")
      .select(
        "id, status, assigned_to, requested_by, created_at, completed_at",
      );

    if (reqError) throw reqError;

    const requests = allRequests || [];

    // Build staff members with metrics
    const staffMembers = (users || []).map((user) => {
      // Get tasks assigned to or requested by this user
      const userTasks = requests.filter(
        (r) => r.assigned_to === user.id || r.requested_by === user.id,
      );

      const completedTasks = userTasks.filter(
        (r) => r.status === "completed",
      ).length;
      const activeTasks = userTasks.filter(
        (r) => r.status === "in_progress" || r.status === "assigned",
      ).length;
      const pendingTasks = userTasks.filter(
        (r) => r.status === "pending" || r.status === "queued",
      ).length;
      const cancelledTasks = userTasks.filter(
        (r) => r.status === "cancelled",
      ).length;

      const totalHandled = completedTasks + cancelledTasks;
      const completionRate =
        totalHandled > 0
          ? Math.round((completedTasks / totalHandled) * 100)
          : 100;

      // Avg completion time for this user
      const completedWithTime = userTasks.filter(
        (r) => r.status === "completed" && r.completed_at && r.created_at,
      );

      let avgTimeMinutes = 0;
      if (completedWithTime.length > 0) {
        const totalMinutes = completedWithTime.reduce((sum, r) => {
          const start = new Date(r.created_at);
          const end = new Date(r.completed_at);
          return sum + (end - start) / (1000 * 60);
        }, 0);
        avgTimeMinutes = Math.round(totalMinutes / completedWithTime.length);
      }

      // Efficiency score based on completion rate and avg time
      const efficiencyScore = Math.min(
        100,
        Math.round(
          completionRate * 0.7 + Math.max(0, 100 - avgTimeMinutes) * 0.3,
        ),
      );

      return {
        id: user.id,
        employee_code: user.employee_code,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        current_status: user.current_status,
        current_floor_id: user.current_floor_id,
        tasks: {
          completed: completedTasks,
          active: activeTasks,
          pending: pendingTasks,
          total: userTasks.length,
        },
        completion_rate: completionRate,
        efficiency_score: efficiencyScore,
        avg_time_minutes: avgTimeMinutes,
      };
    });

    res.json({
      success: true,
      data: staffMembers,
      count: staffMembers.length,
    });
  } catch (error) {
    console.error("Get staff workload error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/workload/staff/:id
 * Get detailed workload for a specific staff member
 */
router.get("/staff/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user info
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, employee_code, full_name, role, phone, current_status, current_floor_id, active_request_count, created_at",
      )
      .eq("id", id)
      .single();

    if (userError) throw userError;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Get all tasks for this user
    const { data: userTasks, error: taskError } = await supabase
      .from("requests")
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type),
        destination_room:destination_room_id(id, name, room_type)
      `,
      )
      .or(`assigned_to.eq.${id},requested_by.eq.${id}`)
      .order("created_at", { ascending: false });

    if (taskError) throw taskError;

    const tasks = userTasks || [];

    const completedTasks = tasks.filter((r) => r.status === "completed");
    const activeTasks = tasks.filter(
      (r) => r.status === "in_progress" || r.status === "assigned",
    );
    const pendingTasks = tasks.filter(
      (r) => r.status === "pending" || r.status === "queued",
    );
    const cancelledTasks = tasks.filter((r) => r.status === "cancelled");

    const totalHandled = completedTasks.length + cancelledTasks.length;
    const completionRate =
      totalHandled > 0
        ? Math.round((completedTasks.length / totalHandled) * 100)
        : 100;

    // Avg completion time
    const completedWithTime = completedTasks.filter(
      (r) => r.completed_at && r.created_at,
    );

    let avgTimeMinutes = 0;
    if (completedWithTime.length > 0) {
      const totalMinutes = completedWithTime.reduce((sum, r) => {
        const start = new Date(r.created_at);
        const end = new Date(r.completed_at);
        return sum + (end - start) / (1000 * 60);
      }, 0);
      avgTimeMinutes = Math.round(totalMinutes / completedWithTime.length);
    }

    const efficiencyScore = Math.min(
      100,
      Math.round(
        completionRate * 0.7 + Math.max(0, 100 - avgTimeMinutes) * 0.3,
      ),
    );

    res.json({
      success: true,
      data: {
        ...user,
        tasks: {
          completed: completedTasks.length,
          active: activeTasks.length,
          pending: pendingTasks.length,
          cancelled: cancelledTasks.length,
          total: tasks.length,
        },
        completion_rate: completionRate,
        efficiency_score: efficiencyScore,
        avg_time_minutes: avgTimeMinutes,
        recent_tasks: tasks.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Get staff detail error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
