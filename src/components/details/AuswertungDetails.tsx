import type { Auswertung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { usePermissions } from '@/lib/permissions';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface AuswertungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Auswertung;
}

export function AuswertungDetails({
  record,
}: AuswertungDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('auswertung', 'zeitstempel')} value={record.fields.zeitstempel} format="datetime" />
        <RecordField label={fieldLabel('auswertung', 'sekunde')} value={record.fields.sekunde} format="text" />
        <RecordField label={fieldLabel('auswertung', 'messgroesse')} value={record.fields.messgroesse} format="text" />
        <RecordField label={fieldLabel('auswertung', 'wert')} value={record.fields.wert} format="text" />
        <RecordField label={fieldLabel('auswertung', 'einheit')} value={record.fields.einheit} format="text" />
        <RecordField label={fieldLabel('auswertung', 'bemerkung')} value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUSWERTUNG} recordId={record.record_id} readOnly={!perms.canWrite('auswertung')} />
    </>
  );
}
