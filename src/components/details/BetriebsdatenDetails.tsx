import type { Betriebsdaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface BetriebsdatenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Betriebsdaten;
}

export function BetriebsdatenDetails({
  record,
}: BetriebsdatenDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('betriebsdaten', 'zeitstempel')} value={record.fields.zeitstempel} format="datetime" />
        <RecordField label={fieldLabel('betriebsdaten', 'messgroesse')} value={record.fields.messgroesse} format="text" />
        <RecordField label={fieldLabel('betriebsdaten', 'wert')} value={record.fields.wert} format="text" />
        <RecordField label={fieldLabel('betriebsdaten', 'einheit')} value={record.fields.einheit} format="text" />
        <RecordField label={fieldLabel('betriebsdaten', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('betriebsdaten', 'sekunde')} value={record.fields.sekunde} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BETRIEBSDATEN} recordId={record.record_id} />
    </>
  );
}
