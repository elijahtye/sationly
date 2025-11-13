// Audio session processing endpoint for Vercel
import OpenAI from 'openai';
import { writeFile, unlink, readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import formidable from 'formidable';

// Helper functions
function extensionFromMimeType(mimeType = '') {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('ogg')) return 'ogg';
  return 'webm';
}

function normalizeExtension(ext) {
  return ext.replace(/^\./, '').toLowerCase();
}

function resolveAudioExtension({ explicitExtension, originalName, mimeType, clientMimeType }) {
  const candidates = [
    normalizeExtension(explicitExtension || ''),
    normalizeExtension(originalName ? originalName.split('.').pop() : ''),
    extensionFromMimeType(clientMimeType),
    extensionFromMimeType(mimeType)
  ];
  return candidates.find(Boolean) || 'webm';
}

async function storeSessionTurn(payload) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_SESSION_TABLE = process.env.SUPABASE_SESSION_TABLE || 'conversation_turns';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_SESSION_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        ...payload,
        created_at: new Date().toISOString(),
        expires_at: expiresAt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[upword] Failed to persist session turn to Supabase:', errorText);
    }
  } catch (error) {
    console.warn('[upword] Error storing session turn in Supabase:', error);
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // Parse multipart form data using formidable
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
      uploadDir: tmpdir()
    });

    const [fields, files] = await form.parse(req);
    
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    
    if (!audioFile) {
      return res.status(400).json({ message: 'Audio file is required.' });
    }

    const goal = (Array.isArray(fields.goal) ? fields.goal[0] : fields.goal) || 'general conversation';
    const rawGoal = Array.isArray(fields.rawGoal) ? fields.rawGoal[0] : fields.rawGoal || '';
    const customGoal = Array.isArray(fields.customGoal) ? fields.customGoal[0] : fields.customGoal || '';
    const duration = parseInt((Array.isArray(fields.duration) ? fields.duration[0] : fields.duration) || '3', 10);
    const clientMimeType = Array.isArray(fields.mimeType) ? fields.mimeType[0] : fields.mimeType || '';
    const explicitExtension = Array.isArray(fields.fileExtension) ? fields.fileExtension[0] : fields.fileExtension || '';

    // Use the uploaded file path
    const audioPath = audioFile.filepath;
    const buffer = await readFile(audioPath);

    // Determine file extension
    const resolvedExtension = resolveAudioExtension({
      explicitExtension,
      originalName: audioFile.originalFilename || '',
      mimeType: audioFile.mimetype || '',
      clientMimeType
    });

    // Use the uploaded file path or create a new one with correct extension
    let tempFilePath = audioPath;
    if (resolvedExtension && !audioPath.endsWith(`.${resolvedExtension}`)) {
      tempFilePath = join(tmpdir(), `audio-${Date.now()}.${resolvedExtension}`);
      await writeFile(tempFilePath, buffer);
    }

    try {
      // Transcribe audio
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: 'gpt-4o-transcribe',
        response_format: 'text'
      });

      const transcript = transcriptionResponse?.trim?.() || '';

      // Analyze conversation
      const analysisResponse = await openai.responses.create({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'You are a confident, empathetic conversation coach. Adapt your tone and style to the user\'s stated conversation goal. If the goal is romantic, keep the flirtatious warmth; if it is professional, be polished and encouraging; if it is custom, mirror the intent provided. Respond strictly with valid JSON that follows the provided schema. Rating is an integer 1-100 reflecting how well the user matched the desired tone, confidence, and goal. Fixes are concise bullet-style strings highlighting improvements around tonality, word choice, pacing, pauses, stutters, etc.'
          },
          {
            role: 'user',
            content: `Conversation goal: ${goal}\nRaw goal value: ${rawGoal}\nCustom goal description: ${customGoal}\nDuration: ${duration} minutes\nTranscript:\n${transcript}`
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'conversation_turn',
            schema: {
              type: 'object',
              properties: {
                response: { type: 'string' },
                rating: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100
                },
                fixes: {
                  type: 'array',
                  items: { type: 'string' },
                  minItems: 1
                }
              },
              required: ['response', 'rating', 'fixes'],
              additionalProperties: false
            }
          }
        }
      });

      let turnFeedback = null;
      const outputs = Array.isArray(analysisResponse.output) ? analysisResponse.output : [];

      for (const output of outputs) {
        const parts = Array.isArray(output?.content) ? output.content : [];
        for (const part of parts) {
          if (part?.json && typeof part.json === 'object') {
            turnFeedback = part.json;
            break;
          }
          if (typeof part?.text === 'string') {
            try {
              turnFeedback = JSON.parse(part.text);
              break;
            } catch (parseError) {
              // continue looking
            }
          }
        }
        if (turnFeedback) break;
      }

      if (!turnFeedback && typeof analysisResponse.output_text === 'string') {
        try {
          turnFeedback = JSON.parse(analysisResponse.output_text);
        } catch (parseError) {
          console.warn('[upword] Unable to parse output_text as JSON:', parseError);
        }
      }

      if (!turnFeedback) {
        console.error('[upword] Unexpected analysis response shape:', JSON.stringify(analysisResponse, null, 2));
        throw new Error('Unable to parse analysis response from OpenAI.');
      }

      // Store session turn in Supabase
      await storeSessionTurn({
        transcript,
        rawGoal,
        customGoal,
        goal,
        duration: Number(duration) || 0,
        response: turnFeedback.response,
        rating: turnFeedback.rating,
        fixes: turnFeedback.fixes
      });

      // Return response
      res.json({
        transcript,
        response: turnFeedback.response,
        rating: turnFeedback.rating,
        fixes: turnFeedback.fixes,
        rawGoal,
        customGoal,
        goal,
        duration: Number(duration) || 0
      });
    } finally {
      // Clean up temporary files
      try {
        // Delete the uploaded file
        if (audioPath !== tempFilePath) {
          await unlink(audioPath);
        }
        // Delete the renamed file if different
        if (tempFilePath !== audioPath) {
          await unlink(tempFilePath);
        }
      } catch (unlinkError) {
        console.warn('[upword] Failed to delete temp file:', unlinkError);
      }
    }
  } catch (error) {
    const rawDetails = error?.response?.data || error.message || 'Unknown error';
    const detailsString = typeof rawDetails === 'string' ? rawDetails : JSON.stringify(rawDetails);
    const statusCode = error?.response?.status === 400 ? 400 : 500;
    const message =
      statusCode === 400
        ? 'Unsupported audio format. Please try recording in a browser that produces WebM/Opus or M4A audio.'
        : 'Failed to analyze conversation.';
    console.error('[upword] Session processing error:', detailsString, error);
    res.status(statusCode).json({ message, details: detailsString });
  }
}

// Vercel configuration for file uploads
export const config = {
  api: {
    bodyParser: false, // We need raw body for file uploads (formidable handles parsing)
  },
};

