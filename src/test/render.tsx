import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../messages/en.json";

/** Render with the real English messages, like the app does. */
export function renderWithIntl(
  ui: React.ReactElement,
  options?: RenderOptions,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}
