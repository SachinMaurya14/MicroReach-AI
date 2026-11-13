import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { RESOURCES_LIST } from '../data/landingContent';
import { ResourceItem } from '../types/landing';
import { Container } from '../components/ui/Container';
import { SectionHeading } from '../components/ui/SectionHeading';

interface ResourcesSectionProps {
  onSelectResource: (resource: ResourceItem) => void;
}

export const ResourcesSection: React.FC<ResourcesSectionProps> = ({ onSelectResource }) => {
  return (
    <section id="resources" className="py-20 md:py-24 bg-[#F9FAFB] border-t border-[#E5E7EB]">
      <Container>
        <SectionHeading title="Resources to help you build better creator campaigns" />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {RESOURCES_LIST.map((resource) => (
            <article
              key={resource.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-7 hover:border-[#DDD6FE] transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5B21B6]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{resource.category}</span>
                </div>
                <h3 className="mt-3 text-xl font-bold text-[#1F2937] leading-snug">
                  {resource.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#4B5563]">
                  {resource.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => onSelectResource(resource)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B21B6] hover:text-[#7C3AED] transition-colors cursor-pointer"
                >
                  <span>{resource.readActionLabel}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};
