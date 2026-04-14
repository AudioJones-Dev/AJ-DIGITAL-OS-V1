import type { CSSProperties, ReactNode } from "react";

// ── Dark-theme status badge colors ─────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  // Client / Mission status
  active:      { bg: "#064e3b", fg: "#6ee7b7" },
  paused:      { bg: "#713f12", fg: "#fde68a" },
  archived:    { bg: "#1e293b", fg: "#94a3b8" },
  retired:     { bg: "#1e293b", fg: "#94a3b8" },
  // Run status
  pending:     { bg: "#312e81", fg: "#a5b4fc" },
  running:     { bg: "#1e3a5f", fg: "#7dd3fc" },
  completed:   { bg: "#064e3b", fg: "#6ee7b7" },
  failed:      { bg: "#7f1d1d", fg: "#fca5a5" },
  // Deliverable status
  uploaded:    { bg: "#1e3a5f", fg: "#7dd3fc" },
  published:   { bg: "#064e3b", fg: "#6ee7b7" },
  // Priority
  low:         { bg: "#1e293b", fg: "#94a3b8" },
  normal:      { bg: "#312e81", fg: "#a5b4fc" },
  high:        { bg: "#78350f", fg: "#fcd34d" },
  critical:    { bg: "#7f1d1d", fg: "#fca5a5" },
  // Tier
  standard:    { bg: "#1e293b", fg: "#94a3b8" },
  professional:{ bg: "#1e3a5f", fg: "#7dd3fc" },
  enterprise:  { bg: "#581c87", fg: "#d8b4fe" },
  // Trigger
  manual:      { bg: "#1e293b", fg: "#94a3b8" },
  cron:        { bg: "#312e81", fg: "#a5b4fc" },
  webhook:     { bg: "#1e3a5f", fg: "#7dd3fc" },
  hermes:      { bg: "#581c87", fg: "#d8b4fe" },
};

const badgeStyle = (status: string): CSSProperties => {
  const colors = STATUS_COLORS[status] ?? { bg: "#1e293b", fg: "#cbd5e1" };
  return {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
    backgroundColor: colors.bg,
    color: colors.fg,
    textTransform: "capitalize",
  };
};

export function StatusBadge({ value }: { value: string }) {
  return <span style={badgeStyle(value)}>{value}</span>;
}

// ── Spinner ────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid #1e293b",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 48,
        color: "#64748b",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

// ── Error banner ───────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        backgroundColor: "#450a0a",
        color: "#fca5a5",
        fontSize: 13,
        marginBottom: 16,
        border: "1px solid #7f1d1d",
      }}
    >
      {message}
    </div>
  );
}

// ── Summary card ───────────────────────────────────────────────────

export function SummaryCard({
  label,
  value,
  accent = "#3b82f6",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: "20px 24px",
        flex: "1 1 0",
        minWidth: 180,
        borderLeft: `3px solid ${accent}`,
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>
        {value}
      </div>
    </div>
  );
}

// ── Search input ───────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        color: "#e2e8f0",
        outline: "none",
        minWidth: 200,
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#334155"; }}
    />
  );
}

// ── Filter select ──────────────────────────────────────────────────

export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
      {label && <span>{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 13,
          color: "#e2e8f0",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Generic data table (dark theme) ────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #334155",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#64748b",
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #1e293b",
  verticalAlign: "middle",
};

export function DataTable<T>({ columns, rows, rowKey, onRowClick }: DataTableProps<T>) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ ...thStyle, width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                transition: "background 0.15s",
                cursor: onRowClick ? "pointer" : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1e293b"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              {columns.map((col) => (
                <td key={col.key} style={tdStyle}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page wrapper ───────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>{title}</h2>
        {subtitle && (
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

// ── Toolbar row (search + filters) ─────────────────────────────────

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
      {children}
    </div>
  );
}
