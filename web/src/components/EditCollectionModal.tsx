"use client";

import { useState, useEffect } from "react";
import { useUpdateCollectionMetadata } from "@/hooks/useCollectionMetadata";

interface EditCollectionModalProps {
  collectionAddress: string;
  currentLogoUrl?: string;
  currentDescription?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditCollectionModal({
  collectionAddress,
  currentLogoUrl,
  currentDescription,
  onClose,
  onSaved,
}: EditCollectionModalProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl ?? "");
  const [description, setDescription] = useState(currentDescription ?? "");
  const { updateMetadata, isUpdating, error, clearError } =
    useUpdateCollectionMetadata(collectionAddress);

  useEffect(() => {
    clearError();
  }, [logoUrl, description, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateMetadata({
      logoUrl: logoUrl || undefined,
      description: description || undefined,
    });
    if (success) {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Edit Community Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="logoUrl"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Logo URL
            </label>
            <input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use the default logo.
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this community..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-sm text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold text-sm transition-colors"
            >
              {isUpdating ? "Signing & Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
