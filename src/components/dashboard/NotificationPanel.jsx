import { FaBell } from "react-icons/fa";

function NotificationPanel() {
  const notifications = [
    {
      id: 1,
      title: "Library Approved",
      message: "Your library clearance has been approved.",
      time: "10 minutes ago",
    },
    {
      id: 2,
      title: "Guidance Review",
      message: "The Guidance Office is reviewing your clearance.",
      time: "1 hour ago",
    },
    {
      id: 3,
      title: "New Announcement",
      message: "Clearance processing deadline is next Friday.",
      time: "Yesterday",
    },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <FaBell className="text-2xl text-blue-700" />

        <h2 className="text-2xl font-bold text-slate-800">
          Notifications
        </h2>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
          >
            <h3 className="font-semibold text-slate-800">
              {notification.title}
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              {notification.message}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {notification.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationPanel;