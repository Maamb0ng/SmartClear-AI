import {
  FaSearch,
  FaBell,
  FaUserCircle,
} from "react-icons/fa";

function Topbar() {
  return (
    <header className="fixed left-72 right-0 top-0 z-40 flex h-20 items-center justify-between border-b bg-white px-8 shadow-sm">

      {/* Search */}

      <div className="relative w-full max-w-md">

        <FaSearch className="absolute left-4 top-4 text-slate-400" />

        <input
          type="text"
          placeholder="Search users, offices, reports..."
          className="w-full rounded-xl border py-3 pl-12 pr-4 outline-none focus:border-slate-900"
        />

      </div>

      {/* Right Side */}

      <div className="flex items-center gap-6">

        {/* Notification */}

        <button className="relative rounded-xl bg-slate-100 p-3 transition hover:bg-slate-200">

          <FaBell className="text-xl text-slate-700" />

          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500"></span>

        </button>

        {/* Admin */}

        <div className="flex items-center gap-3">

          <FaUserCircle className="text-5xl text-slate-800" />

          <div>

            <h3 className="font-semibold text-slate-800">
              System Administrator
            </h3>

            <p className="text-sm text-slate-500">
              Administrator
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}

export default Topbar;