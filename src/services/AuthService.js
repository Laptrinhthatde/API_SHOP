const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const { generateToken } = require("./JwtService");
const { CONFIG_MESSAGE_ERRORS } = require("../configs");
const EmailService = require("../services/EmailService");
const dotenv = require("dotenv");
const { addToBlacklist, isAdminPermission } = require("../utils");
dotenv.config();

const loginUser = (userLogin) => {
  return new Promise(async (resolve, reject) => {
    const { email, password } = userLogin;
    try {
      const checkUser = await User.findOne({
        email: email,
      }).populate({
        path: "role",
        select: "name permissions",
      });
      if (checkUser === null) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "The username or password is wrong",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
      }
      const comparePassword = bcrypt.compareSync(password, checkUser.password);

      if (!comparePassword) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "The username or password is wrong",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
      }

      const access_token = await generateToken(
        {
          id: checkUser.id,
          permissions: checkUser?.role?.permissions,
        },
        process.env.ACCESS_TOKEN_SECRET,
        process.env.ACCESS_TOKEN_EXPIRE
      );

      const refresh_token = await generateToken(
        {
          id: checkUser.id,
          permissions: checkUser?.role?.permissions,
        },
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRE
      );

      resolve({
        status: CONFIG_MESSAGE_ERRORS.ACTION_SUCCESS.status,
        message: "Login Success",
        typeError: "",
        statusMessage: "Success",
        data: checkUser,
        access_token,
        refresh_token,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const logoutUser = (res, accessToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      res.clearCookie("refresh_token");
      addToBlacklist(accessToken);
      resolve({
        status: CONFIG_MESSAGE_ERRORS.ACTION_SUCCESS.status,
        message: "logout Success",
        typeError: "",
        statusMessage: "Success",
        data: null,
      });
    } catch (e) {
      reject(e);
    }
  });
};

const updateAuthMe = (id, data, isPermission) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkUser = await User.findOne({
        _id: id,
      });

      if (checkUser === null) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "The user is not existed",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
      } else if (
        (data.status !== checkUser.status || data.email !== checkUser.email) &&
        !isPermission
      ) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "You can't change your email or status",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
      } else if (
        isAdminPermission(checkUser.permissions) &&
        (data.status !== checkUser.status || data.email !== checkUser.email)
      ) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.UNAUTHORIZED.status,
          message: "You can't change admin's email or status",
          typeError: CONFIG_MESSAGE_ERRORS.UNAUTHORIZED.type,
          data: null,
          statusMessage: "Error",
        });
      }

      const updatedUser = await User.findByIdAndUpdate(id, data, { new: true });
      resolve({
        status: CONFIG_MESSAGE_ERRORS.ACTION_SUCCESS.status,
        message: "Updated user success",
        typeError: "",
        data: updatedUser,
        statusMessage: "Success",
      });
    } catch (e) {
      reject(e);
    }
  });
};

const changePasswordMe = (userId, data, res, accessToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkUser = await User.findOne({
        _id: userId,
      });
      const { newPassword, currentPassword } = data;
      const comparePassword = bcrypt.compareSync(
        newPassword,
        checkUser.password
      );
      const compareCurrentPassword = bcrypt.compareSync(
        currentPassword,
        checkUser.password
      );

      if (checkUser === null) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "The user is not existed",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
      }
      if (!compareCurrentPassword) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.ALREADY_EXIST.status,
          message: "The  currentPassword is wrong",
          typeError: CONFIG_MESSAGE_ERRORS.ALREADY_EXIST.type,
          data: null,
          statusMessage: "Error",
        });
      }

      if (comparePassword) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.ALREADY_EXIST.status,
          message: "The new password isn't not duplicate current password",
          typeError: CONFIG_MESSAGE_ERRORS.ALREADY_EXIST.type,
          data: null,
          statusMessage: "Error",
        });
      }
      const hash = bcrypt.hashSync(newPassword, 10);

      checkUser.password = hash;
      await checkUser.save();
      res.clearCookie("refresh_token");
      addToBlacklist(accessToken);
      resolve({
        status: CONFIG_MESSAGE_ERRORS.ACTION_SUCCESS.status,
        message: "ChangePassword user success",
        typeError: "",
        data: null,
        statusMessage: "Success",
      });
    } catch (e) {
      reject(e);
    }
  });
};

const forgotPasswordMe = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const checkUser = await User.findOne({
        email: "admin@gmail.com",
      }).select("-password");

      if (checkUser === null) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "The email is not existed",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
      }

      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      checkUser.resetToken = resetToken;
      checkUser.resetTokenExpiration =
        Date.now() + process.env.TIME_EXPIRE_PASSWORD; // Hết hạn sau 1 giờ

      const resetLink = `${process.env.URL_RESET_PASSWORD}?secretKey=${resetToken}`;
      await checkUser.save();
      await EmailService.sendEmailForgotPassword(
        email,
        resetLink,
        process.env.TIME_EXPIRE_PASSWORD
      );
      resolve({
        status: CONFIG_MESSAGE_ERRORS.ACTION_SUCCESS.status,
        message: "Forgot password success",
        typeError: "",
        data: null,
        statusMessage: "Success",
      });
    } catch (e) {
      reject(e);
    }
  });
};

const resetPasswordMe = (secretKey, newPassword) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({
        resetToken: secretKey,
        resetTokenExpiration: { $gt: Date.now() },
      });

      const comparePassword = bcrypt.compareSync(newPassword, user.password);

      if (!user) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.INVALID.status,
          message: "Invalid or expired token",
          typeError: CONFIG_MESSAGE_ERRORS.INVALID.type,
          data: null,
          statusMessage: "Error",
        });
        return;
      }
      if (comparePassword) {
        resolve({
          status: CONFIG_MESSAGE_ERRORS.ALREADY_EXIST.status,
          message: "The new password isn't not duplicate current password",
          typeError: CONFIG_MESSAGE_ERRORS.ALREADY_EXIST.type,
          data: null,
          statusMessage: "Error",
        });
      }
      const hash = bcrypt.hashSync(newPassword, 10);

      user.password = hash;
      user.resetToken = null;
      user.resetTokenExpiration = null;
      await user.save();

      resolve({
        status: CONFIG_MESSAGE_ERRORS.ACTION_SUCCESS.status,
        message: "Password reset successfully",
        typeError: "",
        data: null,
        statusMessage: "Success",
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  loginUser,
  logoutUser,
  updateAuthMe,
  changePasswordMe,
  forgotPasswordMe,
  resetPasswordMe,
};