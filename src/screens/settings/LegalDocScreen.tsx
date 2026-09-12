import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  FileText,
  Info,
  Sparkles,
  Lock,
  Eye,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Users,
  Film,
  Zap,
  Mail,
  Heart,
  Shield
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MaxPlayLogo } from '../../components/common/MaxPlayLogo';

export type LegalDocType = 'about' | 'privacy' | 'agreement';

interface LegalDocScreenProps {
  initialDoc?: LegalDocType;
  onBack: () => void;
}

export const LegalDocScreen: React.FC<LegalDocScreenProps> = ({
  initialDoc = 'about',
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<LegalDocType>(initialDoc);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    aboutUs?: string;
    privacyPolicy?: string;
    userAgreement?: string;
    aboutUsStructured?: any;
    privacyStructured?: any;
    agreementStructured?: any;
    updatedAt?: string;
  }>({});

  useEffect(() => {
    setActiveTab(initialDoc);
  }, [initialDoc]);

  useEffect(() => {
    let isMounted = true;
    const fetchLegalData = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'settings', 'legal'));
        if (snap.exists() && isMounted) {
          const docData = snap.data();
          setData(docData as any);
          try {
            if (docData.updatedAt) {
              localStorage.setItem('maxplay_legal_read', docData.updatedAt);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error fetching legal document data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLegalData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'August 2026';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'August 2026';
    }
  };

  // Structured or default fallback values
  const aboutStruct = data.aboutUsStructured || {};
  const privacyStruct = data.privacyStructured || {};
  const agreementStruct = data.agreementStructured || {};

  // ABOUT US DATA
  const aboutTitle = aboutStruct.title || 'MAXPLAY STREAMING';
  const aboutBadge = aboutStruct.badge || 'POWERED BY SAN TEAM';
  const aboutLead = aboutStruct.lead || 'The next-generation entertainment network engineered by SAN TEAM for anime enthusiasts, movie lovers, and binge-watchers worldwide.';
  const aboutMisTitle = aboutStruct.misTitle || 'Our Mission & Purpose';
  const aboutMisText = aboutStruct.misText || 'At MaxPlay, our goal is to deliver uninterrupted, high-definition entertainment with lightning-fast streaming speeds, adaptive bitrates, offline downloads, multi-audio tracks, and real-time cloud synchronization across all your personal devices.';
  
  const aboutF1T = aboutStruct.f1T || 'Seamless Chunk Playback';
  const aboutF1D = aboutStruct.f1D || 'Buffer-free multi-res chunk player designed to conserve mobile data while offering crystal clear visuals.';
  const aboutF2T = aboutStruct.f2T || 'Active Global Community';
  const aboutF2D = aboutStruct.f2D || 'Episode-specific discussions, spoilers filtering, interactive comments, and real-time community engagement.';
  const aboutF3T = aboutStruct.f3T || 'Family Safe & Private';
  const aboutF3D = aboutStruct.f3D || 'Built-in PIN family protection mode, custom ratings filters, and encrypted watch telemetry.';
  const aboutF4T = aboutStruct.f4T || 'Curated by SAN TEAM';
  const aboutF4D = aboutStruct.f4D || 'Constantly updated library with seasonal anime releases, multi-audio dubs, and member-requested series.';
  
  const aboutTeamName = aboutStruct.teamName || 'SAN TEAM Operations';
  const aboutTeamStatus = aboutStruct.teamStatus || 'Operational 24/7';
  const aboutTeamDesc = aboutStruct.teamDesc || 'Dedicated to building next-gen web & streaming experiences.';

  // PRIVACY POLICY DATA
  const privTitle = privacyStruct.title || 'MaxPlay Privacy Statement';
  const privDate = privacyStruct.date || formatDate(data.updatedAt);
  const privIntro = privacyStruct.intro || 'We respect your personal privacy. MaxPlay and the SAN TEAM are strictly committed to safeguarding your personal data and giving you full control over your streaming history.';
  const privB1T = privacyStruct.b1T || 'Encrypted Sync';
  const privB1D = privacyStruct.b1D || 'End-to-end security via Firestore';
  const privB2T = privacyStruct.b2T || 'Zero Data Selling';
  const privB2D = privacyStruct.b2D || 'We never sell your data to advertisers';
  const privB3T = privacyStruct.b3T || 'User Control';
  const privB3D = privacyStruct.b3D || 'Clear watch history with 1-click';

  const privS1T = privacyStruct.s1T || '1. What Information We Collect';
  const privS1Items: string[] = privacyStruct.s1Items 
    ? privacyStruct.s1Items.split('\n').filter(Boolean)
    : [
        'Account Profile: Display Name, Email address, and optional avatar URL chosen by you.',
        'Playback Telemetry: Video progress positions and episode timestamps so you can resume where you left off.',
        'User Content: Public comments, replies, likes, and custom watchlist entries created inside the app.'
      ];
  const privS2T = privacyStruct.s2T || '2. How We Use Your Data';
  const privS2Desc = privacyStruct.s2Desc || 'Your information is used strictly to authenticate your login, save watch bookmarks, personalize homepage recommendations, enforce community comment standards, and improve video streaming bandwidth.';
  const privS3T = privacyStruct.s3T || '3. Data Storage & Protection';
  const privS3Desc = privacyStruct.s3Desc || 'All account credentials and preferences are securely persisted via Firebase Cloud Authentication and Google Cloud Firestore. We employ industry-standard encryption protocols in transit and at rest.';
  const privCallout = privacyStruct.callout || 'You have the right to clear your watch history or delete your account at any time from the Me settings menu.';

  // USER AGREEMENT DATA
  const agrTitle = agreementStruct.title || 'MaxPlay User Agreement & Terms';
  const agrSub = agreementStruct.sub || 'Terms of Service — SAN TEAM Network';
  const agrIntro = agreementStruct.intro || 'By accessing, browsing, or creating an account on MaxPlay, you legally agree to abide by these terms and conditions. Please read them attentively.';
  const agrA1T = agreementStruct.a1T || '1. Acceptance & Eligibility';
  const agrA1D = agreementStruct.a1D || 'By installing or streaming via MaxPlay, you certify that you are of legal age in your jurisdiction or are accessing the platform with parent/guardian guidance through Family Mode.';
  const agrA2T = agreementStruct.a2T || '2. Personal & Non-Commercial Use';
  const agrA2D = agreementStruct.a2D || 'MaxPlay content is provided solely for personal, non-commercial viewing. You may not re-broadcast, rip, sell, or publicly exhibit streams without authorization.';
  const agrA3T = agreementStruct.a3T || '3. Community Guidelines & Comment Rules';
  const agrA3Rules: string[] = agreementStruct.a3Rules
    ? agreementStruct.a3Rules.split('\n').filter(Boolean)
    : [
        'Harassment, hate speech, abusive language, or personal threats.',
        'Unsolicited advertising, spam links, bot scripts, or malicious phishing.',
        'Unmarked episode ending spoilers that ruin the experience for other members.'
      ];
  const agrA4T = agreementStruct.a4T || '4. Account Moderation & Suspensions';
  const agrA4D = agreementStruct.a4D || 'MaxPlay administrators reserve the right to review reported comments and suspend or terminate accounts that repeatedly violate community standards.';

  return (
    <div className="flex h-full w-full flex-col bg-[#0A0A0A] text-white overflow-hidden">
      {/* Top Sticky Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1C1C1E] bg-[#0A0A0A]/95 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181B] text-[#A1A1AA] hover:bg-[#27272A] hover:text-white transition active:scale-95 cursor-pointer"
            title="Back to Settings"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              {activeTab === 'about' && 'About MaxPlay'}
              {activeTab === 'privacy' && 'Privacy Policy'}
              {activeTab === 'agreement' && 'User Agreement'}
            </h1>
            <p className="text-[11px] text-[#71717A] flex items-center gap-1">
              Managed by <span className="font-semibold text-[#8B5CF6]">SAN TEAM</span>
            </p>
          </div>
        </div>

        {/* Tab Pill Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-[#141416] p-1 border border-[#27272A]">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'about'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Info className="h-3 w-3" />
            <span className="hidden sm:inline">About</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            <span className="hidden sm:inline">Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agreement')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'agreement'
                ? 'bg-[#8B5CF6] text-white shadow-md'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Terms</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin scrollbar-thumb-[#27272A] scrollbar-track-transparent">
        <div className="mx-auto max-w-2xl space-y-6 pb-12">

          {/* TAB 1: ABOUT US */}
          {activeTab === 'about' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Hero Banner Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917]/90 via-[#18181B] to-[#09090B] p-6 border border-[#292524] shadow-2xl">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#8B5CF6]/15 blur-3xl" />
                <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[#06B6D4]/10 blur-3xl" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <MaxPlayLogo size="lg" glow={true} className="mb-3" />

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/15 px-3 py-1 text-[11px] font-extrabold text-[#A78BFA] border border-[#8B5CF6]/30 mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    {aboutBadge}
                  </span>

                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {aboutTitle}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-[#A1A1AA] max-w-md leading-relaxed">
                    {aboutLead}
                  </p>
                </div>
              </div>

              {/* Vision & Mission */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3 shadow-md">
                <div className="flex items-center gap-2.5 text-[#06B6D4]">
                  <Zap className="h-5 w-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">{aboutMisTitle}</h3>
                </div>
                <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                  {aboutMisText}
                </p>
              </div>

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] space-y-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B5CF6]/20 text-[#A78BFA]">
                    <Film className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{aboutF1T}</h4>
                  <p className="text-[11px] text-[#71717A] leading-relaxed">
                    {aboutF1D}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] space-y-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10B981]/20 text-[#34D399]">
                    <Users className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{aboutF2T}</h4>
                  <p className="text-[11px] text-[#71717A] leading-relaxed">
                    {aboutF2D}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] space-y-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F59E0B]/20 text-[#FBBF24]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{aboutF3T}</h4>
                  <p className="text-[11px] text-[#71717A] leading-relaxed">
                    {aboutF3D}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] space-y-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EC4899]/20 text-[#F472B6]">
                    <Heart className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">{aboutF4T}</h4>
                  <p className="text-[11px] text-[#71717A] leading-relaxed">
                    {aboutF4D}
                  </p>
                </div>
              </div>

              {/* Team & Credits */}
              <div className="rounded-2xl bg-gradient-to-r from-[#18181B] to-[#121214] p-5 border border-[#27272A] flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#A78BFA]">Platform Ownership</div>
                  <div className="text-sm font-bold text-white">{aboutTeamName}</div>
                  <p className="text-[11px] text-[#71717A]">{aboutTeamDesc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#10B981]/20 px-3 py-1 text-xs font-bold text-[#10B981] border border-[#10B981]/30">
                    {aboutTeamStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="rounded-3xl bg-gradient-to-br from-[#131B1E] to-[#121214] p-6 border border-[#164E63]/40 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06B6D4]/20 text-[#06B6D4]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">{privTitle}</h2>
                    <p className="text-xs text-[#71717A]">Effective Date: {privDate}</p>
                  </div>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  {privIntro}
                </p>
              </div>

              {/* Highlights Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] text-center space-y-1">
                  <Lock className="h-5 w-5 text-[#10B981] mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">{privB1T}</div>
                  <div className="text-[10px] text-[#71717A]">{privB1D}</div>
                </div>
                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] text-center space-y-1">
                  <Eye className="h-5 w-5 text-[#8B5CF6] mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">{privB2T}</div>
                  <div className="text-[10px] text-[#71717A]">{privB2D}</div>
                </div>
                <div className="rounded-2xl bg-[#121214] p-4 border border-[#1C1C1E] text-center space-y-1">
                  <UserCheck className="h-5 w-5 text-[#06B6D4] mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">{privB3T}</div>
                  <div className="text-[10px] text-[#71717A]">{privB3D}</div>
                </div>
              </div>

              {/* Section 1 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[10px] font-extrabold text-[#A78BFA]">1</span>
                  {privS1T}
                </h3>
                <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
                  <p>When you create an account and stream on MaxPlay, we process information strictly required to run the service:</p>
                  <ul className="space-y-1.5 pl-2">
                    {privS1Items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] mt-0.5 shrink-0" />
                        <span>{item.replace(/^[-*]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 2 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06B6D4]/20 text-[10px] font-extrabold text-[#06B6D4]">2</span>
                  {privS2T}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {privS2Desc}
                </p>
              </div>

              {/* Section 3 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/20 text-[10px] font-extrabold text-[#10B981]">3</span>
                  {privS3T}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {privS3Desc}
                </p>
              </div>

              {/* Callout Box */}
              {privCallout && (
                <div className="rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 p-4 text-xs text-[#DDD6FE] leading-relaxed flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-[#A78BFA] mt-0.5 shrink-0" />
                  <span>{privCallout}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USER AGREEMENT */}
          {activeTab === 'agreement' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="rounded-3xl bg-gradient-to-br from-[#1C1814] to-[#121214] p-6 border border-[#78350F]/40 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/20 text-[#F59E0B]">
                    <Scale className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">{agrTitle}</h2>
                    <p className="text-xs text-[#71717A]">{agrSub}</p>
                  </div>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  {agrIntro}
                </p>
              </div>

              {/* Article 1 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F59E0B]/20 text-[10px] font-extrabold text-[#FBBF24]">1</span>
                  {agrA1T}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {agrA1D}
                </p>
              </div>

              {/* Article 2 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B5CF6]/20 text-[10px] font-extrabold text-[#A78BFA]">2</span>
                  {agrA2T}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {agrA2D}
                </p>
              </div>

              {/* Article 3 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#EF4444]/30 space-y-3 bg-red-950/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 text-red-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444]/20 text-[10px] font-extrabold text-[#F87171]">3</span>
                  {agrA3T}
                </h3>
                <div className="space-y-2 text-xs text-[#A1A1AA] leading-relaxed">
                  <p>To ensure a safe environment, the following behaviors are strictly banned across discussions:</p>
                  <ul className="space-y-1.5 pl-2">
                    {agrA3Rules.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444] mt-0.5 shrink-0" />
                        <span>{r.replace(/^[-*]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Article 4 */}
              <div className="rounded-2xl bg-[#121214] p-5 border border-[#1C1C1E] space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06B6D4]/20 text-[10px] font-extrabold text-[#06B6D4]">4</span>
                  {agrA4T}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {agrA4D}
                </p>
              </div>
            </div>
          )}

          {/* Footer Card with Contact Support & SAN TEAM badge */}
          <div className="rounded-2xl bg-[#121214]/60 border border-[#1C1C1E] p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#71717A]">
              <Mail className="h-3.5 w-3.5 text-[#8B5CF6]" />
              <span>Questions or concerns? Contact our team anytime.</span>
            </div>
            <p className="text-[10px] text-[#52525B]">
              © {new Date().getFullYear()} MaxPlay Platform. Engineered & Operated with pride by <strong className="text-[#A1A1AA]">SAN TEAM</strong>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

