import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { LoanDirection, Ownership } from "../schemas";

export type Loan = {
  id: string;
  direction: LoanDirection;
  person: string;
  startedOn: string;
  dueOn: string | null;
  returnedOn: string | null;
  note: string | null;
};

export type Copy = {
  id: string;
  ownership: Ownership;
  editionId: string | null;
  location: string | null;
  acquiredOn: string | null;
  note: string | null;
  /** Newest first; an open one (no return date) comes first. */
  loans: Loan[];
};

const toLoan = (loan: {
  id: string;
  direction: LoanDirection;
  person: string;
  started_on: string;
  due_on: string | null;
  returned_on: string | null;
  note: string | null;
}): Loan => ({
  id: loan.id,
  direction: loan.direction,
  person: loan.person,
  startedOn: loan.started_on,
  dueOn: loan.due_on,
  returnedOn: loan.returned_on,
  note: loan.note,
});

const openFirst = (a: Loan, b: Loan) =>
  Number(a.returnedOn !== null) - Number(b.returnedOn !== null) ||
  b.startedOn.localeCompare(a.startedOn);

/** One book's copies with their loans. Empty when the read fails. */
export async function getCopies(workId: string): Promise<Copy[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("copies")
    .select(
      "id, ownership, edition_id, location, acquired_on, note, created_at, loans(id, direction, person, started_on, due_on, returned_on, note)",
    )
    .eq("work_id", workId)
    .order("created_at");
  if (error) {
    console.error(`[copies] read failed: ${error.message}`);
    return [];
  }
  return data.map((copy) => ({
    id: copy.id,
    ownership: copy.ownership,
    editionId: copy.edition_id,
    location: copy.location,
    acquiredOn: copy.acquired_on,
    note: copy.note,
    loans: copy.loans.map(toLoan).sort(openFirst),
  }));
}

export type OpenLoan = Loan & { workId: string; title: string };

/** Every loan still open, lent out and borrowed in, soonest due first. */
export async function getOpenLoans(): Promise<OpenLoan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loans")
    .select(
      "id, direction, person, started_on, due_on, returned_on, note, copies(work_id, works(title))",
    )
    .is("returned_on", null)
    .order("started_on", { ascending: false })
    .limit(500);
  if (error) {
    console.error(`[copies] open loans read failed: ${error.message}`);
    return [];
  }
  return data
    .flatMap((loan) =>
      loan.copies?.works
        ? [
            {
              ...toLoan(loan),
              workId: loan.copies.work_id,
              title: loan.copies.works.title,
            },
          ]
        : [],
    )
    .sort((a, b) => {
      if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
      return Number(a.dueOn === null) - Number(b.dueOn === null);
    });
}
