'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/** 主題用靜態 PNG 角色（取代 Rive） */
export const ClassroomQuizStaticMascot = forwardRef<HTMLDivElement, Props>(
  function ClassroomQuizStaticMascot({ src, alt, className }, ref) {
    return (
      <div ref={ref} className={cn('classroom-quiz-mascot-static', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="classroom-quiz-mascot-img classroom-quiz-mascot-img--static"
          draggable={false}
        />
      </div>
    );
  },
);
