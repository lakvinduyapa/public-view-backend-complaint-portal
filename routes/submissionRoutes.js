const express = require("express");
const router = express.Router();

const {
  verifyRecaptcha,
  createSubmission,
  getAllSubmissions,
  getSubmissionByCRN,
  trackSubmissionByCRN,
} = require("../controllers/submissionController");

const upload = require("../middleware/upload");

// Track complaint route
router.get("/track/:crn", trackSubmissionByCRN);

// Submit complaint with file upload + recaptcha
router.post("/", upload.array("evidence_files", 10), verifyRecaptcha, createSubmission);

// Standard routes
router.get("/", getAllSubmissions);
router.get("/:crn", getSubmissionByCRN);

module.exports = router;