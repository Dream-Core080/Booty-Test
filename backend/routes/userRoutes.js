const express = require("express");
const {
  registerUser,
  verifyEmail,
  signinCustomer,
  signInAdmin,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  getMe,
  exerciseDone,
  dayDone,
  getWorkoutsHistory,
} = require("../controllers/userController");
const { requiresAuth } = require("../middleware/authMiddleware");
const router = express.Router();

// User registration and authentication routes (email verification implementation)
router.post("/register_user", registerUser); // Register new user with email verification
router.get("/verify-email", verifyEmail); // Verify email using token from email link
router.post("/signin_customer", signinCustomer); // Customer login with email verification check
router.post("/signin_admin", signInAdmin);

router.get("/admin/:id", requiresAuth, getUser);
router.get("/admin", requiresAuth, getUsers);
router.put("/admin/:id", requiresAuth, updateUser);
router.delete("/admin/:id", requiresAuth, deleteUser);

router.get("/get_user",requiresAuth, getMe);
router.put("/:id", updateUser);
router.post("/exercise_done", requiresAuth, exerciseDone);
router.post("/day_done", requiresAuth, dayDone);
router.post("/workouts_history", getWorkoutsHistory);

module.exports = router;