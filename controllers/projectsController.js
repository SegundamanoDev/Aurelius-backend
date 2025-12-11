const Project = require("../models/Project");
const asyncHandler = require("../middleware/asyncHandler");

// Handler to get all projects
exports.getAllProjects = asyncHandler(async (req, res, next) => {
  const projects = await Project.find().sort("order -createdAt");

  // 2. Send response
  res.status(200).json({
    status: "success",
    count: projects.length,
    data: projects,
  });
});

// Handler to create a new project (for easy data entry)
exports.createProject = asyncHandler(async (req, res, next) => {
  console.log(req.body);

  const newProject = await Project.create(req.body);

  res.status(201).json({
    status: "success",
    data: newProject,
  });
});
