const User = require("../models/User");
const {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
} = require("./verifyToken");
const CryptoJS = require("crypto-js");
const router = require("express").Router();

// user can change password
// take everything from body and set it again
// new likh ke phir wo new user return krta na
// update user
router.put("/:id", verifyTokenAndAuthorization, async (req, res) => {
  // Bas jo psw aya wo encrypt krke rkha
  if (req.body.password) {
    req.body.password = CryptoJS.AES.encrypt(
      req.body.password,
      process.env.PASS_SEC
    ).toString();
  }

  try {
    // Check if email or username exists in another user
    if (req.body.email || req.body.username) {
      const existingUser = await User.findOne({
        $or: [{ email: req.body.email }, { username: req.body.username }],
        _id: { $ne: req.params.id }, // Exclude the current user from the search
      });

      if (existingUser) {
        if (existingUser.email === req.body.email) {
          return res
            .status(400)
            .json({ message: "This email is already registered." });
        }
        if (existingUser.username === req.body.username) {
          return res
            .status(400)
            .json({ message: "This username is already taken." });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

//DELETE
router.delete("/:id", verifyTokenAndAuthorization, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json("User has been deleted...");
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER
router.get("/find/:id", verifyTokenAndAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET ALL USER
router.get("/", verifyTokenAndAdmin, async (req, res) => {
  const query = req.query.new;
  try {
    const users = query
      ? await User.find().sort({ _id: -1 }).limit(5) // sort ki wajah sy latest kam first
      : await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

//GET USER STATS

// users registered kab?. Limiting it and last year ke lerhy

router.get("/stats", verifyTokenAndAdmin, async (req, res) => {
  const date = new Date();
  const lastYear = new Date(date.setFullYear(date.getFullYear() - 1)); // last year today

  //aggregate mein ke last year sy greater hu tw dety rhy baqi month lelo 2021-09 it will take 09.
  try {
    const data = await User.aggregate([
      { $match: { createdAt: { $gte: lastYear } } },
      {
        $project: {
          month: { $month: "$createdAt" },
        },
      },
      {
        $group: {
          _id: "$month", // unique id py group
          total: { $sum: 1 },
        },
      },
    ]);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

// for now I created 2 users in sept. So output ye aya
// [
//   {
//       "_id": 9,
//       "total": 2
//   }
// ]

module.exports = router;
