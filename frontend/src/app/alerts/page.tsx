"use client";

import React, { useState } from "react";
import { Bell, Activity, Search, Clock, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export default function AlertsDashboard() {
  const [activeTab, setActiveTab] = useState<'Active' | 'History'>('Active');

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['savedAlerts'],
    queryFn: () => fetchApi<any>('/api/screener/alerts'),
    
  });

  const { data: notifsData, isLoading: notifsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchApi<any>('/api/screener/notifications'),
    
  });

  const alerts = alertsData?.alerts || [];
  const notifications = notifsData?.notifications || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e0f12]">
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#0e0f12]/80 backdrop-blur-xl max-md:backdrop-blur-none max-md:bg-[#0e0f12] z-20">
        <h1 className="font-semibold text-lg tracking-tight flex items-center gap-2 text-white">
          <Bell size={20} className="text-[#F59E0B]" />
          Alerts Dashboard
        </h1>
        <div className="flex bg-[#141824] p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('Active')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'Active' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Rules
          </button>
          <button 
            onClick={() => setActiveTab('History')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'History' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trigger History
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-400">Active Rules</h3>
                <Activity size={20} className="text-[#38BDF8]" />
              </div>
              <div className="text-3xl font-bold text-white">{alerts.length}</div>
            </div>
            
            <div className="bg-[#141824] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-400">Triggered Today</h3>
                <ShieldAlert size={20} className="text-[#F59E0B]" />
              </div>
              <div className="text-3xl font-bold text-white">
                {notifications.filter((n: any) => new Date(n.created_at).toDateString() === new Date().toDateString()).length}
              </div>
            </div>

            <div className="bg-[#141824] border border-white/5 rounded-2xl p-6 flex flex-col justify-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                Rules are evaluated automatically every 15 minutes during market hours across the NIFTY 500 basket.
              </p>
            </div>
          </div>

          {/* Content Area */}
          {activeTab === 'Active' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Your Saved Screens</h2>
              
              {alertsLoading ? (
                <div className="h-32 flex items-center justify-center border border-white/5 rounded-2xl bg-[#141824]">
                  <span className="text-slate-500 animate-pulse">Loading rules...</span>
                </div>
              ) : alerts.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#141824]/50">
                  <Search size={32} className="text-slate-500 mb-3" />
                  <p className="text-slate-400">You haven't saved any screening rules yet.</p>
                  <p className="text-sm text-slate-500 mt-1">Go to the Screener to build and save a rule.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {alerts.map((alert: any) => (
                    <div key={alert.id} className="bg-[#141824] border border-white/5 rounded-xl p-5 flex items-center justify-between group hover:border-[#F59E0B]/30 transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-200">{alert.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400">
                            Active
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {alert.conditions.map((cond: any, idx: number) => (
                            <div key={idx} className="text-xs px-2 py-1 bg-white/5 text-slate-300 rounded border border-white/10">
                              {cond.indicator} {cond.operator} {cond.value}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xs text-slate-500 mb-1">Last Checked</div>
                        <div className="text-sm font-medium text-slate-300">
                          {alert.last_triggered_at ? new Date(alert.last_triggered_at).toLocaleString() : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Notification History</h2>
              
              {notifsLoading ? (
                <div className="h-32 flex items-center justify-center border border-white/5 rounded-2xl bg-[#141824]">
                  <span className="text-slate-500 animate-pulse">Loading history...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#141824]/50">
                  <CheckCircle2 size={32} className="text-slate-500 mb-3" />
                  <p className="text-slate-400">No alerts have been triggered yet.</p>
                </div>
              ) : (
                <div className="bg-[#141824] border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-500 border-b border-white/5">
                        <th className="p-4 font-semibold">Time</th>
                        <th className="p-4 font-semibold">Rule Triggered</th>
                        <th className="p-4 font-semibold">Matches Found</th>
                        <th className="p-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {notifications.map((notif: any) => (
                        <tr key={notif.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="p-4 text-slate-400">
                            <div className="flex items-center gap-2">
                              <Clock size={14} />
                              {new Date(notif.created_at).toLocaleString()}
                            </div>
                          </td>
                          <td className="p-4 font-medium text-[#F59E0B]">
                            {notif.title.replace('Alert Triggered: ', '')}
                          </td>
                          <td className="p-4 text-slate-300">
                            {notif.message.replace('Matches found: ', '')}
                          </td>
                          <td className="p-4 text-right">
                            <button className="text-[#38BDF8] hover:text-white transition-colors">
                              <ArrowRight size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
