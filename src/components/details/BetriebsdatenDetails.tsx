import type { Betriebsdaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface BetriebsdatenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Betriebsdaten;
}

export function BetriebsdatenDetails({
  record,
}: BetriebsdatenDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Zeitstempel" value={record.fields.zeitstempel} format="datetime" />
        <RecordField label="Bereich" value={record.fields.bereich} format="pill" />
        <RecordField label="Messgröße" value={record.fields.messgroesse} format="text" />
        <RecordField label="Messwert" value={record.fields.wert} format="text" />
        <RecordField label="Einheit" value={record.fields.einheit} format="text" />
        <RecordField label="Bemerkung" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BETRIEBSDATEN} recordId={record.record_id} />
    </>
  );
}
