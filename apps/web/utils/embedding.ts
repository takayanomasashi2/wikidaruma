import axios from "axios";

// 環境変数からAPIキーを取得
const apiKey = process.env.NEXT_PUBLIC_HUGGING_FACE_API_KEY;

if (!apiKey) {
  throw new Error("Hugging Face API key is not set in environment variables");
}

// Embeddingを取得する関数
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      {
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!Array.isArray(response.data) || !Array.isArray(response.data[0])) {
      return response.data;
    }

    return response.data[0];
  } catch (error) {
    console.error("Error fetching embedding:", error);
    throw error;
  }
}