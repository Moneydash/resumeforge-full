import { Controller } from "@/types/types.controller-type";
import { generateId } from "../utils/helper";
import { resumeModel } from "../models/Resume";
import { ResumeData } from "@/types/interface.resume";
import { escape, trim } from 'validator';

const save_userData: Controller = async (req, res) => {
  const { resumeData, userId, template, id } = req.body;

  let resume = null;
  // check if resume id is not null or existing
  if (id) {
    resume = await resumeModel.findByIdAndUserId(id, userId);
  }

  if (resume) {
    await resumeModel.update(id, userId, template, { resume_data: JSON.stringify(resumeData) });
    return res.json({ 'message': 'Resume Data has been updated!' });
  } else {
    return res.json({ 'message': 'Resume not found!' });
  }
};

const fetchResumeData: Controller = async (req, res) => {
  const { id, userId } = req.params;

  const resume = await resumeModel.findByIdAndUserId(id, userId);

  if (!resume) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  const { user_id, resume_data } = resume;
  return res.json({ user_id, resume_data });
};

const fetchAllResumes: Controller = async (req, res) => {
  const { userId } = req.params;
  const resumes = await resumeModel.findByUserId(userId);

  return res.json({ resumes });
};

const deleteResume: Controller = async (req, res) => {
  const { id, userId } = req.params;

  const resume = await resumeModel.findByIdAndUserId(id, userId);

  if (!resume) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  try {
    await resumeModel.delete(id, userId);
    return res.json({ 'message': 'Resume has been deleted!' });
  } catch (error) {
    console.error("Failed soft deleting: ", error);
    throw error;
  }
};

const createInitResume: Controller = async (req, res) => {
  const { name, slug } = req.body;
  const { userId } = req.params;

  const resume_name = escape(trim(name));
  const resume_slug = escape(trim(slug));

  const newResumeData: ResumeData = {
    id: generateId(),
    user_id: userId,
    resume_name: resume_name,
    resume_slug_name: resume_slug
  };

  await resumeModel.create(newResumeData);
  return res.json({ 'message': 'Resume has been saved!' });
};

const renameResume: Controller = async (req, res) => {
  const { id, userId } = req.params;
  const { name, slug } = req.body;

  const resume = await resumeModel.findByIdAndUserId(id, userId);
  const resume_name = escape(trim(name));
  const resume_slug_name = escape(trim(slug));

  if (!resume) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  await resumeModel.rename(id, userId, resume_name, resume_slug_name);
  return res.json({ 'message': 'Resume has been renamed!' });
};

const cloneResume: Controller = async (req, res) => {
  const { id, userId } = req.params;

  const resume = await resumeModel.findByIdAndUserId(id, userId);

  if (!resume) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  const generatedId = generateId();
  const resume_name = resume.resume_name ? `${resume.resume_name} (Copy)` : `Untitled (Copy)`;
  const resume_slug_name = resume.resume_slug_name ? `${resume.resume_slug_name}-copy` : `untitled-copy`;
  const newResumeData: ResumeData = {
    id: generatedId,
    user_id: userId,
    resume_name: resume_name,
    resume_slug_name: resume_slug_name,
    resume_data: resume.resume_data,
    template: resume.template
  };

  await resumeModel.create(newResumeData);
  return res.json({ 'message': 'Resume has been cloned!' });
};

const saveExportedResume: Controller = async (req, res) => {
  const { id, userId } = req.params;
  const { template } = req.body;

  const generatedId = generateId();
  const resume = await resumeModel.findByIdAndUserId(id, userId);

  if (!resume) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  await resumeModel.saveExportedResume(generatedId, userId, resume.id, template);
  return res.json({ 'message': 'Resume successfully exported!' });
};

export {
  save_userData,
  fetchResumeData,
  fetchAllResumes,
  deleteResume,
  createInitResume,
  renameResume,
  cloneResume,
  saveExportedResume
};