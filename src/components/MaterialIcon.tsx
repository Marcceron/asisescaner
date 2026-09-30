type Props = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function MaterialIcon({ name, className = "", filled = false }: Props) {
  return (
    <span
      className={`material-symbols-rounded materialIcon${filled ? " filled" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
