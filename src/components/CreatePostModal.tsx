"use client";

import React, { useState } from "react";
import { X, Image as ImageIcon, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (imageUrl: string, caption: string) => void;
}

const PRESET_MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80",
];

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState(PRESET_MOCK_IMAGES[0]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) return;
    onPostCreated(selectedImage, caption.trim());
    setCaption("");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        {/* Backdrop click closer */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <span className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
              Create New Secure Post
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            {/* Image Preview & Selection */}
            <div className="p-5 border-b border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Select Content Cover
              </span>
              <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-4 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Selected cover preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Presets Row */}
              <div className="grid grid-cols-6 gap-2">
                {PRESET_MOCK_IMAGES.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedImage === imgUrl ? "border-emerald-500 scale-95" : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Caption Input */}
            <div className="p-5 flex-1 flex flex-col min-h-[120px]">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Caption
              </span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's on your mind? Add hashtags or emojis..."
                className="w-full flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all leading-relaxed"
                rows={3}
                required
              />
            </div>

            {/* Actions Bar */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-100/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!caption.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/10 active:scale-[0.98]"
              >
                Publish Post
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
