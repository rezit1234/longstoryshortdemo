export function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="admin-placeholder">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
