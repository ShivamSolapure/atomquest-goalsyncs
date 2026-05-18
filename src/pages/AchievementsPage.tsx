import { Award, Star, Trophy, Zap, Target, TrendingUp } from 'lucide-react';
import { useAchievements } from '../lib/hooks';

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy size={20} />,
  star: <Star size={20} />,
  target: <Target size={20} />,
  zap: <Zap size={20} />,
  'trending-up': <TrendingUp size={20} />,
  award: <Award size={20} />,
};

const colorMap: Record<string, string> = {
  amber: 'text-amber-500 bg-amber-50',
  teal: 'text-teal-600 bg-teal-50',
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  gray: 'text-gray-400 bg-gray-100',
};

export default function AchievementsPage() {
  const { achievements, earnedIds, loading } = useAchievements();

  const earned = achievements.filter(a => earnedIds.has(a.id)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#0f1e3c] tracking-tight">Achievements</h1>
        <p className="text-gray-500 text-sm mt-1">Your performance milestones and earned badges.</p>
      </div>

      {/* Progress */}
      <div className="bg-gradient-to-r from-[#0f1e3c] to-[#0d2a3a] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full border-4 border-teal-400/40 flex items-center justify-center bg-teal-500/10 flex-shrink-0">
          <Award size={32} className="text-teal-400" />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-3xl font-extrabold text-teal-400">{earned}<span className="text-white/40 text-lg font-medium">/{achievements.length}</span></p>
          <p className="text-white font-semibold text-base mt-0.5">Badges Earned</p>
          <p className="text-white/50 text-sm mt-1">Keep pushing — {achievements.length - earned} more to unlock</p>
        </div>
        <div className="sm:ml-auto text-center sm:text-right">
          <p className="text-4xl font-extrabold text-white">{earned >= 4 ? '4' : earned >= 2 ? '3' : earned >= 1 ? '2' : '1'}</p>
          <p className="text-white/50 text-sm mt-0.5">Performance Tier</p>
        </div>
      </div>

      {/* Badges */}
      {achievements.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No achievements configured yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map(achievement => {
            const isEarned = earnedIds.has(achievement.id);
            const colorClass = isEarned ? (colorMap[achievement.color] || colorMap.teal) : colorMap.gray;
            return (
              <div key={achievement.id} className={`bg-white rounded-2xl border p-5 transition-all ${isEarned ? 'border-gray-100 hover:shadow-md' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    {iconMap[achievement.icon_key] || <Award size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0f1e3c] text-sm">{achievement.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{achievement.description}</p>
                    {isEarned ? (
                      <p className="text-[11px] text-teal-600 font-medium mt-2">Earned</p>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-2">Not yet earned</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
