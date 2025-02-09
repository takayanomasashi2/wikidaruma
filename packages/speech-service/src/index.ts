import express, { Request, Response } from 'express';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import cors from 'cors';
import yaml from 'js-yaml';

async function loadConfig() {
  try {
    const configPath = path.resolve(process.cwd(), 'env.yaml');
    console.log('Loading config from:', configPath);
    
    const fileContent = await fs.readFile(configPath, 'utf8');
    console.log('File content loaded');
    
    const envConfig = yaml.load(fileContent) as Record<string, string>;
    console.log('Environment variables found:', Object.keys(envConfig));
    
    for (const [key, value] of Object.entries(envConfig)) {
      process.env[key] = value;
    }
    console.log('Environment variables set successfully');
  } catch (error) {
    console.error('環境変数の読み込みに失敗:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

async function main() {
  try {
    console.log('Starting server initialization...');
    await loadConfig();
    console.log('Config loaded successfully');

    const app = express();
    const speechClient = new SpeechClient();
    const storage = new Storage();
    const upload = multer({ dest: os.tmpdir() });

    // CORS 設定
    app.use(cors({
      origin: '*',
      methods: ['POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-user-id'],
    }));

    app.get('/', (req: Request, res: Response) => {
      res.status(200).send('OK');
    });

    app.get('/health', (req: Request, res: Response) => {
      res.status(200).send('Healthy');
    });

    // 環境変数から GCS バケット名を取得
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    if (!bucketName) {
      console.error("❌ 環境変数 'GOOGLE_CLOUD_STORAGE_BUCKET' が設定されていません。");
      process.exit(1);
    }

    app.post('/process-audio', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ error: 'No file uploaded' });
          return;
        }

        const tempInputPath = req.file.path;
        const tempOutputPath = path.join(os.tmpdir(), `output-${Date.now()}.flac`);
        const fileName = `audio-${Date.now()}.flac`;

        console.log(`Processing file: ${req.file.originalname}`);

        // FLAC に変換
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempInputPath)
            .audioFrequency(16000)
            .audioChannels(1)
            .toFormat('flac')
            .on('error', (err) => reject(err))
            .on('end', () => resolve())
            .save(tempOutputPath);
        });

        console.log(`Converted file saved at: ${tempOutputPath}`);

        // Google Cloud Storage にアップロード
        await storage.bucket(bucketName).upload(tempOutputPath, { destination: fileName });

        console.log(`Uploaded to GCS: gs://${bucketName}/${fileName}`);

        // Speech-to-Text で音声認識
        const [operation] = await speechClient.longRunningRecognize({
          audio: { uri: `gs://${bucketName}/${fileName}` },
          config: {
            encoding: 'FLAC' as const,
            sampleRateHertz: 16000,
            languageCode: 'ja-JP',
            enableAutomaticPunctuation: true,
          },
        });

        console.log("Transcription process started...");

        const [response] = await operation.promise();
        
        const transcription = response.results
          ?.map(result => result.alternatives?.[0]?.transcript)
          .join('');

        if (!transcription) {
          res.status(500).json({ error: 'No transcription result' });
          return;
        }

        console.log("Transcription complete:", transcription);

        // レスポンスフォーマット
        const content = {
          type: "doc",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: transcription }]
          }]
        };

        res.json({ text: JSON.stringify(content) });

      } catch (error) {
        console.error('エラー詳細:', error);
        res.status(500).json({
          error: 'Failed to process audio',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        // 一時ファイルを削除
        if (req.file) {
          try {
            await fs.unlink(req.file.path);
          } catch (e) {
            console.error('Cleanup error:', e);
          }
        }
      }
    });

    // サーバー起動
    const port = process.env.PORT || '8080';
    app.listen(parseInt(port, 10), '0.0.0.0', () => {
      console.log(`✅ Server is running on port ${port}`);
    });
    
  } catch (error) {
    console.error('Server initialization failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});