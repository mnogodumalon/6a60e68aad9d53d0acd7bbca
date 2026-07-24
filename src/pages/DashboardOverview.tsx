import { useDashboardData } from '@/hooks/useDashboardData';
import type { Betriebsdaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDateTime } from '@/lib/formatters';
import { useClock, gruss, undoToast } from '@/lib/polish';
import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconGauge, IconFlame } from '@tabler/icons-react';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import {
  TableWidget,
  TableSkeleton,
  TableError,
  type TableColumn,
  type TableRow,
} from '@/components/widgets/TableWidget';
import {
  ChartWidget,
  ChartSkeleton,
  type ChartRow,
} from '@/components/widgets/ChartWidget';
import {
  RecordOverlay,
  RecordHeader,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BetriebsdatenDetails } from '@/components/details/BetriebsdatenDetails';
import { BetriebsdatenDialog } from '@/components/dialogs/BetriebsdatenDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a60e68aad9d53d0acd7bbca';
const REPAIR_ENDPOINT = '/claude/build/repair';


export default function DashboardOverview() {
  const {
    betriebsdaten, setBetriebsdaten,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();
  const overlay = useRecordOverlayStack<{ type: string; record: Betriebsdaten }>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Betriebsdaten | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Betriebsdaten | null>(null);
  const [bereichFilter, setBereichFilter] = useState<string | null>(null);

  // ALL hooks before early returns
  const today = format(clock, 'yyyy-MM-dd');

  const todayEntries = useMemo(
    () => betriebsdaten.filter(r => (r.fields.zeitstempel ?? '').startsWith(today)),
    [betriebsdaten, today],
  );

  const recentEntries = useMemo(
    () => [...betriebsdaten]
      .sort((a, b) => (b.fields.zeitstempel ?? '').localeCompare(a.fields.zeitstempel ?? ''))
      .slice(0, 6),
    [betriebsdaten],
  );

  const filteredByBereich = useMemo(
    () => bereichFilter
      ? betriebsdaten.filter(r => r.fields.messgroesse === bereichFilter)
      : betriebsdaten,
    [betriebsdaten, bereichFilter],
  );

  const chartRows = useMemo<ChartRow<Betriebsdaten>[]>(
    () => betriebsdaten.map(r => ({ id: `betriebsdaten:${r.record_id}`, data: r })),
    [betriebsdaten],
  );

  const tableRows = useMemo<TableRow<Betriebsdaten>[]>(
    () => filteredByBereich
      .map(r => ({ id: `betriebsdaten:${r.record_id}`, data: r })),
    [filteredByBereich],
  );

  const columns = useMemo<TableColumn<Betriebsdaten>[]>(() => [
    {
      key: 'zeitstempel',
      label: 'Zeitstempel',
      accessor: r => r.data.fields.zeitstempel,
      format: 'datetime',
      filterable: true,
      priority: 100,
      cardRole: 'subtitle',
    },
    {
      key: 'messgroesse',
      label: 'Messgröße',
      accessor: r => r.data.fields.messgroesse,
      format: 'pill',
      filterable: true,
      priority: 100,
      cardRole: 'title',
    },
    {
      key: 'wert',
      label: 'Messwert',
      accessor: r => r.data.fields.wert,
      format: 'number',
      aggregate: 'avg',
    },
    {
      key: 'einheit',
      label: 'Einheit',
      accessor: r => r.data.fields.einheit,
      format: 'text',
    },
  ], []);

  const handleCreate = useCallback(async (fields: Betriebsdaten['fields']) => {
    await LivingAppsService.createBetriebsdatenEntry(fields);
    fetchAll();
  }, [fetchAll]);

  const handleEdit = useCallback(async (fields: Betriebsdaten['fields']) => {
    if (!editRecord) return;
    const snapshot = betriebsdaten;
    setBetriebsdaten(prev => prev.map(r =>
      r.record_id === editRecord.record_id ? { ...r, fields: { ...r.fields, ...fields } } : r
    ));
    undoToast('Eintrag aktualisiert', () => {
      setBetriebsdaten(snapshot);
      void LivingAppsService.updateBetriebsdatenEntry(editRecord.record_id, editRecord.fields);
    });
    LivingAppsService.updateBetriebsdatenEntry(editRecord.record_id, fields).catch(() => fetchAll());
  }, [editRecord, betriebsdaten, setBetriebsdaten, fetchAll]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const snapshot = betriebsdaten;
    setBetriebsdaten(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    undoToast('Eintrag gelöscht', () => {
      setBetriebsdaten(snapshot);
    });
    LivingAppsService.deleteBetriebsdatenEntry(deleteTarget.record_id).catch(() => fetchAll());
    setDeleteTarget(null);
    if (overlay.top?.record?.record_id === deleteTarget.record_id) overlay.close();
  }, [deleteTarget, betriebsdaten, setBetriebsdaten, fetchAll, overlay]);

  const openEdit = useCallback((r: Betriebsdaten) => {
    setEditRecord(r);
    setDialogOpen(true);
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const current = overlay.top?.record;

  // Context line
  const bereichCounts = betriebsdaten.reduce<Record<string, number>>((acc, r) => {
    const k = r.fields.messgroesse ?? 'sonstiges';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const aktiveBereiche = Object.keys(bereichCounts).length;
  const contextLine = betriebsdaten.length === 0
    ? 'Noch keine Betriebsdaten erfasst — starte jetzt mit der ersten Messung.'
    : `${betriebsdaten.length} Messwerte erfasst, heute ${todayEntries.length} neu — ${aktiveBereiche} Bereiche aktiv.`;

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Messwert erfassen
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          <StatStrip>
            <StatStripItem
              title="Gesamt"
              value={betriebsdaten.length}
              icon={<IconGauge size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title="Heute erfasst"
              value={todayEntries.length}
              icon={<IconFlame size={16} className="shrink-0" />}
              tone={todayEntries.length > 0 ? 'success' : 'default'}
            />
            {Object.entries(bereichCounts).slice(0, 6).map(([key, count]) => (
              <StatStripItem
                key={key}
                title={key}
                value={count}
                tone={bereichFilter === key ? 'primary' : 'default'}
                onClick={() => setBereichFilter(f => f === key ? null : key)}
                active={bereichFilter === key}
              />
            ))}
          </StatStrip>
        }
        primary={
          betriebsdaten.length === 0 ? (
            <EmptyState onAdd={() => { setEditRecord(null); setDialogOpen(true); }} />
          ) : (
            <TableWidget
              columns={columns}
              rows={tableRows}
              initialSort={{ key: 'zeitstempel', dir: 'desc' }}
              searchPlaceholder="Messwert suchen …"
              exportable
              actions={[
                {
                  icon: IconPencil,
                  label: 'Bearbeiten',
                  onClick: row => openEdit(row.data),
                },
                {
                  icon: IconTrash,
                  label: 'Löschen',
                  tone: 'destructive',
                  onClick: row => setDeleteTarget(row.data),
                },
              ]}
              onRowClick={row => overlay.replace({ type: 'betriebsdaten', record: row.data })}
            />
          )
        }
        aside={
          <>
            <WorkList
              title="Zuletzt erfasst"
              icon={<IconGauge size={14} className="shrink-0" />}
              items={recentEntries.map(r => ({
                id: r.record_id,
                title: r.fields.messgroesse ?? '—',
                secondLine: (
                  <>
                    <span className="text-muted-foreground">{r.fields.einheit ?? '—'}</span>
                    {r.fields.wert != null && (
                      <span className="ml-1 font-medium">
                        {r.fields.wert}{r.fields.einheit ? ` ${r.fields.einheit}` : ''}
                      </span>
                    )}
                  </>
                ),
                action: {
                  label: <IconPencil size={14} />,
                  onClick: () => openEdit(r),
                },
              }))}
              onItemClick={id => {
                const r = betriebsdaten.find(x => x.record_id === id);
                if (r) overlay.replace({ type: 'betriebsdaten', record: r });
              }}
              empty={{
                text: 'Noch keine Messwerte — erfasse den ersten Wert.',
                action: { label: '+ Erfassen', onClick: () => { setEditRecord(null); setDialogOpen(true); } },
              }}
            />
            <ChartWidget
              title="Messungen je Bereich"
              rows={chartRows}
              dimension={{
                kind: 'category',
                accessor: r => r.data.fields.messgroesse,
                label: 'Messgröße',
              }}
            />
          </>
        }
      />

      {/* Record overlay */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        onEdit={current ? () => openEdit(current) : undefined}
        ariaLabel="Betriebsdaten"
      >
        {current && (
          <>
            <RecordHeader
              title={current.fields.messgroesse ?? '—'}
              subtitle={`${current.fields.einheit ?? '—'} · ${formatDateTime(current.fields.zeitstempel)}`}
            />
            <BetriebsdatenDetails record={current} />
          </>
        )}
      </RecordOverlay>

      {/* Create / Edit dialog */}
      <BetriebsdatenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Betriebsdaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Betriebsdaten']}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Messwert „${deleteTarget?.fields.messgroesse ?? '—'}" wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-[27px] bg-card shadow-lg">
      <IconGauge size={48} className="text-muted-foreground" stroke={1.5} />
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Noch keine Betriebsdaten</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Erfasse den ersten Messwert für Fermenter, BHKW oder einen anderen Bereich.
        </p>
      </div>
      <Button onClick={onAdd}>
        <IconPlus size={16} className="mr-1.5 shrink-0" />
        Ersten Messwert erfassen
      </Button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
