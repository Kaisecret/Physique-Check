
export interface MuscleDetail {
  score: number;
  strengths: string;
  weaknesses: string;
  symmetryNotes: string;
}

export interface MuscleAnalysis {
  chest: MuscleDetail;
  abs: MuscleDetail;
  arms: MuscleDetail;
  back: MuscleDetail;
  legs: MuscleDetail;
}

export interface PhysiqueRating {
  overallScore: number;
  summary: string;
}

export interface PhysiqueAnalysisReport {
  muscleAnalysis: MuscleAnalysis;
  physiqueRating: PhysiqueRating;
  postureNotes: string;
}

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

export interface DailyWorkout {
  dayOfWeek: string;
  targetMuscle: string;
  warmup: string;
  exercises: Exercise[];
  cooldown: string;
  progressiveOverloadTip: string;
}

export interface WorkoutPlan {
  plan: DailyWorkout[];
}

export interface Meal {
  name: string;
  ingredients: string[];
  notes: string;
}

export interface MealGuide {
  dailyCalorieTarget: number;
  macros: {
    protein: string;
    carbs: string;
    fats: string;
  };
  meals: Meal[];
  mealSwaps: string[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatar?: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';
}

export interface UserPreferences {
  goal: 'fat loss' | 'muscle gain' | 'recomposition';
  experience: 'beginner' | 'intermediate' | 'advanced';
  equipment: 'home' | 'gym' | 'minimal equipment';
  time: '20-30 min' | '30-45 min' | '45-60 min' | '60+ min';
  enablePose: boolean;
  showLandmarks: boolean;
}

export interface HistoryItem {
  id: string;
  date: string;
  report: PhysiqueAnalysisReport;
  workoutPlan: WorkoutPlan;
  mealGuide: MealGuide;
}

export type AppState = 'landing' | 'login' | 'signup' | 'dashboard';
