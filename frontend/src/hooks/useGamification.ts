import { useState, useEffect, useCallback } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
  category: 'spending' | 'saving' | 'consistency' | 'milestone';
}

interface Streak {
  current: number;
  longest: number;
  lastActivity: string;
}

interface Level {
  level: number;
  title: string;
  minPoints: number;
  maxPoints: number;
  color: string;
}

interface GamificationState {
  points: number;
  level: Level;
  achievements: Achievement[];
  streak: Streak;
  badges: string[];
  weeklyGoal: {
    target: number;
    current: number;
    achieved: boolean;
  };
  monthlyChallenge: {
    title: string;
    description: string;
    target: number;
    current: number;
    reward: string;
  };
}

const LEVELS: Level[] = [
  { level: 1, title: 'Budget Beginner', minPoints: 0, maxPoints: 100, color: '#10B981' },
  { level: 2, title: 'Money Manager', minPoints: 100, maxPoints: 250, color: '#3B82F6' },
  { level: 3, title: 'Financial Planner', minPoints: 250, maxPoints: 500, color: '#8B5CF6' },
  { level: 4, title: 'Savings Expert', minPoints: 500, maxPoints: 1000, color: '#F59E0B' },
  { level: 5, title: 'Wealth Builder', minPoints: 1000, maxPoints: 2000, color: '#EF4444' },
  { level: 6, title: 'Financial Master', minPoints: 2000, maxPoints: Infinity, color: '#EC4899' },
];

const ACHIEVEMENTS: Omit<Achievement, 'progress' | 'unlockedAt'>[] = [
  {
    id: 'first_expense',
    title: 'First Step',
    description: 'Track your first expense',
    icon: '📝',
    points: 10,
    maxProgress: 1,
    category: 'milestone',
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Track expenses for 7 consecutive days',
    icon: '🔥',
    points: 50,
    maxProgress: 7,
    category: 'consistency',
  },
  {
    id: 'month_streak',
    title: 'Monthly Master',
    description: 'Track expenses for 30 consecutive days',
    icon: '📅',
    points: 100,
    maxProgress: 30,
    category: 'consistency',
  },
  {
    id: 'under_budget',
    title: 'Budget Hero',
    description: 'Stay under budget for 5 categories in a month',
    icon: '🦸',
    points: 75,
    maxProgress: 5,
    category: 'saving',
  },
  {
    id: 'no_overspend',
    title: 'Perfect Month',
    description: 'No overspending for an entire month',
    icon: '⭐',
    points: 150,
    maxProgress: 1,
    category: 'saving',
  },
  {
    id: '100_expenses',
    title: 'Expense Tracker',
    description: 'Track 100 expenses',
    icon: '💯',
    points: 100,
    maxProgress: 100,
    category: 'milestone',
  },
  {
    id: 'saver_500',
    title: 'Super Saver',
    description: 'Save $500 compared to your budget',
    icon: '💰',
    points: 200,
    maxProgress: 500,
    category: 'saving',
  },
  {
    id: 'category_master',
    title: 'Category Master',
    description: 'Track expenses in all 8 categories',
    icon: '📊',
    points: 80,
    maxProgress: 8,
    category: 'spending',
  },
];

export const useGamification = () => {
  const [state, setState] = useState<GamificationState>({
    points: 0,
    level: LEVELS[0],
    achievements: [],
    streak: { current: 0, longest: 0, lastActivity: '' },
    badges: [],
    weeklyGoal: { target: 7, current: 0, achieved: false },
    monthlyChallenge: {
      title: 'Reduce Dining Expenses',
      description: 'Spend 20% less on dining this month',
      target: 20,
      current: 0,
      reward: '50 points',
    },
  });

  // Load state from localStorage on mount
  useEffect(() => {
    const storedState = localStorage.getItem('spendguard-gamification');
    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        setState(prev => ({
          ...prev,
          ...parsed,
          level: getCurrentLevel(parsed.points || 0),
        }));
      } catch (error) {
        console.error('Failed to parse gamification state:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('spendguard-gamification', JSON.stringify(state));
  }, [state]);

  const getCurrentLevel = (points: number): Level => {
    return LEVELS.find(level => points >= level.minPoints && points < level.maxPoints) || LEVELS[LEVELS.length - 1];
  };

  const addPoints = useCallback((points: number) => {
    setState(prev => {
      const newPoints = prev.points + points;
      const newLevel = getCurrentLevel(newPoints);
      const leveledUp = newLevel.level > prev.level.level;

      if (leveledUp) {
        // You could trigger a notification here
        console.log(`Level up! You're now ${newLevel.title}`);
      }

      return {
        ...prev,
        points: newPoints,
        level: newLevel,
      };
    });
  }, []);

  const updateAchievement = useCallback((achievementId: string, progress: number) => {
    setState(prev => {
      const achievementDef = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (!achievementDef) return prev;

      const existingIndex = prev.achievements.findIndex(a => a.id === achievementId);
      const existing = existingIndex >= 0 ? prev.achievements[existingIndex] : null;
      
      const newProgress = Math.min(progress, achievementDef.maxProgress);
      const wasUnlocked = existing?.unlockedAt;
      const isUnlocked = newProgress >= achievementDef.maxProgress;

      let pointsToAdd = 0;
      if (!wasUnlocked && isUnlocked) {
        pointsToAdd = achievementDef.points;
      }

      const updatedAchievement: Achievement = {
        ...achievementDef,
        progress: newProgress,
        unlockedAt: isUnlocked ? Date.now() : existing?.unlockedAt,
      };

      const newAchievements = [...prev.achievements];
      if (existingIndex >= 0) {
        newAchievements[existingIndex] = updatedAchievement;
      } else {
        newAchievements.push(updatedAchievement);
      }

      const newPoints = prev.points + pointsToAdd;
      const newLevel = getCurrentLevel(newPoints);

      return {
        ...prev,
        achievements: newAchievements,
        points: newPoints,
        level: newLevel,
      };
    });
  }, []);

  const updateStreak = useCallback((hasActivityToday: boolean) => {
    setState(prev => {
      const today = new Date().toDateString();
      const lastActivity = prev.streak.lastActivity;
      
      let newCurrent = prev.streak.current;
      let newLongest = prev.streak.longest;
      let newLastActivity = today;

      if (hasActivityToday) {
        if (lastActivity === today) {
          // Already logged today, no change
          return prev;
        } else if (lastActivity === new Date(Date.now() - 86400000).toDateString()) {
          // Consecutive day
          newCurrent += 1;
        } else {
          // New streak
          newCurrent = 1;
        }
        newLongest = Math.max(newLongest, newCurrent);
      } else if (lastActivity !== today) {
        // No activity today and wasn't logged today
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (lastActivity !== yesterday) {
          // Streak broken
          newCurrent = 0;
        }
      }

      const newStreak = {
        current: newCurrent,
        longest: newLongest,
        lastActivity: newLastActivity,
      };

      // Check streak achievements
      if (newCurrent >= 7) {
        updateAchievement('week_streak', 7);
      }
      if (newCurrent >= 30) {
        updateAchievement('month_streak', 30);
      }

      return {
        ...prev,
        streak: newStreak,
      };
    });
  }, [updateAchievement]);

  const trackExpense = useCallback(() => {
    // Update first expense achievement
    updateAchievement('first_expense', 1);
    
    // Update expense count achievement
    const currentExpenseCount = state.achievements.find(a => a.id === '100_expenses')?.progress || 0;
    updateAchievement('100_expenses', currentExpenseCount + 1);

    // Add points for tracking expense
    addPoints(1);

    // Update streak
    updateStreak(true);

    // Update weekly goal
    setState(prev => ({
      ...prev,
      weeklyGoal: {
        ...prev.weeklyGoal,
        current: prev.weeklyGoal.current + 1,
        achieved: (prev.weeklyGoal.current + 1) >= prev.weeklyGoal.target,
      },
    }));
  }, [state.achievements, updateAchievement, addPoints, updateStreak]);

  const checkBudgetAchievements = useCallback((budgetStatus: Array<{ category: string; percentage: number }>) => {
    const underBudgetCount = budgetStatus.filter(b => b.percentage < 100).length;
    updateAchievement('under_budget', underBudgetCount);

    // Check perfect month (no overspending)
    const hasOverspending = budgetStatus.some(b => b.percentage > 100);
    if (!hasOverspending && budgetStatus.length > 0) {
      updateAchievement('no_overspend', 1);
    }
  }, [updateAchievement]);

  const getProgressToNextLevel = useCallback(() => {
    const currentLevel = state.level;
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
    
    if (!nextLevel) {
      return { progress: 100, pointsNeeded: 0 };
    }

    const pointsInCurrentLevel = state.points - currentLevel.minPoints;
    const pointsNeededForNext = nextLevel.minPoints - currentLevel.minPoints;
    const progress = (pointsInCurrentLevel / pointsNeededForNext) * 100;

    return {
      progress: Math.min(progress, 100),
      pointsNeeded: nextLevel.minPoints - state.points,
    };
  }, [state]);

  const getUnlockedAchievements = useCallback(() => {
    return state.achievements.filter(a => a.unlockedAt);
  }, [state.achievements]);

  const getAchievementsByCategory = useCallback((category: Achievement['category']) => {
    return state.achievements.filter(a => a.category === category);
  }, [state.achievements]);

  return {
    state,
    addPoints,
    updateAchievement,
    updateStreak,
    trackExpense,
    checkBudgetAchievements,
    getProgressToNextLevel,
    getUnlockedAchievements,
    getAchievementsByCategory,
    LEVELS,
    ALL_ACHIEVEMENTS: ACHIEVEMENTS,
  };
};
