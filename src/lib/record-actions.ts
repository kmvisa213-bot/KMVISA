import { supabase } from "@/lib/supabase";

// Shared record operations used by every dashboard section.
// Archiving keeps the record and its relationships. Deleting is blocked when
// deleting would break or lose linked records.

export type ArchivableTable =
  | "clients"
  | "agencies"
  | "agency_representatives"
  | "service_requests";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setArchived(
  table: ArchivableTable,
  id: string,
  archived: boolean
): Promise<ActionResult> {
  const { error } = await supabase
    .from(table)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function countLinked(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const requests = await countLinked("service_requests", "client_id", id);
    if (requests > 0) {
      return {
        ok: false,
        error: `لا يمكن حذف الزبون لأن له ${requests} طلباً. أرشِفه بدلاً من ذلك.`,
      };
    }
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteAgency(id: string): Promise<ActionResult> {
  try {
    const requests = await countLinked("service_requests", "agency_id", id);
    if (requests > 0) {
      return {
        ok: false,
        error: `لا يمكن حذف الوكالة لأن لها ${requests} طلباً. أرشِفها بدلاً من ذلك.`,
      };
    }
    const reps = await countLinked("agency_representatives", "agency_id", id);
    if (reps > 0) {
      return {
        ok: false,
        error: `لا يمكن حذف الوكالة لأن لها ${reps} ممثلاً. احذف الممثلين أولاً أو أرشف الوكالة.`,
      };
    }
    const { error } = await supabase.from("agencies").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteRepresentative(id: string): Promise<ActionResult> {
  try {
    const requests = await countLinked("service_requests", "representative_id", id);
    if (requests > 0) {
      return {
        ok: false,
        error: `لا يمكن حذف الممثل لأن له ${requests} طلباً. أرشِفه بدلاً من ذلك.`,
      };
    }
    const { error } = await supabase.from("agency_representatives").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Deletes a request together with its own detail rows.
// Refused when the request has financial records (invoices or payments).
export async function deleteRequest(id: string): Promise<ActionResult> {
  try {
    const invoices = await countLinked("invoices", "request_id", id);
    const payments = await countLinked("payments", "request_id", id);
    if (invoices > 0 || payments > 0) {
      return {
        ok: false,
        error: "لا يمكن حذف الطلب لأن له فواتير أو دفعات. أرشِفه بدلاً من ذلك.",
      };
    }

    const steps: { table: string; column: string }[] = [
      { table: "intake_matches", column: "intake_request_id" },
      { table: "ratings", column: "request_id" },
      { table: "tasks", column: "request_id" },
      { table: "expenses", column: "request_id" },
      { table: "quotes", column: "request_id" },
      { table: "visa_stages", column: "request_id" },
      { table: "hotel_details", column: "request_id" },
      { table: "flight_details", column: "request_id" },
      { table: "visa_details", column: "request_id" },
      { table: "request_status_history", column: "request_id" },
    ];

    for (const step of steps) {
      const { error } = await supabase.from(step.table).delete().eq(step.column, id);
      if (error) return { ok: false, error: error.message };
    }

    const { error } = await supabase.from("service_requests").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Native confirmation dialog, works on desktop and mobile browsers.
export function confirmDelete(what: string): boolean {
  return window.confirm(
    `هل أنت متأكد من حذف ${what} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
  );
}
