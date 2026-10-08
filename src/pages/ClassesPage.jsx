import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutGrid,
  SearchX,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import ClassCard from "../components/classes/ClassCard";
import ClassCatalogFilters from "../components/classes/ClassCatalogFilters";
import ClassCatalogCalendar from "../components/classes/ClassCatalogCalendar";
import ClassDetailDrawer from "../components/classes/ClassDetailDrawer";
import {
  loadClassCatalog,
  periodLabel,
  previewClassCatalog,
} from "../data/classes";

const initialFilters = {
  search: "",
  program: "all",
  period: "all",
  catalogGroup: "all",
  dayOfWeek: "all",
  availability: "all",
};

export default function ClassesPage() {
  const { isDevPreview } = useAuth();

  const [catalog, setCatalog] = useState(
    isDevPreview ? previewClassCatalog : null,
  );

  const [filters, setFilters] = useState(initialFilters);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [loading, setLoading] = useState(!isDevPreview);
  const [loadError, setLoadError] = useState(null);
  const [viewMode, setViewMode] = useState("cards");

  useEffect(() => {
    if (isDevPreview) {
      setCatalog(previewClassCatalog);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    loadClassCatalog()
      .then((data) => {
        if (!active) return;

        setCatalog(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (!active) return;

        console.error("Class catalog failed to load:", error);

        setLoadError(error.message);
        setCatalog({
          schoolYear: "",
          offerings: [],
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isDevPreview]);

  const offerings = catalog?.offerings ?? [];

  const catalogCourses = useMemo(
    () => groupOfferingsByCourse(offerings),
    [offerings],
  );

  const options = useMemo(() => {
    const programOfferings =
      filters.program === "all"
        ? offerings
        : offerings.filter((item) => item.program === filters.program);

    const catalogGroups = programOfferings
      .map((item) => item.catalogGroup)
      .filter(
        (value) => value && value !== "JR All Ages" && value !== "All Youth",
      );

    const days = programOfferings.flatMap((item) =>
      (item.meetings || []).map((meeting) => meeting.dayOfWeek),
    );

    const dayOptions = [...new Set(days)]
  .sort((a, b) => dayOrder(a) - dayOrder(b))
  .map((value) => [value, dayLabel(value)]);

    if (programOfferings.some((item) => item.scheduleMode === "flexible")) {
      dayOptions.push(["flexible", "Flexible / anytime"]);
    }

    return {
      periods: uniqueOptions(
        programOfferings.map((item) => item.offeringPeriod),
        periodLabel,
      ),

      catalogGroups: uniqueOptions(catalogGroups, (value) => value),

      days: dayOptions,
    };
  }, [offerings, filters.program]);

  const filteredCourses = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return catalogCourses.filter((course) => {
      const matchingOfferings = course.offerings.filter((offering) => {
        if (filters.program !== "all" && offering.program !== filters.program) {
          return false;
        }

        if (
          filters.period !== "all" &&
          offering.offeringPeriod !== filters.period
        ) {
          return false;
        }

        if (
          filters.catalogGroup !== "all" &&
          offering.catalogGroup !== filters.catalogGroup
        ) {
          return false;
        }

        if (filters.dayOfWeek === "flexible") {
          if (offering.scheduleMode !== "flexible") {
            return false;
          }
        } else if (
          filters.dayOfWeek !== "all" &&
          !offering.meetings?.some(
            (meeting) =>
              String(meeting.dayOfWeek) === String(filters.dayOfWeek),
          )
        ) {
          return false;
        }

        if (filters.availability === "open" && offering.isFull) {
          return false;
        }

        if (filters.availability === "waitlist" && !offering.isFull) {
          return false;
        }

        return true;
      });

      if (matchingOfferings.length === 0) {
        return false;
      }

      if (search) {
        const haystack = [
          course.title,
          course.description,
          course.category,
          ...course.offerings.map((offering) => offering.catalogGroup),
          ...course.instructors.map((item) => item.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [catalogCourses, filters]);

  function updateFilter(key, value) {
    setFilters((current) => {
      if (key === "program") {
        return {
          ...current,
          program: value,
          catalogGroup: "all",
          dayOfWeek: "all",
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  return (
    <div className="space-y-6">
      {isDevPreview && (
        <div className="rounded-xl border border-brand-gold/45 bg-brand-gold/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          Local preview mode is on. The catalog is using sample classes until
          Google sign-in is configured.
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-brand-junior/40 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          The live class catalog could not load: {loadError}
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-brand-navy p-6 text-white shadow-sm sm:p-8">
        <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-brand-sky/15" />

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-gold">
              {catalog?.schoolYear || "Current Year"}
            </p>

            <h1 className="brand-title mt-2 text-4xl leading-none sm:text-5xl">
              Class Catalog
            </h1>

            <p className="mt-3 max-w-2xl text-base font-medium text-white/75">
              Browse Junior and Youth classes, compare sessions and schedules,
              and review class details before registration.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <GraduationCap className="text-brand-gold" />

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">
                Showing
              </p>

              <p className="font-extrabold">
                {filteredCourses.length}{" "}
                {filteredCourses.length === 1 ? "class" : "classes"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ClassCatalogFilters
        filters={filters}
        options={options}
        onChange={updateFilter}
        onReset={() => setFilters(initialFilters)}
      />

      <div className="flex justify-end">
        <div className="inline-flex rounded-xl border border-brand-sand/45 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold transition ${
              viewMode === "cards"
                ? "bg-brand-navy text-white"
                : "text-brand-taupe hover:bg-brand-sand/15"
            }`}
          >
            <LayoutGrid size={16} />
            Cards
          </button>

          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold transition ${
              viewMode === "calendar"
                ? "bg-brand-navy text-white"
                : "text-brand-taupe hover:bg-brand-sand/15"
            }`}
          >
            <CalendarDays size={16} />
            Calendar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-brand-sand/40 bg-white">
          <div className="text-center">
            <BookOpen className="mx-auto text-brand-sky" />

            <p className="mt-2 font-extrabold text-brand-navy">
              Loading class catalog…
            </p>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-brand-sand/40 bg-white p-6 text-center">
          <div>
            <SearchX className="mx-auto text-brand-sky" />

            <h2 className="brand-title mt-3 text-2xl text-brand-navy">
              No classes match those filters
            </h2>

            <p className="mt-1 text-sm text-brand-taupe">
              Try clearing a filter or searching for something broader.
            </p>
          </div>
        </div>
      ) : viewMode === "calendar" ? (
        <ClassCatalogCalendar
          offerings={filteredCourses}
          onOpen={setSelectedOffering}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredCourses.map((offering) => (
            <ClassCard
              key={offering.id}
              offering={offering}
              onOpen={setSelectedOffering}
            />
          ))}
        </div>
      )}

      <ClassDetailDrawer
        offering={selectedOffering}
        onClose={() => setSelectedOffering(null)}
      />
    </div>
  );
}

function uniqueOptions(values, formatLabel) {
  return [...new Set(values)]
    .sort((a, b) => formatLabel(a).localeCompare(formatLabel(b)))
    .map((value) => [value, formatLabel(value)]);
}

function dayLabel(value) {
  const labels = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };

  return labels[value] || "";
}

function dayOrder(value) {
  const order = {
    1: 1, // Monday
    2: 2, // Tuesday
    3: 3, // Wednesday
    4: 4, // Thursday
    5: 5, // Friday
    6: 6, // Saturday
    0: 7, // Sunday
  };

  return order[value] ?? 99;
}

function groupOfferingsByCourse(offerings) {
  const groups = new Map();

  for (const offering of offerings) {
    const key = offering.courseId || offering.id;

    if (!groups.has(key)) {
      groups.set(key, {
        ...offering,
        id: `course-${key}`,
        catalogId: key,
        offerings: [],
        offeringPeriods: [],
      });
    }

    const group = groups.get(key);

    group.offerings.push(offering);

    if (
      offering.offeringPeriod &&
      !group.offeringPeriods.includes(offering.offeringPeriod)
    ) {
      group.offeringPeriods.push(offering.offeringPeriod);
    }
  }

  for (const group of groups.values()) {
    group.offeringPeriods.sort((a, b) => periodOrder(a) - periodOrder(b));

    group.meetings = uniqueMeetings(
      group.offerings.flatMap((offering) => offering.meetings || []),
    );

    group.instructors = uniqueInstructors(
      group.offerings.flatMap((offering) => offering.instructors || []),
    );

    group.scheduleMode = group.offerings.every(
      (offering) => offering.scheduleMode === "flexible",
    )
      ? "flexible"
      : "scheduled";

    group.isFull = group.offerings.every((offering) => offering.isFull);
  }

  return [...groups.values()];
}

function uniqueMeetings(meetings) {
  const seen = new Set();

  return meetings.filter((meeting) => {
    const key = [
      meeting.dayOfWeek,
      meeting.startTime,
      meeting.durationMinutes,
      meeting.timezone,
    ].join("|");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function uniqueInstructors(instructors) {
  const seen = new Set();

  return instructors.filter((instructor) => {
    const key = `${instructor.name}|${instructor.role}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function periodOrder(value) {
  const order = {
    fall_session_1: 1,
    fall_session_2: 2,
    fall: 3,
    spring_session_1: 4,
    spring_session_2: 5,
    spring: 6,
    year_long: 7,
  };

  return order[value] ?? 99;
}
