import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/authMiddleware';
import { requireUser } from '../utils/requireUser';
import * as libraryService from '../services/library.service';

const resolveStorageKey = (file: { storageKey?: string; fileUrl?: string }): string | null => {
  if (file.storageKey?.trim()) return path.basename(file.storageKey.trim());
  if (!file.fileUrl?.trim()) return null;

  try {
    const parsed = new URL(file.fileUrl);
    const key = path.basename(parsed.pathname);
    return key || null;
  } catch {
    const key = path.basename(file.fileUrl);
    return key || null;
  }
};

// GET /library
export const getFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const files = await libraryService.getFilesService(user._id.toString());
    res.json(files);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch library files',
    });
  }
};

// POST /library
export const addFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const { name, type, folder } = req.body;
    const file = await libraryService.addFileService(user._id.toString(), {
      name, type, folder,
    });
    res.status(201).json(file);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to add library file',
    });
  }
};

// GET /library/folders
export const getFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const folders = await libraryService.getFoldersService(user._id.toString());
    res.json(folders);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch folders',
    });
  }
};

// POST /library/folders
export const createFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const { name, category } = req.body;
    const folder = await libraryService.createFolderService(user._id.toString(), { name, category });
    res.status(201).json(folder);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create folder',
    });
  }
};

// POST /library/upload
export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const file = req.file;
    const { folderId } = req.body;

    if (!file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    if (!folderId) {
      res.status(400).json({ error: 'folderId is required' });
      return;
    }

    const folder = await libraryService.getFolderByIdService(folderId, user._id.toString());
    const host = req.get('host');
    const proto = req.protocol;
    const fileUrl = `${proto}://${host}/uploads/${file.filename}`;

    const created = await libraryService.addFileService(user._id.toString(), {
      name: file.originalname,
      type: file.mimetype || 'application/octet-stream',
      folder: `${folder.category}::${folder.name}`,
      folderId,
      fileUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: file.filename,
    });

    res.status(201).json(created);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to upload file',
    });
  }
};

// DELETE /library/:id
export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const deleted = await libraryService.deleteFileService(req.params.id as string, user._id.toString());

    const storageKey = resolveStorageKey(deleted);
    if (storageKey) {
      const filePath = path.resolve('uploads', storageKey);
      // Deleting a missing file should not fail the API; the DB record is already removed.
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }

    res.json({ message: 'File deleted' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete file',
    });
  }
};

// PUT /library/:id
export const updateFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const { name, type, folder } = req.body;
    const file = await libraryService.updateFileService(req.params.id as string, user._id.toString(), {
      name,
      type,
      folder,
    });
    res.json(file);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update file',
    });
  }
};

// GET /library/:id/download
export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const file = await libraryService.getFileByIdService(req.params.id as string, user._id.toString());
    const storageKey = resolveStorageKey(file);

    if (!storageKey) {
      res.status(404).json({ error: 'Stored file not found' });
      return;
    }

    const filePath = path.resolve('uploads', storageKey);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Stored file not found' });
      return;
    }

    const encodedName = encodeURIComponent(file.name);
    const asciiName = file.name.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', file.mimeType || file.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to download file',
    });
  }
};

// GET /library/:id/preview
export const previewFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = requireUser(req);
    const file = await libraryService.getFileByIdService(req.params.id as string, user._id.toString());
    const mime = (file.mimeType || file.type || '').toLowerCase();

    if (!mime.includes('pdf')) {
      res.status(400).json({ error: 'Preview is currently available only for PDF files' });
      return;
    }

    const storageKey = resolveStorageKey(file);
    if (!storageKey) {
      res.status(404).json({ error: 'Stored file not found' });
      return;
    }

    const filePath = path.resolve('uploads', storageKey);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Stored file not found' });
      return;
    }

    const encodedName = encodeURIComponent(file.name);
    const asciiName = file.name.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to preview file',
    });
  }
};
