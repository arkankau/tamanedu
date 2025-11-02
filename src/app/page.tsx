'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Upload, BarChart3, Sparkles, Zap, Brain, ArrowRight, Star } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <nav className="flex items-center justify-between">
            <Image 
              src="/tamanedu-logo.svg" 
              alt="TamanEdu" 
              width={160} 
              height={40}
              className="h-10 w-auto"
            />
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-[#A91B6F] font-medium transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-[0_10px_30px_-10px_rgba(169,27,111,0.4)] transition-all duration-300 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column */}
            <div className="text-left space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 border border-pink-200 text-[#A91B6F] font-medium text-sm">
                <Sparkles className="h-4 w-4" />
                AI-Powered Auto-Grading
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-brand font-bold text-gray-900 leading-tight">
                Grade Worksheets{' '}
                <span className="text-gradient-primary">Instantly</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
                Stop spending hours grading manually. TamanEdu uses AI vision to scan, extract, and grade student worksheets in seconds—not hours.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup"
                  className="group bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] text-white px-8 py-4 rounded-xl font-semibold hover:shadow-[0_10px_30px_-10px_rgba(169,27,111,0.4)] transition-all duration-300 hover:-translate-y-1 text-lg inline-flex items-center justify-center gap-2"
                >
                  Start Grading Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-pink-200 hover:bg-pink-50 transition-all duration-300 text-lg inline-flex items-center justify-center"
                >
                  See How It Works
                </Link>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] border-2 border-white"></div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1 text-yellow-500 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <span className="font-semibold text-gray-900">200+</span> teachers trust TamanEdu
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image/Animation */}
            <div className="relative lg:block hidden animate-float">
              <div className="relative bg-white rounded-3xl shadow-glow border border-gray-100 p-8 space-y-6">
                {/* Animated Progress Card */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Grading Progress</span>
                    <span className="text-sm font-semibold text-[#A91B6F]">87%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[linear-gradient(135deg,#A91B6F_0%,#DB2777_100%)] w-[87%] rounded-full transition-all duration-1000"></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'MCQ', value: '✓', color: 'primary' },
                    { label: 'Essays', value: '✓', color: 'accent' },
                    { label: 'Numeric', value: '✓', color: 'primary' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                      <div className={`text-2xl font-bold ${stat.color === 'primary' ? 'text-[#A91B6F]' : 'text-[#7C9E7A]'} mb-1`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center justify-around pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">150+</div>
                    <div className="text-xs text-gray-500">Worksheets</div>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">&lt;10s</div>
                    <div className="text-xs text-gray-500">Per Page</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-brand font-bold text-gray-900">
              Built for <span className="text-gradient-accent">Busy Teachers</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple, fast, and accurate grading that works with your existing workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Upload className="h-7 w-7" />,
                title: 'Upload & Scan',
                description: 'Simply upload photos or PDFs. Our AI vision extracts all answers automatically.',
                gradient: 'from-pink-500 to-pink-400',
                bgColor: 'bg-pink-50',
              },
              {
                icon: <Brain className="h-7 w-7" />,
                title: 'AI-Powered Grading',
                description: 'Upload your answer key and let AI grade everything with high accuracy.',
                gradient: 'from-green-600 to-green-500',
                bgColor: 'bg-green-50',
              },
              {
                icon: <BarChart3 className="h-7 w-7" />,
                title: 'Export Results',
                description: 'Get detailed reports and class summaries in CSV or PDF format.',
                gradient: 'from-purple-500 to-blue-500',
                bgColor: 'bg-purple-50',
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group relative bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary-200 hover:shadow-soft transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 ${feature.bgColor} bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-brand font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-[#A91B6F] to-[#DB2777] relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-brand font-bold text-white mb-6">
            Ready to Save Hours of Grading Time?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join hundreds of teachers who are already using TamanEdu to automate their grading.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-white text-[#A91B6F] px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Start Grading for Free
            <Zap className="h-5 w-5" />
          </Link>
          <p className="text-white/80 text-sm mt-4">No credit card required • Free pilot available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image 
                src="/tamanedu-logo.svg" 
                alt="TamanEdu" 
                width={140} 
                height={35}
                className="h-8 w-auto"
              />
            </div>
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} TamanEdu. Built for educators, by educators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
