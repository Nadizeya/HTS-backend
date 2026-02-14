const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { authenticate, requireRole } = require("../middleware/auth.middleware");

/**
 * GET /api/requests
 * Get all requests with optional filters
 * Query params: status, assigned_to, requested_by, equipment_type, priority
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, assigned_to, requested_by, equipment_type, priority } =
      req.query;

    let query = supabase
      .from("requests")
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type, zone:zone_id(name, floor:floor_id(name, building))),
        destination_room:destination_room_id(id, name, room_type, zone:zone_id(name, floor:floor_id(name, building))),
        requested_by_user:requested_by(id, employee_code, full_name, role),
        assigned_to_user:assigned_to(id, employee_code, full_name, role),
        equipment:equipment_id(id, equipment_code, type, status, battery_level)
      `,
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (assigned_to) {
      query = query.eq("assigned_to", assigned_to);
    }

    if (requested_by) {
      query = query.eq("requested_by", requested_by);
    }

    if (equipment_type) {
      query = query.eq("equipment_type", equipment_type);
    }

    if (priority) {
      query = query.eq("priority", parseInt(priority));
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/requests/active
 * Get active requests (pending, queued, assigned, in_progress) for current user
 */
router.get("/active", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type),
        destination_room:destination_room_id(id, name, room_type),
        requested_by_user:requested_by(id, employee_code, full_name),
        assigned_to_user:assigned_to(id, employee_code, full_name),
        equipment:equipment_id(id, equipment_code, type, battery_level)
      `,
      )
      .or(`requested_by.eq.${userId},assigned_to.eq.${userId}`)
      .in("status", ["pending", "queued", "assigned", "in_progress"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Map priority to labels
    const tasksWithLabels = (data || []).map((task) => ({
      ...task,
      priorityLabel:
        task.priority === 1
          ? "STAT"
          : task.priority === 2
            ? "HIGH"
            : task.priority === 3
              ? "NORMAL"
              : "LOW",
    }));

    res.json({
      success: true,
      data: tasksWithLabels,
      count: tasksWithLabels.length,
    });
  } catch (error) {
    console.error("Get active requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/requests/my-requests
 * Get all requests created by current user
 */
router.get("/my-requests", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type),
        destination_room:destination_room_id(id, name, room_type),
        assigned_to_user:assigned_to(id, employee_code, full_name),
        equipment:equipment_id(id, equipment_code, type)
      `,
      )
      .eq("requested_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/requests/assigned
 * Get all requests assigned to current user
 */
router.get("/assigned", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type),
        destination_room:destination_room_id(id, name, room_type),
        requested_by_user:requested_by(id, employee_code, full_name),
        equipment:equipment_id(id, equipment_code, type, battery_level)
      `,
      )
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Get assigned requests error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/requests/:id
 * Get request by ID
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("requests")
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type, zone:zone_id(name, floor:floor_id(name, building))),
        destination_room:destination_room_id(id, name, room_type, zone:zone_id(name, floor:floor_id(name, building))),
        requested_by_user:requested_by(id, employee_code, full_name, role, phone),
        assigned_to_user:assigned_to(id, employee_code, full_name, role, phone),
        equipment:equipment_id(id, equipment_code, type, status, battery_level, current_room:current_room_id(name))
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get request by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/requests
 * Create a new request
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      patient_name,
      priority,
      pickup_room_id,
      destination_room_id,
      equipment_type,
      notes,
      estimated_duration_minutes,
    } = req.body;

    // Validate required fields
    if (
      !priority ||
      !pickup_room_id ||
      !destination_room_id ||
      !equipment_type
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: priority, pickup_room_id, destination_room_id, equipment_type",
      });
    }

    // Validate priority values (1=STAT, 2=HIGH, 3=NORMAL)
    if (![1, 2, 3].includes(parseInt(priority))) {
      return res.status(400).json({
        success: false,
        message: "Priority must be 1 (STAT), 2 (HIGH), or 3 (NORMAL)",
      });
    }

    // Validate equipment type
    if (!['wheelchair', 'bed'].includes(equipment_type)) {
      return res.status(400).json({
        success: false,
        message: "Equipment type must be 'wheelchair' or 'bed'",
      });
    }

    const { data, error } = await supabase
      .from("requests")
      .insert([
        {
          patient_name: patient_name || null,
          priority: parseInt(priority),
          pickup_room_id,
          destination_room_id,
          equipment_type,
          requested_by: req.user.id,
          notes: notes || null,
          estimated_duration_minutes: estimated_duration_minutes ? parseInt(estimated_duration_minutes) : 30,
          status: "pending",
        },
      ])
      .select(
        `
        *,
        pickup_room:pickup_room_id(id, name, room_type),
        destination_room:destination_room_id(id, name, room_type)
      `,
      )
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data,
    });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/requests/:id/status
 * Update request status
 */
router.put("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "queued",
      "assigned",
      "in_progress",
      "completed",
      "cancelled",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updateData = { status };

    // Add timestamps based on status
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Request status updated",
      data,
    });
  } catch (error) {
    console.error("Update request status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/requests/:id/assign
 * Assign request to a porter
 */
router.put("/:id/assign", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { porter_id, equipment_id } = req.body;

    if (!porter_id) {
      return res.status(400).json({
        success: false,
        message: "porter_id is required",
      });
    }

    const updateData = {
      assigned_to: porter_id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    };

    if (equipment_id) {
      updateData.equipment_id = equipment_id;
    }

    const { data, error } = await supabase
      .from("requests")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        assigned_to_user:assigned_to(id, employee_code, full_name)
      `,
      )
      .single();

    if (error) throw error;

    // Update equipment status if equipment is assigned
    if (equipment_id) {
      await supabase
        .from("equipment")
        .update({
          status: "in_use",
          assigned_request_id: id,
        })
        .eq("id", equipment_id);
    }

    res.json({
      success: true,
      message: "Request assigned successfully",
      data,
    });
  } catch (error) {
    console.error("Assign request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/requests/:id
 * Cancel/Delete a request
 */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Update status to cancelled instead of deleting
    const { data, error } = await supabase
      .from("requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Request cancelled successfully",
      data,
    });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
