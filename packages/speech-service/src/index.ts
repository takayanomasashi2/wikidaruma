// src/index.ts
import express, { Request, Response } from 'express';
import { SpeechClient } from '@google-cloud/speech';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import cors from 'cors';

const app = express();
const speechClient = new SpeechClient();
const storage = new Storage();
const upload = multer({ dest: os.tmpdir() });

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id'],
}));

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

app.post('/process-audio', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const tempInputPath = req.file.path;
    const tempOutputPath = path.join(os.tmpdir(), `output-${Date.now()}.flac`);
    const fileName = `audio-${Date.now()}.flac`;

    // Convert to FLAC
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .toFormat('flac')
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(tempOutputPath);
    });

    // Upload to Cloud Storage
    await storage.bucket(bucketName!).upload(tempOutputPath, {
      destination: fileName,
    });

    // Speech-to-Text Processing
    const [operation] = await speechClient.longRunningRecognize({
      audio: { uri: `gs://${bucketName}/${fileName}` },
      config: {
        encoding: 'FLAC' as const,
        sampleRateHertz: 16000,
        languageCode: 'ja-JP',
        enableAutomaticPunctuation: true,
      },
    });

    const [response] = await operation.promise();
    
    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript)
      .join('');

    if (!transcription) {
      res.status(500).json({ error: 'No transcription result' });
      return;
    }

    // Format response
    const content = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: transcription }]
      }]
    };

    res.json({ text: JSON.stringify(content) });

  } catch (error) {
    console.error('Error details:', error);
    res.status(500).json({
      error: 'Failed to process audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Cleanup
    if (req.file) {
      try {
        await fs.unlink(req.file.path).catch(e => console.error('Cleanup error:', e));
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
  }
});

const port = parseInt(process.env.PORT || '8080', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});