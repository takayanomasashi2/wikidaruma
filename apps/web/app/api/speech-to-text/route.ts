// api/speech-to-text/route.ts
import { NextResponse } from "next/server";
import { SpeechClient, protos } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import path from "path";
import os from "os";

const speechClient = new SpeechClient({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim(),
    },
    projectId: process.env.GOOGLE_PROJECT_ID,
});

const storage = new Storage({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    projectId: process.env.GOOGLE_PROJECT_ID,
});

const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

// 日本語テキストを整形する関数
function formatJapaneseText(text: string): string[] {
    // 文章を意味のある単位で分割
    const formattedText = text
        // 長い文章を適切な位置で分割（助詞や接続詞の前で区切る）
        .replace(/([^、。]{15,}?)(では|には|として|による|において)/g, '$1、$2')
        // 不要な読点を削除
        .replace(/、、/g, '、')
        // 文末に句点がない場合は追加
        .replace(/([^。])$/g, '$1。');

    // 文章を適度な長さで分割
    const sentences = formattedText.split(/([。])/g)
        .map((part, i, arr) => {
            if (i % 2 === 0) return part;
            return part + (i < arr.length - 1 ? '\n' : '');
        })
        .join('')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    return sentences;
}

export async function POST(req: Request) {
    const tempInputPath = path.join(os.tmpdir(), `input-${Date.now()}.m4a`);
    const tempOutputPath = path.join(os.tmpdir(), `output-${Date.now()}.flac`);

    try {
        const formData = await req.formData();
        const audioFile = formData.get("audio") as File;

        if (!audioFile) {
            return NextResponse.json(
                { error: "Audio file is required" },
                { status: 400 }
            );
        }

        console.log("Received audio file:", {
            type: audioFile.type,
            size: audioFile.size,
        });

        // M4Aファイルを一時ディレクトリに保存
        await fs.writeFile(tempInputPath, new Uint8Array(await audioFile.arrayBuffer()));

        // M4AをFLACに変換
        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempInputPath)
                .audioFrequency(16000)
                .audioChannels(1)
                .toFormat("flac")
                .on("end", resolve)
                .on("error", reject)
                .save(tempOutputPath);
        });

        console.log("Audio converted to FLAC");

        // Cloud Storage にアップロード
        const bucket = storage.bucket(bucketName);
        const fileName = `audio-${Date.now()}.flac`;
        const file = bucket.file(fileName);

        const audioBuffer = await fs.readFile(tempOutputPath);
        await file.save(audioBuffer);

        console.log("Uploaded to Cloud Storage");

        // Speech-to-Text APIの設定
        const request: protos.google.cloud.speech.v1.ILongRunningRecognizeRequest = {
            audio: {
                uri: `gs://${bucketName}/${fileName}`
            },
            config: {
                encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC,
                sampleRateHertz: 16000,
                languageCode: "ja-JP",
                enableAutomaticPunctuation: true,
            },
        };

        console.log("Sending request to Speech-to-Text API");

        // 音声認識実行
        const [operation] = await speechClient.longRunningRecognize(request);
        const [response] = await operation.promise();

        console.log("Received response from Speech-to-Text API");

        // アップロードしたファイルを削除
        await file.delete();

        // 文字起こし結果を取得
        const transcription = response.results
            ?.map(result => result.alternatives?.[0]?.transcript)
            .join('');

        if (!transcription) {
            return NextResponse.json(
                { error: "No transcription result" },
                { status: 400 }
            );
        }

        console.log("Raw transcription:", transcription);

        // テキストを整形して段落に分割
        const sentences = formatJapaneseText(transcription);

        // Novelエディタ用のJSONを生成
        const content = {
            type: "doc",
            content: sentences.map(sentence => ({
                type: "paragraph",
                content: [{
                    type: "text",
                    text: sentence
                }]
            }))
        };

        console.log("Formatted content:", JSON.stringify(content, null, 2));

        return NextResponse.json({ text: JSON.stringify(content) });
    } catch (error) {
        console.error("Speech-to-text error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to process audio" },
            { status: 500 }
        );
    } finally {
        // 一時ファイルの削除
        try {
            await fs.unlink(tempInputPath).catch(() => { });
            await fs.unlink(tempOutputPath).catch(() => { });
        } catch (e) {
            console.error('Failed to cleanup temporary files:', e);
        }
    }
}