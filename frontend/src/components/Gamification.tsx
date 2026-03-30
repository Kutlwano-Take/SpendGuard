import React from 'react';
import { motion } from 'framer-motion';
import { useGamification } from '../hooks/useGamification.js';
import { Trophy, Target, Flame, Zap, Award } from 'lucide-react';

const Gamification: React.FC = () => {
  const { 
    state, 
    getProgressToNextLevel, 
    getUnlockedAchievements, 
    getAchievementsByCategory 
  } = useGamification();

  const progressToNextLevel = getProgressToNextLevel();
  const unlockedAchievements = getUnlockedAchievements();

  return (
    <div className="space-y-6">
      {/* Level Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold">{state.level.title}</h3>
            <p className="text-purple-100">Level {state.level.level}</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{state.points}</div>
            <div className="text-sm text-purple-100">Total Points</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Level {state.level.level + 1}</span>
            <span>{progressToNextLevel.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-purple-300 rounded-full h-3">
            <motion.div
              className="bg-white rounded-full h-3"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          {progressToNextLevel.pointsNeeded > 0 && (
            <p className="text-xs text-purple-100">
              {progressToNextLevel.pointsNeeded} points to next level
            </p>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Current Streak</p>
              <p className="text-2xl font-bold text-orange-600">{state.streak.current}</p>
              <p className="text-xs text-gray-500">days</p>
            </div>
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Achievements</p>
              <p className="text-2xl font-bold text-blue-600">{unlockedAchievements.length}</p>
              <p className="text-xs text-gray-500">unlocked</p>
            </div>
            <Trophy className="w-8 h-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Weekly Goal</p>
              <p className="text-2xl font-bold text-green-600">
                {state.weeklyGoal.current}/{state.weeklyGoal.target}
              </p>
              <p className="text-xs text-gray-500">expenses tracked</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </motion.div>
      </div>

      {/* Recent Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
        {unlockedAchievements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No achievements yet. Start tracking expenses to unlock them!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unlockedAchievements
              .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
              .slice(0, 5)
              .map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{achievement.title}</p>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-yellow-600">+{achievement.points}</p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </motion.div>
              ))}
          </div>
        )}
      </motion.div>

      {/* Achievement Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievement Progress</h3>
        <div className="space-y-4">
          {['spending', 'saving', 'consistency', 'milestone'].map((category) => {
            const categoryAchievements = getAchievementsByCategory(category as any);
            const unlockedInCategory = categoryAchievements.filter(a => a.unlockedAt).length;
            const totalInCategory = categoryAchievements.length;
            const progress = totalInCategory > 0 ? (unlockedInCategory / totalInCategory) * 100 : 0;

            const categoryInfo = {
              spending: { icon: '💳', title: 'Spending', color: 'blue' },
              saving: { icon: '💰', title: 'Saving', color: 'green' },
              consistency: { icon: '🔥', title: 'Consistency', color: 'orange' },
              milestone: { icon: '🎯', title: 'Milestones', color: 'purple' },
            };

            const info = categoryInfo[category as keyof typeof categoryInfo];

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{info.icon}</span>
                    <span className="font-medium text-gray-900">{info.title}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {unlockedInCategory}/{totalInCategory}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className={`bg-${info.color}-500 rounded-full h-2`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Monthly Challenge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-lg p-6 text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Monthly Challenge</h3>
            <p className="text-indigo-100">{state.monthlyChallenge.title}</p>
          </div>
          <Award className="w-6 h-6" />
        </div>
        
        <p className="text-indigo-100 mb-4">{state.monthlyChallenge.description}</p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{state.monthlyChallenge.current}% / {state.monthlyChallenge.target}%</span>
          </div>
          <div className="w-full bg-indigo-300 rounded-full h-3">
            <motion.div
              className="bg-white rounded-full h-3"
              initial={{ width: 0 }}
              animate={{ width: `${(state.monthlyChallenge.current / state.monthlyChallenge.target) * 100}%` }}
              transition={{ duration: 1, delay: 0.7 }}
            />
          </div>
          <p className="text-xs text-indigo-100">
            Reward: {state.monthlyChallenge.reward}
          </p>
        </div>
      </motion.div>

      {/* Points Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Points Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {unlockedAchievements.reduce((sum, a) => sum + a.points, 0)}
            </p>
            <p className="text-sm text-gray-600">From Achievements</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {state.points - unlockedAchievements.reduce((sum, a) => sum + a.points, 0)}
            </p>
            <p className="text-sm text-gray-600">From Activities</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Gamification;
