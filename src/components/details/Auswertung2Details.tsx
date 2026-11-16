import type { Auswertung2 } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface Auswertung2DetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Auswertung2;
}

export function Auswertung2Details({
  record,
}: Auswertung2DetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('auswertung_2', 'zeitstempel')} value={record.fields.zeitstempel} format="datetime" />
        <RecordField label={fieldLabel('auswertung_2', 'sekunde')} value={record.fields.sekunde} format="text" />
        <RecordField label={fieldLabel('auswertung_2', 'messgroesse')} value={record.fields.messgroesse} format="text" />
        <RecordField label={fieldLabel('auswertung_2', 'wert')} value={record.fields.wert} format="text" />
        <RecordField label={fieldLabel('auswertung_2', 'einheit')} value={record.fields.einheit} format="text" />
        <RecordField label={fieldLabel('auswertung_2', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUSWERTUNG_2} recordId={record.record_id} readOnly={!perms.canWrite('auswertung_2')} />
    </>
  );
}
