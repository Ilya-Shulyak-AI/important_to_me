import React, { useState, useRef, useEffect, useId } from 'react';
import { Upload, Sliders, Move, X, Eye, FileImage } from 'lucide-react';

interface PhotoCropperProps {
  onPhotoSelected: (blob: Blob) => void;
  onCancel?: () => void;
  initialPhotoUrl?: string;
}

export default function PhotoCropper({ onPhotoSelected, onCancel, initialPhotoUrl }: PhotoCropperProps) {
  const [imgSource, setImgSource] = useState<string | null>(initialPhotoUrl || null);
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const dropZoneId = useId();
  const fileInputId = useId();
  const zoomSliderId = useId();

  // Load selected file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);

    // Validate if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Unsupported file format. Please upload an image (JPEG, PNG, SVG).');
      return;
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Please select an image under 5MB.');
      return;
    }

    const kb = (file.size / 1024).toFixed(1);
    setFileSize(`${kb} KB (Original)`);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImgSource(event.target.result as string);
        setScale(1);
        setOffsetX(0);
        setOffsetY(0);
      }
    };
    reader.onerror = () => {
      setError('Failed to read visual image file from disk.');
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Drag-to-pan in crop area
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imgSource) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !imgSource) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Set constraint boundaries (keep somewhat centered)
    setOffsetX(newX);
    setOffsetY(newY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Compile final crop using Canvas
  const handleSaveCrop = () => {
    if (!canvasRef.current || !imgSource) return;
    const ctx = canvasRef.current.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      if (!ctx || !canvasRef.current) return;
      
      // Clear the canvas
      ctx.clearRect(0, 0, 300, 300);
      
      // We want to draw a circular/square crop onto our 300x300 target
      // Apply offset, zoom, and draw
      const size = 300;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      // Draw circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Math for scaling & panning
      const iw = img.width;
      const ih = img.height;
      const minDim = Math.min(iw, ih);
      
      // Center-crop parameters by default
      const sx = (iw - minDim) / 2;
      const sy = (ih - minDim) / 2;

      // Draw relative to client dragging
      // Target square centered
      const drawWidth = size * scale;
      const drawHeight = size * scale;
      const dx = (size - drawWidth) / 2 + offsetX;
      const dy = (size - drawHeight) / 2 + offsetY;

      ctx.drawImage(img, sx, sy, minDim, minDim, dx, dy, drawWidth, drawHeight);
      ctx.restore();

      // Compress to lightweight JPEG Blob
      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            onPhotoSelected(blob);
          }
        },
        'image/jpeg',
        0.85 // 85% acceptable compression quality
      );
    };

    img.src = imgSource;
  };

  return (
    <div className="bg-white border border-[#E5E0D8] rounded-[24px] p-6 text-[#2D2D2D] max-w-md w-full mx-auto shadow-xl space-y-5" id="photo-cropper">
      <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
        <h3 className="text-lg font-serif font-bold italic text-[#2D2D2D] flex items-center gap-2">
          <FileImage className="w-5 h-5 text-[#8C6A5D]" />
          Edit Profile Photo
        </h3>
        {onCancel && (
          <button onClick={onCancel} className="p-1 hover:bg-[#F5F2ED] rounded-full text-[#7A7A7A] hover:text-[#5A5A40] transition cursor-pointer" aria-label="Cancel crop border-0">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl border border-rose-200 font-medium">
          {error}
        </div>
      )}

      {!imgSource ? (
        <div 
          id={dropZoneId}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-[#E5E0D8] hover:border-[#5A5A40] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition text-center bg-[#F5F2ED]/40"
          onClick={() => document.getElementById(fileInputId)?.click()}
        >
          <div className="p-4 bg-white border border-[#E5E0D8] rounded-full text-[#8C6A5D] shadow-sm">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#2D2D2D]">Drag and drop profile photo here</p>
            <p className="text-xs text-[#7A7A7A]">or click to browse from device (JPEG, PNG)</p>
          </div>
          <input 
            id={fileInputId}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Cropper interactive area */}
          <div className="relative flex flex-col items-center">
            <p className="text-xs text-[#7A7A7A] mb-2 flex items-center gap-1">
              <Move className="w-3.5 h-3.5 text-[#8C6A5D]" /> Tap and drag picture below to reposition
            </p>
            
            <div 
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-64 h-64 overflow-hidden rounded-full border-4 border-[#5A5A40]/15 bg-stone-150 cursor-grab relative select-none touch-none shadow-inner"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {/* Image Preview applying scale & offsets */}
              <img 
                ref={imageRef}
                src={imgSource} 
                alt="Repositioning target" 
                draggable={false}
                className="absolute origin-center w-full h-full object-cover select-none pointer-events-none"
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                }}
              />
            </div>
            
            {fileSize && (
              <span className="mt-2 text-[11px] font-mono text-[#7A7A7A] bg-[#F5F2ED] border border-[#E5E0D8] px-2 py-0.5 rounded">
                Size: {fileSize}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-3 bg-[#F5F2ED]/40 p-4 rounded-xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between">
              <label htmlFor={zoomSliderId} className="text-xs font-bold uppercase tracking-wider text-[#7A7A7A] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#8C6A5D]" />
                Scale / Zoom ({(scale * 100).toFixed(0)}%)
              </label>
              <button 
                onClick={() => { setScale(1); setOffsetX(0); setOffsetY(0); }}
                className="text-[10px] text-[#5A5A40] hover:text-opacity-80 font-bold border-0 bg-transparent cursor-pointer"
              >
                Reset
              </button>
            </div>
            <input 
              id={zoomSliderId}
              type="range" 
              min="0.5" 
              max="3" 
              step="0.05" 
              value={scale} 
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white border border-[#E5E0D8] rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
            />
          </div>

          {/* Render target (invisible utility canvas) */}
          <canvas ref={canvasRef} width="300" height="300" className="hidden" />

          {/* Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => setImgSource(null)}
              className="flex-1 py-2.5 px-4 bg-[#F5F2ED] hover:bg-[#E5E0D8]/40 border border-[#E5E0D8] text-[#5A5A40] text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Change Image
            </button>
            <button 
              onClick={handleSaveCrop}
              className="flex-1 py-2.5 px-4 bg-[#5A5A40] hover:bg-opacity-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer border-0"
            >
              Apply Crop & Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
