import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, PlayCircle, Mail, ExternalLink, Quote } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { HeroGlow } from '../../components/HeroGlow';
import { getService } from '../../config/modules';
import { LEARN_MORE } from '../../config/learnMore';
import { SERVICE_ICON } from '../../config/serviceIcons';
import type { ServiceKey } from '../../types';
import { useOrgBySlug } from '../../hooks/useOrgs';
import { useAuth } from '../../auth/AuthContext';

export function LearnMorePage() {
  const { orgSlug, serviceKey } = useParams<{ orgSlug: string; serviceKey: string }>();
  const { user } = useAuth();
  const { data: org } = useOrgBySlug(orgSlug);
  const svc = serviceKey ? getService(serviceKey as ServiceKey) : null;
  const content = serviceKey ? LEARN_MORE[serviceKey as ServiceKey] : undefined;

  if (!svc || !content) return <Navigate to={orgSlug ? `/onboarding/${orgSlug}` : '/'} replace />;

  const Icon = SERVICE_ICON[svc.key];
  const subject = `Adding ${svc.label} to my Serenium plan`;
  const body = org && user
    ? `Hi Serenium team,\n\nI'd like to learn more about adding ${svc.label} for ${org.businessName}.\n\nThanks,\n${user.fullName}`
    : `Hi Serenium team,\n\nI'd like to learn more about adding ${svc.label}.\n\nThanks`;
  const mailto = `mailto:contact@sereniumai.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <AppShell>
      <div className="relative">
        <HeroGlow />

        <div className="mx-auto max-w-5xl px-4 md:px-6 pt-6 md:pt-8">
          <Link
            to={orgSlug ? `/onboarding/${orgSlug}` : '/'}
            className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>

        {/* HERO */}
        <section className="relative mx-auto max-w-5xl px-4 md:px-6 pt-8 md:pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-orange/10 text-orange">
                <Icon className="h-5 w-5" />
              </div>
              <p className="eyebrow">{content.eyebrow}</p>
            </div>
            <h1 className="font-display font-black text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.02] tracking-[-0.035em] mb-5">
              {content.headline}
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-3xl leading-relaxed">
              {content.subhead}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <a
                href={mailto}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange hover:bg-orange-hover text-white font-semibold transition-colors"
              >
                <Mail className="h-4 w-4" /> Talk to us about adding {svc.label}
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border-subtle hover:border-border-emphasis text-white/85 hover:text-white font-medium transition-all"
              >
                See how it works
              </a>
            </div>
          </motion.div>
        </section>

        {/* STATS */}
        <section className="relative mx-auto max-w-5xl px-4 md:px-6 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {content.stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
                className="rounded-2xl border border-border-subtle bg-bg-secondary/40 p-5 md:p-6"
              >
                <p className="font-display font-black text-[clamp(1.75rem,4vw,2.5rem)] tracking-[-0.025em] text-orange leading-none">
                  {s.value}
                </p>
                <p className="text-xs md:text-sm text-white/65 mt-2 leading-snug">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* VIDEO */}
        <section className="relative mx-auto max-w-5xl px-4 md:px-6 pb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative aspect-video rounded-2xl overflow-hidden border border-border-subtle bg-bg-secondary"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange/15 via-bg-secondary to-bg" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-orange/15 border border-orange/30 flex items-center justify-center">
                <PlayCircle className="h-8 w-8 text-orange" />
              </div>
              <p className="text-white/70 text-sm max-w-md">{content.videoCaption}</p>
            </div>
          </motion.div>
        </section>

        {/* WHAT YOU GET */}
        <section className="relative mx-auto max-w-5xl px-4 md:px-6 pb-14">
          <p className="eyebrow mb-6">What you get</p>
          <div className="grid md:grid-cols-2 gap-3">
            {content.outcomes.map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.35, delay: 0.04 * i }}
                className="flex items-start gap-3 p-4 rounded-xl border border-border-subtle bg-bg-secondary/40"
              >
                <CheckCircle2 className="h-5 w-5 text-orange shrink-0 mt-0.5" />
                <span className="text-white/85 leading-relaxed">{o}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="relative mx-auto max-w-5xl px-4 md:px-6 pb-14 scroll-mt-8">
          <p className="eyebrow mb-2">How it works</p>
          <h2 className="font-display font-black text-[clamp(1.5rem,3.5vw,2.25rem)] leading-tight tracking-[-0.02em] mb-8">
            From kickoff to booked jobs in three steps.
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {content.process.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: 0.06 * i }}
                className="card p-6"
              >
                <p className="text-orange font-semibold text-sm mb-2">{step.title}</p>
                <p className="text-white/75 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PROOF QUOTE */}
        <section className="relative mx-auto max-w-5xl px-4 md:px-6 pb-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-border-subtle bg-gradient-to-br from-orange/[0.06] via-bg-secondary/60 to-transparent p-8 md:p-10"
          >
            <Quote className="h-8 w-8 text-orange/60 mb-4" />
            <p className="font-display font-bold text-xl md:text-2xl tracking-[-0.01em] leading-snug max-w-3xl mb-3">
              {content.proof.headline}
            </p>
            <p className="text-white/70 max-w-3xl leading-relaxed">
              {content.proof.body}
            </p>
          </motion.div>
        </section>

        {/* PORTFOLIO (Website only) */}
        {content.portfolio && content.portfolio.length > 0 && (
          <section className="relative mx-auto max-w-5xl px-4 md:px-6 pb-14">
            <p className="eyebrow mb-2">Recent work</p>
            <h2 className="font-display font-black text-[clamp(1.5rem,3.5vw,2.25rem)] leading-tight tracking-[-0.02em] mb-8">
              Sites we have built. Live, fast, converting.
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {content.portfolio.map((p, i) => (
                <motion.a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: 0.06 * i }}
                  className="card group block hover:border-orange/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                >
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4 border border-border-subtle bg-bg-secondary">
                    <iframe
                      src={p.url}
                      title={p.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full pointer-events-none origin-top-left"
                      style={{ transform: 'scale(0.5)', width: '200%', height: '200%' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-transparent to-transparent pointer-events-none" />
                  </div>
                  <h3 className="font-display font-bold text-lg tracking-[-0.01em] mb-2 flex items-center gap-2">
                    {p.name}
                    <ExternalLink className="h-3.5 w-3.5 text-white/40 group-hover:text-orange transition-colors" />
                  </h3>
                  <p className="text-sm text-white/65 leading-relaxed mb-3">{p.description}</p>
                  <span className="text-xs text-white/45 font-mono">{p.url.replace(/^https?:\/\//, '')}</span>
                </motion.a>
              ))}
            </div>
          </section>
        )}

        {/* CLOSER + CTA */}
        <section className="relative mx-auto max-w-5xl px-4 md:px-6 pb-20">
          <div className="rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/10 via-orange/5 to-transparent p-8 md:p-12">
            <p className="text-white/85 text-base md:text-xl leading-relaxed max-w-3xl mb-7 font-display tracking-[-0.005em]">
              {content.closer}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={mailto}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange hover:bg-orange-hover text-white font-semibold transition-colors"
              >
                <Mail className="h-4 w-4" /> Talk to us about adding {svc.label} <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to={orgSlug ? `/onboarding/${orgSlug}` : '/'}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border-subtle hover:border-border-emphasis text-white/80 hover:text-white font-medium transition-all"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
