import { evaluate } from "./jev.js";
import { buildQuestions, buildState } from "./questions.js";
import { buildReport } from "./score.js";

/**
 * Alur lengkap: state + pertanyaan -> Jev -> laporan yang siap ditampilkan.
 */
export async function analyzeJob({ job, profile, settings, now = Date.now() }) {
  const state = buildState({ job, profile });
  const questions = buildQuestions({ job });

  const response = await evaluate({
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    state,
    questions,
  });

  return buildReport({
    jobId: job.jobId,
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
    },
    answers: response.answers,
    usage: response.usage,
    signals: job.signals,
    model: response.model ?? settings.model,
    analyzedAt: now,
  });
}
