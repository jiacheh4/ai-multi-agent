"use client";

import React, { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Crop as CropIcon, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface CapturePopupProps {
  imageUrl: string;
  onClose: () => void;
  onCaptureAnother: () => Promise<string | null>;
}

function applyCrop(image: HTMLImageElement, crop: PixelCrop): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, canvas.width, canvas.height
  );
  return canvas.toDataURL("image/png");
}

const SEND_PROMPT = [
  "These are screenshots of a coding/algorithm problem (likely from LeetCode, HackerRank, or a technical interview).",
  "The images are in order — together they form the complete problem statement.",
  "Carefully read and understand EVERY detail across ALL images:",
  "- Problem title, description, constraints, and examples (inputs, outputs, explanations)",
  "- Any visual diagrams: graphs, trees, linked lists, stacks, queues, heaps, matrices, grids, tables, or illustrations",
  "- Edge cases, follow-up questions, and complexity requirements mentioned",
  "- Input/output format, data types, and value ranges (e.g. 1 <= n <= 10^5)",
  "",
  "If the images contain diagrams, interpret the exact structure — node values, edge connections, directions, null pointers, levels, row/col indices, etc.",
  "Do NOT guess or hallucinate any details that are not clearly shown in the images.",
  "",
  "Once you fully understand the complete problem, solve it following the structured format in the system message.",
].join("\n");

export function CapturePopup({ imageUrl, onClose, onCaptureAnother }: CapturePopupProps) {
  const [images, setImages] = useState<string[]>([imageUrl]);
  // croppedUrls[i] = baked data URL if user cropped image i, or null if no crop
  const [croppedUrls, setCroppedUrls] = useState<(string | null)[]>([null]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [extractedText, setExtractedText] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [sending, setSending] = useState(false);
  const [addingImage, setAddingImage] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Bake crop into croppedUrls when user finishes cropping
  const handleCropComplete = useCallback((c: PixelCrop) => {
    if (!imgRef.current || c.width <= 0 || c.height <= 0) return;
    const dataUrl = applyCrop(imgRef.current, c);
    setCroppedUrls(prev => {
      const n = [...prev];
      n[activeIndex] = dataUrl;
      return n;
    });
  }, [activeIndex]);

  // Clear the crop tool when switching images
  const switchToImage = (index: number) => {
    setCrop(undefined);
    setActiveIndex(index);
  };

  const clearCrop = () => {
    setCrop(undefined);
    setCroppedUrls(prev => {
      const n = [...prev];
      n[activeIndex] = null;
      return n;
    });
  };

  // Get the final URL to use for a given image (cropped or original)
  const getFinalUrl = (index: number): string => {
    return croppedUrls[index] || images[index];
  };

  const handleAddImage = async () => {
    setAddingImage(true);
    try {
      const newUrl = await onCaptureAnother();
      if (newUrl) {
        const newIndex = images.length;
        setImages(prev => [...prev, newUrl]);
        setCroppedUrls(prev => [...prev, null]);
        setCrop(undefined);
        setActiveIndex(newIndex);
      }
    } finally {
      setAddingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) return;
    setImages(prev => prev.filter((_, i) => i !== index));
    setCroppedUrls(prev => prev.filter((_, i) => i !== index));
    setCrop(undefined);
    setActiveIndex(prev => Math.min(prev, images.length - 2));
  };

  const handleSendAsImage = async () => {
    setSending(true);
    try {
      const attachments = [];
      for (let i = 0; i < images.length; i++) {
        if (isCropped(i)) {
          // Cropped: upload the cropped data URL
          const blob = await (await fetch(croppedUrls[i]!)).blob();
          const file = new File([blob], `capture-${i + 1}.png`, { type: "image/png" });
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch("/api/files/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            attachments.push({ url: data.url, name: `capture-${i + 1}.png`, contentType: "image/png" });
          }
        } else {
          // Uncropped: use the original Blob URL directly — full resolution, no re-encoding
          attachments.push({ url: images[i], name: `capture-${i + 1}.png`, contentType: "image/png" });
        }
      }

      if (attachments.length > 0) {
        window.dispatchEvent(
          new CustomEvent("transcript-message", {
            detail: { content: SEND_PROMPT, attachments },
          })
        );
        onClose();
      }
    } catch (err) {
      console.error("Failed to send images:", err);
    } finally {
      setSending(false);
    }
  };

  const handleExtractText = async () => {
    setExtracting(true);
    try {
      const allTexts: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const res = await fetch("/api/capture/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: getFinalUrl(i) }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.text) allTexts.push(data.text);
        }
      }
      setExtractedText(allTexts.join("\n\n---\n\n"));
    } catch (err) {
      console.error("Text extraction failed:", err);
    } finally {
      setExtracting(false);
    }
  };

  const handleSendText = () => {
    if (!extractedText.trim()) return;
    window.dispatchEvent(
      new CustomEvent("transcript-message", {
        detail: { content: extractedText },
      })
    );
    onClose();
  };

  const isCropped = (index: number) => !!croppedUrls[index];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Screen Capture ({images.length} image{images.length > 1 ? "s" : ""})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((_, i) => (
                <div key={i} className="relative shrink-0">
                  <button
                    onClick={() => switchToImage(i)}
                    className={`border-2 rounded overflow-hidden ${i === activeIndex ? "border-blue-500" : "border-muted-foreground/30"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getFinalUrl(i)}
                      alt={`Capture ${i + 1}`}
                      className="h-16 w-auto object-cover"
                      crossOrigin="anonymous"
                    />
                  </button>
                  {isCropped(i) && (
                    <span className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[8px] text-center leading-tight">
                      Cropped
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveImage(i)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active image: show cropped preview or crop tool */}
          <div className="border rounded overflow-auto max-h-[400px]">
            {isCropped(activeIndex) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={croppedUrls[activeIndex]!}
                alt="Cropped capture"
                style={{ maxWidth: "100%" }}
              />
            ) : (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={handleCropComplete}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={images[activeIndex]}
                  alt="Screen capture"
                  crossOrigin="anonymous"
                  style={{ maxWidth: "100%" }}
                />
              </ReactCrop>
            )}
          </div>

          {/* Crop status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CropIcon size={12} />
              {isCropped(activeIndex) ? "Cropped — only the selected area will be sent" : "Drag on the image to crop (optional)"}
            </span>
            {isCropped(activeIndex) && (
              <button onClick={clearCrop} className="text-blue-500 hover:underline text-xs">
                Re-crop
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleAddImage}
              disabled={addingImage}
              variant="outline"
              className="gap-1"
            >
              <ImagePlus size={14} />
              {addingImage ? "Capturing..." : "Add Image"}
            </Button>
            <Button
              onClick={handleSendAsImage}
              disabled={sending}
              className="flex-1"
            >
              {sending ? "Uploading..." : `Send ${images.length > 1 ? `${images.length} Images` : "as Image"}`}
            </Button>
            <Button
              onClick={handleExtractText}
              disabled={extracting}
              variant="outline"
              className="flex-1"
            >
              {extracting ? "Extracting..." : "Extract Text"}
            </Button>
          </div>

          {/* Extracted text area */}
          {extractedText && (
            <div className="space-y-2">
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
                placeholder="Extracted text will appear here..."
              />
              <Button onClick={handleSendText} className="w-full">
                Send Text to Chat
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
