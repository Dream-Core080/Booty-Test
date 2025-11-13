const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const UpdatedMonth = require("../models/updatedWorkoutModel");
const Exercise = require("../models/exerciseModel");
const { getEstTime } = require("../utils/date");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../utils/emailService");
const { default: mongoose } = require("mongoose");
const { auth } = require("../config/firebase");
const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");

/**
 * Register a new user
 * Creates user in both Firebase and MongoDB, then sends verification email
 * 
 * @route POST /api/users/register_user
 * @param {string} req.body.email - User's email address (required)
 * @param {string} req.body.password - User's password (required)
 * @param {string} req.body.username - User's username (optional)
 * @param {string} req.body.phone - User's phone number (optional)
 * @returns {Object} Success message with verification instructions
 * @throws {Error} 400 if email/password missing or user already exists
 * @throws {Error} 500 if Firebase or MongoDB creation fails
 */
exports.registerUser = asyncHandler(async (req, res, next) => {
  const { email, password, username, phone } = req.body;
  let newUserObject = {};

  // Validate required fields
  if (!email) {
    res.status(400);
    throw new Error("Please add email");
  }

  if (!password) {
    res.status(400);
    throw new Error("Please add password");
  }

  // Check if user already exists in MongoDB
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("A user with that email already exists");
  }

  // Hash password for secure storage in MongoDB
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Generate unique verification token (32 bytes = 64 hex characters)
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date();
  verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24); // Token expires in 24 hours

  // Create user in Firebase first (Firebase handles authentication)
  let firebaseUser;
  try {
    firebaseUser = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Firebase user created:", firebaseUser.user.uid);
  } catch (error) {
    console.error("Firebase user creation error:", error);
    // If Firebase user creation fails, don't create MongoDB user
    if (error.code === 'auth/email-already-in-use') {
      res.status(400);
      throw new Error("A user with that email already exists");
    }
    res.status(500);
    throw new Error(`Error creating Firebase user: ${error.message}`);
  }

  // Create user in MongoDB with verification status set to false
  // User must verify email before they can log in
  newUserObject = {
    ...newUserObject,
    email,
    password: hashedPassword, // Store hashed password for backup/verification
    username,
    phone,
    experience: "",
    level: 0,
    role: 0,
    note: "",
    avatarUrl: "",
    favorites: [],
    histories: [],
    isVerified: false, // Email verification required before login
    verificationToken,
    verificationTokenExpires,
  };

  let user;
  try {
    user = await User.create(newUserObject);
  } catch (error) {
    console.log("MongoDB user creation error:", error);
    // If MongoDB creation fails, we should ideally delete the Firebase user
    // But for now, just throw error
    res.status(500);
    throw new Error(`Error creating user: ${error.message}`);
  }

  // Send verification email with link
  // Email sending failure doesn't block registration, but is logged
  try {
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5004';
    await sendVerificationEmail(email, verificationToken, baseUrl);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't fail registration if email fails, but log it
  }

  if (user) {
    res.status(200).json({ 
      message: "User registered successfully. Please check your email to verify your account.",
      success: true
    });
  } else {
    res.status(500);
    throw new Error("Invalid user data");
  }
});

/**
 * Verify user's email address using verification token
 * Called when user clicks the verification link in their email
 * 
 * @route GET /api/users/verify-email
 * @param {string} req.query.token - Verification token from email link (required)
 * @returns {string} HTML page with success or error message
 * @throws {Error} 400 if token is missing, invalid, or expired
 */
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.query;

  // Validate token parameter
  if (!token) {
    // Return HTML error page for missing token
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #9A354E; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Email Verification Failed</h1>
          <p class="error">Verification token is required.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Find user with matching verification token that hasn't expired
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() } // Token must not be expired
  });

  if (!user) {
    // Return HTML error page for invalid or expired token
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #9A354E; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Email Verification Failed</h1>
          <p class="error">Invalid or expired verification token. Please request a new verification email.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Mark user as verified and clear verification token fields
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  // Return HTML success page confirming email verification
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verified</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #9A354E; }
        .success { color: #4caf50; font-size: 18px; margin: 20px 0; }
        .checkmark { font-size: 60px; color: #4caf50; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="checkmark">✓</div>
        <h1>Email Verified Successfully!</h1>
        <p class="success">Your email address has been verified. You can now log in to your account.</p>
        <p>You can close this window and return to the app.</p>
      </div>
    </body>
    </html>
  `);
});

/**
 * Customer login with email verification check
 * Verifies email is confirmed before allowing Firebase authentication
 * 
 * @route POST /api/users/signin_customer
 * @param {string} req.body.email - User's email address (required)
 * @param {string} req.body.password - User's password (required)
 * @returns {Object} User data and Firebase ID token
 * @throws {Error} 400 if email/password missing
 * @throws {Error} 401 if invalid credentials
 * @throws {Error} 403 if email not verified
 * @throws {Error} 500 if Firebase authentication fails
 */
exports.signinCustomer = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  // Find user in MongoDB by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Email verification layer: Check if user has verified their email
  // This is an additional security layer before Firebase authentication
  if (!user.isVerified) {
    const error = new Error("Please verify your email address before logging in. Check your inbox for the verification email.");
    error.statusCode = 403;
    res.status(403);
    throw error;
  }

  // Authenticate with Firebase using email and password
  try {
    const firebaseUserCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = firebaseUserCredential.user;
    
    // Get Firebase ID token for client-side authentication
    const idToken = await firebaseUser.getIdToken();

    // Return user data and Firebase token on successful login
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        username: user.username,
        idToken: idToken, // Firebase ID token for client authentication
      }
    });
  } catch (error) {
    console.error("Firebase authentication error:", error);
    // Handle Firebase authentication errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      res.status(401);
      throw new Error("Invalid email or password");
    }
    res.status(500);
    throw new Error(`Authentication failed: ${error.message}`);
  }
});

exports.getUser = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findOne({_id: req.params.id});
    const userWorkout = await getWorkoutForCurrentMonthHistory(user.uid);
    user.workout = userWorkout;
    const userResponse = {  
      _id: user._id,  
      email: user.email,  
      uid: user.uid,  
      role: user.role,  
      experience: user.experience,  
      level: user.level,  
      note: user.note,  
      avatarUrl: user.avatarUrl,  
      favorites: user.favorites,  
      createdAt: user.createdAt,  
      updatedAt: user.updatedAt,  
      __v: user.__v,  
      name: user.name,  
      workoutsHistory: user.workoutsHistory,  
      dayHistory: user.dayHistory,  
      workout: userWorkout 
    }
    console.log(userResponse);
    res.status(200).json(userResponse);

  } catch (error) {
    console.log(error);
  }
});
const getWorkoutForCurrentMonthHistory = async (id) => {
  try {
    const estNow = getEstTime();

    const workout = await UpdatedMonth.findOne({
      uid: id,
      $and: [
        { $or: [{ startDate: { $lte: estNow } }, { startDate: null }] },
        { $or: [{ endDate: { $gte: estNow } }, { endDate: null }] }
      ]
    });

    if (!workout) {
      return false;
    }
  
    let exerciseIds = [];
    workout.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises.forEach((exercise) => {
          if (exercise.exerciseId) {
            exerciseIds.push(exercise.exerciseId);
          }
        });
      });
    });

    const exercises = await Exercise.find({ _id: { $in: exerciseIds } });

    const exerciseMap = {};
    exercises.forEach((exercise) => {
      exerciseMap[exercise._id] = exercise.title;
    });

    workout.weeks = workout.weeks.map((week) => {
      week.days = week.days.map((day) => {
        day.exercises = day.exercises.map((exercise) => {
          return {
            ...exercise,
            name: exerciseMap[exercise.exerciseId] || "",
          };
        });
        return day;
      });
      return week;
    });

    return workout;
  }
  catch (error) {
    console.error('Error updating workouts:', error);
  }
};
exports.getUsers = asyncHandler(async (req, res, next) => {
  try {
    const { search, page = 1, perPage = 10, sortBy} = req.query;

    const pipeline = [];

    const skip = (page - 1) * perPage;

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { firstname: { $regex: search, $options: "i" } },
            { lastname: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    const pipelineUsers = [];

    if (sortBy) {
      var order = getSortInfo(sortBy);

      pipelineUsers.push({
        $sort: order,
      });
    }

    if (perPage && page) {
      const skip = (page - 1) * perPage;
      pipelineUsers.push({ $skip: skip });
      pipelineUsers.push({ $limit: parseInt(perPage) });
    }

    //const totalCount = await User.countDocuments(query);

    const facet = {
      $facet: {
        pipelineUsers: pipelineUsers,
        //totalCount: totalCount,
      },
    };
    pipeline.push(facet);
    
    const results = await User.aggregate(pipeline);

    var users = [];
    var count = 0;

    if (results.length != 0) {
      users = results[0].pipelineUsers;

    //   if (results[0].totalCount.length != 0)
    //     count = results[0].totalCount[0].totalMatchingDocuments;
    // }
    }
    res.status(200).json({ users: users });
  } catch (error) {
    console.log(error);
  }
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  try {
    const { detail, deviceToken } = req.body;
    console.log({detail});
    await User.findOneAndUpdate(
      { _id: req.params.id },
      {
        detail,
        $push: { deviceTokens: deviceToken }
      },
      { new: true }
    )
      .then((result) => {
        console.log("Document updated successfully:", result);
        res.status(200).json({ result });
      })
      .catch((error) => {
        console.error("Error updating document:", error);
        res.status(200).json({ result: false, message: error });
      });
  } catch (error) {
    console.log(error);
  }
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  try {
    await User.findOneAndDelete({ _id: req.params.id })
      .then((result) => {
        console.log("Document deleted successfully:", result);
        res.status(200).json({ result: true });
      })
      .catch((error) => {
        console.error("Error deleting document:", error);
        res.status(200).json({ result: false, message: error });
      });
  } catch (error) {
    console.log(error);
  }
});

exports.signInAdmin = asyncHandler(async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email }).select(["role"]);

    if (!user) {
      res.status(200).json({ result: false });
    } else {
      if (user.role >= 1) res.status(200).json({ result: true });
      // else res.status(200).json({ result: false });
      else console.log(user.role);
    }
  } catch (error) {
    console.log(error);
  }
});

exports.getMe = asyncHandler(async (req, res, next) => {
  try {
    console.log('get_user', req);
    console.log('get_user/user', req.user);

    const user = req.user;
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});

exports.exerciseDone = asyncHandler(async (req, res, next) => {
  try {
    const { monthIndex, weekIndex, dayId, exerciseId, sets, reps, weight, rest } = req.body;
    const user = req.user;

    if (!user.workoutsHistory) user.workoutsHistory = new Array();

    user.workoutsHistory.push({
      monthIndex : monthIndex,
      weekIndex : weekIndex,
      dayId : new mongoose.Types.ObjectId(dayId),
      exerciseId : new mongoose.Types.ObjectId(exerciseId),
      sets: sets,
      reps: reps,
      weight: weight,
      rest: rest,
    })
    await user.save().then((result) => {
      console.log("history saved successfully:", result);
      res.status(200).json({ result: true });
    }).catch((error) => {
      console.error("Error occurs while saving history:", error);
      res.status(200).json({ result: false, message: error });
    });
  } catch (error) {
    console.log(error);
  }
});

// const dayDone = asyncHandler(async (req, res) => {
//   try {
//     const { monthIndex, weekIndex, daySplit, dayIndex, state, streak } = req.body;
//     const user = req.user;

//     console.log(monthIndex, weekIndex, daySplit, dayIndex, state, streak);
//     console.log(user);
//     if (!user.dayHistory) user.dayHistory = new Array();

//     user.dayHistory.push({
//       monthIndex : parseInt(monthIndex),
//       weekIndex : parseInt(weekIndex),
//       daySplit : parseInt(daySplit),
//       dayIndex : parseInt(dayIndex),
//       state : state,
//       streak: parseInt(streak)
//     })

//     await user.save().then((result) => {
//       console.log("history saved successfully:", result);
//       res.status(200).json({ result: true });
//     }).catch((error) => {
//       console.error("Error occurs while saving history:", error);
//       res.status(200).json({ result: false, message: error });
//     });
//   } catch (error) {
//     console.log(error);
//   }
// });
exports.dayDone = asyncHandler(async (req, res, next) => {
  try {
    const { monthIndex, weekIndex, daySplit, dayIndex, state, streak } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ result: false, message: "User not authenticated" });
    }

    if (!user.dayHistory) user.dayHistory = [];

    // Check for duplicate entries
    const existingEntry = user.dayHistory.find(
      (entry) =>
        entry.monthIndex === parseInt(monthIndex, 10) &&
        entry.weekIndex === parseInt(weekIndex, 10) &&
        entry.dayIndex === parseInt(dayIndex, 10) &&
        entry.daySplit === parseInt(daySplit, 10)
    );

    if (existingEntry) {
      return res.status(400).json({ result: false, message: "Entry already exists" });
    }

    // Add a new entry
    user.dayHistory.push({
      monthIndex: parseInt(monthIndex, 10),
      weekIndex: parseInt(weekIndex, 10),
      daySplit: parseInt(daySplit, 10),
      dayIndex: parseInt(dayIndex, 10),
      state: state,
      streak: parseInt(streak, 10),
    });

    // Save to database
    await user.save().then((result) => {
      console.log("History saved successfully:", result);
      res.status(200).json({ result: true });
    }).catch((error) => {
      console.error("Error occurs while saving history:", error);
      res.status(500).json({ result: false, message: "Database save error", error });
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ result: false, message: "Internal server error", error });
  }
});


exports.getWorkoutsHistory = asyncHandler(async (req, res, next) => {
  try {
    const { monthIndex, weekIndex, dayIndex, day, daySplit, exercises } = req.body;
    const userId = req.user;
    const user = await User.findOne({id: userId});

    if (!user.workoutsHistory) user.workoutsHistory = new Array();
    if (!user.workoutsHistory.exercises) user.workoutsHistory.exercises = new Array();
    if (!user.workoutsHistory.exercises.sets) user.workoutsHistory.exercises.sets = new Array();

    user.workoutsHistory.push({
      monthIndex : monthIndex,
      weekIndex : weekIndex,
      daySplit : daySplit,
      dayIndex : dayIndex,
      day : day,
    })
    exercises.map(exercise => {
      user.workoutsHistory.exercises.push(
        {
        exerciseId: exercise.exerciseId,
        status: exercise.status,
        }
      )
    });
    await user.save().then((result) => {
      console.log("history saved successfully:", result);
      res.status(200).json({ result: true });
    }).catch((error) => {
      console.error("Error occurs while saving history:", error);
      res.status(200).json({ result: false, message: error });
    });
  } catch (error) {
    console.log(error);
  }
});

const getSortInfo = (sortBy) => {
  let orderBy, orderDir;

  switch (sortBy) {
    case "Popularity":
      orderBy = "popularity";
      orderDir = -1;
      break;
    case "NameAtoZ":
      orderBy = "name";
      orderDir = 1;
      break;
    case "NameZtoA":
      orderBy = "name";
      orderDir = -1;
      break;
    case "NewestAdded":
      orderBy = "createdAt";
      orderDir = -1;
      break;
    case "OldestAdded":
      orderBy = "createdAt";
      orderDir = 1;
      break;
    case "LastViewed":
      orderBy = "lastview";
      orderDir = -1;
      break;
    default:
      orderBy = "name";
      orderDir = 1;
      break;
  }

  return { [orderBy]: orderDir };
};

