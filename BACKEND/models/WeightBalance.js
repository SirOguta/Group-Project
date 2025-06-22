import mongoose from "mongoose";

const weightBalanceSchema = new mongoose.Schema({
  date: Date,
  pilot: String,
  route: String,
  reg: String,
  aircraftType: String,
  entries: [
    {
      description: String,
      weight: Number,
      arm: Number,
      moment: Number
    }
  ],
  totalTakeoffWeight: Number,
  takeoffCOG: Number,
  takeoffMoment: Number,
  fuelBurnOff: Number,
  landingWeight: Number,
  landingCOG: Number,
  landingMoment: Number,
  preparedBy: String,
  licenseNo: String
});

const WeightBalance = mongoose.model("WeightBalance", weightBalanceSchema);

export default WeightBalance;

