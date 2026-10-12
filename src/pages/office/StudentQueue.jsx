import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaClipboardList,
  FaExclamationTriangle,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";
import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";
import { getOfficeStudentQueue } from "../../services/officeStaffService";

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const PREVIEW_LIMIT = 8;
const PREFS_KEY = "smartclear-office-queue-prefs";

const PENDING_STATUSES = new Set(["pending", "under review", "in progress"]);

const TABS = [
  { key: "all", label: "All" },
  { key: "needs-action", label: "Needs Action" },
  { key: "pending", label: "Pending Review" },
  { key: "other", label: "Other" },
];

const GROUP_OPTIONS = [
  { key: "batch", label: "Batch" },
  { key: "program", label: "Program" },
  { key: "none", label: "None" },
];

const SORT_OPTIONS = [
  { key: "priority", label: "Priority — needs action first" },
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
];

// Which two middle columns are shown for each grouping (the grouped field is
// already in the group header, so it is replaced by the school term).
const COLUMN_SETS = {
  batch: ["program", "term"],
  program: ["batch", "term"],
  none: ["program", "batch"],
};

const COLUMN_LABELS = {
  program: "Program",
  batch: "Batch",
  term: "Term",
};

const ROW_GRID =
  "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_150px_110px]";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function getBucket(student) {
  const status = normalizeStatus(student.status);

  if (status === "needs action" || status === "rejected") {
    return "needs-action";
  }

  if (PENDING_STATUSES.has(status)) {
    return "pending";
  }

  return "other";
}

const BUCKET_RANK = { "needs-action": 0, pending: 1, other: 2 };

function nameCompare(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    sensitivity: "base",
  });
}

function compareStudents(sortBy) {
  return (a, b) => {
    if (sortBy === "name-asc") return nameCompare(a, b);
    if (sortBy === "name-desc") return nameCompare(b, a);

    const rank = BUCKET_RANK[getBucket(a)] - BUCKET_RANK[getBucket(b)];

    if (rank !== 0) return rank;

    const issues = (Number(b.issues) || 0) - (Number(a.issues) || 0);

    if (issues !== 0) return issues;

    return nameCompare(a, b);
  };
}

function yearSortValue(value) {
  const match = String(value || "").match(/\d+/);

  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  if (!value) return "Date TBA";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(value) {
  if (!value) return "";

  const [hourValue, minute] = String(value).slice(0, 5).split(":");
  const hour = Number(hourValue);

  if (Number.isNaN(hour) || minute === undefined) return String(value);

  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function describeBatch(batch) {
  const start = formatTimeLabel(batch?.startTime);
  const end = formatTimeLabel(batch?.endTime);
  const time = start && end ? `${start} – ${end}` : start || end;

  return [formatDateLabel(batch?.date), time].filter(Boolean).join(" • ");
}

function getStatusStyle(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "needs action" || normalized === "rejected") {
    return {
      badge: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
      icon: FaExclamationTriangle,
    };
  }

  if (normalized === "under review" || normalized === "in progress") {
    return {
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      icon: FaClipboardList,
    };
  }

  return {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    icon: FaUserClock,
  };
}

function getInitials(name) {
  return String(name || "Student")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

function StudentQueue() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [office, setOffice] = useState({ name: "Office", code: "OFFICE" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [courseFilter, setCourseFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [scheduleFilter, setScheduleFilter] = useState("all");

  const [groupBy, setGroupBy] = useState(() => {
    const saved = loadPrefs().groupBy;

    return GROUP_OPTIONS.some((option) => option.key === saved)
      ? saved
      : "batch";
  });

  const [sortBy, setSortBy] = useState(() => {
    const saved = loadPrefs().sortBy;

    return SORT_OPTIONS.some((option) => option.key === saved)
      ? saved
      : "priority";
  });

  const [collapsedGroups, setCollapsedGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState([]);

  async function loadQueue(silent = false) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const result = await getOfficeStudentQueue();
      const primaryOffice = result?.primaryOffice || null;

      setOffice({
        name: primaryOffice?.office_name || "Office",
        code: primaryOffice?.office_code || "OFFICE",
      });

      setStudents(Array.isArray(result?.students) ? result.students : []);
      setLastUpdated(new Date());
    } catch (loadError) {
      console.error("Unable to load Office Staff student queue:", loadError);

      setStudents([]);
      setError(loadError?.message || "Unable to load the student queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  // Remember how this staff member likes to view the queue.
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ groupBy, sortBy }));
    } catch {
      // Storage can be unavailable; the queue still works without it.
    }
  }, [groupBy, sortBy]);

  /*
  |--------------------------------------------------------------------------
  | FILTER OPTIONS
  |--------------------------------------------------------------------------
  */

  const courses = useMemo(() => {
    const values = students
      .map((student) => student.course)
      .filter(Boolean)
      .filter((course) => course !== "—");

    return ["All", ...new Set(values)].sort((a, b) =>
      a === "All" ? -1 : b === "All" ? 1 : String(a).localeCompare(String(b))
    );
  }, [students]);

  const yearLevels = useMemo(() => {
    const values = students
      .map((student) => student.yearLevel)
      .filter(Boolean)
      .filter((year) => year !== "—");

    return [
      "All",
      ...[...new Set(values)].sort(
        (a, b) =>
          yearSortValue(a) - yearSortValue(b) ||
          String(a).localeCompare(String(b))
      ),
    ];
  }, [students]);

  /*
  |--------------------------------------------------------------------------
  | FILTERING, COUNTS AND SORTING
  |--------------------------------------------------------------------------
  |
  | Tab counts reflect the search and dropdown filters, so the numbers always
  | match what you would see after clicking a tab.
  |--------------------------------------------------------------------------
  */

  const searchFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const searchable = [
        student.name,
        student.studentId,
        student.course,
        student.yearLevel,
        student.section,
        student.email,
        student.schoolYear,
        student.semester,
        student.batch?.name,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return (
        (!query || searchable.includes(query)) &&
        (courseFilter === "All" || student.course === courseFilter) &&
        (yearFilter === "All" || student.yearLevel === yearFilter)
      );
    });
  }, [students, search, courseFilter, yearFilter]);

  // Students who are not assigned to any office batch yet.
  const unscheduledCount = useMemo(
    () => searchFiltered.filter((student) => !student.batch?.id).length,
    [searchFiltered]
  );

  const baseFiltered = useMemo(
    () =>
      scheduleFilter === "unscheduled"
        ? searchFiltered.filter((student) => !student.batch?.id)
        : searchFiltered,
    [searchFiltered, scheduleFilter]
  );

  const counts = useMemo(() => {
    const result = {
      all: baseFiltered.length,
      "needs-action": 0,
      pending: 0,
      other: 0,
    };

    baseFiltered.forEach((student) => {
      result[getBucket(student)] += 1;
    });

    return result;
  }, [baseFiltered]);

  const filteredStudents = useMemo(
    () =>
      tab === "all"
        ? baseFiltered
        : baseFiltered.filter((student) => getBucket(student) === tab),
    [baseFiltered, tab]
  );

  const sortedStudents = useMemo(
    () => [...filteredStudents].sort(compareStudents(sortBy)),
    [filteredStudents, sortBy]
  );

  const scheduledCount = useMemo(
    () => filteredStudents.filter((student) => Boolean(student.batch?.id)).length,
    [filteredStudents]
  );

  const hasActiveFilters =
    scheduleFilter !== "all" ||
    Boolean(search.trim()) ||
    courseFilter !== "All" ||
    yearFilter !== "All" ||
    tab !== "all";

  const isSearching = Boolean(search.trim());

  function clearFilters() {
    setSearch("");
    setCourseFilter("All");
    setYearFilter("All");
    setScheduleFilter("all");
    setTab("all");
  }

  /*
  |--------------------------------------------------------------------------
  | GROUPS
  |--------------------------------------------------------------------------
  */

  const todayKey = getLocalDateKey();

  const groups = useMemo(() => {
    if (groupBy === "none") {
      return sortedStudents.length
        ? [
            {
              key: "all",
              kind: "all",
              title: "All students",
              subtitle: "",
              items: sortedStudents,
            },
          ]
        : [];
    }

    if (groupBy === "program") {
      const programMap = new Map();

      sortedStudents.forEach((student) => {
        const course = student.course || "Unassigned course";
        const year = student.yearLevel || "Unassigned year";
        const block = student.section || "—";
        const key = `${course}|${year}|${block}`;

        if (!programMap.has(key)) {
          programMap.set(key, {
            key: `program-${key}`,
            kind: "program",
            title: `${course} • ${year}`,
            subtitle: `Block ${block}`,
            sortKey: { course, year, block },
            items: [],
          });
        }

        programMap.get(key).items.push(student);
      });

      return [...programMap.values()].sort(
        (a, b) =>
          String(a.sortKey.course).localeCompare(String(b.sortKey.course)) ||
          yearSortValue(a.sortKey.year) - yearSortValue(b.sortKey.year) ||
          String(a.sortKey.block).localeCompare(
            String(b.sortKey.block),
            undefined,
            { numeric: true, sensitivity: "base" }
          )
      );
    }

    // Default: group by office batch, soonest first, unscheduled last.
    const batchMap = new Map();
    const unscheduled = [];

    sortedStudents.forEach((student) => {
      if (student.batch?.id) {
        if (!batchMap.has(student.batch.id)) {
          batchMap.set(student.batch.id, {
            key: `batch-${student.batch.id}`,
            kind: "batch",
            batch: student.batch,
            title: student.batch.name || "Office Batch",
            subtitle: describeBatch(student.batch),
            isToday: student.batch.date === todayKey,
            items: [],
          });
        }

        batchMap.get(student.batch.id).items.push(student);
      } else {
        unscheduled.push(student);
      }
    });

    const scheduled = [...batchMap.values()].sort((a, b) =>
      `${a.batch.date || "9999-12-31"} ${a.batch.startTime || "23:59"}`.localeCompare(
        `${b.batch.date || "9999-12-31"} ${b.batch.startTime || "23:59"}`
      )
    );

    return [
      ...scheduled,
      ...(unscheduled.length
        ? [
            {
              key: "unscheduled",
              kind: "unscheduled",
              title: "Unscheduled",
              subtitle: "Not yet assigned to an office batch",
              items: unscheduled,
            },
          ]
        : []),
    ];
  }, [sortedStudents, groupBy, todayKey]);

  const showGroupHeaders = groupBy !== "none";
  const columns = COLUMN_SETS[groupBy] || COLUMN_SETS.none;

  function toggleGroup(key) {
    setCollapsedGroups((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function toggleExpandedRows(key) {
    setExpandedGroups((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  const allCollapsed =
    groups.length > 0 && groups.every((g) => collapsedGroups.includes(g.key));

  function toggleAllGroups() {
    setCollapsedGroups(allCollapsed ? [] : groups.map((group) => group.key));
  }

  function handleReview(student) {
    navigate(`/office/student/${student.stepId}`);
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* HEADER */}

        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {office.code}
              </span>

              <span className="text-xs font-bold text-slate-400">
                {office.name} Clearance
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Student Queue
            </h1>

            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Review student clearance requests assigned to your office. Only
              your office's clearance steps appear here.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {lastUpdated && (
              <span className="hidden text-xs font-semibold text-slate-400 sm:inline">
                Updated{" "}
                {lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}

            <button
              type="button"
              onClick={() => loadQueue(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-blue-400"
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh Queue"}
            </button>
          </div>
        </section>

        {/* TOOLBAR: SEARCH, FILTERS, STATUS TABS, GROUPING */}

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, student ID, course, block, or batch..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {courses.length > 2 && (
                <FilterSelect
                  label="Course"
                  value={courseFilter}
                  onChange={setCourseFilter}
                >
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course === "All" ? "All courses" : course}
                    </option>
                  ))}
                </FilterSelect>
              )}

              {yearLevels.length > 2 && (
                <FilterSelect
                  label="Year level"
                  value={yearFilter}
                  onChange={setYearFilter}
                >
                  {yearLevels.map((year) => (
                    <option key={year} value={year}>
                      {year === "All" ? "All years" : year}
                    </option>
                  ))}
                </FilterSelect>
              )}

              <FilterSelect label="Sort" value={sortBy} onChange={setSortBy}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter by status"
              className="flex flex-wrap gap-2"
            >
              {TABS.map((item) => {
                const isActive = tab === item.key;
                const count = counts[item.key];
                const highlight = item.key === "needs-action" && count > 0;

                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(item.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-black transition ${
                      isActive
                        ? "bg-slate-950 text-white shadow-sm dark:bg-blue-600"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {item.label}

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        isActive
                          ? "bg-white/20 text-white"
                          : highlight
                            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

              <button
                type="button"
                onClick={() =>
                  setScheduleFilter((current) =>
                    current === "unscheduled" ? "all" : "unscheduled"
                  )
                }
                aria-pressed={scheduleFilter === "unscheduled"}
                title="Show only students who are not assigned to a batch yet"
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black transition ${
                  scheduleFilter === "unscheduled"
                    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                }`}
              >
                <FaUserClock />
                Unscheduled
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    scheduleFilter === "unscheduled"
                      ? "bg-white/25 text-white"
                      : "bg-white text-amber-800 dark:bg-slate-900 dark:text-amber-300"
                  }`}
                >
                  {unscheduledCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                Group by
              </span>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {GROUP_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setGroupBy(option.key)}
                    aria-pressed={groupBy === option.key}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                      groupBy === option.key
                        ? "bg-white text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-400"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* QUEUE */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Clearance Students
              </h2>

              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {loading
                  ? "Loading assigned students..."
                  : `${filteredStudents.length} of ${students.length} student${
                      students.length !== 1 ? "s" : ""
                    } • ${scheduledCount} scheduled • ${
                      filteredStudents.length - scheduledCount
                    } unscheduled`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}

              {showGroupHeaders && groups.length > 1 && (
                <button
                  type="button"
                  onClick={toggleAllGroups}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {allCollapsed ? "Expand all" : "Collapse all"}
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadQueue()} />
          ) : groups.length === 0 ? (
            <EmptyState
              hasFilters={hasActiveFilters}
              officeName={office.name}
              onClear={clearFilters}
            />
          ) : (
            <div>
              {/* Column headings (desktop) */}

              <div
                className={`hidden gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800 dark:bg-slate-800/30 lg:grid ${ROW_GRID}`}
              >
                <span>Student</span>

                {columns.map((column) => (
                  <span key={column}>{COLUMN_LABELS[column]}</span>
                ))}

                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              {groups.map((group) => {
                const isCollapsed =
                  showGroupHeaders && collapsedGroups.includes(group.key);

                const isExpanded = expandedGroups.includes(group.key);

                const visibleItems =
                  isSearching || isExpanded
                    ? group.items
                    : group.items.slice(0, PREVIEW_LIMIT);

                const hiddenCount = group.items.length - visibleItems.length;

                const needsActionCount = group.items.filter(
                  (student) => getBucket(student) === "needs-action"
                ).length;

                const GroupIcon =
                  group.kind === "batch"
                    ? FaCalendarAlt
                    : group.kind === "unscheduled"
                      ? FaUserClock
                      : FaUsers;

                return (
                  <section key={group.key}>
                    {showGroupHeaders && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={!isCollapsed}
                        className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:brightness-95 dark:border-slate-800 sm:px-5 ${
                          group.kind === "batch"
                            ? "bg-blue-50/60 dark:bg-blue-500/10"
                            : "bg-slate-50/70 dark:bg-slate-800/30"
                        }`}
                      >
                        <FaChevronDown
                          className={`shrink-0 text-xs text-slate-400 transition-transform ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                        />

                        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-900 sm:flex">
                          <GroupIcon />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                              {group.title}
                            </h3>

                            {group.isToday && (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                                Today
                              </span>
                            )}
                          </div>

                          {group.subtitle && (
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                              {group.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
                          {needsActionCount > 0 && (
                            <span className="hidden rounded-full bg-red-50 px-2.5 py-1 text-red-700 dark:bg-red-500/10 dark:text-red-400 sm:inline">
                              {needsActionCount} needs action
                            </span>
                          )}

                          <span className="rounded-full bg-white px-2.5 py-1 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            {group.items.length}
                          </span>
                        </div>
                      </button>
                    )}

                    {!isCollapsed && (
                      <>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {visibleItems.map((student) => (
                            <StudentRow
                              key={student.stepId}
                              student={student}
                              columns={columns}
                              onReview={handleReview}
                            />
                          ))}
                        </div>

                        {(hiddenCount > 0 ||
                          (isExpanded &&
                            group.items.length > PREVIEW_LIMIT)) && (
                          <button
                            type="button"
                            onClick={() => toggleExpandedRows(group.key)}
                            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs font-black text-blue-600 transition hover:bg-blue-50/50 dark:border-slate-800 dark:text-blue-400 dark:hover:bg-blue-500/5"
                          >
                            {hiddenCount > 0
                              ? `Show all ${group.items.length} students (${hiddenCount} more)`
                              : "Show fewer"}
                          </button>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <p className="flex items-start gap-2 px-1 text-xs font-medium leading-5 text-slate-400">
          <FaCheckCircle className="mt-0.5 shrink-0 text-blue-500" />
          Each decision is saved on the exact clearance step you open, so
          approving one student never changes another office's steps.
        </p>
      </div>
    </OfficeStaffLayout>
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENTS
|--------------------------------------------------------------------------
*/

function FilterSelect({ label, value, onChange, children }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-auto"
    >
      {children}
    </select>
  );
}

function StudentRow({ student, columns, onReview }) {
  const statusStyle = getStatusStyle(student.status);
  const StatusIcon = statusStyle.icon;
  const hasFollowUp = Number(student.issues) > 0;

  function renderCell(column) {
    if (column === "program") {
      return (
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">
            {student.course || "—"} • {student.yearLevel || "—"}
          </p>

          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            Block {student.section || "—"}
          </p>
        </div>
      );
    }

    if (column === "batch") {
      return student.batch?.id ? (
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-emerald-700 dark:text-emerald-400">
            {student.batch.name || "Batch Assigned"}
          </p>

          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
            {describeBatch(student.batch)}
          </p>
        </div>
      ) : (
        <span className="text-xs font-semibold text-slate-400">
          Unscheduled
        </span>
      );
    }

    return (
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-300">
          {student.semester || "Semester not set"}
        </p>

        {student.schoolYear && (
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            {student.schoolYear}
          </p>
        )}
      </div>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onReview(student)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onReview(student);
        }
      }}
      className={`group grid cursor-pointer gap-2.5 px-4 py-3.5 transition hover:bg-slate-50/80 focus:outline-none focus-visible:bg-blue-50/60 dark:hover:bg-slate-800/30 sm:px-5 lg:items-center lg:gap-4 ${ROW_GRID}`}
    >
      {/* Student */}

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white dark:bg-blue-600">
          {getInitials(student.name)}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
            {student.name || "Unnamed student"}
          </h3>

          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {student.studentId || "No student ID"}
          </p>
        </div>
      </div>

      {/* Middle columns */}

      {columns.map((column) => (
        <div key={column} className="min-w-0 pl-[52px] lg:pl-0">
          {renderCell(column)}
        </div>
      ))}

      {/* Status */}

      <div className="min-w-0 pl-[52px] lg:pl-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyle.badge}`}
        >
          <StatusIcon />
          {student.status}
        </span>

        {hasFollowUp && (
          <p className="mt-1 text-[11px] font-bold text-red-500">
            Needs follow-up
          </p>
        )}
      </div>

      {/* Action */}

      <div className="pl-[52px] lg:flex lg:justify-end lg:pl-0">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReview(student);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 lg:w-auto"
        >
          Review
          <FaChevronRight />
        </button>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="animate-pulse px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700" />

            <div className="flex-1">
              <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-2.5 w-64 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="hidden h-8 w-24 rounded-xl bg-slate-100 dark:bg-slate-800 sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="px-5 py-16 text-center">
      <FaExclamationTriangle className="mx-auto mb-4 text-3xl text-red-400" />

      <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
        Unable to load student queue
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-slate-500">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
      >
        <FaSyncAlt />
        Try Again
      </button>
    </div>
  );
}

function EmptyState({ hasFilters, officeName, onClear }) {
  return (
    <div className="px-5 py-16 text-center">
      <FaSearch className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

      <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
        {hasFilters ? "No students found" : "No students in this office queue"}
      </h3>

      <p className="mx-auto mt-1 max-w-lg text-sm font-medium text-slate-500">
        {hasFilters
          ? "Try changing your search, tab, or filters."
          : `There are currently no unresolved ${officeName} clearance steps assigned to this office.`}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export default StudentQueue;
