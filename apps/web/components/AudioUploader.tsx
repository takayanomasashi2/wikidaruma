import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/tailwind/ui/button";
import { Progress } from "@/components/tailwind/ui/progress";
import { FileAudio } from "lucide-react";
import { useToast } from "@/components/tailwind/ui/use-toast";

interface AudioUploaderProps {
  onTranscriptionComplete: (text: string, fileName: string) => void;
  disabled?: boolean;
}

const SPEECH_SERVICE_URL = "https://speech-service-927290674827.asia-northeast1.run.app";

const AudioUploader: React.FC<AudioUploaderProps> = ({
  onTranscriptionComplete,
  disabled,
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("音声ファイルから作成");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>(undefined);

  // アップロード後のプログレス処理
  const startProcessingProgress = (start: number, end: number, duration: number) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    const stepSize = (end - start) / (duration / 50);
    let currentProgress = start;

    progressInterval.current = setInterval(() => {
      currentProgress += stepSize;
      if (currentProgress >= end) {
        clearInterval(progressInterval.current);
        currentProgress = end;
      }
      setProgress(Math.min(Math.round(currentProgress), end));
    }, 50);
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const uploadWithProgress = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("audio", file);

      // アップロード進捗の監視
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const uploadProgress = Math.round((event.loaded / event.total) * 35);
          setProgress(uploadProgress);
        }
      });

      // レスポンス受信の監視
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error("Invalid response format"));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      // リクエストの設定と送信
      xhr.open("POST", `${SPEECH_SERVICE_URL}/process-audio`);
      xhr.setRequestHeader("x-user-id", "test-user");
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsProcessing(true);
  setProgress(0);
  setStatus("ファイルを準備中...");

  try {
    // アップロード開始
    setStatus("音声ファイルをアップロード中...");
    const data = await uploadWithProgress(file);

    if (data.text) {
      // 音声処理とテキスト生成
      setStatus("音声を解析中...");
      startProcessingProgress(35, 75, 3000);
      
      setTimeout(() => {
        setStatus("テキストを生成中...");
        startProcessingProgress(75, 100, 1000);
        
        setTimeout(() => {
          onTranscriptionComplete(data.text, file.name);
          toast({
            title: "成功",
            description: "音声の文字起こしが完了しました",
          });
          // 完了後すぐにリセット
          setIsProcessing(false);
          setProgress(0);
          setStatus("音声ファイルから作成");
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
          }
          // ファイル入力をリセット
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 1000);
      }, 3000);
    } else {
      throw new Error('音声処理の結果が不正です');
    }
  } catch (error) {
    console.error('Audio processing error:', error);
    toast({
      variant: "destructive",
      title: "エラー",
      description: error instanceof Error ? error.message : "音声処理に失敗しました",
    });
    // エラー時もすぐにリセット
    setIsProcessing(false);
    setProgress(0);
    setStatus("音声ファイルから作成");
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="relative space-y-2">
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
        className="flex items-center gap-2 w-full justify-start"
        type="button"
      >
        <FileAudio className="h-4 w-4" />
        {status}
      </Button>
      {isProcessing && (
        <div className="w-full space-y-1">
          <Progress value={progress} className="w-full h-1" />
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{status}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;