import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, PhysiqueAnalysisReport, WorkoutPlan, MealGuide, UserProfile } from "../types";

// Robust API Key retrieval: Tries Vite's import.meta.env first, then process.env
const getApiKey = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    return import.meta.env.VITE_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// --- API SCHEMAS ---

const muscleDetailSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.NUMBER, description: "Score from 1 to 10 for the muscle group." },
        strengths: { type: Type.STRING, description: "Observed strengths for this muscle group." },
        weaknesses: { type: Type.STRING, description: "Observed weaknesses or areas for improvement." },
        symmetryNotes: { type: Type.STRING, description: "Notes on muscular symmetry." },
    },
    required: ["score", "strengths", "weaknesses", "symmetryNotes"],
};

const physiqueAnalysisReportSchema = {
    type: Type.OBJECT,
    properties: {
        muscleAnalysis: {
            type: Type.OBJECT,
            properties: {
                chest: muscleDetailSchema,
                abs: muscleDetailSchema,
                arms: muscleDetailSchema,
                back: muscleDetailSchema,
                legs: muscleDetailSchema,
            },
            required: ["chest", "abs", "arms", "back", "legs"],
        },
        physiqueRating: {
            type: Type.OBJECT,
            properties: {
                overallScore: { type: Type.NUMBER, description: "Overall physique score from 1 to 10." },
                summary: { type: Type.STRING, description: "A concise summary of the overall physique." },
            },
            required: ["overallScore", "summary"],
        },
        postureNotes: { type: Type.STRING, description: "Observations and suggestions regarding posture." },
    },
    required: ["muscleAnalysis", "physiqueRating", "postureNotes"],
};

const exerciseSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        sets: { type: Type.STRING },
        reps: { type: Type.STRING },
        rest: { type: Type.STRING },
    },
    required: ["name", "sets", "reps", "rest"],
};

const dailyWorkoutSchema = {
    type: Type.OBJECT,
    properties: {
        dayOfWeek: { type: Type.STRING },
        targetMuscle: { type: Type.STRING },
        warmup: { type: Type.STRING },
        exercises: {
            type: Type.ARRAY,
            items: exerciseSchema,
        },
        cooldown: { type: Type.STRING },
        progressiveOverloadTip: { type: Type.STRING },
    },
    required: ["dayOfWeek", "targetMuscle", "warmup", "exercises", "cooldown", "progressiveOverloadTip"],
};

const workoutPlanSchema = {
    type: Type.OBJECT,
    properties: {
        plan: {
            type: Type.ARRAY,
            items: dailyWorkoutSchema,
        },
    },
    required: ["plan"],
};

const mealSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
        },
        notes: { type: Type.STRING },
    },
    required: ["name", "ingredients", "notes"],
};

const mealGuideSchema = {
    type: Type.OBJECT,
    properties: {
        dailyCalorieTarget: { type: Type.NUMBER },
        macros: {
            type: Type.OBJECT,
            properties: {
                protein: { type: Type.STRING },
                carbs: { type: Type.STRING },
                fats: { type: Type.STRING },
            },
            required: ["protein", "carbs", "fats"],
        },
        meals: {
            type: Type.ARRAY,
            items: mealSchema,
        },
        mealSwaps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
        },
    },
    required: ["dailyCalorieTarget", "macros", "meals", "mealSwaps"],
};

const plansSchema = {
    type: Type.OBJECT,
    properties: {
        workoutPlan: workoutPlanSchema,
        mealGuide: mealGuideSchema,
    },
    required: ["workoutPlan", "mealGuide"],
};

// --- SERVICE FUNCTIONS ---

export const analyzePhysique = async (
    images: File[],
    preferences: UserPreferences,
    profile: UserProfile
): Promise<PhysiqueAnalysisReport> => {
    const imageParts = await Promise.all(images.map(fileToGenerativePart));

    const prompt = `You are an expert fitness coach and physique analyst. Analyze the following images of a person's physique.
    
    User Personal Details:
    - Sex: ${profile.sex}
    - Age: ${profile.age}
    - Height: ${profile.height} cm
    - Weight: ${profile.weight} kg
    - Activity Level: ${profile.activityLevel}

    User Preferences:
    - Goal: ${preferences.goal}
    - Experience Level: ${preferences.experience}
    - Available Equipment: ${preferences.equipment}
    - Time per workout: ${preferences.time}
    
    Instructions:
    ${preferences.enablePose ? "- Please pay special attention to posture and alignment as the user has requested pose analysis." : ""}

    Based on the images and their preferences, provide a detailed analysis. Evaluate their muscle development, symmetry, and potential areas for improvement for the following groups: chest, abs, arms, back, and legs. Also, provide an overall physique score and a summary, along with any notes on their posture.

    Return the analysis as a JSON object that conforms to the provided schema. Do not include any markdown formatting (e.g., \`\`\`json).`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: physiqueAnalysisReportSchema,
        },
    });

    const jsonString = response.text;
    return JSON.parse(jsonString) as PhysiqueAnalysisReport;
};

export const generatePlans = async (
    analysis: PhysiqueAnalysisReport,
    preferences: UserPreferences,
    profile: UserProfile
): Promise<{ workoutPlan: WorkoutPlan; mealGuide: MealGuide }> => {

    const prompt = `You are an expert fitness coach and nutritionist. Based on the following physique analysis and user preferences, create a personalized weekly workout plan and a daily meal guide.

    Physique Analysis:
    ${JSON.stringify(analysis, null, 2)}

    User Personal Details:
    - Sex: ${profile.sex}
    - Age: ${profile.age}
    - Height: ${profile.height} cm
    - Weight: ${profile.weight} kg
    - Activity Level: ${profile.activityLevel}
    - Goal: ${preferences.goal}

    User Preferences:
    - Experience Level: ${preferences.experience}
    - Available Equipment: ${preferences.equipment}
    - Time per workout: ${preferences.time}

    The workout plan should be a 7-day schedule, including rest days. It should target the user's weak points identified in the analysis while maintaining their strengths. Each workout day should include a warm-up, specific exercises (with sets, reps, and rest periods), a cooldown, and a practical tip for progressive overload.
    
    The meal guide should include a daily calorie target, macronutrient breakdown (protein, carbs, fats), 4-5 sample meals for one day with ingredients, and some simple meal swap ideas for variety. The plan should be aligned with the user's primary goal.

    Return the plans as a single JSON object that conforms to the provided schema. Do not include any markdown formatting (e.g., \`\`\`json).`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: plansSchema,
        },
    });

    const jsonString = response.text;
    return JSON.parse(jsonString) as { workoutPlan: WorkoutPlan; mealGuide: MealGuide };
};