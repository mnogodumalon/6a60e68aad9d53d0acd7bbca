/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'betriebsdaten'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.betriebsdaten.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.betriebsdaten.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.betriebsdaten.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.betriebsdaten              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   betriebsdaten: zeitstempel, messgroesse, wert, einheit, bemerkung
 */
import { useState, type ReactNode } from 'react';
import type { Betriebsdaten } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BetriebsdatenDialog, type BetriebsdatenDialogDefaults } from '@/components/dialogs/BetriebsdatenDialog';
import { BetriebsdatenDetails } from '@/components/details/BetriebsdatenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'betriebsdaten'; record: Betriebsdaten };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  betriebsdaten: EntityCrudApi<Betriebsdaten, BetriebsdatenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { betriebsdaten: Betriebsdaten[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [betriebsdatenDialog, setBetriebsdatenDialog] = useState<{ defaults?: BetriebsdatenDialogDefaults; editing?: Betriebsdaten } | null>(null);

  function detailBetriebsdaten(record: Betriebsdaten, push = false) {
    const item: OverlayItem = { type: 'betriebsdaten', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBetriebsdaten(fields: Betriebsdaten['fields']) {
    const editing = betriebsdatenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBetriebsdaten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBetriebsdatenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('betriebsdaten')} — ${t('crud_updated')}`, async () => {
        data.setBetriebsdaten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBetriebsdatenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBetriebsdatenEntry(fields);
      undoToast(`${appLabel('betriebsdaten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <BetriebsdatenDialog
        open={betriebsdatenDialog !== null}
        onClose={() => setBetriebsdatenDialog(null)}
        onSubmit={submitBetriebsdaten}
        defaultValues={betriebsdatenDialog?.defaults}
        recordId={betriebsdatenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Betriebsdaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Betriebsdaten']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'betriebsdaten') {
            return (
              <>
                <RecordHeader title={top.record.fields.messgroesse ?? appLabel('betriebsdaten')} subtitle={top.record.fields.zeitstempel ? formatDate(top.record.fields.zeitstempel) : undefined} />
                <BetriebsdatenDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'betriebsdaten') setBetriebsdatenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    betriebsdaten: {
      openCreate: (defaults?: BetriebsdatenDialogDefaults) => setBetriebsdatenDialog({ defaults }),
      openEdit: (record: Betriebsdaten) => setBetriebsdatenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Betriebsdaten) => detailBetriebsdaten(record, false),
    },
    enriched: { betriebsdaten: data.betriebsdaten },
  };
}
