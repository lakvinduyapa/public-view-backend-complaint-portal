const Counter = require("../models/Counter");

const generateCRN = async () => {
  const year = new Date().getFullYear();
  const counterId = `IAU-${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  const numberPart = String(counter.seq).padStart(6, "0");

  return `IAU-${year}-${numberPart}`;
};

module.exports = generateCRN;