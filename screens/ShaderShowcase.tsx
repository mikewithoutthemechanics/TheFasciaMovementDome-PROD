
import React from 'react';
import { Header, HeroContent, PulsingCircle, ShaderBackground } from '../components/ui/shaders-hero-section';

export const ShaderShowcase: React.FC = () => {
  return (
    <ShaderBackground>
      <Header />
      <HeroContent />
      <PulsingCircle />
    </ShaderBackground>
  );
};
