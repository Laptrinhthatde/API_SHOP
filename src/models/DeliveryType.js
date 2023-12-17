const mongoose = require("mongoose");

const deliverTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  {
    timestamps: true,
  }
);
const DeliveryType = mongoose.model("DeliveryType", deliverTypeSchema);

module.exports = DeliveryType;
