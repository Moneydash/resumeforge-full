import { Controller } from "@/types/types.controller-type";
import { generateId } from "../utils/helper";
import { coverletterModel } from "../models/CoverLetter";
import { CoverLetterData } from "@/types/interface.cover-letter";
import { escape, trim } from "validator";

const save_userData: Controller = async (req, res) => {
  const { clData, userId, template, id } = req.body;

  let cl = null;
  // check if resume id is not null or existing
  if (id) {
    cl = await coverletterModel.findByIdAndUserId(id, userId);
  }

  if (cl) {
    await coverletterModel.update(id, userId, template, { cover_letter_data: JSON.stringify(clData) });
    return res.json({ 'message': 'Cover Letter Data has been updated!' });
  } else {
    return res.json({ 'message': 'Cover Letter not found!' });
  }
};

const fetchAllCL: Controller = async (req, res) => {
  const { userId } = req.params;

  const cover_letters = await coverletterModel.findByUserId(userId);
  return res.json({ cover_letters });
};

const createInitCL: Controller = async (req, res) => {
  const { name, slug } = req.body;
  const { userId } = req.params;

  const cover_letter_name = escape(trim(name));
  const cover_letter_slug = escape(trim(slug));

  const newCoverLetterData: CoverLetterData = {
    id: generateId(),
    user_id: userId,
    cover_letter_name: cover_letter_name,
    cover_letter_slug_name: cover_letter_slug
  };

  await coverletterModel.create(newCoverLetterData);
  return res.json({ 'message': 'Cover Letter has been saved!' });
};

const cloneCL: Controller = async (req, res) => {
  const { id, userId } = req.params;

  const cover_letter = await coverletterModel.findByIdAndUserId(id, userId);
  if (!cover_letter) {
    return res.status(404).json({ message: 'Cover Letter not found' });
  }

  const generatedId = generateId();
  const cover_letter_name = cover_letter.cover_letter_name ? `${cover_letter.cover_letter_name} (Copy)` : `Untitled (Copy)`;
  const cover_letter_slug_name = cover_letter.cover_letter_slug_name ? `${cover_letter.cover_letter_slug_name}-copy` : `untitled-copy`;
  const newCoverLetterData: CoverLetterData = {
    id: generatedId,
    user_id: userId,
    cover_letter_name: cover_letter_name,
    cover_letter_slug_name: cover_letter_slug_name,
    cover_letter_data: cover_letter.cover_letter_data,
    template: cover_letter.template
  };

  await coverletterModel.create(newCoverLetterData);
  return res.json({ 'message': 'Cover Letter has been cloned!' });
};

const deleteCL: Controller = async (req, res) => {
  const { id, userId } = req.params;

  const cover_letter = await coverletterModel.findByIdAndUserId(id, userId);
  if (!cover_letter) {
    return res.status(404).json({ 'error': 'Cover Letter not found!' });
  }

  try {
    await coverletterModel.delete(id, userId);
    return res.json({ 'message': 'Cover Letter has been deleted!' });
  } catch (error) {
    console.error("Failed soft deleting: ", error);
    throw error;
  }
};

const renameCL: Controller = async (req, res) => {
  const { id, userId } = req.params;
  const { name, slug } = req.body;

  const cover_letter = await coverletterModel.findByIdAndUserId(id, userId);
  const cover_letter_name = escape(trim(name));
  const cover_letter_slug_name = escape(trim(slug));

  if (!cover_letter) {
    return res.status(404).json({ message: 'Cover Letter not found' });
  }

  await coverletterModel.rename(id, userId, cover_letter_name, cover_letter_slug_name);
  return res.json({ 'message': 'Cover Letter has been renamed!' });
};

const fetchCLData: Controller = async (req, res) => {
  const { id, userId } = req.params;
  const cover_letter = await coverletterModel.findByIdAndUserId(id, userId);
  if (!cover_letter) {
    return res.status(404).json({ message: 'Cover Letter not found' });
  }

  const { user_id, cover_letter_data } = cover_letter;
  return res.json({ user_id, cover_letter_data });
};

const saveExportedCL: Controller = async (req, res) => {
  const { id, userId } = req.params;
  const { template } = req.body;

  const generatedId = generateId();
  const cover_letter = await coverletterModel.findByIdAndUserId(id, userId);

  if (!cover_letter) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  await coverletterModel.saveExportedCoverLetter(generatedId, userId, cover_letter.id, template);
  return res.json({ 'message': 'Resume successfully exported!' });
}

export {
  save_userData,
  fetchAllCL,
  createInitCL,
  cloneCL,
  deleteCL,
  renameCL,
  fetchCLData,
  saveExportedCL
}