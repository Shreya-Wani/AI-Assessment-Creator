'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { AnimatePresence, motion } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import { useLibraryStore } from '@/store/useLibraryStore';
import { apiFetch } from '@/lib/api';

const categories = ['Question Bank', 'Lesson Plan', 'Worksheets', 'Exam Papers', 'Reference'];

function LibraryContent() {
  const {
    files,
    folders,
    isLoading,
    error,
    fetchFiles,
    fetchFolders,
    createFolder,
    uploadToFolder,
    deleteFile,
    clearError,
  } = useLibraryStore();

  const [folderName, setFolderName] = useState('');
  const [folderCategory, setFolderCategory] = useState(categories[0]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
    fetchFolders();
  }, [fetchFiles, fetchFolders]);

  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0]._id);
    }
  }, [selectedFolderId, folders]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q) ||
      f.folder.toLowerCase().includes(q)
    );
  }, [files, query]);

  const createFolderAction = async () => {
    if (!folderName.trim()) return;
    try {
      setIsWorking(true);
      await createFolder({ name: folderName.trim(), category: folderCategory });
      setFolderName('');
    } finally {
      setIsWorking(false);
    }
  };

  const uploadAction = async () => {
    if (!selectedFolderId || !selectedFile) return;
    try {
      setIsWorking(true);
      await uploadToFolder({ folderId: selectedFolderId, file: selectedFile });
      setSelectedFile(null);
    } finally {
      setIsWorking(false);
    }
  };

  const isPdfFile = (mimeOrType: string) => mimeOrType.toLowerCase().includes('pdf');

  const downloadOriginalFile = async (file: { _id: string; name: string }) => {
    try {
      setIsWorking(true);
      const res = await apiFetch(`/library/${file._id}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download file');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to download file';
      alert(message);
    } finally {
      setIsWorking(false);
    }
  };

  const previewPdfFile = async (file: { _id: string; name: string }) => {
    try {
      setIsWorking(true);
      const res = await apiFetch(`/library/${file._id}/preview`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to preview PDF');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewTitle(file.name);
      setPreviewUrl(objectUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to preview PDF';
      alert(message);
    } finally {
      setIsWorking(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setPreviewTitle('');
  };

  const deleteFileAction = async (file: { _id: string; name: string }) => {
    const confirmed = window.confirm(`Delete "${file.name}" from your library?`);
    if (!confirmed) return;

    try {
      setDeletingFileId(file._id);
      await deleteFile(file._id);

      if (previewTitle === file.name) {
        closePreview();
      }
    } finally {
      setDeletingFileId(null);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar title="My Library" />
        <div className="page-container" style={{ padding: 'clamp(14px, 3vw, 30px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Library Workspace</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Create category folders and upload files directly into them.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="profile-card" style={{ padding: '10px 14px' }}><strong>{folders.length}</strong> folders</div>
              <div className="profile-card" style={{ padding: '10px 14px' }}><strong>{files.length}</strong> files</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="profile-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Create Folder</h3>
              <label className="form-label">Category</label>
              <select className="form-select" value={folderCategory} onChange={(e) => setFolderCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label className="form-label" style={{ marginTop: 10 }}>Folder Name</label>
              <input className="form-input" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Chapter 7 Revision" />

              <button className="btn-nav-next" onClick={createFolderAction} disabled={isWorking || !folderName.trim()} style={{ marginTop: 12, width: '100%' }}>
                {isWorking ? 'Working...' : 'Create Folder'}
              </button>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Folders</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {folders.map((f) => (
                    <div key={f._id} style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-light)', background: selectedFolderId === f._id ? 'var(--bg-main)' : 'transparent' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="profile-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Upload Into Folder</h3>
              <label className="form-label">Select Folder</label>
              <select className="form-select" value={selectedFolderId} onChange={(e) => setSelectedFolderId(e.target.value)}>
                <option value="">Choose folder</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>{f.category} / {f.name}</option>
                ))}
              </select>

              <label className="form-label" style={{ marginTop: 10 }}>File</label>
              <input className="form-input" type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />

              <button className="btn-nav-next" style={{ marginTop: 12, width: '100%' }} onClick={uploadAction} disabled={isWorking || !selectedFolderId || !selectedFile}>
                {isWorking ? 'Uploading...' : 'Upload File'}
              </button>

              <div style={{ marginTop: 16 }}>
                <input className="form-input" placeholder="Search files" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="profile-card" style={{ padding: 12 }}>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 22, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading files...
                </motion.div>
              ) : filteredFiles.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 22, textAlign: 'center' }}>
                  <div style={{ fontSize: 34, marginBottom: 6 }}>📂</div>
                  <p style={{ color: 'var(--text-secondary)' }}>No files found.</p>
                </motion.div>
              ) : (
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 8 }}>
                  {filteredFiles.map((f) => (
                    <div key={f._id} style={{ padding: '10px 12px', border: '1px solid var(--border-light)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.folder}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.type}</span>
                        <button className="btn-nav-prev" style={{ padding: '6px 10px' }} onClick={() => downloadOriginalFile({ _id: f._id, name: f.name })}>
                          Download
                        </button>
                        {isPdfFile(f.mimeType || f.type) ? (
                          <button className="btn-nav-next" style={{ padding: '6px 10px' }} onClick={() => previewPdfFile({ _id: f._id, name: f.name })}>
                            Preview PDF
                          </button>
                        ) : null}
                        <button
                          className="btn-nav-prev"
                          style={{ padding: '6px 10px', borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => deleteFileAction({ _id: f._id, name: f.name })}
                          disabled={deletingFileId === f._id}
                        >
                          {deletingFileId === f._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {previewUrl ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(2, 6, 23, 0.58)',
                  zIndex: 1200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                }}
              >
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  className="profile-card"
                  style={{ width: '100%', maxWidth: 980, height: 'min(86vh, 760px)', padding: 14, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 10 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{previewTitle}</div>
                    <button className="btn-nav-prev" onClick={closePreview}>Close</button>
                  </div>
                  <iframe src={previewUrl} title={previewTitle || 'PDF Preview'} style={{ width: '100%', height: '100%', border: '1px solid var(--border-light)', borderRadius: 10, background: 'var(--bg-main)' }} />
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error && (
            <div style={{ marginTop: 12, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              {error}
              <button onClick={clearError} style={{ marginLeft: 8, border: 'none', background: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer' }}>
                dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AuthGuard>
      <LibraryContent />
    </AuthGuard>
  );
}
