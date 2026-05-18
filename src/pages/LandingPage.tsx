import { Link } from 'react-router-dom';
import { Target, TrendingUp, Users, Shield, BarChart2, CheckCircle, ArrowRight, Zap } from 'lucide-react';

const features = [
  {
    icon: <Target size={22} className="text-teal-400" />,
    title: 'Goal Setting & Tracking',
    desc: 'Set SMART goals at individual, team, and organizational levels with clear milestones.',
  },
  {
    icon: <TrendingUp size={22} className="text-teal-400" />,
    title: 'KPI Dashboards',
    desc: 'Real-time KPI monitoring with visual charts and automated progress alerts.',
  },
  {
    icon: <Users size={22} className="text-teal-400" />,
    title: 'Team Alignment',
    desc: 'Cascade goals top-down, align teams, and see how individual work drives company OKRs.',
  },
  {
    icon: <Shield size={22} className="text-teal-400" />,
    title: 'Role-Based Access',
    desc: 'Granular permissions for employees, managers, and admins keep data secure and relevant.',
  },
  {
    icon: <BarChart2 size={22} className="text-teal-400" />,
    title: 'Analytics & Reports',
    desc: 'Export detailed performance reports and identify trends across quarters.',
  },
  {
    icon: <Zap size={22} className="text-teal-400" />,
    title: 'Real-Time Updates',
    desc: 'Powered by Supabase — every check-in and status update reflects instantly across teams.',
  },
];

const stats = [
  { value: '98%', label: 'Goal completion rate' },
  { value: '3.2x', label: 'Faster review cycles' },
  { value: '10k+', label: 'Active users' },
  { value: '500+', label: 'Enterprise clients' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0f1e3c] rounded-lg flex items-center justify-center">
              <Target size={15} className="text-teal-400" />
            </div>
            <div>
              <span className="font-bold text-[#0f1e3c] text-sm tracking-tight">AtomQuest</span>
              <span className="text-teal-500 font-semibold text-sm ml-1">GoalSync</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600 font-medium">
            <a href="#features" className="hover:text-[#0f1e3c] transition-colors">Features</a>
            <a href="#stats" className="hover:text-[#0f1e3c] transition-colors">Why Us</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-[#0f1e3c] transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold bg-[#0f1e3c] text-white px-4 py-2 rounded-lg hover:bg-[#162a52] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1e3c] via-[#132444] to-[#0d2a3a] text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-28 lg:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide">
            <Zap size={12} /> Enterprise Goal Management Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Align Teams. Track KPIs.
            <span className="block text-teal-400 mt-1">Achieve More.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            AtomQuest GoalSync brings your entire organization's goals, KPIs, and performance metrics
            into a single, beautifully designed platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40"
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 text-white/70 hover:text-white font-medium px-6 py-3.5 rounded-xl border border-white/15 hover:border-white/30 transition-all"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="bg-[#0a1628] py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold text-teal-400">{s.value}</p>
              <p className="text-sm text-white/50 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-teal-600 text-sm font-semibold uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0f1e3c] tracking-tight">
              Everything you need to hit your targets
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-base">
              Built for modern enterprises that take performance seriously.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all duration-200 group">
                <div className="w-10 h-10 bg-[#0f1e3c] rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[#0f1e3c] text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#0f1e3c] to-[#0d2a3a]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Ready to align your team?
          </h2>
          <p className="text-white/60 mb-8 text-base">
            Join thousands of teams already using AtomQuest GoalSync to drive measurable outcomes.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg"
          >
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a1628] py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-teal-400" />
            <span className="text-white/40 text-sm">AtomQuest GoalSync &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <CheckCircle size={12} className="text-teal-500" />
            <span>SOC2 Compliant &nbsp;|&nbsp; GDPR Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
