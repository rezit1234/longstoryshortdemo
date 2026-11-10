/** Jednotný souhrn v mailech: linky jen mezi řádky (ne nad prvním, ne pod posledním). */

export type EmailDetailRowInput = {
  label: string;
  valueHtml: string;
  valueStyle?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailDetailRow(
  label: string,
  valueHtml: string,
  options?: { first?: boolean; valueStyle?: string },
) {
  const borderTop = options?.first ? "" : "border-top:1px solid #eee;";
  const valueStyle = options?.valueStyle ?? "";
  return `<tr>
    <td style="padding:8px 0;${borderTop}font-size:14px;color:#666;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;${borderTop}font-size:14px;text-align:right;${valueStyle}">${valueHtml}</td>
  </tr>`;
}

export function emailDetailRows(
  rows: Array<EmailDetailRowInput | null | false | "">,
) {
  const filtered = rows.filter(Boolean) as EmailDetailRowInput[];
  return filtered
    .map((row, index) =>
      emailDetailRow(row.label, row.valueHtml, {
        first: index === 0,
        valueStyle: row.valueStyle,
      }),
    )
    .join("");
}
