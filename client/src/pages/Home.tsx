import '@/styles/landing.css';
import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import TrustStrip from '@/components/landing/TrustStrip';
import FeatureRows from '@/components/landing/FeatureRows';
import TemplateStrip from '@/components/landing/TemplateStrip';
import ClosingCta from '@/components/landing/ClosingCta';
import LandingFooter from '@/components/landing/LandingFooter';

const Home = () => (
  <div className="landing">
    <LandingNav />
    <main id="main" tabIndex={-1}>
      <Hero />
      <TrustStrip />
      <FeatureRows />
      <TemplateStrip />
      <ClosingCta />
    </main>
    <LandingFooter />
  </div>
);

export default Home;
