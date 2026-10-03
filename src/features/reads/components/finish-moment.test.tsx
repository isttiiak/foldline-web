import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { renderWithIntl } from "@/test/render";

import { FinishMoment } from "./finish-moment";

const updateRead = vi.hoisted(() => vi.fn());
vi.mock("../server/actions", () => ({ updateReadAction: updateRead }));

const readId = "3f0c1b7e-8d3a-4d6e-9b53-0a4a7e5c9d11";

function show(
  kind: "finished" | "dnf",
  extra: Partial<Parameters<typeof FinishMoment>[0]> = {},
) {
  const onOpenChange = vi.fn();
  renderWithIntl(
    <FinishMoment
      open
      onOpenChange={onOpenChange}
      kind={kind}
      title="Dune"
      readId={readId}
      rating={null}
      reflection={null}
      {...extra}
    />,
  );
  return onOpenChange;
}

describe("FinishMoment", () => {
  beforeEach(() => {
    updateRead.mockReset();
    updateRead.mockResolvedValue({ status: "saved", savedAt: 1 });
  });

  test("a finish is warm and offers a rating", () => {
    show("finished");
    expect(
      screen.getByRole("dialog", { name: "You finished Dune" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Your rating")).toBeInTheDocument();
  });

  test("setting a book down is gentle and has no rating", () => {
    show("dnf");
    expect(
      screen.getByRole("dialog", { name: "You set Dune down" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your rating")).not.toBeInTheDocument();
    expect(screen.getByText(/completely fine/)).toBeInTheDocument();
  });

  test("Not now saves nothing", async () => {
    const onOpenChange = show("finished");
    fireEvent.change(screen.getByLabelText("A few words for future you"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(updateRead).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("Save sends trimmed words and closes", async () => {
    const onOpenChange = show("finished");
    fireEvent.change(screen.getByLabelText("A few words for future you"), {
      target: { value: "  Spice and sand.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(updateRead).toHaveBeenCalledWith({
        readId,
        reflection: "Spice and sand.",
      }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  test("Save with nothing new just closes", async () => {
    const onOpenChange = show("dnf");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(updateRead).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("a failed save stays open and says why", async () => {
    updateRead.mockResolvedValue({ status: "error", reason: "generic" });
    const onOpenChange = show("finished");
    fireEvent.change(screen.getByLabelText("A few words for future you"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nothing was changed/,
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
