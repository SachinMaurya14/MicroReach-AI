import React from 'react';
import { FAQ_ITEMS } from '../data/landingContent';
import { Accordion } from '../components/ui/Accordion';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

export const FAQSection: React.FC = () => {
  return (
    <section id="faq" className="py-20 md:py-24 bg-white border-t border-[#E5E7EB]">
      <Container>
        <SectionHeading
          title="Frequently Asked Questions"
          subtitle="Everything you need to understand the MicroReach AI workflow."
        />

        <div className="mx-auto mt-12 max-w-[750px]">
          <Accordion items={FAQ_ITEMS} />
        </div>
      </Container>
    </section>
  );
};
