import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  HandHeart,
  KeyRound,
  Loader2,
  Settings,
  ShieldCheck,
  Users,
  UserRoundCheck,
  Workflow,
} from "lucide-react";

import { usePermissions } from "../contexts/PermissionContext";
import { loadAdminClassProposals } from "../data/adminClassProposals";
import { loadAdminContributionApplications } from "../data/adminContributionApplications";
import { loadAdminRegistrationOverview } from "../data/adminRegistration";

const ADMIN_SECTIONS = [
  {
    key: "admissions",
    title: "Admissions",
    description:
      "Prospective families, applications, board decisions, and onboarding.",
    permission: "admin.admissions.view",
    icon: UserRoundCheck,
  },
  {
    key: "members",
    title: "Members & Families",
    description:
      "People, households, relationships, annual reviews, and member administration.",
    permission: "admin.members.view",
    icon: Users,
  },
  {
    key: "contribution-opportunities",
    title: "Manage Opportunities",
    description:
      "Create and maintain contribution opportunities, capacity, program scope, status, and catalog details.",
    permission: "admin.contributions.manage",
    icon: HandHeart,
    to: "/admin/contributions/opportunities",
  },
  {
    key: "classes",
    title: "Classes",
    description:
      "Class proposals, catalog, offerings, teachers, schedules, and rosters.",
    permission: "admin.classes.view",
    icon: GraduationCap,
    to: "/admin/classes/proposals",
  },
  {
    key: "registration",
    title: "Registration",
    description: "Enrollments, waitlists, exceptions, windows, and holds.",
    permission: "admin.registration.view",
    icon: ClipboardCheck,
    to: "/admin/registration",
  },
  {
    key: "finance",
    title: "Finance",
    description:
      "Charges, payments, allocations, balances, and financial exceptions.",
    permission: "admin.finance.view",
    icon: CreditCard,
  },
  {
    key: "google",
    title: "Google & Provisioning",
    description:
      "Workspace accounts, Classroom readiness, roster sync, and errors.",
    permission: "admin.google.view",
    icon: Workflow,
  },
  {
    key: "settings",
    title: "School Year & Settings",
    description:
      "Dates, deadlines, registration windows, sessions, and system settings.",
    permission: "admin.settings.view",
    icon: Settings,
  },
  {
    key: "audit",
    title: "Audit & Exceptions",
    description:
      "Failed syncs, unresolved exceptions, data issues, and audit information.",
    permission: "admin.audit.view",
    icon: Activity,
  },
  {
    key: "access",
    title: "Admin Access",
    description: "Administrative roles, permissions, and access assignments.",
    permission: "admin.access.view",
    icon: KeyRound,
  },
];

export default function AdminPage() {
  const { permissions, hasPermission } = usePermissions();
  const canViewClasses = hasPermission("admin.classes.view");
  const canViewContributions = hasPermission("admin.contributions.view");
  const [classProposals, setClassProposals] = useState([]);
  const [classQueueLoading, setClassQueueLoading] = useState(canViewClasses);
  const [classQueueError, setClassQueueError] = useState("");
  const [contributionApplications, setContributionApplications] = useState([]);
  const [contributionQueueLoading, setContributionQueueLoading] =
    useState(canViewContributions);
  const [contributionQueueError, setContributionQueueError] = useState("");

  const visibleSections = ADMIN_SECTIONS.filter((section) =>
    hasPermission(section.permission),
  );

  const canViewRegistration = hasPermission("admin.registration.view");
  const [registrationOverview, setRegistrationOverview] = useState(null);
  const [registrationQueueLoading, setRegistrationQueueLoading] =
    useState(canViewRegistration);
  const [registrationQueueError, setRegistrationQueueError] = useState("");

  useEffect(() => {
    if (!canViewClasses) {
      setClassQueueLoading(false);
      return;
    }

    let active = true;

    async function loadClassQueue() {
      setClassQueueLoading(true);
      setClassQueueError("");

      try {
        const rows = await loadAdminClassProposals();
        if (active) setClassProposals(rows);
      } catch (error) {
        console.error("Failed to load admin class proposal count", error);
        if (active) {
          setClassQueueError(
            error?.message || "Class proposal count could not be loaded.",
          );
        }
      } finally {
        if (active) setClassQueueLoading(false);
      }
    }

    loadClassQueue();

    return () => {
      active = false;
    };
  }, [canViewClasses]);

  useEffect(() => {
    if (!canViewContributions) {
      setContributionQueueLoading(false);
      return;
    }

    let active = true;

    async function loadContributionQueue() {
      setContributionQueueLoading(true);
      setContributionQueueError("");

      try {
        const rows = await loadAdminContributionApplications();
        if (active) setContributionApplications(rows);
      } catch (error) {
        console.error(
          "Failed to load admin contribution application count",
          error,
        );
        if (active) {
          setContributionQueueError(
            error?.message ||
              "Contribution application count could not be loaded.",
          );
        }
      } finally {
        if (active) setContributionQueueLoading(false);
      }
    }

    loadContributionQueue();

    return () => {
      active = false;
    };
  }, [canViewContributions]);

  useEffect(() => {
    if (!canViewRegistration) {
      setRegistrationQueueLoading(false);
      return;
    }

    let active = true;

    async function loadRegistrationQueue() {
      setRegistrationQueueLoading(true);
      setRegistrationQueueError("");

      try {
        const data = await loadAdminRegistrationOverview();
        if (active) setRegistrationOverview(data);
      } catch (error) {
        console.error("Failed to load registration exception count", error);
        if (active) {
          setRegistrationQueueError(
            error?.message ||
              "Registration exception count could not be loaded.",
          );
        }
      } finally {
        if (active) setRegistrationQueueLoading(false);
      }
    }

    loadRegistrationQueue();

    return () => {
      active = false;
    };
  }, [canViewRegistration]);

  const classProposalCount = useMemo(
    () =>
      classProposals.filter((proposal) =>
        ["submitted", "under_review"].includes(proposal.status),
      ).length,
    [classProposals],
  );

const contributionApprovalCount = useMemo(
  () =>
    contributionApplications.filter((application) =>
      ["submitted", "under_review"].includes(application.status),
    ).length,
  [contributionApplications],
);

  const registrationExceptionCount =
    registrationOverview?.exception_counts?.pending ?? 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/15 text-brand-gold">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h1 className="brand-title text-3xl text-brand-navy">Admin</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-brand-taupe">
              See what needs attention, then open the appropriate admin
              workspace to review and act.
            </p>
          </div>
        </div>
      </header>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Needs attention
          </h2>
          <p className="mt-1 text-sm text-brand-taupe">
            Summary only. Open a card to work through its queue.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {canViewContributions && (
            <QueueCard
              icon={HandHeart}
              title="Contribution approvals"
              value={
                contributionQueueLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : contributionQueueError ? (
                  "!"
                ) : (
                  contributionApprovalCount
                )
              }
              description={
                contributionQueueError
                  ? "Count unavailable. Open the queue to try again."
                  : contributionApprovalCount === 1
                    ? "application awaiting review"
                    : "applications awaiting review"
              }
              to="/admin/contributions/applications"
            />
          )}

          {canViewClasses && (
            <QueueCard
              icon={GraduationCap}
              title="Class proposals"
              value={
                classQueueLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : classQueueError ? (
                  "!"
                ) : (
                  classProposalCount
                )
              }
              description={
                classQueueError
                  ? "Count unavailable. Open the queue to try again."
                  : classProposalCount === 1
                    ? "proposal awaiting review"
                    : "proposals awaiting review"
              }
              to="/admin/classes/proposals"
            />
          )}

          {canViewRegistration && (
            <QueueCard
              icon={ClipboardCheck}
              title="Eligibility exceptions"
              value={
                registrationQueueLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : registrationQueueError ? (
                  "—"
                ) : (
                  registrationExceptionCount
                )
              }
              description={
                registrationQueueError
                  ? "Could not load pending eligibility requests."
                  : registrationExceptionCount === 1
                    ? "1 eligibility request waiting"
                    : `${registrationExceptionCount} eligibility requests waiting`
              }
              to="/admin/registration"
            />
          )}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Admin areas
          </h2>
          <p className="mt-1 text-sm text-brand-taupe">
            You only see areas your assigned roles allow you to access.
          </p>
        </div>

        {visibleSections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleSections.map((section) => (
              <AdminSectionCard key={section.key} section={section} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-sand/40 bg-white p-6 text-sm text-brand-taupe shadow-sm">
            You do not currently have access to any admin sections.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-brand-sand/35 bg-brand-sand/5 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-brand-gold" />
          <h2 className="text-sm font-extrabold text-brand-navy">
            Access check
          </h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-brand-taupe">
          Your account currently has{" "}
          <span className="font-bold text-brand-navy">
            {permissions.length}
          </span>{" "}
          active admin permissions.
        </p>
      </section>
    </div>
  );
}

function QueueCard({
  icon: Icon,
  title,
  value,
  description,
  to,
  muted = false,
}) {
  const content = (
    <div
      className={`group h-full rounded-2xl border bg-white p-5 shadow-sm transition ${
        to
          ? "border-brand-sand/40 hover:-translate-y-0.5 hover:border-brand-sky/60 hover:shadow-md"
          : "border-brand-sand/30"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold/12 text-brand-gold">
          <Icon size={20} />
        </div>

        {to && (
          <ChevronRight
            size={18}
            className="text-brand-sand group-hover:text-brand-sky"
          />
        )}
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div
          className={`text-3xl font-extrabold ${muted ? "text-brand-taupe/55" : "text-brand-navy"}`}
        >
          {value}
        </div>
        <div className="pb-1 text-sm font-extrabold text-brand-navy">
          {title}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-brand-taupe">
        {description}
      </p>
    </div>
  );

  if (!to) return content;

  return (
    <Link to={to} className="focus-ring block rounded-2xl">
      {content}
    </Link>
  );
}

function AdminSectionCard({ section }) {
  const Icon = section.icon;

  const content = (
    <div className="group h-full rounded-2xl border border-brand-sand/40 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-sky/60 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sky/15 text-brand-navy">
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-brand-navy">{section.title}</h3>
            {section.to && (
              <ChevronRight
                size={17}
                className="text-brand-sand group-hover:text-brand-sky"
              />
            )}
          </div>

          <p className="mt-1 text-sm leading-relaxed text-brand-taupe">
            {section.description}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-brand-sand/25 pt-3 text-xs font-bold text-brand-sky">
        {section.to ? "Open admin tools" : "Admin tools coming online"}
      </div>
    </div>
  );

  if (!section.to) return content;

  return (
    <Link to={section.to} className="focus-ring block rounded-2xl">
      {content}
    </Link>
  );
}
