"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, X, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import Link from "next/link";

export function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notificationId: string, strategyId: string) => {
    await markAsRead(notificationId);
    setIsOpen(false);
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "ENTRY":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "EXIT":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-card-hover transition-colors text-muted hover:text-foreground relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-accent-light hover:text-accent transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.slice(0, 10).map((notification) => (
                  <Link
                    key={notification.id}
                    href={`/dashboard/strategies/${notification.signal.strategy.id}`}
                    onClick={() => handleNotificationClick(notification.id, notification.signal.strategy.id)}
                    className={`block p-3 hover:bg-card-hover transition-colors ${
                      notification.status !== "READ" ? "bg-accent/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${notification.signal.strategy.color}20` }}
                      >
                        {getSignalIcon(notification.signal.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.signal.strategy.name}
                          </p>
                          {notification.status !== "READ" && (
                            <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          <span className="font-medium">{notification.signal.ticker}</span>
                          {notification.signal.direction && (
                            <span
                              className={`ml-1 ${
                                notification.signal.direction === "LONG"
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {notification.signal.direction}
                            </span>
                          )}
                          {notification.signal.price && (
                            <span className="ml-1">@ ${notification.signal.price}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted mt-1 line-clamp-2">
                          {notification.signal.message}
                        </p>
                        <p className="text-xs text-muted/70 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="px-4 py-2 border-t border-border text-center">
              <Link
                href="/dashboard/strategies"
                className="text-xs text-accent-light hover:underline"
                onClick={() => setIsOpen(false)}
              >
                View all strategies
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
