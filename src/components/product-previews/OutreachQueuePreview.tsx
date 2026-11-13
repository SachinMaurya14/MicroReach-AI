import React, { useState } from 'react';
import { OutreachStatus } from '../../types/landing';

interface QueueRow {
  id: string;
  influencer: string;
  email: string;
  campaign: string;
  messageStatus: string;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Skipped';
  sendingStatus: OutreachStatus;
  date: string;
}

const INITIAL_QUEUE_ROWS: QueueRow[] = [
  {
    id: 'q1',
    influencer: 'Creator A',
    email: 'creator-a-demo@example.invalid',
    campaign: 'GlowCare India',
    messageStatus: 'Email Draft (76w)',
    approvalStatus: 'Approved',
    sendingStatus: 'Sent',
    date: 'Demo Day 1',
  },
  {
    id: 'q2',
    influencer: 'Creator C',
    email: 'creator-c-demo@example.invalid',
    campaign: 'GlowCare India',
    messageStatus: 'Email Draft (68w)',
    approvalStatus: 'Pending Approval',
    sendingStatus: 'Pending Approval',
    date: 'Demo Day 1',
  },
  {
    id: 'q3',
    influencer: 'Creator B',
    email: 'Not Found',
    campaign: 'GlowCare India',
    messageStatus: 'IG DM (24w)',
    approvalStatus: 'Approved',
    sendingStatus: 'Manual DM',
    date: 'Demo Day 1',
  },
  {
    id: 'q4',
    influencer: 'Creator D',
    email: 'Not Found',
    campaign: 'GlowCare India',
    messageStatus: 'Not Generated',
    approvalStatus: 'Skipped',
    sendingStatus: 'Skipped',
    date: 'Demo Day 1',
  },
];

const statusPillClass: Record<OutreachStatus, string> = {
  Draft: 'bg-[#F3F4F6] text-[#4B5563]',
  'Pending Approval': 'bg-[#F5F3FF] text-[#5B21B6]',
  Approved: 'bg-[#D1FAE5] text-[#065F46]',
  Sent: 'bg-[#EDE9FE] text-[#5B21B6]',
  Failed: 'bg-[#FEE2E2] text-[#991B1B]',
  Skipped: 'bg-[#F3F4F6] text-[#6B7280]',
  'Manual DM': 'bg-[#FEF3C7] text-[#92400E]',
};

export const OutreachQueuePreview: React.FC = () => {
  const [rows, setRows] = useState<QueueRow[]>(INITIAL_QUEUE_ROWS);

  const handleToggleApproval = (id: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (row.approvalStatus === 'Pending Approval') {
          return {
            ...row,
            approvalStatus: 'Approved',
            sendingStatus: 'Approved',
          };
        }
        if (row.approvalStatus === 'Approved' && row.sendingStatus === 'Approved') {
          return {
            ...row,
            approvalStatus: 'Pending Approval',
            sendingStatus: 'Pending Approval',
          };
        }
        return row;
      })
    );
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E7EB]">
        <span className="text-xs font-semibold text-[#1F2937]">
          Approval-First Outreach Queue — Illustrative Demo Data
        </span>
        <span className="text-[11px] font-medium text-[#5B21B6]">
          Simulation / Test Mode · Duplicate Guard Active
        </span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-semibold text-[#6B7280]">
              <th className="py-2 px-3">Influencer</th>
              <th className="py-2 px-2.5">Email</th>
              <th className="py-2 px-2.5">Message</th>
              <th className="py-2 px-2.5">Approval</th>
              <th className="py-2 px-2.5">Sending Status</th>
              <th className="py-2 px-3">Demo Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] mr-tabular">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-2.5 px-3 font-semibold text-[#1F2937]">
                  <div>{row.influencer}</div>
                  <div className="text-[10px] font-normal text-[#6B7280]">{row.campaign} · {row.date}</div>
                </td>
                <td className="py-2.5 px-2.5 text-[#4B5563]">
                  {row.email === 'Not Found' ? (
                    <span className="text-[#9CA3AF]">Not Found</span>
                  ) : (
                    <span className="truncate max-w-[110px] inline-block align-bottom">
                      {row.email}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-2.5 text-[#4B5563]">{row.messageStatus}</td>
                <td className="py-2.5 px-2.5 font-medium text-[#1F2937]">{row.approvalStatus}</td>
                <td className="py-2.5 px-2.5">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                      statusPillClass[row.sendingStatus]
                    }`}
                  >
                    {row.sendingStatus}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {row.approvalStatus === 'Pending Approval' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleApproval(row.id)}
                      className="rounded-md bg-[#5B21B6] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#7C3AED] cursor-pointer whitespace-nowrap"
                    >
                      Approve
                    </button>
                  ) : row.sendingStatus === 'Approved' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleApproval(row.id)}
                      className="rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4B5563] hover:bg-[#F9FAFB] cursor-pointer whitespace-nowrap"
                    >
                      Revert
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#9CA3AF]">Logged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[#6B7280]">
        Supported queue states: Draft, Pending Approval, Approved, Sent, Failed, Skipped, and Manual DM.
      </p>
    </div>
  );
};
