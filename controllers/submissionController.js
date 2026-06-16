const pool = require("../config/db");
const axios = require("axios");

// Generate CRN number
const generateCRN = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CRN-${year}-${random}`;
};

// Generate unique CRN
const generateUniqueCRN = async () => {
  for (let i = 0; i < 10; i++) {
    const crn = generateCRN();

    const result = await pool.query(
      "SELECT id FROM submissions WHERE crn = $1",
      [crn]
    );

    if (result.rows.length === 0) {
      return crn;
    }
  }

  throw new Error("Could not generate unique CRN");
};

const cleanDate = (value) => {
  if (!value || value === "") return null;
  return value;
};

const cleanBool = (value) => {
  return value === true || value === "true" || value === "1";
};

const cleanEvidenceTypes = (value) => {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.join(", ");
      }
    } catch (err) {
      return value;
    }
  }

  return null;
};

const mapSubmission = (row) => {
  return {
    id: row.id,
    crn: row.crn,

    complaintCategory: row.complaint_category,
    submissionType: row.submission_type,

    reporterCategory: row.reporter_category,
    fullName: row.full_name,
    staffId: row.staff_id,
    department: row.department,
    designation: row.designation,
    email: row.email,
    phone: row.phone,
    preferredContact: row.preferred_contact,

    location: row.location,
    frequency: row.frequency,
    awareness: row.awareness,
    previouslyReported: row.previously_reported,
    previousOutcome: row.previous_outcome,

    subjectNames: row.subject_names,
    subjectDesignation: row.subject_designation,
    subjectOrganisation: row.subject_organisation,
    subjectRelationship: row.subject_relationship,

    investigatorName: row.investigator_name,
    investigationNotes: row.investigation_notes,
    additionalInfo: row.additional_info,
    complaintDescription: row.complaint_description,
    evidenceType: row.evidence_type,
    hasEvidence: row.has_evidence,
    evidenceFiles: row.evidence_files,
    witnesses: row.witnesses,

    incidentDateMode: row.incident_date_mode,
    incidentDate: row.incident_date,
    incidentFromDate: row.incident_from_date,
    incidentToDate: row.incident_to_date,

    involvesSeniorManager: row.involves_senior_manager,
    seniorManagerDetails: row.senior_manager_details,

    declarationConfirm: row.declaration_confirm,
    declarationAudit: row.declaration_audit,

    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// reCAPTCHA check AFTER multer parses form-data
const verifyRecaptcha = async (req, res, next) => {
  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({
      success: false,
      message: "Complete human verification",
    });
  }

  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${recaptchaToken}`;

    const response = await axios.post(url);

    if (!response.data.success) {
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed",
      });
    }

    delete req.body.recaptchaToken;
    next();
  } catch (err) {
    console.error("reCAPTCHA verification error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Verification error",
    });
  }
};

const createSubmission = async (req, res) => {
  try {
    const sanitizedBody = {};

    Object.keys(req.body || {}).forEach((key) => {
      const cleanKey = key.trim();

      sanitizedBody[cleanKey] =
        typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
    });

    if (!sanitizedBody.complaintCategory || !sanitizedBody.submissionType) {
      return res.status(400).json({
        success: false,
        message: "Complaint category and submission type are required.",
      });
    }

    const evidenceFiles =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename).join(",")
        : null;

    const incidentMode = sanitizedBody.incidentDateMode;

    const incidentDate =
      incidentMode === "single" ? cleanDate(sanitizedBody.incidentDate) : null;

    const incidentFromDate =
      incidentMode === "range" ? cleanDate(sanitizedBody.incidentFromDate) : null;

    const incidentToDate =
      incidentMode === "range" ? cleanDate(sanitizedBody.incidentToDate) : null;

    const crn = await generateUniqueCRN();

    const query = `
      INSERT INTO submissions (
        crn,
        complaint_category,
        submission_type,

        reporter_category,
        full_name,
        staff_id,
        department,
        designation,
        email,
        phone,
        preferred_contact,

        location,
        frequency,
        awareness,
        previously_reported,
        previous_outcome,

        subject_names,
        subject_designation,
        subject_organisation,
        subject_relationship,

        investigator_name,
        investigation_notes,
        additional_info,
        complaint_description,
        evidence_type,
        has_evidence,
        evidence_files,
        witnesses,

        incident_date_mode,
        incident_date,
        incident_from_date,
        incident_to_date,

        involves_senior_manager,
        senior_manager_details,

        declaration_confirm,
        declaration_audit,

        status
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32,
        $33, $34,
        $35, $36,
        $37
      )
      RETURNING *
    `;

    const values = [
      crn,
      sanitizedBody.complaintCategory,
      sanitizedBody.submissionType,

      sanitizedBody.reporterCategory || null,
      sanitizedBody.fullName || null,
      sanitizedBody.staffId || null,
      sanitizedBody.department || null,
      sanitizedBody.designation || null,
      sanitizedBody.email || null,
      sanitizedBody.phone || null,
      sanitizedBody.preferredContact || null,

      sanitizedBody.location || null,
      sanitizedBody.frequency || null,
      sanitizedBody.awareness || null,
      sanitizedBody.previouslyReported || null,
      sanitizedBody.previousOutcome || null,

      sanitizedBody.subjectNames || null,
      sanitizedBody.subjectDesignation || null,
      sanitizedBody.subjectOrganisation || null,
      sanitizedBody.subjectRelationship || null,

      sanitizedBody.investigatorName || "N/A",
      sanitizedBody.investigationNotes || "No notes available",
      sanitizedBody.additionalInfo || null,
      sanitizedBody.description || null,
      cleanEvidenceTypes(sanitizedBody.evidenceTypes),
      sanitizedBody.hasEvidence || null,
      evidenceFiles,
      sanitizedBody.witnessNames || null,

      incidentMode || null,
      incidentDate,
      incidentFromDate,
      incidentToDate,

      sanitizedBody.seniorManagementInvolved || null,
      sanitizedBody.seniorDetails || null,

      cleanBool(sanitizedBody.declarationConfirm),
      cleanBool(sanitizedBody.declarationAudit),

      "Submitted",
    ];

    const result = await pool.query(query, values);
    const submission = mapSubmission(result.rows[0]);

    res.status(201).json({
      success: true,
      crn: submission.crn,
      data: submission,
    });
  } catch (err) {
    console.error("Create submission error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAllSubmissions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM submissions
      ORDER BY created_at DESC
    `);

    const submissions = result.rows.map(mapSubmission);

    res.json({
      success: true,
      data: submissions,
    });
  } catch (err) {
    console.error("Get submissions error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getSubmissionByCRN = async (req, res) => {
  try {
    const crn = req.params.crn.trim().toUpperCase();

    const result = await pool.query(
      "SELECT * FROM submissions WHERE crn = $1",
      [crn]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    const submission = mapSubmission(result.rows[0]);

    res.json({
      success: true,
      data: submission,
    });
  } catch (err) {
    console.error("Get submission by CRN error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const trackSubmissionByCRN = async (req, res) => {
  try {
    const crn = req.params.crn.trim().toUpperCase();

    const result = await pool.query(
      "SELECT * FROM submissions WHERE crn = $1",
      [crn]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No complaint found with the provided CRN.",
      });
    }

    const complaint = mapSubmission(result.rows[0]);

    res.status(200).json({
      success: true,
      complaint: {
        crn: complaint.crn,
        complaintCategory: complaint.complaintCategory || "N/A",
        submissionType: complaint.submissionType || "N/A",
        status: complaint.status || "Pending",
        complaintDescription: complaint.complaintDescription || "N/A",
        evidenceType: complaint.evidenceType || "No evidence provided",
        evidenceFiles: complaint.evidenceFiles || "N/A",
        witnesses: complaint.witnesses || "N/A",
        additionalInfo: complaint.additionalInfo || "N/A",
      },
    });
  } catch (error) {
    console.error("Track complaint error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while tracking complaint.",
    });
  }
};

module.exports = {
  verifyRecaptcha,
  createSubmission,
  getAllSubmissions,
  getSubmissionByCRN,
  trackSubmissionByCRN,
};