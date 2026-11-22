"use client";

import imageCompression from "browser-image-compression";
import type { UploadFolder } from "./validation";

export type UploadStage = "compressing" | "signing" | "uploading";

export interface UploadedImageResult {
  publicUrl: string;
  storagePath: string;
  originalBytes: number;
  compressedBytes: number;
}

interface SignUploadResponse {
  signedUrl?: string;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export async function compressAndUploadImage(
  file: File,
  folder: UploadFolder,
  onStageChange?: (stage: UploadStage) => void
): Promise<UploadedImageResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please pick an image file (PNG, JPG, WebP, or GIF).");
  }

  onStageChange?.("compressing");

  const compressedBlob = await imageCompression(file, {
    maxSizeMB: 0.9,
    maxWidthOrHeight: 1920,
    fileType: "image/webp",
    useWebWorker: true,
  });

  const contentType =
    compressedBlob.type && compressedBlob.type.startsWith("image/")
      ? compressedBlob.type
      : "image/webp";

  onStageChange?.("signing");

  const signResponse = await fetch("/api/storage/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, folder }),
  });

  const signData = (await signResponse.json()) as SignUploadResponse;
  if (!signResponse.ok || !signData.signedUrl || !signData.path || !signData.publicUrl) {
    throw new Error(
      signData.error ?? "Could not prepare image upload. Check server config."
    );
  }

  onStageChange?.("uploading");

  const uploadResponse = await fetch(signData.signedUrl, {
    method: "PUT",
    body: compressedBlob,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload to storage failed. Please try again.");
  }

  return {
    publicUrl: signData.publicUrl,
    storagePath: signData.path,
    originalBytes: file.size,
    compressedBytes: compressedBlob.size,
  };
}
