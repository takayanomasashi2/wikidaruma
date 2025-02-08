import React, { useRef, useState } from "react";
import { Button } from "@/components/tailwind/ui/button";
import { FileAudio } from "lucide-react";

interface AudioUploaderProps {
  onTranscriptionComplete: (text: string, fileName: string) => void;
  disabled?: boolean;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onTranscriptionComplete,
  disabled,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);

      console.log("Uploading file:", file.name);
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "音声認識に失敗しました");
      }

      const { text } = await response.json();
      console.log("Transcription received:", text);

      // 受け取ったJSONをそのまま使用
      onTranscriptionComplete(text, file.name);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Processing error:", error);
      alert(error instanceof Error ? error.message : "音声処理に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        className="hidden"
        aria-label="音声ファイルを選択"
      />
      <Button
        onClick={handleButtonClick}
        disabled={disabled || isProcessing}
        variant="ghost"
        className="flex items-center gap-2"
        type="button"
      >
        <FileAudio className="h-4 w-4" />
        {isProcessing ? "処理中..." : "音声ファイルから作成"}
      </Button>
    </div>
  );
};

export default AudioUploader;
