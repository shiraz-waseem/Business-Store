const router = require("express").Router();
const User = require("../models/User");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Check if any required field is missing
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please fill all the fields properly" });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res
          .status(400)
          .json({ message: "This email is already registered." });
      }
      if (existingUser.username === username) {
        return res
          .status(400)
          .json({ message: "This username is already taken." });
      }
    }
    // If no user exists, create a new user
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: CryptoJS.AES.encrypt(
        req.body.password,
        process.env.PASS_SEC
      ).toString(),
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/login", async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res
      .status(400)
      .json({ message: "Please fill all the fields properly" });
  }
  try {
    const user = await User.findOne({
      username: req.body.username,
    });

    !user && res.status(401).json("You've entered wrong username");

    const hashedPassword = CryptoJS.AES.decrypt(
      user.password,
      process.env.PASS_SEC
    );

    const originalPassword = hashedPassword.toString(CryptoJS.enc.Utf8);

    const inputPassword = req.body.password;

    originalPassword != inputPassword &&
      res.status(401).json("Invalid Credentials");

    // will help in verifying while making order ke client ko belong krta ha na
    const accessToken = jwt.sign(
      {
        id: user._id,
        isAdmin: user.isAdmin, // will make crud operations
      },
      process.env.JWT_SEC,
      { expiresIn: "3d" }
    );

    const { password, ...others } = user._doc; // sending other from user._doc as mongodb stores docs in _doc
    res.status(200).json({ ...others, accessToken });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
