import React from 'react';
import { Container } from '../ui/Container';

export const AnnouncementBar: React.FC = () => {
  return (
    <div className="bg-[#F5F3FF] border-b border-[#EDE9FE] py-2 text-center">
      <Container>
        <p className="text-xs sm:text-[13px] font-medium text-[#5B21B6] leading-snug">
          MicroReach AI — A smarter way to discover, qualify and reach micro-influencers.
        </p>
      </Container>
    </div>
  );
};
