import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  HandHeart,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  loadContributionCatalog,
  loadMyContributionApplications,
  submitContributionClaim,
} from "../data/contributions";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "junior", label: "Junior" },
  { key: "youth", label: "Youth" },
  { key: "teaching", label: "Teaching" },
  { key: "non_teaching", label: "Non-teaching" },
  { key: "open", label: "Open" },
];

function formatProgram(program) {
  if (program === "junior") return "Junior";
  if (program === "youth") return "Youth";
  return program;
}

function formatStatus(status) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function periodLabel(period) {
  const labels = {
    fall: "Fall",
    spring: "Spring",
    fall_session_1: "Fall 1",
    fall_session_2: "Fall 2",
    spring_session_1: "Spring 1",
    spring_session_2: "Spring 2",
  };
  return labels[period] || period;
}

function coverageByProgram(opportunity) {
  const coverage = opportunity.coverage ?? [];
  return {
    youth: coverage.filter((item) => item.program === "youth").map((item) => item.period),
    junior: coverage.filter((item) => item.program === "junior").map((item) => item.period),
  };
}

function coverageDisplayLabel(opportunity) {
  const { youth, junior } = coverageByProgram(opportunity);
  const parts = [];

  if (youth.length) {
    const full = youth.includes("fall") && youth.includes("spring");
    parts.push(full ? "Youth · Full Year" : `Youth · ${youth.map(periodLabel).join(" + ")}`);
  }

  if (junior.length) {
    const required = [
      "fall_session_1",
      "fall_session_2",
      "spring_session_1",
      "spring_session_2",
    ];
    const full = required.every((period) => junior.includes(period));
    parts.push(full ? "Junior · Full Year" : `Junior · ${junior.map(periodLabel).join(" + ")}`);
  }

  let label = parts.join(" | ") || "Coverage not configured";
  if (opportunity.coverageChoiceMode === "choose_program") {
    label += " | Choose Junior or Youth";
  }
  if (opportunity.coverageChoiceMode === "choose_period") {
    label += " | Choose one period/session";
  }
  return label;
}

function choicePeriodOptions(opportunity) {
  return (opportunity.coverage ?? []).map((item) => ({
    key: `${item.program}:${item.period}`,
    program: item.program,
    period: item.period,
    label: `${formatProgram(item.program)} · ${periodLabel(item.period)}`,
  }));
}

function availabilityLabel(opportunity) {
  if (opportunity.myApplicationStatus) {
    return `Your claim: ${formatStatus(opportunity.myApplicationStatus)}`;
  }

  if (opportunity.availabilityStatus !== "open") {
    return formatStatus(opportunity.availabilityStatus);
  }

  if (opportunity.spotsRemaining === null) {
    return "Open";
  }

  if (opportunity.spotsRemaining === 1) {
    return "1 spot remaining";
  }

  return `${opportunity.spotsRemaining} spots remaining`;
}

function programScopeLabel(opportunity) {
  const programs = opportunity.appliesToPrograms ?? [];

  if (programs.length === 1) {
    return formatProgram(programs[0]);
  }

  if (programs.includes("junior") && programs.includes("youth")) {
    return opportunity.requiresProgramChoice
      ? "Junior or Youth"
      : "Junior + Youth";
  }

  return programs.map(formatProgram).join(" + ") || "Program not specified";
}

function programBadgeClass(opportunity) {
  const programs = opportunity.appliesToPrograms ?? [];

  if (programs.length === 1 && programs[0] === "junior") {
    return "bg-brand-junior/15 text-[#9f3d39] ring-1 ring-brand-junior/35";
  }

  if (programs.length === 1 && programs[0] === "youth") {
    return "bg-brand-sand/20 text-brand-navy ring-1 ring-brand-sand/50";
  }

  return "bg-brand-sky/20 text-brand-navy ring-1 ring-brand-sky/45";
}

function programAccentClass(opportunity) {
  const programs = opportunity.appliesToPrograms ?? [];

  if (programs.length === 1 && programs[0] === "junior") {
    return "bg-brand-junior";
  }

  if (programs.length === 1 && programs[0] === "youth") {
    return "bg-brand-sand";
  }

  return "bg-brand-sky";
}

function contributionKindLabel(opportunity) {
  return opportunity.isTeaching ? "Teaching" : "Service";
}

function contributionKindClass(opportunity) {
  return opportunity.isTeaching
    ? "bg-brand-gold/20 text-brand-navy ring-1 ring-brand-gold/40"
    : "bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/20";
}

export default function ContributionsPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [applicationsError, setApplicationsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  async function refreshCatalog({ keepSelected = false } = {}) {
    try {
      setLoading(true);
      setLoadError(null);

      const [rows, applicationsResult] = await Promise.all([
        loadContributionCatalog(),
        loadMyContributionApplications().then((data) => ({ data })).catch((error) => ({ error })),
      ]);
      setOpportunities(rows);
      if (applicationsResult.error) {
        setApplicationsError(applicationsResult.error.message || "Could not load your applications.");
      } else {
        setApplicationsError(null);
        setMyApplications(applicationsResult.data);
      }

      if (keepSelected && selected) {
        setSelected(rows.find((row) => row.id === selected.id) ?? null);
      }
    } catch (error) {
      console.error("Contribution catalog failed to load:", error);
      setLoadError(error.message || "Contribution opportunities could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCatalog();
  }, []);

  useEffect(() => {
    if (!selected) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelected(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const filteredOpportunities = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      if (filter === "junior" && !opportunity.appliesToPrograms.includes("junior")) {
        return false;
      }

      if (filter === "youth" && !opportunity.appliesToPrograms.includes("youth")) {
        return false;
      }

      if (filter === "teaching" && !opportunity.isTeaching) {
        return false;
      }

      if (filter === "non_teaching" && opportunity.isTeaching) {
        return false;
      }

      if (filter === "open" && opportunity.availabilityStatus !== "open") {
        return false;
      }

      if (!needle) return true;

      const haystack = [
        opportunity.title,
        opportunity.description,
        opportunity.contributionType,
        opportunity.oversightGroup,
        opportunity.committee,
        opportunity.cycle,
        opportunity.ageGroup,
        ...opportunity.appliesToPrograms,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [opportunities, search, filter]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
            <HandHeart size={22} />
          </div>

          <div>
            <h1 className="brand-title text-3xl text-brand-navy">Contributions</h1>
            <p className="mt-1 text-sm text-brand-taupe">
              Browse available contribution opportunities for your family.
            </p>
          </div>
        </div>
      </header>

      <MyContributions
        applications={myApplications}
        error={applicationsError}
        loading={loading}
      />

      <section className="rounded-3xl border border-brand-sand/40 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contributions"
              className="w-full rounded-xl border border-brand-sand/60 bg-white py-2.5 pl-10 pr-3 text-sm text-brand-navy outline-none transition placeholder:text-brand-taupe/50 focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  filter === item.key
                    ? "bg-brand-navy text-white"
                    : "border border-brand-sand/50 bg-white text-brand-navy hover:border-brand-sky"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loadError && (
        <div className="rounded-2xl border border-brand-junior/30 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-brand-sand/40 bg-white p-8 text-center text-sm text-brand-taupe shadow-sm">
          Loading contribution opportunities…
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="rounded-3xl border border-brand-sand/40 bg-white p-8 text-center shadow-sm">
          <div className="font-bold text-brand-navy">No contributions match those filters.</div>
          <p className="mt-1 text-sm text-brand-taupe">Try a different search or filter.</p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOpportunities.map((opportunity) => (
            <ContributionCard
              key={opportunity.id}
              opportunity={opportunity}
              onOpen={() => setSelected(opportunity)}
            />
          ))}
        </section>
      )}

      {selected && (
        <ContributionDrawer
          opportunity={selected}
          onClose={() => setSelected(null)}
          onClaimed={async () => {
            await refreshCatalog({ keepSelected: true });
          }}
        />
      )}
    </div>
  );
}

function ContributionCard({ opportunity, onOpen }) {
  const isUnavailable = opportunity.availabilityStatus !== "open";
  const hasMyClaim = Boolean(opportunity.myApplicationStatus);
  const KindIcon = opportunity.isTeaching ? BookOpen : Users;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-brand-sand/45 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky hover:shadow-md">
      <div className={`h-1.5 ${programAccentClass(opportunity)}`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${programBadgeClass(opportunity)}`}
              >
                {programScopeLabel(opportunity)}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${contributionKindClass(opportunity)}`}
              >
                <KindIcon size={11} />
                {contributionKindLabel(opportunity)}
              </span>

              {opportunity.contributionType && (
                <span className="rounded-full bg-brand-sand/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-navy">
                  {opportunity.contributionType}
                </span>
              )}
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${
              hasMyClaim
                ? "bg-brand-sky/20 text-brand-navy"
                : isUnavailable
                  ? "bg-brand-junior/10 text-[#9f3d39]"
                  : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {availabilityLabel(opportunity)}
          </span>

          <div className="col-span-2 min-w-0">
            <h2 className="brand-title text-2xl leading-tight text-brand-navy">
              {opportunity.title}
            </h2>
            <div className="mt-1.5 text-xs font-bold leading-relaxed text-brand-taupe">
              {coverageDisplayLabel(opportunity)}
            </div>
          </div>
        </div>

        {opportunity.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-brand-taupe">
            {opportunity.description}
          </p>
        )}

        <dl className="mt-5 space-y-2 text-sm text-brand-taupe">
          {opportunity.cycle && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-20 shrink-0 text-xs font-extrabold uppercase tracking-wide text-brand-taupe/70">
                Cycle
              </span>
              <span>{opportunity.cycle}</span>
            </div>
          )}

          {opportunity.ageGroup && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-20 shrink-0 text-xs font-extrabold uppercase tracking-wide text-brand-taupe/70">
                Group
              </span>
              <span>{opportunity.ageGroup}</span>
            </div>
          )}
        </dl>

        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={onOpen}
            className="focus-ring w-full rounded-xl border-2 border-brand-navy px-4 py-2.5 text-sm font-extrabold text-brand-navy transition hover:bg-brand-navy hover:text-white"
          >
            View contribution details
          </button>
        </div>
      </div>
    </article>
  );
}

function ContributionDrawer({ opportunity, onClose, onClaimed }) {
  const programs = opportunity.appliesToPrograms ?? [];
  const choiceMode = opportunity.coverageChoiceMode || "all";
  const periodOptions = choicePeriodOptions(opportunity);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedCoverageKey, setSelectedCoverageKey] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const hasClaim = Boolean(opportunity.myApplicationStatus);
  const canClaim = opportunity.availabilityStatus === "open" && !hasClaim;

  async function handleClaim(event) {
    event.preventDefault();

    if (choiceMode === "choose_program" && !selectedProgram) {
      setSubmitError("Please choose whether this contribution will count toward Junior or Youth.");
      return;
    }

    if (choiceMode === "choose_period" && !selectedCoverageKey) {
      setSubmitError("Please choose one eligible contribution period/session.");
      return;
    }

    const selectedCoverage =
      choiceMode === "choose_period"
        ? periodOptions.find((option) => option.key === selectedCoverageKey)
        : null;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const result = await submitContributionClaim({
        opportunityId: opportunity.id,
        selectedProgram:
          choiceMode === "choose_program"
            ? selectedProgram
            : selectedCoverage?.program || "",
        selectedPeriod: selectedCoverage?.period || "",
        notes: notes.trim(),
      });

      setSuccessMessage(
        result?.already_exists
          ? "You already have an active claim for this contribution."
          : "Your contribution claim has been submitted for review.",
      );

      await onClaimed();
    } catch (error) {
      console.error("Contribution claim failed:", error);
      setSubmitError(error.message || "Your contribution claim could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  const linkItems = [
    ["Public information", opportunity.publicInfoUrl],
    ["Internal information", opportunity.internalInfoUrl],
    ["Other resources", opportunity.otherResourcesUrl],
  ].filter(([, url]) => Boolean(url));

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close contribution details"
        className="absolute inset-0 bg-brand-navy/35"
        onClick={onClose}
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-brand-sand/30 px-5 py-5 sm:px-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-brand-taupe">
              {opportunity.contributionType || "Contribution"}
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-brand-navy">
              {opportunity.title}
            </h2>
            <div className="mt-2 text-sm font-bold text-brand-taupe">
              {availabilityLabel(opportunity)}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-sand/40 text-brand-navy transition hover:bg-brand-sand/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-6">
            {opportunity.description && (
              <section>
                <h3 className="text-sm font-extrabold text-brand-navy">About this contribution</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-taupe">
                  {opportunity.description}
                </p>
              </section>
            )}

            <section className="grid gap-4 sm:grid-cols-2">
              <Detail label="Counts toward" value={coverageDisplayLabel(opportunity)} />
              <Detail label="Cycle" value={opportunity.cycle || "Not specified"} />
              <Detail label="Age group" value={opportunity.ageGroup || "Not specified"} />
              <Detail label="Committee" value={opportunity.committee || "Not specified"} />
              <Detail label="Oversight" value={opportunity.oversightGroup || "Not specified"} />
              <Detail
                label="Availability"
                value={
                  opportunity.slots === null
                    ? availabilityLabel(opportunity)
                    : `${opportunity.spotsRemaining ?? 0} of ${opportunity.slots} spots remaining`
                }
              />
            </section>

            {linkItems.length > 0 && (
              <section>
                <h3 className="text-sm font-extrabold text-brand-navy">Resources</h3>
                <div className="mt-2 flex flex-col gap-2">
                  {linkItems.map(([label, url]) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy hover:text-brand-sky"
                    >
                      {label}
                      <ExternalLink size={15} />
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className="border-t border-brand-sand/30 pt-5">
              <h3 className="text-lg font-extrabold text-brand-navy">Claim this contribution</h3>

              {successMessage ? (
                <div className="mt-3 rounded-2xl border border-brand-sky/40 bg-brand-sky/10 px-4 py-3 text-sm font-semibold text-brand-navy">
                  {successMessage}
                </div>
              ) : hasClaim ? (
                <div className="mt-3 rounded-2xl border border-brand-sky/40 bg-brand-sky/10 px-4 py-3 text-sm text-brand-navy">
                  You already have an active claim for this opportunity. Current status: <strong>{formatStatus(opportunity.myApplicationStatus)}</strong>.
                </div>
              ) : opportunity.availabilityStatus !== "open" ? (
                <div className="mt-3 rounded-2xl border border-brand-sand/40 bg-brand-sand/10 px-4 py-3 text-sm text-brand-taupe">
                  This contribution is not currently available to claim.
                </div>
              ) : (
                <form onSubmit={handleClaim} className="mt-4 space-y-4">
                  {submitError && (
                    <div className="rounded-xl border border-brand-junior/30 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
                      {submitError}
                    </div>
                  )}

                  {choiceMode === "all" && (
                    <div className="rounded-xl border border-brand-sky/35 bg-brand-sky/10 px-4 py-3 text-sm text-brand-taupe">
                      This contribution counts toward <strong className="text-brand-navy">{coverageDisplayLabel(opportunity)}</strong>. No additional choice is needed.
                    </div>
                  )}

                  {choiceMode === "choose_program" && (
                    <div>
                      <label htmlFor="claim-program" className="text-sm font-bold text-brand-navy">
                        Which program would you like this contribution to count toward?
                      </label>
                      <select
                        id="claim-program"
                        value={selectedProgram}
                        onChange={(event) => setSelectedProgram(event.target.value)}
                        disabled={submitting}
                        className="mt-2 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20"
                      >
                        <option value="">Choose Junior or Youth</option>
                        {programs.map((program) => (
                          <option key={program} value={program}>
                            {formatProgram(program)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {choiceMode === "choose_period" && (
                    <div>
                      <label htmlFor="claim-period" className="text-sm font-bold text-brand-navy">
                        Which period/session would you like this contribution to count toward?
                      </label>
                      <select
                        id="claim-period"
                        value={selectedCoverageKey}
                        onChange={(event) => setSelectedCoverageKey(event.target.value)}
                        disabled={submitting}
                        className="mt-2 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20"
                      >
                        <option value="">Choose one period/session</option>
                        {periodOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="claim-notes" className="text-sm font-bold text-brand-navy">
                      Notes <span className="font-normal text-brand-taupe">(optional)</span>
                    </label>
                    <textarea
                      id="claim-notes"
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={submitting}
                      placeholder={
                        opportunity.isTeaching
                          ? "Add any early context about the class you are considering. Full class details will come later."
                          : "Anything you would like the contribution coordinator to know."
                      }
                      className="mt-2 w-full rounded-xl border border-brand-sand/60 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition placeholder:text-brand-taupe/50 focus:border-brand-sky focus:ring-2 focus:ring-brand-sky/20"
                    />
                  </div>

                  {opportunity.isTeaching && (
                    <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm text-brand-taupe">
                      This is the initial teaching contribution claim. Full class information will be requested after the claim is approved.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !canClaim}
                    className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-extrabold text-white transition hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit contribution claim"}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-brand-taupe">{label}</div>
      <div className="mt-1 text-sm font-semibold text-brand-navy">{value}</div>
    </div>
  );
}


function MyContributions({ applications, error, loading }) {
  return (
    <section className="rounded-3xl border border-brand-sand/40 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-extrabold text-brand-navy">My Contributions</h2>
      <p className="mt-1 text-sm text-brand-taupe">Track the status of your contribution claims.</p>
      {error && <p className="mt-3 text-sm text-brand-junior" role="alert">{error}</p>}
      {loading && applications.length === 0 ? (
        <p className="mt-4 text-sm text-brand-taupe">Loading your applications…</p>
      ) : applications.length === 0 ? (
        <p className="mt-4 text-sm text-brand-taupe">You haven't submitted any contribution claims yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {applications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-brand-sand/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-brand-navy">{application.opportunityTitle}</h3>
                  <p className="mt-1 text-xs text-brand-taupe">{application.schoolYearName}</p>
                </div>
                <span className="rounded-full bg-brand-sky/15 px-3 py-1 text-xs font-bold text-brand-navy">
                  {formatStatus(application.status)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
