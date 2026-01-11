import { GoogleGenAI, VideosOperation } from "@google/genai";

interface GenerateVideoParams {
  prompt: string;
  onLoadingMessage: (message: string) => void;
}

const VIDEO_GENERATION_MESSAGES = [
  "Preparando a tela... isso pode levar alguns momentos.",
  "Desenhando o conceito inicial do vídeo...",
  "Animando os elementos e personagens...",
  "Adicionando detalhes e aprimorando a cena...",
  "Sincronizando áudio e efeitos visuais...",
  "Renderizando o vídeo final em alta definição...",
  "Quase pronto! Seu vídeo está sendo finalizado...",
  "Concluído! O vídeo está pronto para ser reproduzido."
];

export const geminiService = {
  generateVideo: async ({ prompt, onLoadingMessage }: GenerateVideoParams): Promise<string> => {
    // CRITICAL: Create a new GoogleGenAI instance here to ensure it uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'veo-3.1-fast-generate-preview';

    try {
      onLoadingMessage(VIDEO_GENERATION_MESSAGES[0]);
      let operation = await ai.models.generateVideos({
        model: model,
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      let messageIndex = 1;
      while (!operation.done) {
        if (messageIndex < VIDEO_GENERATION_MESSAGES.length - 1) {
          onLoadingMessage(VIDEO_GENERATION_MESSAGES[messageIndex]);
          messageIndex++;
        }
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      onLoadingMessage(VIDEO_GENERATION_MESSAGES[VIDEO_GENERATION_MESSAGES.length - 1]);

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

      if (!downloadLink) {
        throw new Error("Não foi possível obter o link de download do vídeo.");
      }

      // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
      // This is for demonstration, as in a real app, you might serve this via a backend proxy.
      return `${downloadLink}&key=${process.env.API_KEY}`;

    } catch (error: any) {
      console.error("Erro ao gerar vídeo:", error);
      if (error.message.includes("Requested entity was not found.")) {
        throw new Error("Erro na API: Chave de API não encontrada ou inválida. Por favor, selecione sua chave novamente.");
      }
      throw new Error(`Falha ao gerar vídeo: ${error.message || "Erro desconhecido"}`);
    }
  },
};