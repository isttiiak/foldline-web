"use client";

import { createContext, useContext } from "react";

import { DEFAULT_RATING_SCALE, type RatingScale } from "../schemas";

const RatingScaleContext = createContext<RatingScale>(DEFAULT_RATING_SCALE);

/** Shares the reader's rating scale with every rating in the app. */
export function RatingScaleProvider({
  scale,
  children,
}: {
  scale: RatingScale;
  children: React.ReactNode;
}) {
  return (
    <RatingScaleContext.Provider value={scale}>
      {children}
    </RatingScaleContext.Provider>
  );
}

export function useRatingScale(): RatingScale {
  return useContext(RatingScaleContext);
}
