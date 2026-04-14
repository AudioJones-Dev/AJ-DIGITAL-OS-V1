import type { CSSProperties, ReactNode } from "react";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  // Client / Mission status
  active:      { bg: "#dcfce7", fg: "#166534" },
  paused:      { bg: "#fef9c3", fg: "#854d0e" },
  archived:    { bg: "#f3f4f6", fg: "#6b7280" },
  retired:     { bg: "#f3f4f6", fg: "#6b7280" },
  // Run status
  pending:     { bg: "#e0e7ff", fg: "#3730a3" },
  running:     { bg: "#dbeafe", fg: "#1e40af" },
  completed:   { bg: "#dcfce7", fg: "#166534" },
  failed:      { bg: "#fee2e2", fg: "#991b1b" },
  // Deliverable status
  uploaded:    { bg: "#dbeafe", fg: "#1e40af" },
  published:   { bg: "#dcfce7", fg: "#166534" },
  // Priority
  low:         { bg: "#f3f4f6", fg: "#6b7280" },
  normal:      { bg: "#e0e7ff", fg: "#3730a3" },
  high:        { bg: "#fef3c7", fg: "#92400e" },
  critical:    { bg: "#fee2e2", fg: "#991b1b" },
  // Tier
  standard:    { bg: "#f3f4f6", fg: "#6b7280" },
  professional:{ bg: "#dbeafe", fg: "#1e40af" },
  enterprise:  { bg: "#fae8ff", fg: "#86198f" },
};

const badgeStyle = (status: string): CSSProperties => {
  const colors = STATUS_COLORS[status] ?? { bg: "#f3f4f6", fg: "#374151" };
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
          border: "3px solid #e5e7eb",
          borderTopColor: "#2563eb",
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
        color: "#9ca3af",
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
        backgroundColor: "#fef2f2",
        color: "#991b1b",
        fontSize: 13,
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  );
}

// ── Generic data table ─────────────────────────────────────────────

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
}

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "2px solid #e5e7eb",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#6b7280",
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "middle",
};

export function DataTable<T>({ columns, rows, rowKey }: DataTableProps<T>) {
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
            <tr key={rowKey(row)} style={{ transition: "background 0.15s" }}>
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h2>
        {subtitle && (
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
