import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../utils/apiError';

const API_URL = import.meta.env.VITE_API_URL;

interface DriveStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

interface BackupLog {
  id: number;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'failed';
  trigger: 'schedule' | 'manual';
  fileName?: string;
  sizeBytes?: number;
  driveWebViewLink?: string;
  errorMessage?: string;
  // uploads/ (NID images, etc.) isn't in Postgres, so it's archived
  // separately alongside the DB dump -- not every row has one, e.g. runs
  // from before this existed, or a fresh install with no uploads/ yet.
  uploadsFileName?: string;
  uploadsSizeBytes?: number;
  uploadsDriveWebViewLink?: string;
}

const cardClass =
  'bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]';

const primaryBtnClass =
  'h-10 px-4 flex items-center justify-center gap-2 rounded-lg bg-[#e21e53] text-white font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#c01745] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const secondaryBtnClass =
  'h-10 px-4 flex items-center justify-center gap-2 rounded-lg bg-white border border-[#e8e8e8] text-[#1E1E1E] font-bold text-[0.875rem] transition-all duration-200 hover:bg-[#f8fafc] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function SystemSettings() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [history, setHistory] = useState<BackupLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [disconnecting, setDisconnecting] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await axios.get<DriveStatus>(`${API_URL}/settings/google-drive/status`);
      setStatus(res.data);
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
      console.error('Failed to load Google Drive status', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get<BackupLog[]>(`${API_URL}/settings/backups`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load backup history', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadHistory();

    // Google redirects the browser back to this page with one of these
    // query flags after a connect attempt -- surface it once, then strip it
    // from the URL so a refresh doesn't re-show the same banner.
    const params = new URLSearchParams(window.location.search);
    const drive = params.get('drive');
    if (drive === 'connected') {
      setBanner({ type: 'success', text: 'Google Drive connected.' });
    } else if (drive === 'denied') {
      setBanner({ type: 'error', text: 'Google Drive connection was cancelled.' });
    } else if (drive === 'error') {
      setBanner({ type: 'error', text: params.get('message') || 'Failed to connect Google Drive.' });
    }
    if (drive) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadStatus, loadHistory]);

  const handleConnect = () => {
    // Full top-level navigation, not axios -- the backend responds with a
    // redirect to Google's consent screen, which only makes sense as a real
    // browser navigation.
    window.location.href = `${API_URL}/settings/google-drive/connect`;
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Drive? Scheduled backups will stop until it is reconnected.')) return;
    setDisconnecting(true);
    setActionError(null);
    try {
      await axios.post(`${API_URL}/settings/google-drive/disconnect`);
      await loadStatus();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRunNow = async () => {
    setRunningNow(true);
    setActionError(null);
    setBanner(null);
    try {
      const res = await axios.post<BackupLog>(`${API_URL}/settings/backups/run-now`);
      setBanner(
        res.data.status === 'success'
          ? { type: 'success', text: 'Backup completed and uploaded to Google Drive.' }
          : { type: 'error', text: res.data.errorMessage || 'Backup failed.' },
      );
      await loadHistory();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not reach the server. Check the console.'));
    } finally {
      setRunningNow(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E1E1E] mb-2">System Settings</h2>
        <p className="text-[0.9rem] text-[#545454]">Configure system-wide variables and defaults.</p>
      </div>

      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-[0.85rem] font-semibold ${
            banner.type === 'success'
              ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)] text-[#16a34a]'
              : 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] text-[#ef4444]'
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className={cardClass}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(226,30,83,0.08)] text-[#e21e53]">
            <i className="fa-brands fa-google-drive" />
          </div>
          <div>
            <h3 className="text-[1.05rem] font-extrabold text-[#1E1E1E]">Google Drive Backup</h3>
            <p className="text-[0.8rem] text-[#545454]">
              Nightly database backups (plus uploaded files like NID images), uploaded automatically to a
              connected Google Drive account.
            </p>
          </div>
        </div>

        {statusError && <p className="mb-4 text-[0.85rem] font-semibold text-[#ef4444]">{statusError}</p>}
        {actionError && <p className="mb-4 text-[0.85rem] font-semibold text-[#ef4444]">{actionError}</p>}

        {statusLoading ? (
          <p className="text-[0.85rem] text-[#545454]">Checking connection…</p>
        ) : status?.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-4 py-3">
            <div>
              <p className="text-[0.85rem] font-bold text-[#1E1E1E]">
                <i className="fa-solid fa-circle-check mr-1.5 text-[#16a34a]" />
                Connected as {status.email}
              </p>
              {status.connectedAt && (
                <p className="text-[0.75rem] text-[#545454]">
                  Since {new Date(status.connectedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" className={secondaryBtnClass} onClick={handleRunNow} disabled={runningNow}>
                <i className="fa-solid fa-cloud-arrow-up" />
                {runningNow ? 'Backing up…' : 'Run Backup Now'}
              </button>
              <button type="button" className={secondaryBtnClass} onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e8e8e8] bg-[#f8fafc] px-4 py-3">
            <p className="text-[0.85rem] text-[#545454]">Not connected -- automated backups are paused.</p>
            <button type="button" className={primaryBtnClass} onClick={handleConnect}>
              <i className="fa-brands fa-google" />
              Connect Google Drive
            </button>
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="mb-4 text-[1.05rem] font-extrabold text-[#1E1E1E]">Backup History</h3>
        {historyLoading ? (
          <p className="text-[0.85rem] text-[#545454]">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-[0.85rem] text-[#545454]">No backups have run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[0.72rem] uppercase tracking-[0.05em] text-[#545454]">
                  <th className="py-2 pr-3 font-bold">Started</th>
                  <th className="py-2 pr-3 font-bold">Trigger</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Size</th>
                  <th className="py-2 pr-3 font-bold">File</th>
                  <th className="py-2 pr-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} className="border-b border-[#f1f1f1] last:border-0">
                    <td className="py-3 pr-3 whitespace-nowrap font-semibold text-[#545454]">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 capitalize text-[#545454]">{log.trigger}</td>
                    <td className="py-3 pr-3">
                      {log.status === 'success' ? (
                        <span className="rounded-full bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[0.7rem] font-bold text-[#16a34a]">
                          Success
                        </span>
                      ) : (
                        <span
                          className="rounded-full bg-[rgba(239,68,68,0.1)] px-2 py-0.5 text-[0.7rem] font-bold text-[#ef4444]"
                          title={log.errorMessage}
                        >
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-[#545454]">
                      <div className="flex flex-col gap-0.5">
                        <span>{formatBytes(log.sizeBytes)}</span>
                        {log.uploadsFileName && (
                          <span className="text-[0.72rem] opacity-70">+{formatBytes(log.uploadsSizeBytes)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col gap-1">
                        {log.driveWebViewLink ? (
                          <a
                            href={log.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[#e21e53] hover:underline"
                          >
                            {log.fileName ?? 'Open in Drive'}
                          </a>
                        ) : (
                          <span className="text-[#545454]" title={log.errorMessage}>
                            {log.fileName ?? '—'}
                          </span>
                        )}
                        {log.uploadsFileName && (
                          <a
                            href={log.uploadsDriveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[0.72rem] text-[#3b82f6] hover:underline"
                            title="Separate archive of the uploads/ folder (NID images, etc.) from this same backup run"
                          >
                            {log.uploadsFileName}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-col gap-1">
                        {log.driveWebViewLink && (
                          // Plain <a>, not axios -- the backend responds with
                          // Content-Disposition: attachment, so the browser
                          // downloads it directly without navigating away.
                          <a
                            href={`${API_URL}/settings/backups/${log.id}/download`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200"
                            title="Download the database dump"
                          >
                            <i className="fa-solid fa-download" />
                          </a>
                        )}
                        {log.uploadsFileName && (
                          <a
                            href={`${API_URL}/settings/backups/${log.id}/download-uploads`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8e8e8] text-[#545454] hover:bg-[#f8fafc] hover:text-[#1E1E1E] transition-colors duration-200"
                            title="Download the uploads/ (NID images) archive"
                          >
                            <i className="fa-solid fa-images" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
