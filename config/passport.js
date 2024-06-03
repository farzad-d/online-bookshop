import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import User from "../models/User.js";

export default (passport) => {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          // Match user
          const foundUser = await User.findOne({ email });
          if (!foundUser) {
            return done(null, false, {
              message: "That email is not registered",
            });
          }

          // Match password
          const isMatch = await bcrypt.compare(password, foundUser.password);

          if (isMatch) {
            return done(null, foundUser);
          } else {
            return done(null, false, { message: "Password incorrect" });
          }
        } catch (err) {
          console.error(err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
