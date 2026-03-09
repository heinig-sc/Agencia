import { GoogleGenAI, Type } from "@google/genai";
import { ContentType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateMarketingContent(
  type: ContentType,
  prompt: string,
  brandInfo?: { brandName?: string; brandDescription?: string; brandVoice?: string; targetAudience?: string },
  clientInfo?: { name?: string; description?: string; brandVoice?: string; targetAudience?: string }
) {
  const model = "gemini-3.1-pro-preview";
  
  const name = clientInfo?.name || brandInfo?.brandName || 'Não especificado';
  const description = clientInfo?.description || brandInfo?.brandDescription || 'Não especificado';
  const voice = clientInfo?.brandVoice || brandInfo?.brandVoice || 'Não especificado';
  const audience = clientInfo?.targetAudience || brandInfo?.targetAudience || 'Não especificado';

  const systemInstruction = `
    Você é um especialista em marketing digital sênior. 
    Sua tarefa é criar conteúdo de alta conversão para ${type}.
    Considre as seguintes informações da marca/cliente:
    Nome: ${name}
    Descrição: ${description}
    Voz da Marca: ${voice}
    Público Alvo: ${audience}
    
    O conteúdo deve ser criativo, persuasivo e otimizado para a plataforma escolhida.
    Use emojis se apropriado.
    Responda em Português do Brasil.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  return response.text || "Erro ao gerar conteúdo.";
}

export async function generateContentIdeas(
  clientInfo?: { name?: string; description?: string; brandVoice?: string; targetAudience?: string }
) {
  const model = "gemini-3.1-pro-preview";
  
  const name = clientInfo?.name || 'Não especificado';
  const description = clientInfo?.description || 'Não especificado';
  const audience = clientInfo?.targetAudience || 'Não especificado';

  const systemInstruction = `
    Você é um estrategista de conteúdo criativo. 
    Sua tarefa é gerar 5 ideias inovadoras de conteúdo para marketing digital.
    Considere as seguintes informações do cliente:
    Nome: ${name}
    Descrição: ${description}
    Público Alvo: ${audience}
    
    Para cada ideia, forneça:
    1. Título da Ideia
    2. Objetivo (ex: engajamento, conversão, autoridade)
    3. Breve descrição da execução.
    
    Responda em Português do Brasil em formato Markdown.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: "Gere 5 ideias de conteúdo para este cliente.",
    config: {
      systemInstruction,
    },
  });

  return response.text || "Erro ao gerar ideias.";
}

export async function generateMarketTrends(
  segment: string
) {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    Você é um analista de tendências de mercado. 
    Sua tarefa é identificar as tendências atuais e o que os concorrentes estão fazendo no segmento: ${segment}.
    Use a pesquisa do Google para obter informações atualizadas de 2024/2025.
    
    Forneça um resumo das 3 principais tendências e o que elas significam para o negócio.
    Responda em Português do Brasil em formato Markdown.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Quais são as tendências atuais e o que os concorrentes estão fazendo no segmento de ${segment}?`,
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text || "Erro ao gerar tendências.";
}

export async function generateMarketingImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Crie uma imagem profissional de marketing digital: ${prompt}. Estilo moderno, limpo, alta qualidade fotográfica ou ilustração 3D premium.`,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateMarketingSVG(prompt: string) {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    Você é um designer gráfico especializado em criar templates SVG para Canva.
    Sua tarefa é gerar o código SVG completo para um post de marketing baseado no prompt do usuário.
    
    REGRAS CRÍTICAS:
    1. O SVG deve ser 1080x1080 (quadrado).
    2. Use elementos <text> para todo o texto, para que sejam editáveis.
    3. Use fontes padrão da web (Arial, Helvetica, sans-serif).
    4. Use cores modernas e vibrantes.
    5. Inclua formas geométricas (<rect>, <circle>, <path>) para criar um design atraente.
    6. O design deve ser limpo e profissional.
    7. Retorne APENAS o código SVG puro, sem explicações ou blocos de código markdown.
    8. Certifique-se de que o texto esteja bem posicionado e legível.
    9. Se houver erros de ortografia no prompt, CORRIJA-OS no SVG.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Crie um template SVG de marketing para: ${prompt}`,
    config: {
      systemInstruction,
    },
  });

  return response.text || "";
}

export async function generateMarketingVideo(prompt: string, apiKey?: string) {
  const videoAi = new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY || "" });
  
  let operation = await videoAi.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Crie um vídeo de marketing profissional: ${prompt}. Estilo cinematográfico, alta qualidade, cores vibrantes, movimento suave.`,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await videoAi.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  // To fetch the video, we need the API key
  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey || process.env.GEMINI_API_KEY || "",
    },
  });

  if (!response.ok) return null;
  
  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    uri: downloadLink
  };
}
